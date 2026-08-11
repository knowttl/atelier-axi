import { spawn, spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { encode as encodeToon } from "@toon-format/toon";
import { AxiError, installSessionStartHooks, RESERVED_COMMANDS, runAxiCli, runUpdate } from "axi-sdk-js";

import { createDesignOutput, DESIGN_SYSTEM_HINT } from "./design-reference.js";
import {
  buildSelfContainedHtml,
  exportFileName,
  exportWarningSummaries,
  splitExportWarnings,
} from "./export-bundle.js";
import { publishToHtmlApp } from "./html-app.js";
import {
  clientHost,
  defaultPort,
  ensureStateDir,
  hostForUrl,
  pollBatchFile,
  serverLogFile,
  stateFile,
} from "./paths.js";
import {
  computeVsCodePluginLocationsUpdate,
  linkCursorLocalPlugin,
  readPluginManifest,
  resolveCursorLocalPluginsDir,
  resolvePluginRoot,
  resolveVsCodeSettingsFile,
  spawnPluginClientSync,
  writeTextFileAtomically,
} from "./plugin.js";
import { findPlaybook, listPlaybooks, playbookIds, PLAYBOOK_ROUTER_HELP } from "./playbooks.js";
import { analyzeSelfPaint, SELF_PAINT_WARNING } from "./self-paint.js";
import { resolveDesignAssetPath, serve } from "./server.js";
import { canonicalFile, sessionKey, SessionStore } from "./session-store.js";

const COMMANDS = new Set(["open", "poll", "end", "stop", "server", "playbook", "design", "setup", "export", "share"]);
// SDK-reserved built-ins (e.g. `update`) must reach runAxiCli untouched; otherwise
// the bare-arg normalization below would rewrite them into the hidden `open` command.
const RESERVED = new Set(RESERVED_COMMANDS);
const DESCRIPTION =
  "Atelier Editor helps agents turn rich HTML artifacts into collaborative human review surfaces. Whenever you are about to give user a complex response that will be easier to understand via a rich / interactive page, consider using Atelier Editor. " +
  "First generate an interactive HTML artifact according to user request, then run `atelier-axi <html-file>` so the user can visually review it, annotate elements or selected text, queue prompts, and send feedback back through `atelier-axi poll`.";
export const POLL_WAKE_PATH_RULES = Object.freeze([
  "Keep the poll in the foreground by default and let it return the feedback directly to the agent.",
  "A background poll is allowed only through a harness-native tracked background-job facility whose completion result is guaranteed to resume or notify the same agent.",
  "Never use `nohup`, shell `&`, `disown`, redirected fire-and-forget processes, or a detached terminal without an explicit verified callback merely to keep polling alive.",
  "If the harness has no completion-aware background facility, use the foreground poll or first wire a verified wake callback into the surrounding supervisor.",
  "Do not tell the user the artifact is being monitored until that wake path is live.",
  "If the poll gets killed or times out anyway, just re-run it - queued feedback is never lost.",
  "Run at most one poll per artifact: a session delivers each batch of feedback to one owning poll and retires every competing poll with a POLL_SUPERSEDED error rather than splitting feedback between them.",
  "Every delivered poll response ends with a `prompts_delivered=<N> batch_file=<path>` line: compare `<N>` against the prompts you actually read, and if you read fewer, your own output capture truncated the response - read the whole batch from `batch_file` instead of asking the user to repeat themselves. A `batch_file` value of `-` means the recovery copy could not be written, not that `-` is a filename.",
]);
// The one authoritative wrap-up statement. It reaches agents through the home output (SessionStart
// hook), `--help`, and the generated skill; every other surface points at it rather than restating
// it, so the procedure has a single source of truth.
export const SESSION_WRAPUP_HELP =
  "When a review is finished, wrap up so sessions and the shared server do not linger. " +
  "Run `atelier-axi end <html-file>` to end the session as the agent - ending it this way still allows a plain reopen later, while a session the user ended from the browser refuses a plain reopen and needs `--reopen`. " +
  "Then, once `atelier-axi` lists no other session, run `atelier-axi stop` to shut the shared background server down promptly; it also self-stops when idle (default 30 minutes) or as soon as the last session ends with nothing connected, so a manual stop is prompt cleanup rather than a requirement. When `ATELIER_AXI_IDLE_TIMEOUT_MS` is `0` or `off`, a manual stop can be required. " +
  "If the artifact file was already deleted, `end` fails with ENOENT and the session keeps showing as open even after the server stops - recreate an empty file at that exact path, run `end`, then delete it again. " +
  "Anything you started alongside the server, such as a LAN port forwarder or SSH tunnel, is a separate process Atelier never stops for you. " +
  "Leftovers worth clearing once the review is over: the artifacts under `.atelier/` and any `<name>.export.html` beside them, plus whiteboard scene sidecars under `<state-dir>/whiteboards/<key>/` and the last delivered batch copy at `<state-dir>/batches/<key>.json` - `<state-dir>` is `~/.atelier-axi` by default or `ATELIER_AXI_STATE_DIR` when set, and `<key>` is the final segment of that session's URL - which are never removed automatically.";
// Short pointer appended to the poll responses an agent receives at the end of a review. The full
// procedure lives in SESSION_WRAPUP_HELP; `end` is omitted here because these responses only fire
// once the session has already ended.
export const SESSION_WRAPUP_NEXT_STEP =
  "Then wrap up: once `atelier-axi` lists no other session, run `atelier-axi stop` to shut the shared background server down instead of leaving it to its idle self-stop, stop anything you started alongside it such as a LAN port forwarder, and clear artifact leftovers the review no longer needs.";
export const POLL_SEND_AND_END_RULE =
  "`Send & End` ends the session. Its final feedback is still delivered once. After that response, polling stops, and the agent must not reopen the session uninvited.";
const CODEX_POLL_WAKE_PATH_GUIDANCE =
  "Codex detected: completed background tasks may not resume Codex automatically, so keep the poll attached to the active turn.";
// Inlined at build time from package.json; falls back to reading package.json so source-run tests work.
export const VERSION =
  process.env.ATELIER_AXI_BUILD_VERSION ||
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

export function detectInvokingAgent(env = process.env) {
  return ["CODEX_SANDBOX", "CODEX_THREAD_ID"].some((key) => Object.hasOwn(env, key)) ? "codex" : "generic";
}

export function shouldNarratePollWaitTicks({ isTTY }) {
  return Boolean(isTTY);
}

export function pollExecutionGuidance({ agent = "generic" } = {}) {
  const sharedGuidance = POLL_WAKE_PATH_RULES.join(" ");
  const agentGuidance = agent === "codex" ? ` ${CODEX_POLL_WAKE_PATH_GUIDANCE}` : "";
  return `${sharedGuidance}${agentGuidance}`;
}

// Mirrors the SDK's own version-flag detection so the fast path below prints exactly
// what `runAxiCli` would have printed, for exactly the same argv shapes.
export function isVersionOnlyArgv(argv) {
  return argv.length === 1 && (argv[0] === "--version" || argv[0] === "-v" || argv[0] === "-V");
}

export async function run(argv) {
  // `--version` sits on the agent-startup hot path because harnesses probe every tool's
  // version at session start, so it must not pay for state-directory initialization.
  if (isVersionOnlyArgv(argv)) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  await ensureStateDir();
  const normalizedArgv = normalizeArgv(argv);
  const agent = detectInvokingAgent(process.env);
  const isTopLevelHelp = argv.length === 1 && argv[0] === "--help";
  await runAxiCli({
    description: DESCRIPTION,
    version: VERSION,
    argv: isTopLevelHelp ? [] : normalizedArgv,
    topLevelHelp: createTopLevelHelp({ agent }),
    home: async () =>
      createHomeOutput({
        bin: process.argv[1] || "atelier-axi",
        sessions: isTopLevelHelp ? [] : await visibleSessions(),
        includeSessions: !isTopLevelHelp,
        agent,
      }),
    commands: {
      open: openCommand,
      poll: pollCommand,
      end: endCommand,
      stop: stopCommand,
      playbook: playbookCommand,
      design: designCommand,
      setup: setupCommand,
      server: serverCommand,
      export: exportCommand,
      share: shareCommand,
      update: updateCommand,
    },
    getCommandHelp: (command) => getCommandHelp(command, { agent }),
  });
}

export function collapseHomeDirectory(file, home) {
  const normalizedFile = file.replaceAll("\\", "/");
  const normalizedHome = home.replaceAll("\\", "/");

  if (normalizedFile === normalizedHome) {
    return "~";
  }
  if (normalizedFile.startsWith(`${normalizedHome}/`)) {
    return `~/${normalizedFile.slice(normalizedHome.length + 1)}`;
  }
  return file;
}

export function normalizeArgv(argv) {
  const first = argv[0];
  if (!first || COMMANDS.has(first) || RESERVED.has(first)) {
    return argv;
  }
  if (first.startsWith("-")) {
    return argv.some((arg) => isHtmlPath(arg)) ? ["open", ...argv] : argv;
  }
  return ["open", ...argv];
}

export function createHomeOutput({ bin, sessions, includeSessions = true, agent = "generic" }) {
  return {
    bin: collapseHomeDirectory(bin, os.homedir()),
    description: DESCRIPTION,
    ...(includeSessions
      ? {
          sessions: sessions.map((session) => ({
            file: session.file,
            status: session.status,
            url: session.url,
            pending_prompts: session.pending_prompts || 0,
          })),
        }
      : {}),
    visual_guidance: [
      "Use visual hierarchy to make the most important decisions, risks, tradeoffs, and next actions obvious at a glance",
      "Use visual structure such as sections, cards, tables, diagrams, annotated snippets, and side-by-side comparisons instead of long prose",
      "Choose typography, spacing, color, and layout deliberately so the artifact has a clear point of view",
      "Prevent horizontal overflow at every nesting level: nested grid/flex children also need minmax(0, 1fr) tracks and min-width: 0, especially when badges, labels, or status text use wide pixel or monospace fonts; wrap, truncate, or contain long unbreakable text deliberately",
      "When the artifact would describe existing or current UI or state, show it instead: capture screenshots of the real pages (run the app read-only if needed) and embed them, rather than explaining the current look in prose; reserve prose for what cannot be shown such as rationale, trade-offs, and open questions",
    ],
    playbooks: listPlaybooks(),
    help: [
      "Run `atelier-axi <html-file>` to open or resume a Atelier Editor session. If the user explicitly ended the session from the browser, this refuses to reopen it and explains why instead of reopening uninvited - pass `--reopen` only when the user asks for further review or something important needs their visual attention",
      "Unless the user specifies another location, create HTML artifacts in the current working directory under `.atelier/`",
      "Atelier serves the html file through a local express.js server. If your html needs to reference other filesystem assets such as images, CSS, fonts, and local scripts, copy them into the same directory as the HTML file, then reference them with relative paths from that directory. Never prepend `/` to those asset paths - root paths won't work",
      `Run \`atelier-axi poll <html-file>\` to wait for user feedback. It long-polls and stays silent until the user sends feedback or ends the session, so leave it running - never kill it. Detected layout issues never return this poll: the browser files them in the user's Layout issues inbox in the Atelier top bar, and they arrive as an ordinary tag "layout-warnings" prompt only when the user selects them and queues the fixes. Never edit the artifact to chase a layout issue the user has not queued. The only exception is a fatal artifact_failures response, which means the review surface itself could not be used. ${pollExecutionGuidance({ agent })} ${POLL_SEND_AND_END_RULE}`,
      'Rendered Mermaid diagrams in `.mermaid` containers become embedded, editable Excalidraw whiteboards in the browser (click a diagram to unlock editing; a Fullscreen action opens it over the whole viewport) - flowchart, sequence, class, ER, and state diagrams convert to editable shapes; other types embed as an image to draw on. Scenes autosave locally; when a reload detects a changed Mermaid source, the reviewer explicitly chooses to re-convert and discard saved edits or keep editing the saved scene. Standalone and exported copies still render plain Mermaid. Queue feedback adds a prompt to the Conversation panel; when the user sends it, poll returns a tag "whiteboard" prompt carrying a bounded edit summary plus local scenePath (.excalidraw JSON) and previewPath (PNG) files - read the summary first, open the files only when needed, then apply the edits by updating the Mermaid source in the artifact (never try to write the scene back)',
      SESSION_WRAPUP_HELP,
      "Run `atelier-axi export <html-file> [--out <path>]` to write a portable copy of the artifact - one HTML file with its LOCAL assets inlined - so it opens with no Atelier server and no sibling files. Remote CDN/font references are left as links, so it needs network to render those. Users can also export from the browser chrome's overflow menu",
      "Run `atelier-axi share <html-file> [--password <pw>] [--token <t>]` to publish the artifact on ht-ml.app (https://ht-ml.app), a third-party hosting service not part of Atelier, and get back a visitable URL. Shares are PUBLIC by default, so anyone with the link can open them. Pass --password to publish a PRIVATE password-protected page; viewers must supply the password to view. Local assets are inlined; remote refs load over the network. It returns the url plus a secret update_key for managing the page later. Use --token or ATELIER_AXI_HTML_APP_TOKEN only when you have an optional bearer token; it is never required. Users can also publish from the browser chrome's overflow menu",
      `Run \`atelier-axi playbook <playbook_id>\` for focused artifact guidance. ${PLAYBOOK_ROUTER_HELP}`,
      "To plan a feature or change before building it, run `atelier-axi playbook plan`: surface the open questions and edge cases as a visual review surface first, converge with the user, then produce a spec and a bite-sized implementation plan.",
      DESIGN_SYSTEM_HINT,
      "Use atelier-axi when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop",
    ],
  };
}

export function createPlaybookOutput(args) {
  const id = args[0];
  if (!id) {
    return {
      playbooks: listPlaybooks(),
      help: ["Run `atelier-axi playbook <playbook_id>` for focused artifact guidance", PLAYBOOK_ROUTER_HELP],
    };
  }

  const playbook = findPlaybook(id);
  if (!playbook) {
    throw new AxiError(`Unknown playbook: ${id}`, "VALIDATION_ERROR", [
      `Run \`atelier-axi playbook\` to list known IDs: ${playbookIds().join(", ")}`,
    ]);
  }

  return { playbook };
}

export function createOpenOutput({ file, url, status, agent = "generic", selfPaintWarning = undefined }) {
  const selfPaintPrefix = selfPaintWarning
    ? `First fix the unpainted page surface flagged in self_paint_warning and save - Atelier live-reloads the artifact automatically, so you do not need to re-run \`atelier-axi ${file}\`. `
    : "";
  return {
    session: { file, url, status },
    ...(selfPaintWarning ? { self_paint_warning: selfPaintWarning } : {}),
    next_step: `${selfPaintPrefix}Do not respond to the user just yet. Now you must run \`atelier-axi poll ${file}\`. This command long-polls until the user sends feedback or ends the session, and it stays silent the whole time - that is normal, never kill it. Layout issues the browser detects do not return this poll; they wait in the user's Layout issues inbox until the user queues them, then arrive as an ordinary tag "layout-warnings" prompt. Do not pass --timeout-ms during normal agent use. ${pollExecutionGuidance({ agent })} After applying feedback, run \`atelier-axi poll ${file} --agent-reply "<message for the user>"\` without --timeout-ms to show your response in Atelier Editor and wait for more feedback. If the user ends the session, stop polling and do not reopen it by re-running \`atelier-axi ${file}\` unless the user asks for further review or something genuinely important needs their visual attention - deliver routine updates directly in this conversation instead. When reopening is warranted, run \`atelier-axi ${file} --reopen\`.`,
  };
}

// Shown when a plain `atelier-axi <file>` targets a session the user explicitly ended from the
// browser. Reviving it silently would reopen a browser window the human deliberately closed, so
// this refuses and requires the explicit --reopen opt-in instead of erroring - the session
// staying closed is the correct, idempotent outcome unless the agent has a real reason to reopen.
export function createUserEndedOpenOutput({ file, url }) {
  return {
    session: { file, url, status: "user-ended" },
    next_step: `The user explicitly ended this Atelier Editor session from the browser, so \`atelier-axi ${file}\` did not reopen it. Do not reopen unless the user asks for further review or something genuinely important needs their visual attention - deliver routine updates directly in this conversation instead. When reopening is warranted, run \`atelier-axi ${file} --reopen\`.`,
  };
}

async function openCommand(args) {
  assertKnownFlags(args, { command: "open", booleanFlags: ["--no-open", "--no-gate", "--reopen"] });
  const file = firstPositionalArg(args);
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `atelier-axi <html-file>`"]);
  }
  await assertHtmlFile(file);
  const absolute = await canonicalFile(file);
  const selfPaintWarning = await selfPaintWarningForFile(absolute);
  const noGate = args.includes("--no-gate");
  const reopen = args.includes("--reopen");
  const baseUrl = await ensureServer({ forceRestart: shouldForceRestartForLocalBuild(process.argv[1] || "") });
  const response = await postJson(`${baseUrl}/api/sessions`, { file: absolute, noGate, reopen });
  if (response.status === "user-ended") {
    return createUserEndedOpenOutput({ file: absolute, url: response.url });
  }
  if (shouldOpenBrowser(args, process.env)) {
    try {
      const open = (await import("open")).default;
      await open(response.url);
    } catch {
      response.status = "ready";
    }
  }
  return createOpenOutput({
    file: absolute,
    url: response.url,
    status: response.status || "opened",
    agent: detectInvokingAgent(process.env),
    selfPaintWarning,
  });
}

// A read failure here must not break the open - the server reports unreadable artifacts
// through its own fatal path, and the self-paint check always fails open.
async function selfPaintWarningForFile(absolute) {
  try {
    return analyzeSelfPaint(await readFile(absolute, "utf8")).painted ? undefined : SELF_PAINT_WARNING;
  } catch {
    return undefined;
  }
}

export function shouldOpenBrowser(args, env) {
  return !args.includes("--no-open") && env.ATELIER_AXI_NO_OPEN !== "1";
}

async function pollCommand(args) {
  assertKnownFlags(args, {
    command: "poll",
    valueFlags: ["--agent-reply", "--timeout-ms"],
    booleanFlags: ["--full"],
  });
  const file = firstPositionalArg(args, ["--agent-reply", "--timeout-ms"]);
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `atelier-axi poll <html-file>`"]);
  }
  const absolute = await canonicalFile(file);
  const full = args.includes("--full");
  const baseUrl = await ensureServer();
  const agentReply = flagValue(args, "--agent-reply");
  if (agentReply) {
    await postJson(`${baseUrl}/api/${sessionKey(absolute)}/agent-reply`, { text: agentReply });
  }
  const timeoutMs = flagValue(args, "--timeout-ms");
  const timeoutQuery = timeoutMs ? `&timeoutMs=${encodeURIComponent(timeoutMs)}` : "";
  // The indefinite poll looks hung from the agent's side (stdout stays empty until the user
  // acts), so narrate the wait on stderr and leave re-run guidance behind if the agent's
  // harness kills the process anyway. stderr keeps the stdout JSON contract intact.
  // The one-shot banner is that "not hung" signal and stays unconditional; only the recurring
  // ticks - one line per minute, unbounded - are gated on an interactive stderr so piped,
  // merged agent captures do not accumulate them.
  const onPollSignal = (signal) => {
    process.stderr.write(`\n${pollInterruptedText(absolute)}\n`);
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  if (!timeoutMs) {
    // Register before the banner write below: a harness that kills the poll as soon as the
    // banner appears can deliver the signal before the next statement runs, and without a
    // handler the default disposition exits silently with no re-run guidance.
    process.on("SIGINT", onPollSignal);
    process.on("SIGTERM", onPollSignal);
  }
  const waitReporter = timeoutMs
    ? null
    : startPollWaitReporter({
        file: absolute,
        narrateTicks: shouldNarratePollWaitTicks({ isTTY: process.stderr.isTTY }),
      });
  try {
    const response = await fetchJson(`${baseUrl}/api/poll?file=${encodeURIComponent(absolute)}${timeoutQuery}`, {
      retries: 3,
      retryDelayMs: 500,
    });
    // `missing` and `superseded` throw out of createPollOutput before the trailer is built: they
    // deliver no prompts and write no batch, so there is nothing to lose or to recover, and the
    // non-zero exit already makes them unmissable. A trailer there would only name a file that
    // holds someone else's batch.
    const output = createPollOutput({ file: absolute, response, full, agent: detectInvokingAgent(process.env) });
    const batchFile = await writePollBatch(sessionKey(absolute), output);
    return renderPollDelivery({ output, batchFile });
  } finally {
    waitReporter?.stop();
    if (!timeoutMs) {
      process.off("SIGINT", onPollSignal);
      process.off("SIGTERM", onPollSignal);
    }
  }
}

export function pollWaitBannerText(file) {
  return (
    `[atelier-axi] Long-polling for user feedback on ${file}. This stays silent until the user sends feedback or ends the session - leave it running. ` +
    `Detected layout issues do NOT return this poll: they wait in the user's Layout issues inbox until the user queues them as ordinary feedback. ` +
    `If it gets killed or times out, re-run \`atelier-axi poll ${file}\` - queued feedback is never lost.`
  );
}

export function pollWaitTickText(elapsedMs) {
  const minutes = Math.round(elapsedMs / 60_000);
  return `[atelier-axi] Still waiting for user feedback (${minutes}m). Leave this running until the user sends feedback or ends the session.`;
}

export function pollInterruptedText(file) {
  return (
    `[atelier-axi] Poll interrupted before user feedback arrived. The user may still be reviewing - ` +
    `re-run \`atelier-axi poll ${file}\` to keep waiting; queued feedback is never lost.`
  );
}

export function startPollWaitReporter({
  file,
  write = (line) => {
    process.stderr.write(line);
  },
  intervalMs = 60_000,
  narrateTicks = true,
}) {
  write(`${pollWaitBannerText(file)}\n`);
  if (!narrateTicks) return { stop: () => {} };
  let elapsedMs = 0;
  const timer = setInterval(() => {
    elapsedMs += intervalMs;
    write(`${pollWaitTickText(elapsedMs)}\n`);
  }, intervalMs);
  timer.unref?.();
  return { stop: () => clearInterval(timer) };
}

/**
 * @returns {{
 *   session: { file: string, status: string, session_ended?: boolean, ended_by?: string },
 *   next_step?: string,
 *   dom_snapshot?: string,
 *   dom_snapshot_truncated?: boolean,
 *   dom_snapshot_bytes?: number,
 *   dom_snapshot_hint?: string,
 *   prompts?: any[],
 *   artifact_failures?: any[],
 * }}
 */
export function createPollOutput({ file, response, full = false, agent = "generic" }) {
  if (response.status === "missing") {
    throw new AxiError("No active Atelier Editor session for this file", "NOT_FOUND", [
      `Run \`atelier-axi ${file}\` first`,
    ]);
  }
  // A session delivers its feedback to exactly one poll. Being superseded means another poll owns
  // the session, so this one returns nothing - loudly, because the alternative is two pollers
  // splitting one batch between them with neither the user nor either agent told.
  if (response.status === "superseded") {
    throw new AxiError("Another `atelier-axi poll` owns this Atelier Editor session", "POLL_SUPERSEDED", [
      "No feedback was delivered to this poll and none was lost - the owning poll receives it",
      "Run only one poll per artifact: stop any leftover poll before starting another",
      `To take the session back, run \`atelier-axi poll ${file}\` again once no other poll is running`,
    ]);
  }
  if (response.status === "feedback") {
    const artifactFailures = Array.isArray(response.artifact_failures) ? response.artifact_failures : [];
    const sessionEnded = Boolean(response.session_ended);
    const endedBy = typeof response.ended_by === "string" ? response.ended_by : undefined;
    return {
      session: {
        file,
        status: "feedback",
        ...(sessionEnded ? { session_ended: true, ...(endedBy ? { ended_by: endedBy } : {}) } : {}),
      },
      ...truncateDomSnapshot(response.dom_snapshot, { file, full }),
      prompts: response.prompts || [],
      ...(artifactFailures.length > 0 ? { artifact_failures: artifactFailures } : {}),
      next_step: createFeedbackNextStep(file, artifactFailures, sessionEnded, endedBy, response.prompts || [], agent),
    };
  }
  if (response.status === "ended") {
    return {
      session: { file, status: "ended", ...(response.ended_by ? { ended_by: response.ended_by } : {}) },
      next_step: createEndedNextStep(file, response.ended_by),
    };
  }
  return {
    session: { file, status: response.status || "waiting" },
    next_step: `No user feedback arrived before the optional timeout. Run \`atelier-axi poll ${file}\` without --timeout-ms to wait indefinitely - queued feedback is never lost, so re-running the poll is always safe.`,
  };
}

// Sentinel for `batch_file` when the recovery copy could not be written, so the trailer keeps
// one parseable shape instead of an empty field.
export const POLL_BATCH_FILE_UNAVAILABLE = "-";

/**
 * A poll's stdout is routinely truncated OUTSIDE atelier: agent harnesses cap captured output
 * and keep the TAIL, which silently eats the head of a large batch - the incident that motivated
 * this was a 2932-byte capture that began mid-table and dropped five decisions without a trace.
 * Atelier cannot control that boundary, but it can make the loss detectable: a tail-keeping cap
 * preserves exactly the last line, so the trailer survives the cut that destroys the rows above
 * it. `prompts_delivered` is the authoritative count for the response, and `batch_file` points at
 * the full batch on disk so a short read is recoverable without asking the user to re-answer.
 * A pointer printed first would be the first thing eaten - keep this last, and emit nothing after.
 */
export function formatPollDeliveryTrailer({ promptsDelivered, batchFile }) {
  return `prompts_delivered=${promptsDelivered} batch_file=${batchFile || POLL_BATCH_FILE_UNAVAILABLE}`;
}

// Renders the poll response body exactly as the SDK would, then appends the trailer as the last
// line. Returning a pre-rendered string is why the trailer can be last: the SDK renders and
// writes a command's structured return value itself, leaving no seam after it.
export function renderPollDelivery({ output, batchFile }) {
  const promptsDelivered = Array.isArray(output.prompts) ? output.prompts.length : 0;
  return `${encodeToon(output)}\n${formatPollDeliveryTrailer({ promptsDelivered, batchFile })}`;
}

// The trailer promises a recoverable copy, so the batch lands on disk before the response is
// rendered. `takeFeedback` is a destructive read - by now the prompts are gone from the session
// store and this process holds the only copy - so a failed write degrades to a trailer without a
// path rather than throwing away the delivery it exists to protect.
async function writePollBatch(key, output) {
  const file = pollBatchFile(key);
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    return file;
  } catch {
    return null;
  }
}

function createFeedbackNextStep(file, artifactFailures, sessionEnded, endedBy, prompts = [], agent = "generic") {
  const count = artifactFailures.length;
  const whiteboardNote = prompts.some((prompt) => prompt && prompt.tag === "whiteboard")
    ? `This feedback includes whiteboard edits (tag "whiteboard"): read the edit summary in the prompt text first, and only when it is not enough, open the target's scenePath (.excalidraw scene JSON) or previewPath (PNG) local files for detail. The artifact's Mermaid source stays authoritative - apply the edits by updating the Mermaid text in ${file} (Atelier live-reloads it); never try to write the .excalidraw scene back. `
    : "";
  const layoutNote = prompts.some((prompt) => prompt && prompt.tag === "layout-warnings")
    ? `This feedback includes layout issues the user selected from the Atelier Layout issues inbox (tag "layout-warnings"): the target lists the exact warning ids and targets. Apply every listed fix in one pass before saving so the user's review refreshes once. Queueing is a repair request, not a resolution - Atelier only marks a warning resolved after a newer artifact load and a complete check at the same viewport no longer detects it. `
    : "";
  if (sessionEnded) {
    const failureNote =
      count > 0
        ? endedBy === "user"
          ? `${count} fatal artifact failure${count === 1 ? "" : "s"} arrived alongside this final feedback - the review surface itself could not be used. Repair ${file}, then open it directly and confirm it renders without reopening this ended Atelier session. `
          : `${count} fatal artifact failure${count === 1 ? "" : "s"} arrived alongside this final feedback - the review surface itself could not be used. Repair ${file}, then run \`atelier-axi ${file}\` to open a fresh session. `
        : "";
    if (endedBy === "user") {
      const reopenNote =
        count > 0
          ? ""
          : ` Only run \`atelier-axi ${file} --reopen\` if the user explicitly asks for further review or something genuinely important needs their visual attention.`;
      return `${failureNote}${layoutNote}${whiteboardNote}This was the last feedback before the user ended the session. Stop polling ${file} and do not reopen it - deliver any remaining updates directly in this conversation instead.${reopenNote} ${SESSION_WRAPUP_NEXT_STEP}`;
    }
    return `${failureNote}${layoutNote}${whiteboardNote}This was the last feedback before the Atelier Editor session ended. Stop polling ${file}. Deliver any remaining updates directly in this conversation, or run \`atelier-axi ${file}\` to open a fresh session if the user needs further visual review. ${SESSION_WRAPUP_NEXT_STEP}`;
  }
  const prefix =
    count > 0 ? artifactFailuresPrefix(file, artifactFailures) : `Apply the requested changes to ${file}. `;
  return `${prefix}${layoutNote}${whiteboardNote}Do not respond to the user just yet. Now you must run \`atelier-axi poll ${file} --agent-reply "<message for the user>"\` without --timeout-ms unless the user ended the session. The poll waits silently until the user sends more feedback or ends the session - never kill it. ${pollExecutionGuidance({ agent })}`;
}

// The narrow fatal path. Ordinary layout findings never reach the poll: they wait in the user's
// Layout issues inbox. Only failures that make the review itself unusable - the artifact document
// not being servable, or one of its own local assets failing to load - arrive without user action.
function artifactFailuresPrefix(file, artifactFailures) {
  const count = artifactFailures.length;
  const plural = count === 1 ? "" : "s";
  const details = artifactFailures
    .map((failure) => `${failure.kind}: ${failure.detail}`)
    .slice(0, 5)
    .join("; ");
  return `${count} fatal artifact failure${plural} detected - the review surface could not be used (${details}). Repair ${file} so it renders with all of its local assets, then re-check in the browser. Atelier live-reloads the artifact automatically after you save, so you do not need to re-run \`atelier-axi ${file}\` for this. `;
}

function createEndedNextStep(file, endedBy) {
  if (endedBy === "user") {
    return `The user ended this Atelier Editor session. Stop polling ${file} - do not run \`atelier-axi ${file}\` to reopen it. Deliver any remaining updates directly in this conversation instead. Only reopen with \`atelier-axi ${file} --reopen\` if the user explicitly asks for further review or something genuinely important needs their visual attention. ${SESSION_WRAPUP_NEXT_STEP}`;
  }
  return `This Atelier Editor session for ${file} has ended. Stop polling. Deliver any remaining updates directly in this conversation, or run \`atelier-axi ${file}\` to open a fresh session if the user needs further visual review. ${SESSION_WRAPUP_NEXT_STEP}`;
}

async function endCommand(args) {
  assertKnownFlags(args, { command: "end" });
  const file = firstPositionalArg(args);
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `atelier-axi end <html-file>`"]);
  }
  const absolute = await canonicalFile(file);
  const baseUrl = await ensureServer();
  const response = await postJson(`${baseUrl}/api/end`, { file: absolute });
  return { session: { file: absolute, status: response.status || "ended" } };
}

// Produce a portable copy of an artifact: one HTML file with its LOCAL assets (relative-path
// stylesheets, scripts, images, fonts) inlined as data URIs. Remote CDN/font references are left
// as-is for the browser to load, so the export needs network to render those. Atelier makes no
// outbound requests - export is a pure local file transform, server-independent.
async function exportCommand(args) {
  assertKnownFlags(args, { command: "export", valueFlags: ["--out"] });
  const file = firstPositionalArg(args, ["--out"]);
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `atelier-axi export <html-file>`"]);
  }
  await assertHtmlFile(file);
  const absolute = await canonicalFile(file);
  const root = path.dirname(absolute);
  const output = path.resolve(flagValue(args, "--out") || path.join(root, exportFileName(absolute)));
  const source = await readFile(absolute, "utf8");
  const { html, warnings } = await buildSelfContainedHtml(source, {
    baseDir: root,
    confineDir: root,
    resolveAbsolute: resolveDesignAssetPath,
  });
  await writeFile(output, html);
  return createExportOutput({
    source: absolute,
    output,
    html,
    warnings,
    selfPaintWarning: analyzeSelfPaint(source).painted ? undefined : SELF_PAINT_WARNING,
  });
}

export function createExportOutput({ source, output, html, warnings, selfPaintWarning = undefined }) {
  const allWarnings = Array.isArray(warnings) ? warnings : [];
  const { unresolved, notices } = splitExportWarnings(allWarnings);
  const result = {
    export: {
      source,
      output,
      bytes: Buffer.byteLength(html),
      unresolved_local_assets: unresolved.length,
      notices: notices.length,
    },
  };
  if (allWarnings.length) result.warnings = exportWarningSummaries(allWarnings);
  if (unresolved.length) result.unresolved_local_assets = exportWarningSummaries(unresolved);
  if (notices.length) result.notices = exportWarningSummaries(notices);
  if (unresolved.length) {
    result.next_step =
      "Some LOCAL assets could not be inlined and were left as references (see unresolved_local_assets); they will break once the file is moved. Remote CDN/font references are intentionally left as links and render where there is network access.";
  } else if (notices.length) {
    result.next_step = `Wrote ${output} with export notices (see notices). Open it directly or host it anywhere - it needs no Atelier server. Local assets are inlined; remote CDN/font references are left as links, so it needs network to render those.`;
  } else {
    result.next_step = `Wrote ${output}. Open it directly or host it anywhere - it needs no Atelier server. Local assets are inlined; remote CDN/font references are left as links, so it needs network to render those.`;
  }
  if (selfPaintWarning) {
    result.self_paint_warning = selfPaintWarning;
    result.next_step = `Fix the unpainted page surface flagged in self_paint_warning and re-run the export before sharing the file - an exported page renders over whatever surface hosts it. ${result.next_step}`;
  }
  return result;
}

function assetWarningSummaries(warnings) {
  return exportWarningSummaries(warnings);
}

// Publish the artifact as a visitable page on third-party ht-ml.app. Builds the same local-inlined
// HTML as `export` (remote refs left as links), then POSTs it to ht-ml.app's `/v1/sites` API,
// sending the artifact to ht-ml.app's servers. The service is not part of Atelier, needs no
// account or API key, and returns the share URL plus the secret update_key for
// managing the page later. Server-independent.
async function shareCommand(args) {
  assertKnownFlags(args, { command: "share", valueFlags: ["--password", "--token"] });
  const file = firstPositionalArg(args, ["--password", "--token"]);
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `atelier-axi share <html-file>`"]);
  }
  await assertHtmlFile(file);
  const absolute = await canonicalFile(file);
  const password = optionalFlagString(flagValue(args, "--password"));
  const token = optionalFlagString(flagValue(args, "--token"));
  const root = path.dirname(absolute);
  const source = await readFile(absolute, "utf8");
  const { html, warnings } = await buildSelfContainedHtml(source, {
    baseDir: root,
    confineDir: root,
    resolveAbsolute: resolveDesignAssetPath,
  });
  const site = await publishToHtmlApp(html, { password, token });
  return createShareOutput({
    source: absolute,
    site,
    warnings,
    passwordProtected: Boolean(password),
    selfPaintWarning: analyzeSelfPaint(source).painted ? undefined : SELF_PAINT_WARNING,
  });
}

export function createShareOutput({ source, site, warnings, passwordProtected = false, selfPaintWarning = undefined }) {
  const allWarnings = Array.isArray(warnings) ? warnings : [];
  const { unresolved, notices } = splitExportWarnings(allWarnings);
  const isPasswordProtected = Boolean(passwordProtected);
  const result = {
    share: {
      source,
      url: site.url,
      site_id: site.site_id,
      update_key: site.update_key,
      status: site.status || "active",
      public: !isPasswordProtected,
      visibility: isPasswordProtected ? "private" : "public",
      password_protected: isPasswordProtected,
      unresolved_local_assets: unresolved.length,
      notices: notices.length,
    },
  };
  const passwordNote = isPasswordProtected ? " This page is PASSWORD-PROTECTED; viewers also need the password." : "";
  if (allWarnings.length) result.warnings = exportWarningSummaries(allWarnings);
  if (unresolved.length) result.unresolved_local_assets = assetWarningSummaries(unresolved);
  if (notices.length) result.notices = assetWarningSummaries(notices);
  const noticeNote = notices.length ? " Export notices are available in notices." : "";
  const hostNote =
    "ht-ml.app (https://ht-ml.app), a third-party host not part of Atelier, hosts the page, so it needs no Atelier server.";
  if (unresolved.length) {
    result.next_step =
      `Published ${isPasswordProtected ? "a PASSWORD-PROTECTED page at " : ""}${site.url}, but some LOCAL assets could not be inlined and were left as references (see unresolved_local_assets); inspect the hosted page and fix missing local assets before sharing it.${passwordNote}${noticeNote} ` +
      `Remote CDN/font references are intentionally left as links and render where there is network access. ` +
      `The update_key is a secret shown only once; keep it to update or delete the page later (there is no recovery). ` +
      hostNote;
  } else if (isPasswordProtected) {
    result.next_step =
      `Published a PASSWORD-PROTECTED page: ${site.url} - share this URL with the user and provide the password separately; viewers also need the password. ` +
      `${noticeNote ? `${noticeNote} ` : ""}` +
      `The update_key is a secret shown only once; keep it to update or delete the page later (there is no recovery). ` +
      hostNote;
  } else {
    result.next_step =
      `Published a PUBLIC page that anyone with the link can view: ${site.url} - share this URL with the user. ` +
      `${noticeNote ? `${noticeNote} ` : ""}` +
      `The update_key is a secret shown only once; keep it to update or delete the page later (there is no recovery). ` +
      hostNote;
  }
  if (selfPaintWarning) {
    result.self_paint_warning = selfPaintWarning;
    result.next_step = `Fix the unpainted page surface flagged in self_paint_warning, then re-run the share command and share only its replacement URL - the hosted page renders over ht-ml.app's own surface. ${result.next_step}`;
  }
  return result;
}

// Explicitly shut down the running Atelier Editor server. Unlike `end` (which closes a single
// session), this stops the background process so it stops dangling between sessions.
export async function stopCommand(args) {
  assertKnownFlags(args, { command: "stop", valueFlags: ["--port"] });
  const port = Number(flagValue(args, "--port") || defaultPort());
  const baseUrl = `http://${hostForUrl(clientHost())}:${port}`;
  return shutdownServerOnPort(port, { baseUrl, currentVersion: VERSION });
}

export async function shutdownServerOnPort(
  port,
  {
    baseUrl = `http://${hostForUrl(clientHost())}:${port}`,
    currentVersion = VERSION,
    fetchHealth: healthFetcher = fetchHealth,
    requestShutdown: shutdownRequester = requestShutdown,
    waitForPortFree: portFreeWaiter = waitForPortFree,
    killProcessOnPort: portKiller = killProcessOnPort,
    processMatchesAtelier = processOnPortMatchesAtelier,
  } = {},
) {
  const health = await healthFetcher(baseUrl);
  if (!health) {
    return { server: { status: "not-running", port } };
  }
  if (!(await canControlServerOnPort(port, health, processMatchesAtelier))) {
    return { server: { status: "not-atelier", port } };
  }
  await shutdownRequester(baseUrl);
  let freed = await portFreeWaiter(baseUrl, 3000);
  if (!freed && shouldKillProcessOnPort(currentVersion, health)) {
    portKiller(port);
    freed = await portFreeWaiter(baseUrl, 3000);
  }
  return { server: { status: freed ? "stopped" : "stopping", port } };
}

async function playbookCommand(args) {
  assertKnownFlags(args, { command: "playbook" });
  return createPlaybookOutput(args);
}

async function designCommand(args) {
  assertKnownFlags(args, { command: "design" });
  return createDesignOutput();
}

async function setupCommand(args) {
  if (args.length !== 1 || (args[0] !== "hooks" && args[0] !== "plugin")) {
    throw new AxiError("Unknown setup action", "VALIDATION_ERROR", [
      "Run `atelier-axi setup hooks`",
      "Run `atelier-axi setup plugin`",
    ]);
  }

  if (args[0] === "plugin") return setupPluginCommand();

  const errors = [];
  installSessionStartHooks({
    marker: "atelier-axi",
    binaryNames: ["atelier-axi"],
    distEntrypoints: ["dist/cli.mjs", "bin/atelier-axi.js"],
    homeDir: resolveHookHomeDir(),
    onError: (message) => errors.push(message),
  });
  installCopilotCliSessionStartHook({
    hookDir: resolveCopilotHookDir(process.env, resolveHookHomeDir()),
    onError: (message) => errors.push(message),
  });

  if (errors.length > 0) {
    throw new AxiError("Failed to install atelier-axi agent hooks", "SERVER_ERROR", errors);
  }

  return {
    hooks: { status: "installed", integrations: "Claude Code, Codex, OpenCode, GitHub Copilot CLI" },
    help: [
      "Restart your agent session to receive atelier-axi ambient context",
      "Run `atelier-axi setup plugin` to also register the Agent Plugin in VS Code, Cursor, and GitHub Copilot CLI",
    ],
  };
}

// The atelier agent skill installs separately from the npm package (via
// `npx skills add knowttl/atelier-axi --skill atelier`), so a plain npm
// self-update never refreshes it. This shadows the SDK's reserved `update`
// built-in: self-update the CLI through the SDK, then delegate to the same
// skills CLI the skill was installed with so both move to the new release.
const ATELIER_SKILL_NAME = "atelier";

async function updateCommand(args) {
  const result = await runUpdate({ args, stdout: process.stdout, version: VERSION });
  const checkOnly = args.some((arg) => arg === "--check" || arg === "--dry-run");
  if (checkOnly) {
    return result;
  }
  const base = typeof result === "object" && result !== null ? result : { update: result };
  return { ...base, skill: refreshAtelierSkill() };
}

// Refresh the installed atelier skill through the `skills` CLI. Never throws: a
// skill-refresh failure must not undo a successful CLI self-update, so it
// returns manual-recovery guidance instead of failing the whole command.
/**
 * @param {() => { error?: unknown; status?: number | null }} [spawnSkillUpdate]
 */
export function refreshAtelierSkill(spawnSkillUpdate = defaultSpawnSkillUpdate) {
  const command = `npx -y skills update --yes ${ATELIER_SKILL_NAME}`;
  const result = spawnSkillUpdate();
  if (result.error || result.status !== 0) {
    return { status: "skipped", run: command, help: `Refresh the atelier skill manually with \`${command}\`` };
  }
  // A clean exit is not proof a matching skill existed - the skills CLI exits 0
  // even when nothing was installed to update - and its output is inherited, not
  // inspected, so report "attempted" rather than overclaiming a refresh.
  return { status: "attempted", run: command };
}

function defaultSpawnSkillUpdate() {
  // `--yes` skips the skills CLI's scope prompt so the inherited-stdio child can
  // never block `atelier-axi update` waiting on a TTY answer.
  return spawnSync("npx", ["-y", "skills", "update", "--yes", ATELIER_SKILL_NAME], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

/**
 * Register this installed package as an Agent Plugin in every supported client that is
 * present. The package directory itself is the plugin root, so nothing is downloaded and
 * no marketplace is involved - clients read the same files `npm install` already wrote.
 *
 * Like `setup hooks`, this only ever runs from an explicit user invocation.
 *
 * @returns {Promise<Record<string, unknown>>} structured per-client outcome
 */
async function setupPluginCommand() {
  const pluginRoot = resolvePluginRoot();
  const manifest = readPluginManifest(pluginRoot);
  if (!manifest) {
    throw new AxiError("No plugin.json found in the atelier-axi package", "SERVER_ERROR", [
      `Expected a manifest at ${path.join(pluginRoot, "plugin.json")}`,
      "Reinstall atelier-axi, or run `npm run build:plugin` when working from a source checkout",
    ]);
  }

  const clients = [
    registerVsCodePlugin(pluginRoot, manifest.name),
    registerCursorPlugin(pluginRoot, manifest.name),
    registerCopilotPlugin(pluginRoot, manifest.name),
  ];

  const help = ["Restart or reload each client so it discovers the plugin"];
  if (clients.some((client) => client.status === "absent")) {
    help.push("Absent clients are skipped; re-run `atelier-axi setup plugin` after installing one");
  }
  if (clients.some((client) => client.status === "manual")) {
    help.push(`Register the plugin root manually where noted: ${pluginRoot}`);
  }

  return { plugin: { name: manifest.name, root: collapseHome(pluginRoot) }, clients, help };
}

/** @param {string} target absolute path @returns {string} path with $HOME collapsed to ~ */
function collapseHome(target) {
  const home = resolveHookHomeDir();
  return home && target.startsWith(home) ? `~${target.slice(home.length)}` : target;
}

/**
 * @param {string} pluginRoot absolute plugin root
 * @param {string} pluginName manifest name
 * @returns {{ client: string, status: string, detail: string }} outcome row
 */
function registerVsCodePlugin(pluginRoot, pluginName) {
  const settingsFile = resolveVsCodeSettingsFile(process.env, resolveHookHomeDir());
  const settingsDir = path.dirname(settingsFile);
  const hasSettingsFile = existsSync(settingsFile);
  if (!hasSettingsFile && !existsSync(settingsDir)) {
    return { client: "vscode", status: "absent", detail: "no VS Code user configuration found" };
  }

  let settings = {};
  if (hasSettingsFile) {
    try {
      settings = JSON.parse(readFileSync(settingsFile, "utf8"));
    } catch {
      // VS Code settings may legally contain comments or trailing commas. Rewriting a file
      // we cannot faithfully parse would destroy the user's configuration, so we bail out
      // and tell them the one line to add instead.
      return {
        client: "vscode",
        status: "manual",
        detail: `add "chat.pluginLocations": {"${pluginRoot}": true} to ${collapseHome(settingsFile)}`,
      };
    }
  }

  const [updated, changed] = computeVsCodePluginLocationsUpdate(settings, pluginRoot, pluginName);
  if (!changed) return { client: "vscode", status: "current", detail: collapseHome(settingsFile) };

  try {
    const writeTarget = hasSettingsFile ? realpathSync(settingsFile) : settingsFile;
    writeTextFileAtomically(writeTarget, `${JSON.stringify(updated, null, 2)}\n`);
  } catch (error) {
    return { client: "vscode", status: "failed", detail: String(error instanceof Error ? error.message : error) };
  }
  return { client: "vscode", status: "registered", detail: collapseHome(settingsFile) };
}

/**
 * @param {string} pluginRoot absolute plugin root
 * @param {string} pluginName manifest name
 * @returns {{ client: string, status: string, detail: string }} outcome row
 */
function registerCursorPlugin(pluginRoot, pluginName) {
  const cursorDir = path.join(resolveHookHomeDir(), ".cursor");
  if (!existsSync(cursorDir)) {
    return { client: "cursor", status: "absent", detail: "no ~/.cursor directory found" };
  }

  try {
    const { status, target, reason } = linkCursorLocalPlugin(
      resolveCursorLocalPluginsDir(resolveHookHomeDir()),
      pluginRoot,
      pluginName,
    );
    if (status === "occupied") {
      return { client: "cursor", status: "manual", detail: `${collapseHome(target)} exists and is not a symlink` };
    }
    if (status === "unsupported") {
      // Windows without Developer Mode is the common case. Say what to do instead of
      // leaking a bare EPERM, and leave the other clients registered.
      return {
        client: "cursor",
        status: "manual",
        detail: `cannot link ${collapseHome(target)} (${reason}); link it to ${pluginRoot} manually, or enable Developer Mode on Windows`,
      };
    }
    return {
      client: "cursor",
      status: status === "current" ? "current" : "registered",
      detail: collapseHome(target),
    };
  } catch (error) {
    return { client: "cursor", status: "failed", detail: String(error instanceof Error ? error.message : error) };
  }
}

/**
 * @param {string} pluginRoot absolute plugin root
 * @param {string} pluginName manifest name
 * @returns {{ client: string, status: string, detail: string }} outcome row
 */
function registerCopilotPlugin(pluginRoot, pluginName) {
  const listed = spawnPluginClientSync("copilot", ["plugins", "list", "--scope", "user", "--kind", "plugin", "--json"]);
  if (listed.error) {
    return { client: "copilot", status: "absent", detail: "copilot CLI not found on PATH" };
  }
  if (listed.status !== 0) {
    const detail = String(listed.stderr || listed.stdout || `exit ${listed.status}`).trim();
    return {
      client: "copilot",
      status: "manual",
      detail: `could not verify installed plugins: ${detail.split("\n")[0]}`,
    };
  }

  const records = parseCopilotPluginRecords(listed.stdout);
  if (!records) {
    return { client: "copilot", status: "manual", detail: "could not parse installed plugin records" };
  }

  const existing = records.find((record) => record.name === pluginName && (!record.kind || record.kind === "plugin"));
  if (existing) {
    const source = copilotPluginSourcePath(existing) || installedCopilotPluginSourcePath(pluginName);
    if (!source) {
      return { client: "copilot", status: "manual", detail: "could not verify the installed plugin source" };
    }
    if (sameResolvedPath(source, pluginRoot)) {
      return { client: "copilot", status: "current", detail: collapseHome(pluginRoot) };
    }
  }

  const installed = spawnPluginClientSync("copilot", ["plugin", "install", pluginRoot]);
  if (installed.status !== 0) {
    const detail = String(installed.stderr || installed.stdout || `exit ${installed.status}`).trim();
    return { client: "copilot", status: "failed", detail: detail.split("\n")[0] };
  }
  return { client: "copilot", status: "registered", detail: "copilot plugin install" };
}

/** @param {unknown} output @returns {Record<string, any>[] | null} */
function parseCopilotPluginRecords(output) {
  try {
    const parsed = JSON.parse(String(output));
    const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.plugins) ? parsed.plugins : parsed?.items;
    return Array.isArray(records) && records.every((record) => record && typeof record === "object") ? records : null;
  } catch {
    return null;
  }
}

/** @param {string} pluginName @returns {string | null} */
function installedCopilotPluginSourcePath(pluginName) {
  const configDir = process.env.COPILOT_HOME || path.join(resolveHookHomeDir(), ".copilot");
  try {
    const config = JSON.parse(readFileSync(path.join(configDir, "config.json"), "utf8"));
    const record = Array.isArray(config.installedPlugins)
      ? config.installedPlugins.find((candidate) => candidate?.name === pluginName)
      : null;
    return record ? copilotPluginSourcePath(record) : null;
  } catch {
    return null;
  }
}

/** @param {Record<string, any>} record @returns {string | null} */
function copilotPluginSourcePath(record) {
  const candidates = [
    record.sourcePath,
    record.source_path,
    record.pluginRoot,
    record.plugin_root,
    record.path,
    record.source?.path,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    if (candidate.startsWith("file:")) {
      try {
        return fileURLToPath(candidate);
      } catch {
        continue;
      }
    }
    if (path.isAbsolute(candidate)) return candidate;
  }
  return null;
}

/** @param {string} left @param {string} right @returns {boolean} */
function sameResolvedPath(left, right) {
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return path.resolve(left) === path.resolve(right);
  }
}

export function resolveHookHomeDir(env = process.env, fallback = os.homedir()) {
  return env.HOME || fallback;
}

export function resolveCopilotHookDir(env = process.env, homeDir = resolveHookHomeDir(env)) {
  return path.join(env.COPILOT_HOME || path.join(homeDir, ".copilot"), "hooks");
}

export function createCopilotCliAmbientContextScript(command = "atelier-axi") {
  return [
    'const { spawnSync } = require("node:child_process");',
    `const command = ${JSON.stringify(command)};`,
    'const result = spawnSync(command, [], { encoding: "utf8", shell: true });',
    'const detail = result.error ? result.error.message : (result.stderr || result.stdout || "exit " + (result.status ?? "unknown"));',
    "const text = String(result.status === 0 ? result.stdout : detail).trim();",
    'if (!text) { console.log("{}"); process.exit(0); }',
    'const prefix = result.status === 0 ? "## AXI ambient context: atelier-axi\\n" : "## AXI ambient context: atelier-axi\\nerror: atelier-axi ambient context failed: ";',
    "console.log(JSON.stringify({ additionalContext: prefix + text }));",
  ].join(" ");
}

export function createCopilotCliSessionStartHook(command = "atelier-axi", timeoutSec = 10) {
  const script = createCopilotCliAmbientContextScript(command);
  return {
    type: "command",
    bash: `node -e ${quoteForPosixShell(script)}`,
    powershell: `node -e ${quoteForPowerShell(script)}`,
    timeoutSec,
  };
}

export function computeCopilotCliHookUpdate(settings, hook = createCopilotCliSessionStartHook()) {
  const updated = structuredClone(settings && typeof settings === "object" ? settings : {});
  let changed = false;

  if (updated.version !== 1) {
    updated.version = 1;
    changed = true;
  }
  if (!updated.hooks || typeof updated.hooks !== "object" || Array.isArray(updated.hooks)) {
    updated.hooks = {};
    changed = true;
  }

  const current = Array.isArray(updated.hooks.sessionStart) ? updated.hooks.sessionStart : [];
  const unmanaged = current.filter((entry) => !isManagedCopilotCliHook(entry));
  const next = [...unmanaged, hook];

  if (!deepEqual(current, next)) {
    updated.hooks.sessionStart = next;
    changed = true;
  }

  return [changed ? updated : settings, changed];
}

export function installCopilotCliSessionStartHook({
  hookDir = resolveCopilotHookDir(),
  command = "atelier-axi",
  timeoutSec = 10,
  onError = undefined,
} = {}) {
  const target = path.join(hookDir, "atelier-axi.json");
  try {
    mkdirSync(path.dirname(target), { recursive: true });
    const current = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : {};
    const [updated, changed] = computeCopilotCliHookUpdate(
      current,
      createCopilotCliSessionStartHook(command, timeoutSec),
    );
    if (changed) {
      writeFileSync(target, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onError?.(`${target}: ${message}`);
  }
}

function isManagedCopilotCliHook(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    (typeof entry.bash === "string" || typeof entry.powershell === "string" || typeof entry.command === "string") &&
    [entry.bash, entry.powershell, entry.command].some(
      (value) => typeof value === "string" && value.includes("atelier-axi"),
    )
  );
}

function quoteForPosixShell(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function quoteForPowerShell(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function serverCommand(args) {
  assertKnownFlags(args, { command: "server", valueFlags: ["--port"], booleanFlags: ["--verbose", "--no-open"] });
  const port = Number(flagValue(args, "--port") || defaultPort());
  const debug = args.includes("--verbose") || process.env.ATELIER_AXI_DEBUG === "1";
  const server = await serve({ port, stateFile: stateFile(), version: VERSION, debug });
  await server.done;
  return "";
}

async function visibleSessions() {
  const store = new SessionStore(stateFile());
  return (await store.listSessions()).filter((session) => session.status !== "ended");
}

async function assertHtmlFile(file) {
  if (!isHtmlPath(file)) {
    throw new AxiError("Atelier Editor expects an HTML file", "VALIDATION_ERROR", ["Run `atelier-axi <html-file>`"]);
  }
  try {
    await access(file);
  } catch {
    throw new AxiError(`File not found: ${file}`, "NOT_FOUND", [
      "Create the HTML artifact first, then run `atelier-axi <html-file>`",
    ]);
  }
}

function isHtmlPath(file) {
  return file.toLowerCase().endsWith(".html") || file.toLowerCase().endsWith(".htm");
}

async function ensureServer({ forceRestart = false } = {}) {
  const port = defaultPort();
  const baseUrl = `http://${hostForUrl(clientHost())}:${port}`;
  const existing = await fetchHealth(baseUrl);
  if (existing && !shouldRestartServer(VERSION, existing, forceRestart)) {
    return baseUrl;
  }
  if (existing) {
    if (!(await canControlServerOnPort(port, existing, processOnPortMatchesAtelier))) {
      throw new AxiError(`Port ${port} is occupied by a non-Atelier server`, "SERVER_ERROR", [
        `Stop the process using port ${port}, or set ATELIER_AXI_PORT to another port`,
      ]);
    }
    // Stale server from an older release is squatting on the port. Ask it to shut down
    // gracefully so the upgraded client doesn't keep handing users an old chrome.
    await requestShutdown(baseUrl);
    const freed = await waitForPortFree(baseUrl, 2000);
    if (!freed) {
      // Pre-handshake servers (any release older than this change) don't expose /shutdown
      // so the POST 404'd. Fall back to SIGTERM by PID so the very first upgrade still
      // works, then keep waiting.
      if (shouldKillProcessOnPort(VERSION, existing)) {
        killProcessOnPort(port);
        await waitForPortFree(baseUrl, 3000);
      }
    }
  }
  await startServer(port);
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const health = await fetchHealth(baseUrl);
    if (health && !shouldRestartServer(VERSION, health)) {
      return baseUrl;
    }
    await delay(100);
  }
  throw new AxiError("Atelier Editor server did not start", "SERVER_ERROR", [
    `Run \`atelier-axi server --port ${port}\` to inspect server startup`,
  ]);
}

// Pure helper so the upgrade-detection logic is unit-testable without spinning up HTTP.
// Returns true when the running server is a different (or pre-handshake) version than
// what this CLI was built with - i.e. the user just upgraded and the stale server needs
// to step aside.
export function shouldRestartServer(currentVersion, healthBody, forceRestart = false) {
  if (!healthBody || typeof healthBody !== "object") return false;
  if (forceRestart && healthBody.app === "atelier-axi") return true;
  if (typeof healthBody.version !== "string" || healthBody.version === "") return true;
  return healthBody.version !== currentVersion;
}

export function shouldForceRestartForLocalBuild(executablePath, sourceServerExists = localSourceServerExists()) {
  const localBuildEntry = fileURLToPath(new URL("../dist/cli.mjs", import.meta.url));
  return sourceServerExists && path.resolve(executablePath) === path.resolve(localBuildEntry);
}

function localSourceServerExists() {
  return existsSync(fileURLToPath(new URL("../src/server.js", import.meta.url)));
}

export function shouldKillProcessOnPort(currentVersion, healthBody) {
  if (!healthBody || typeof healthBody !== "object") return false;
  if (typeof healthBody.version !== "string" || healthBody.version === "") return true;
  if (healthBody.app !== "atelier-axi") return false;
  return healthBody.version !== currentVersion;
}

async function canControlServerOnPort(port, healthBody, processMatchesAtelier) {
  if (!healthBody || typeof healthBody !== "object") return false;
  if (healthBody.app === "atelier-axi") return true;
  if (typeof healthBody.version === "string" && healthBody.version !== "") return false;
  return processMatchesAtelier(port);
}

async function fetchHealth(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function requestShutdown(baseUrl) {
  try {
    await fetch(`${baseUrl}/shutdown`, { method: "POST" });
  } catch {
    // Best effort. If the server died before answering, the port will free up on its own.
  }
}

async function waitForPortFree(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await fetchHealth(baseUrl))) return true;
    await delay(100);
  }
  return false;
}

// Last-resort fallback for the bootstrap upgrade case: a pre-handshake server is squatting
// on the port and doesn't expose /shutdown, so we resolve its PID via lsof and SIGTERM it.
// macOS/Linux only - Windows users would need to kill manually, but atelier-axi isn't
// shipped for Windows today.
function killProcessOnPort(port) {
  try {
    const result = spawnSync("lsof", ["-t", `-iTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
    if (result.status !== 0) return;
    for (const line of result.stdout.split("\n")) {
      const pid = Number(line.trim());
      if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          // Process already gone or permission denied - either way nothing we can do.
        }
      }
    }
  } catch {
    // lsof missing or unsupported platform - the outer caller will surface SERVER_ERROR.
  }
}

function processOnPortMatchesAtelier(port) {
  try {
    const pids = spawnSync("lsof", ["-t", `-iTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
    if (pids.status !== 0) return false;
    for (const line of pids.stdout.split("\n")) {
      const pid = Number(line.trim());
      if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) continue;
      const command = spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });
      if (command.status === 0 && /atelier-axi/.test(command.stdout)) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

async function startServer(port) {
  await ensureStateDir();
  const entry = resolveServerEntry();
  let logFd = null;
  try {
    logFd = openSync(serverLogFile(), "a");
  } catch {
    // If logging cannot be initialized, keep the server behavior unchanged.
  }
  try {
    const child = spawn(process.execPath, [entry, "server", "--port", String(port)], createServerSpawnOptions(logFd));
    child.unref();
  } finally {
    if (logFd !== null) closeSync(logFd);
  }
}

// The detached server child must point at a node-executable entry that actually invokes
// run(). In source layout that's `../bin/atelier-axi.js` (which calls run on import). In the
// published bundle, only `dist/cli.mjs` ships and it self-invokes via the bundled bin
// wrapper. Pick whichever exists.
export function resolveServerEntry() {
  const binEntry = fileURLToPath(new URL("../bin/atelier-axi.js", import.meta.url));
  if (existsSync(binEntry)) return binEntry;
  return fileURLToPath(import.meta.url);
}

/**
 * @param {number | null} logFd
 * @returns {import("node:child_process").SpawnOptions}
 */
export function createServerSpawnOptions(logFd = null) {
  const stdio = /** @type {import("node:child_process").StdioOptions} */ (
    logFd === null ? "ignore" : ["ignore", logFd, logFd]
  );
  return {
    detached: true,
    stdio,
    env: { ...process.env, ATELIER_AXI_NO_OPEN: "1" },
  };
}

export async function fetchJson(url, { retries = 0, retryDelayMs = 250 } = {}) {
  let response;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      response = await fetch(url);
      break;
    } catch (error) {
      if (error instanceof AxiError) throw error;
      if (attempt >= retries) throw serverConnectionError();
      await delay(retryDelayMs);
    }
  }

  if (!response) throw serverConnectionError();
  if (!response.ok) {
    throw new AxiError(`Atelier Editor request failed: ${response.status}`, "SERVER_ERROR");
  }
  try {
    return await response.json();
  } catch {
    throw pollResponseInterruptedError();
  }
}

async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw serverConnectionError();
  }
  if (!response.ok) {
    throw new AxiError(`Atelier Editor request failed: ${response.status}`, "SERVER_ERROR");
  }
  return response.json();
}

function serverConnectionError() {
  return new AxiError("Atelier Editor server connection failed", "SERVER_ERROR", [
    "Run `atelier-axi server --verbose` or inspect `~/.atelier-axi/server.log` (`ATELIER_AXI_STATE_DIR/server.log` when set) for server startup or crash diagnostics",
    "Re-run the last `atelier-axi poll <html-file>` command after the server is healthy",
  ]);
}

function pollResponseInterruptedError() {
  return new AxiError("Atelier Editor poll response was interrupted", "SERVER_ERROR", [
    "Run `atelier-axi server --verbose` or inspect `~/.atelier-axi/server.log` (`ATELIER_AXI_STATE_DIR/server.log` when set) for server startup or crash diagnostics",
    "Re-run the last `atelier-axi poll <html-file>` command after the server is healthy",
  ]);
}

// Fail loudly on an unrecognized flag instead of silently ignoring it (AXI principle 6). The
// lenient `firstPositionalArg`/`flagValue` parsers below skip anything they don't recognize, so a
// typo like `share --pasword x` would otherwise drop the flag and publish a PUBLIC page when the
// user meant private. Value tokens (the argument after a space-separated value flag, or a value
// that itself begins with `-`) are not treated as flags, and everything after a `--` separator is
// positional.
export function assertKnownFlags(args, { command, valueFlags = [], booleanFlags = [] }) {
  const valueSet = new Set(valueFlags);
  const allowed = new Set([...valueFlags, ...booleanFlags]);
  let positionalMode = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!positionalMode && arg === "--") {
      positionalMode = true;
      continue;
    }
    if (positionalMode || arg === "-" || !arg.startsWith("-")) {
      continue;
    }
    const name = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (!allowed.has(name)) {
      const suggestion = allowed.size
        ? `Supported flags for \`${command}\`: ${[...allowed].join(", ")}`
        : `\`${command}\` takes no flags`;
      throw new AxiError(`Unknown flag: ${name}`, "VALIDATION_ERROR", [suggestion]);
    }
    if (valueSet.has(name) && !arg.includes("=")) {
      // Skip the value token so a value that begins with `-` isn't mistaken for a flag.
      i += 1;
    }
  }
}

// Default byte cap for the DOM snapshot returned in poll output; override with
// ATELIER_AXI_POLL_SNAPSHOT_MAX_BYTES. Large snapshots are the biggest single token cost in a
// poll response, so truncate by default (AXI principle 3) and offer `--full` to bypass.
const DEFAULT_POLL_SNAPSHOT_MAX_BYTES = 16000;

export function pollSnapshotMaxBytes(env = process.env) {
  const raw = Number(env.ATELIER_AXI_POLL_SNAPSHOT_MAX_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_POLL_SNAPSHOT_MAX_BYTES;
}

// Truncate a DOM snapshot to a byte cap, leaving a size hint that points the agent at `--full`.
// Passing `full: true` (or a snapshot already within the cap) returns it untouched with no
// truncation metadata, so small artifacts and explicit opt-ins are byte-identical.
/**
 * @param {string} snapshot
 * @param {{ file?: string, full?: boolean, maxBytes?: number }} [options]
 * @returns {{ dom_snapshot: string, dom_snapshot_truncated?: boolean, dom_snapshot_bytes?: number, dom_snapshot_hint?: string }}
 */
export function truncateDomSnapshot(snapshot, { file, full = false, maxBytes = pollSnapshotMaxBytes() } = {}) {
  const text = String(snapshot || "");
  const bytes = Buffer.byteLength(text, "utf8");
  if (full || bytes <= maxBytes) {
    return { dom_snapshot: text };
  }
  // Slice on a byte boundary but never mid-codepoint: Buffer#toString drops a trailing partial
  // UTF-8 sequence rather than emitting a replacement character.
  const kept = Buffer.from(text, "utf8").subarray(0, maxBytes).toString("utf8");
  return {
    dom_snapshot: kept,
    dom_snapshot_truncated: true,
    dom_snapshot_bytes: bytes,
    dom_snapshot_hint: `DOM snapshot truncated to ${Buffer.byteLength(kept, "utf8")} of ${bytes} bytes. Re-run \`atelier-axi poll ${file} --full\` for the complete snapshot.`,
  };
}

function firstPositionalArg(args, valueFlags = []) {
  const flags = new Set(valueFlags);
  let positionalMode = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!positionalMode && arg === "--") {
      positionalMode = true;
      continue;
    }
    if (!positionalMode && isValueFlagToken(arg, flags)) {
      if (!arg.includes("=")) i += 1;
      continue;
    }
    if (!positionalMode && arg.startsWith("-")) {
      continue;
    }
    return arg;
  }
  return null;
}

function flagValue(args, flag) {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--") return null;
    if (arg === flag) return args[i + 1] || null;
    if (arg.startsWith(`${flag}=`)) return arg.slice(flag.length + 1) || null;
  }
  return null;
}

function optionalFlagString(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || undefined;
}

function isValueFlagToken(arg, flags) {
  for (const flag of flags) {
    if (arg === flag || arg.startsWith(`${flag}=`)) return true;
  }
  return false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCommandHelp(command, { agent = "generic" } = {}) {
  return createCommandHelp({ agent })[command] || null;
}

function createTopLevelHelp({ agent = "generic" } = {}) {
  return `atelier-axi - Atelier Editor AXI\n\nUsage:\n  atelier-axi\n  atelier-axi <html-file> [--no-open] [--no-gate] [--reopen]\n  atelier-axi poll <html-file> [--agent-reply "..."]\n  atelier-axi end <html-file>\n  atelier-axi export <html-file> [--out <path>]\n  atelier-axi share <html-file> [--password <pw>] [--token <t>]\n  atelier-axi stop\n  atelier-axi playbook [playbook_id]\n  atelier-axi design\n  atelier-axi setup hooks\n  atelier-axi setup plugin\n  atelier-axi update [--check]\n\n${DESIGN_SYSTEM_HINT}\n\nNote: poll long-polls indefinitely by default until the user sends feedback or ends the session, staying silent while it waits - never kill it. Layout issues the browser detects are passive: they collect in the user's Layout issues inbox in the Atelier top bar and reach the agent only when the user selects them and queues the fixes, as an ordinary tag "layout-warnings" prompt. Do not pass --timeout-ms during normal agent use; it is for tests and debugging only. ${pollExecutionGuidance({ agent })} ${POLL_SEND_AND_END_RULE}\n\n`;
}

function createCommandHelp({ agent = "generic" } = {}) {
  return {
    open: `Usage: atelier-axi <html-file> [--no-open] [--no-gate] [--reopen]\n\nOpen or resume a Atelier Editor review session for an HTML artifact. Use --no-open when you need to ensure the server/session exists without opening another browser window. Use --no-gate to skip the open-time layout curtain for this browser open. If the user explicitly ended the session from the browser, this refuses to reopen it and returns guidance instead - pass --reopen to force it open when the user asks for further review or something important needs their visual attention. Sessions ended by the agent (\`atelier-axi end\`) reopen normally without the flag.\n`,
    poll: `Usage: atelier-axi poll <html-file> [--agent-reply "..."] [--full]\n\nThis command long-polls indefinitely for queued user prompts. It stays silent while it waits - that is normal, never kill it. Browser-detected layout issues do NOT return this poll: they are filed passively in the user's Layout issues inbox and arrive as an ordinary tag "layout-warnings" prompt only after the user selects them and queues the fixes. Warning lifecycle: an issue stays unresolved and counted while queued, becomes recurring if a newer artifact revision still shows it, and is resolved only after a newer artifact load plus a complete diagnostic pass at the same viewport no longer detects it. A failed or incomplete pass preserves it as unverified rather than clearing it. The only response that arrives without user action is artifact_failures - a fatal failure that made the review surface itself unusable. Do not pass --timeout-ms during normal agent use; it is for tests and debugging only. ${pollExecutionGuidance({ agent })} Use --agent-reply after applying prior feedback to display your response in Atelier Editor before waiting again. The returned dom_snapshot is truncated by default with a size hint (override the byte cap with ATELIER_AXI_POLL_SNAPSHOT_MAX_BYTES); pass --full to receive the complete DOM snapshot. ${POLL_SEND_AND_END_RULE}\n`,
    end: `Usage: atelier-axi end <html-file>\n\nEnd a Atelier Editor session as the agent. A session ended this way still reopens normally on the next \`atelier-axi <html-file>\`, unlike a user ending it from the browser, which requires --reopen. End sessions before deleting their artifacts; run \`atelier-axi\` with no arguments and see the wrap-up entry in its help for the full procedure, including recovery when the file is already gone.\n`,
    export: `Usage: atelier-axi export <html-file> [--out <path>]\n\nWrite a portable copy of an artifact: one HTML file with its LOCAL assets inlined (relative-path stylesheets, scripts, images, and fonts become inline <style>/<script> blocks and data URIs). Remote CDN/font references (https URLs) are left as links for the browser to load, so the file needs network to render those. Atelier makes no outbound requests - it only reads local files, confined to the artifact's directory. Defaults to writing <name>.export.html next to the source; pass --out to choose a path. The Atelier annotation SDK is never included in an export.\n`,
    share: `Usage: atelier-axi share <html-file> [--password <pw>] [--token <t>]\n\nPublish the artifact on ht-ml.app (https://ht-ml.app), a third-party hosting service not part of Atelier, and print a visitable URL. Shares are PUBLIC by default: anyone with the link can open the page, and it may be indexed or scraped. Pass --password to publish a PRIVATE password-protected page; viewers must supply the password to view. Builds the same local-inlined HTML as 'export' (local assets inlined; remote CDN/font URLs left as links and are not blocked by CSP on ht-ml.app, but still load over the viewer's network), then POSTs it to ht-ml.app's /v1 API. Creating a site needs no account or API key. The response includes the url plus a secret update_key (shown once) for updating or deleting the page later. Set ATELIER_AXI_HTML_APP_TOKEN (or pass --token) to attach an optional bearer token; it is never required. The annotation SDK is never included.\n`,
    stop: `Usage: atelier-axi stop [--port <port>]\n\nShut down the background Atelier Editor server. The server also stops itself when no browser or poll has been connected for a while (ATELIER_AXI_IDLE_TIMEOUT_MS, default 30m) and immediately when the last session ends with nothing connected.\n`,
    playbook: `Usage: atelier-axi playbook [playbook_id]\n\nList focused artifact guidance playbooks, or show one playbook by ID. Known IDs: diagram, table, comparison, plan, code, input, slides.\n\n${PLAYBOOK_ROUTER_HELP}\n\nExamples:\n  atelier-axi playbook\n  atelier-axi playbook diagram\n  atelier-axi playbook input\n`,
    design: `Usage: atelier-axi design\n\nShow a copy-pasteable CDN snippet for Tailwind CSS browser runtime v4 + DaisyUI v5 + themes, Mermaid diagram tooling, a content-to-playbook router, an optional layout safety CSS snippet, plus technical reference for DaisyUI components. ${PLAYBOOK_ROUTER_HELP} Atelier artifacts stay portable HTML. This CDN snippet is the design fallback, not the default: inspect the subject project before falling back, and paste the layout safety CSS only when useful for dense nested grid/flex layouts, badges, wide fonts, or local media. The strict priority order is: (1) if the user asked for a specific look or named design system, follow that; (2) otherwise, match the design system of the project the artifact is about, not necessarily your current working directory. If the artifact previews, proposes, or mocks a specific app's UI, use that app's own design system; (3) only when both come up empty, prefer the Atelier-recommended Tailwind + DaisyUI CDN snippet over hand-writing styles unless explicitly instructed otherwise by the user.\n`,
    setup: `Usage: atelier-axi setup hooks\n       atelier-axi setup plugin\n\nhooks: install or repair agent SessionStart hooks for atelier-axi ambient context in Claude Code, Codex, OpenCode, and GitHub Copilot CLI. Restart your agent session afterward to receive the context. This is the primary integration - it carries live session state.\n\nplugin: register the installed atelier-axi package as an Agent Plugin (agent-plugins.org) in VS Code, Cursor, and GitHub Copilot CLI. The installed package directory is itself the plugin root, so nothing is downloaded and no marketplace is involved. Reload each client afterward. Codex users should use \`setup hooks\` instead.\n\nBoth actions are explicit opt-in, idempotent, and repair a stale path after a reinstall.\n`,
    update: `Usage: atelier-axi update [--check]\n\nUpgrade atelier-axi to the latest published npm version, then refresh the installed atelier agent skill through the skills CLI it was installed with (\`npx -y skills update --yes ${ATELIER_SKILL_NAME}\`). The skill installs separately from the npm package, so a plain package upgrade never refreshes it. Pass --check (or --dry-run) to report current vs latest and exit without installing or touching the skill. The skill refresh is best-effort: if the skills CLI is unavailable it prints manual-recovery guidance rather than failing the update.\n`,
    server: `Usage: atelier-axi server [--port 4387] [--verbose]\n\nRun the local Atelier Editor server. Pass --verbose (or set ATELIER_AXI_DEBUG=1) to log session and watcher events to stderr. Detached server output is appended to ~/.atelier-axi/server.log, or ATELIER_AXI_STATE_DIR/server.log when set, for startup and crash diagnostics.\n\nATELIER_AXI_HOST sets the bind address (default 127.0.0.1; a wildcard 0.0.0.0 or :: binds every interface). Binding beyond loopback exposes an unauthenticated server that can read and serve arbitrary local files to anything that can reach it, so only do so on a trusted network. ATELIER_AXI_LINK_HOST sets the hostname written into generated session links (default: the bind address, or loopback when bound to a wildcard). See README's Allowed hosts section for Host allowlisting and ATELIER_AXI_ALLOWED_HOSTS. ATELIER_AXI_NO_OPEN=1 (or --no-open) suppresses the local browser launch.\n`,
  };
}

export { createDesignOutput };
