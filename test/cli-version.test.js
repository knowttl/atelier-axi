import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { isVersionOnlyArgv, VERSION } from "../src/cli.js";

const execFileAsync = promisify(execFile);
const BIN = fileURLToPath(new URL("../bin/atelier-axi.js", import.meta.url));

// The version path is probed by agent harnesses, so keep its process startup comfortably fast.
const VERSION_BUDGET_MS = 500;

// Accepts any unexpected telemetry connection and never answers.
async function startBlackHoleTelemetry() {
  const sockets = new Set();
  const requests = [];
  const server = createServer((req) => {
    requests.push(req.url);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(undefined));
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    requests,
    host: `http://127.0.0.1:${port}`,
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test("isVersionOnlyArgv matches exactly the SDK's version-flag shapes", () => {
  for (const flag of ["--version", "-v", "-V"]) {
    assert.equal(isVersionOnlyArgv([flag]), true);
  }
  for (const argv of [[], ["--help"], ["open"], ["--version", "extra"], ["open", "--version"]]) {
    assert.equal(isVersionOnlyArgv(argv), false);
  }
});

test("--version prints the version fast and skips telemetry and state-dir init", async (t) => {
  const telemetry = await startBlackHoleTelemetry();
  const stateParent = await mkdtemp(path.join(tmpdir(), "atelier-version-"));
  const stateDir = path.join(stateParent, "state");
  t.after(async () => {
    await telemetry.close();
    await rm(stateParent, { recursive: true, force: true });
  });

  const env = {
    ...process.env,
    ATELIER_AXI_STATE_DIR: stateDir,
    ATELIER_AXI_TELEMETRY: "1",
    ATELIER_AXI_UMAMI_WEBSITE_ID: "version-fast-path-test",
    ATELIER_AXI_UMAMI_HOST: telemetry.host,
  };

  for (const flag of ["--version", "-v", "-V"]) {
    const startedAt = process.hrtime.bigint();
    const { stdout } = await execFileAsync(process.execPath, [BIN, flag], { env });
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    assert.equal(stdout, `${VERSION}\n`);
    assert.ok(
      elapsedMs < VERSION_BUDGET_MS,
      `\`${flag}\` took ${Math.round(elapsedMs)}ms, over the ${VERSION_BUDGET_MS}ms budget`,
    );
  }

  assert.deepEqual(telemetry.requests, []);
  assert.equal(existsSync(stateDir), false);
});

test("a non-version invocation still initializes state without sending telemetry", async (t) => {
  const telemetry = await startBlackHoleTelemetry();
  const stateParent = await mkdtemp(path.join(tmpdir(), "atelier-version-control-"));
  const stateDir = path.join(stateParent, "state");
  t.after(async () => {
    await telemetry.close();
    await rm(stateParent, { recursive: true, force: true });
  });

  await execFileAsync(process.execPath, [BIN, "design"], {
    env: {
      ...process.env,
      ATELIER_AXI_STATE_DIR: stateDir,
      ATELIER_AXI_TELEMETRY: "1",
      ATELIER_AXI_UMAMI_WEBSITE_ID: "version-fast-path-test",
      ATELIER_AXI_UMAMI_HOST: telemetry.host,
    },
  });

  assert.deepEqual(telemetry.requests, [], "Atelier does not send telemetry");
  assert.equal(existsSync(stateDir), true);
});
