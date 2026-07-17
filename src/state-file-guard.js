import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { unlinkSync } from "node:fs";
import { readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);
const STARTUP_TIMEOUT_MS = 5_000;
const FALLBACK_BIRTH_ID = `${Date.now() - Math.round(process.uptime() * 1_000)}-${crypto.randomUUID()}`;

export async function acquireStateFileGuard(stateFile) {
  const startedAt = Date.now();
  const token = `${process.pid}-${crypto.randomUUID()}`;
  const file = guardFile(stateFile, token);
  const owner = {
    pid: process.pid,
    birth: (await processBirthId(process.pid)) || FALLBACK_BIRTH_ID,
  };
  let retryDelayMs = 5;
  await writeFile(file, JSON.stringify({ ...owner, choosing: true }), { flag: "wx", mode: 0o600 });
  try {
    const initialRecords = await guardRecords(stateFile);
    const ticket = initialRecords.reduce((maximum, record) => Math.max(maximum, record.ticket || 0), 0) + 1;
    await replaceGuardRecord(file, { ...owner, choosing: false, ticket, status: "acquiring" });
    while (true) {
      const records = await guardRecords(stateFile);
      const existingOwner = records.find((record) => record.token !== token && record.status === "held");
      if (existingOwner) throw guardConflictError(stateFile, existingOwner.pid);
      if (!records.some((record) => record.token === token)) throw guardConflictError(stateFile);
      const blocked = records.some(
        (record) =>
          record.token !== token &&
          (record.choosing ||
            record.ticket < ticket ||
            (record.ticket === ticket && record.token.localeCompare(token) < 0)),
      );
      if (!blocked) {
        await replaceGuardRecord(file, { ...owner, choosing: false, ticket, status: "held" });
        return createGuardHandle(file);
      }
      if (Date.now() - startedAt >= STARTUP_TIMEOUT_MS) throw guardConflictError(stateFile);
      await delay(retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 100);
    }
  } catch (error) {
    await unlink(file).catch(ignoreMissingFile);
    throw error;
  }
}

async function guardRecords(stateFile) {
  const directory = path.dirname(stateFile);
  const prefix = `${path.basename(stateFile)}.server-guard.`;
  const names = await readdir(directory);
  const records = [];
  for (const name of names) {
    if (!name.startsWith(prefix)) continue;
    const token = name.slice(prefix.length);
    if (!/^\d+-[0-9a-f-]{36}$/.test(token)) continue;
    const file = path.join(directory, name);
    const record = await readGuardRecord(file, token);
    if (!record) continue;
    if (record.stale) {
      await unlink(file).catch(ignoreMissingFile);
      continue;
    }
    records.push(record);
  }
  return records;
}

async function readGuardRecord(file, token) {
  try {
    const raw = await readFile(file, "utf8");
    const pid = Number.parseInt(token.split("-", 1)[0], 10);
    if (!processIsAlive(pid)) return { token, stale: true };
    try {
      const parsed = JSON.parse(raw);
      if (parsed.pid !== pid || typeof parsed.birth !== "string" || parsed.birth.length === 0) {
        return { token, pid, stale: false, choosing: true, ticket: 0, status: "acquiring" };
      }
      const currentBirth = await processBirthId(pid);
      if (currentBirth && currentBirth !== parsed.birth) return { token, stale: true };
      return {
        token,
        pid,
        stale: false,
        choosing: parsed.choosing !== false,
        ticket: Number.isSafeInteger(parsed.ticket) && parsed.ticket > 0 ? parsed.ticket : 0,
        status: parsed.status === "held" ? "held" : "acquiring",
      };
    } catch {
      return { token, pid, stale: false, choosing: true, ticket: 0, status: "acquiring" };
    }
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function processBirthId(pid) {
  if (process.platform === "linux") {
    try {
      const [bootId, processStat] = await Promise.all([
        readFile("/proc/sys/kernel/random/boot_id", "utf8"),
        readFile(`/proc/${pid}/stat`, "utf8"),
      ]);
      const fields = processStat
        .slice(processStat.lastIndexOf(")") + 2)
        .trim()
        .split(/\s+/);
      return fields[19] ? `${bootId.trim()}:${fields[19]}` : null;
    } catch {
      return null;
    }
  }
  if (process.platform === "darwin") {
    try {
      const { stdout } = await execFileAsync("/bin/ps", ["-o", "lstart=", "-p", String(pid)]);
      return stdout.trim() ? `darwin:${stdout.trim()}` : null;
    } catch {
      return null;
    }
  }
  return null;
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

async function replaceGuardRecord(file, record) {
  const temporary = `${file}.update`;
  try {
    await writeFile(temporary, JSON.stringify(record), { flag: "wx", mode: 0o600 });
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(ignoreMissingFile);
    throw error;
  }
}

function createGuardHandle(file) {
  let released = false;
  const onExit = () => {
    try {
      unlinkSync(file);
    } catch {}
  };
  process.once("exit", onExit);
  return {
    file,
    async release() {
      if (released) return;
      released = true;
      process.removeListener("exit", onExit);
      await unlink(file).catch(ignoreMissingFile);
    },
  };
}

function guardFile(stateFile, token) {
  return path.join(path.dirname(stateFile), `${path.basename(stateFile)}.server-guard.${token}`);
}

function guardConflictError(stateFile, pid) {
  const owner = pid ? ` (pid ${pid})` : "";
  return Object.assign(
    new Error(
      `State file is already owned by another Atelier server${owner}: ${stateFile}. Stop that server or use a different ATELIER_AXI_STATE_DIR.`,
    ),
    { code: "STATE_FILE_IN_USE" },
  );
}

function ignoreMissingFile(error) {
  if (!error || error.code !== "ENOENT") throw error;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
