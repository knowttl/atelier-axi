import crypto from "node:crypto";
import { readFile, readdir, realpath, rename, stat, unlink, utimes, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeMermaidNodeTarget } from "./mermaid-node.js";
import { EXCALIDRAW_SCENE_TARGET_TYPE, normalizeExcalidrawSceneTarget } from "./whiteboard-core.js";

const LOCK_RETRY_TIMEOUT_MS = 5_000;
const LOCK_STALE_MS = 30_000;
const LOCK_HEARTBEAT_MS = 5_000;
const FALLBACK_PROCESS_BIRTH_ID = `${Date.now() - Math.round(process.uptime() * 1_000)}-${crypto.randomUUID()}`;

export class SessionStore {
  constructor(file) {
    this.file = file;
    // Every read and write funnels through this promise chain and a cross-process file lock so
    // no two operations interleave their read-modify-write of the whole state.json.
    /** @type {Promise<unknown>} */
    this.tail = Promise.resolve();
  }

  // Run `operation` only after the previously queued store operation settles, keeping the
  // chain alive whether it resolves or rejects so one failed op can't wedge the store.
  /**
   * @template T
   * @param {() => Promise<T>} operation
   * @returns {Promise<T>}
   */
  serialize(operation) {
    const lockedOperation = () => withFileLock(this.file, operation);
    const result = this.tail.then(lockedOperation, lockedOperation);
    this.tail = result.then(noop, noop);
    return result;
  }

  async listSessions() {
    return this.serialize(async () => {
      const state = await this.readState();
      return Object.values(state.sessions).sort((a, b) => a.file.localeCompare(b.file));
    });
  }

  async findByFile(file) {
    const absolute = await canonicalFile(file);
    return this.serialize(async () => {
      const state = await this.readState();
      return state.sessions[sessionKey(absolute)] || null;
    });
  }

  async findByKey(key) {
    return this.serialize(async () => {
      const state = await this.readState();
      return state.sessions[key] || null;
    });
  }

  async upsertSession(file, url) {
    const absolute = await canonicalFile(file);
    const key = sessionKey(absolute);
    return this.serialize(async () => {
      const state = await this.readState();
      const existing = state.sessions[key] || {};
      const existingPrompts = existing.prompts || [];
      const existingStatus = existing.status === "ended" ? "open" : existing.status || "open";
      const session = {
        key,
        file: absolute,
        url,
        status: existingStatus === "feedback" && existingPrompts.length === 0 ? "open" : existingStatus,
        pending_prompts: existing.pending_prompts || 0,
        prompts: existingPrompts,
        layout_warnings: [],
        delivered_layout_warning_keys: existing.delivered_layout_warning_keys || [],
        dom_snapshot: existing.dom_snapshot || "",
        chat: existing.chat || [],
        updated_at: new Date().toISOString(),
      };
      state.sessions[key] = session;
      await this.writeState(state);
      return session;
    });
  }

  async queuePrompts(key, payload) {
    return this.serialize(async () => {
      const state = await this.readState();
      const session = state.sessions[key];
      if (!session) {
        return null;
      }
      const prompts = Array.isArray(payload.prompts) ? payload.prompts : [];
      const shouldEndSession = Boolean(payload.endSession || payload.end_session);
      const alreadyEnded = session.status === "ended";
      const normalizedPrompts = prompts.map(normalizePrompt);
      const userMessages = normalizedPrompts
        .filter((prompt) => prompt.tag === "message" && prompt.prompt)
        .map((prompt) => ({ role: "user", text: prompt.prompt, at: new Date().toISOString() }));
      session.prompts = [...(session.prompts || []), ...normalizedPrompts];
      session.chat = [...(session.chat || []), ...userMessages];
      session.pending_prompts = session.prompts.length;
      session.dom_snapshot = String(payload.domSnapshot || payload.dom_snapshot || "");
      session.status = shouldEndSession || alreadyEnded ? "ended" : "feedback";
      if (shouldEndSession) session.ended_by = "user";
      session.updated_at = new Date().toISOString();
      await this.writeState(state);
      return session;
    });
  }

  async recordLayoutWarnings(key, payload) {
    return this.serialize(async () => {
      const state = await this.readState();
      const session = state.sessions[key];
      if (!session) {
        return null;
      }
      const deliveredWarningKeys = session.delivered_layout_warning_keys || [];
      const deliveredKeys = new Set(deliveredWarningKeys);
      const layoutWarnings = normalizeLayoutWarnings(
        payload.layout_warnings || payload.layoutWarnings || [],
        deliveredKeys,
      );
      const activeWarningKeys = new Set(layoutWarnings.map(layoutWarningKey));
      const nextDeliveredWarningKeys = deliveredWarningKeys.filter((key) => activeWarningKeys.has(key)).slice(-200);
      const deliveredKeysChanged =
        nextDeliveredWarningKeys.length !== deliveredWarningKeys.length ||
        nextDeliveredWarningKeys.some((key, index) => key !== deliveredWarningKeys[index]);
      const previousSignature = JSON.stringify(session.layout_warnings || []);
      const nextSignature = JSON.stringify(layoutWarnings);
      const warningsChanged = previousSignature !== nextSignature;
      if (!warningsChanged && !deliveredKeysChanged) {
        return { session, changed: false, hasWarnings: layoutWarnings.length > 0 };
      }
      session.layout_warnings = layoutWarnings;
      session.delivered_layout_warning_keys = nextDeliveredWarningKeys;
      if (layoutWarnings.length > 0 && session.status !== "ended") {
        session.status = "feedback";
      } else if ((session.prompts || []).length === 0 && session.status !== "ended") {
        session.status = "open";
      }
      session.updated_at = new Date().toISOString();
      await this.writeState(state);
      return { session, changed: warningsChanged, hasWarnings: layoutWarnings.length > 0 };
    });
  }

  async takeFeedback(key) {
    return this.serialize(async () => {
      const state = await this.readState();
      const session = state.sessions[key];
      if (!session) {
        return { status: "missing" };
      }
      // Prompts queued before the session ended (e.g. "Send & End") must still reach the
      // agent, so deliver them before reporting the ended state; the next poll then sees ended.
      const prompts = session.prompts || [];
      const layoutWarnings = session.layout_warnings || [];
      const alreadyEnded = session.status === "ended";
      if (prompts.length === 0 && layoutWarnings.length === 0) {
        return alreadyEnded ? { status: "ended", ended_by: session.ended_by } : { status: "waiting" };
      }
      const result = {
        status: "feedback",
        dom_snapshot: session.dom_snapshot || "",
        prompts,
        ...(layoutWarnings.length > 0 ? { layout_warnings: layoutWarnings } : {}),
        // This is the final delivery before the session shows as ended - flag it so the agent
        // knows not to expect (or force) a reopened browser afterward.
        ...(alreadyEnded ? { session_ended: true, ended_by: session.ended_by } : {}),
      };
      session.prompts = [];
      session.layout_warnings = [];
      session.pending_prompts = 0;
      session.dom_snapshot = "";
      if (layoutWarnings.length > 0) {
        const deliveredKeys = new Set(session.delivered_layout_warning_keys || []);
        for (const warning of layoutWarnings) deliveredKeys.add(layoutWarningKey(warning));
        session.delivered_layout_warning_keys = [...deliveredKeys].slice(-200);
      }
      if (!alreadyEnded) {
        session.status = "open";
      }
      session.updated_at = new Date().toISOString();
      await this.writeState(state);
      return result;
    });
  }

  // `endedBy` distinguishes a human ending review from the browser chrome ("user") from an
  // agent explicitly closing the loop via `atelier-axi end` ("agent"). Only a user-initiated end
  // blocks a plain reopen - see `SessionStore` callers in server.js.
  async endSession(key, endedBy = "agent") {
    return this.serialize(async () => {
      const state = await this.readState();
      const session = state.sessions[key];
      if (!session) {
        return null;
      }
      const existingEndedBy = session.status === "ended" ? session.ended_by : undefined;
      const nextEndedBy = endedBy === "user" || existingEndedBy === "user" ? "user" : "agent";
      session.status = "ended";
      session.ended_by = nextEndedBy;
      session.updated_at = new Date().toISOString();
      await this.writeState(state);
      return session;
    });
  }

  async addAgentReply(key, text) {
    return this.serialize(async () => {
      const state = await this.readState();
      const session = state.sessions[key];
      if (!session) {
        return null;
      }
      session.chat = [
        ...(session.chat || []),
        { role: "agent", text: String(text || ""), at: new Date().toISOString() },
      ];
      session.updated_at = new Date().toISOString();
      await this.writeState(state);
      return session;
    });
  }

  async readState() {
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw);
      return { sessions: parsed.sessions || {} };
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return { sessions: {} };
      }
      throw error;
    }
  }

  async writeState(state) {
    const temporary = `${this.file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, {
        flag: "wx",
        mode: await stateFileMode(this.file),
      });
      await rename(temporary, this.file);
    } catch (error) {
      await unlink(temporary).catch(ignoreMissingFile);
      throw error;
    }
  }
}

function noop() {}

async function withFileLock(file, operation) {
  const lock = await acquireFileLock(file);
  try {
    return await operation();
  } finally {
    lock.stopHeartbeat();
    await releaseFileLock(lock);
  }
}

async function acquireFileLock(file) {
  const startedAt = Date.now();
  const token = `${process.pid}-${crypto.randomUUID()}`;
  const entry = lockEntryFile(file, token);
  const owner = {
    pid: process.pid,
    birth: (await kernelProcessBirthId(process.pid)) || FALLBACK_PROCESS_BIRTH_ID,
  };
  let retryDelayMs = 5;
  await writeFile(entry, JSON.stringify({ ...owner, choosing: true }), { flag: "wx", mode: 0o600 });
  const stopHeartbeat = startLockHeartbeat(entry);
  try {
    const initialRecords = await lockRecords(file);
    const ticket = initialRecords.reduce((maximum, record) => Math.max(maximum, record.ticket || 0), 0) + 1;
    await replaceLockRecord(entry, { ...owner, choosing: false, ticket });
    while (true) {
      const records = await lockRecords(file);
      if (!records.some((record) => record.token === token)) throw lockLostError(file);
      const blocked = records.some(
        (record) =>
          record.token !== token &&
          (record.choosing ||
            record.ticket < ticket ||
            (record.ticket === ticket && record.token.localeCompare(token) < 0)),
      );
      if (!blocked) return { file: entry, stopHeartbeat };
      if (Date.now() - startedAt >= LOCK_RETRY_TIMEOUT_MS) throw lockTimeoutError(file);
      await delay(retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 100);
    }
  } catch (error) {
    stopHeartbeat();
    await unlink(entry).catch(ignoreMissingFile);
    throw error;
  }
}

async function lockRecords(file) {
  const directory = path.dirname(file);
  const prefix = `${path.basename(file)}.lock.`;
  const names = await readdir(directory);
  const records = [];
  for (const name of names) {
    if (!name.startsWith(prefix)) continue;
    const token = name.slice(prefix.length);
    if (!/^\d+-[0-9a-f-]{36}$/.test(token)) continue;
    const entry = path.join(directory, name);
    const record = await readLockRecord(entry, token);
    if (!record) continue;
    if (record.stale) {
      await unlink(entry).catch(ignoreMissingFile);
      continue;
    }
    records.push(record);
  }
  return records;
}

async function readLockRecord(file, token) {
  try {
    const [raw, fileStat] = await Promise.all([readFile(file, "utf8"), stat(file)]);
    const pid = Number.parseInt(token.split("-", 1)[0], 10);
    if (Date.now() - fileStat.mtimeMs >= LOCK_STALE_MS) return { token, stale: true };
    if (!processIsAlive(pid)) return { token, stale: true };
    try {
      const parsed = JSON.parse(raw);
      if (parsed.pid !== pid || typeof parsed.birth !== "string" || parsed.birth.length === 0) {
        return { token, stale: false, choosing: true, ticket: 0 };
      }
      const currentBirth = await kernelProcessBirthId(pid);
      if (currentBirth && currentBirth !== parsed.birth) return { token, stale: true };
      return {
        token,
        stale: false,
        choosing: parsed.choosing !== false,
        ticket: Number.isSafeInteger(parsed.ticket) && parsed.ticket > 0 ? parsed.ticket : 0,
      };
    } catch {
      return { token, stale: false, choosing: true, ticket: 0 };
    }
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function kernelProcessBirthId(pid) {
  if (process.platform !== "linux") return null;
  try {
    const [bootId, processStat] = await Promise.all([
      readFile("/proc/sys/kernel/random/boot_id", "utf8"),
      readFile(`/proc/${pid}/stat`, "utf8"),
    ]);
    const fields = processStat
      .slice(processStat.lastIndexOf(")") + 2)
      .trim()
      .split(/\s+/);
    const startTicks = fields[19];
    return startTicks ? `${bootId.trim()}:${startTicks}` : null;
  } catch {
    return null;
  }
}

function startLockHeartbeat(entry) {
  const timer = setInterval(() => {
    const now = new Date();
    void utimes(entry, now, now).catch(noop);
  }, LOCK_HEARTBEAT_MS);
  timer.unref();
  return () => clearInterval(timer);
}

function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return Boolean(error && error.code === "EPERM");
  }
}

async function replaceLockRecord(entry, record) {
  const temporary = `${entry}.update`;
  try {
    await writeFile(temporary, JSON.stringify(record), { flag: "wx", mode: 0o600 });
    await rename(temporary, entry);
  } catch (error) {
    await unlink(temporary).catch(ignoreMissingFile);
    throw error;
  }
}

async function releaseFileLock(lock) {
  await unlink(lock.file).catch(ignoreMissingFile);
}

function lockEntryFile(file, token) {
  return path.join(path.dirname(file), `${path.basename(file)}.lock.${token}`);
}

function lockTimeoutError(file) {
  return Object.assign(new Error(`Timed out waiting for state lock: ${file}`), { code: "ELOCKED" });
}

function lockLostError(file) {
  return Object.assign(new Error(`Lost ownership of state lock: ${file}`), { code: "ELOCKLOST" });
}

async function stateFileMode(file) {
  try {
    return (await stat(file)).mode & 0o777;
  } catch (error) {
    if (error && error.code === "ENOENT") return 0o600;
    throw error;
  }
}

function ignoreMissingFile(error) {
  if (!error || error.code !== "ENOENT") throw error;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function canonicalFile(file) {
  const absolute = path.resolve(file);
  return realpath(absolute);
}

export function sessionKey(file) {
  return crypto.createHash("sha256").update(file).digest("hex").slice(0, 16);
}

function normalizePrompt(prompt) {
  const normalized = {
    uid: String(prompt.uid || ""),
    prompt: String(prompt.prompt || ""),
    selector: String(prompt.selector || ""),
    tag: String(prompt.tag || ""),
    text: String(prompt.text || ""),
  };
  const target = normalizeTarget(prompt.target);
  if (target) normalized.target = target;
  return normalized;
}

function layoutWarningKey(warning) {
  return `${warning.kind}:${warning.selector}`;
}

// A finding whose key was already delivered to the agent in a prior poll is marked persistent
// so the agent can tell a fix attempt didn't clear it, instead of treating a reload's re-report
// of the identical warning as fresh.
function normalizeLayoutWarnings(layoutWarnings, deliveredKeys = new Set()) {
  if (!Array.isArray(layoutWarnings)) return [];
  return layoutWarnings
    .filter((warning) => warning && typeof warning === "object" && !Array.isArray(warning))
    .map((warning) => {
      const selector = String(warning.selector || "");
      const kind = String(warning.kind || "layout-warning");
      return {
        selector,
        kind,
        overflowPx: normalizeFiniteNumber(warning.overflowPx),
        viewportWidth: normalizeFiniteNumber(warning.viewportWidth),
        severity: warning.severity === "warning" ? "warning" : "error",
        persistent: deliveredKeys.has(layoutWarningKey({ kind, selector })),
      };
    });
}

function normalizeFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeTarget(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) return null;
  if (target.type === "mermaid-node") return normalizeMermaidNodeTarget(target);
  if (target.type === EXCALIDRAW_SCENE_TARGET_TYPE) return normalizeExcalidrawSceneTarget(target);
  // text-range and any other/legacy target shapes pass through unchanged.
  return JSON.parse(JSON.stringify(target));
}
