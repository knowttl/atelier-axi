import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("published package ships the single atelier skill with its planning + implementation reference files", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));

  assert.ok(packageJson.files.includes("skills/atelier"), "ships skills/atelier");
  // The plan/implement skills were folded into skills/atelier as reference files - no separate dirs.
  assert.ok(!packageJson.files.includes("skills/atelier-plan"), "no separate atelier-plan skill dir");
  assert.ok(!packageJson.files.includes("skills/atelier-implement"), "no separate atelier-implement skill dir");
});

test("the two former skills no longer exist as standalone, separately-triggerable skills", () => {
  assert.ok(!existsSync(new URL("skills/atelier-plan", root)), "atelier-plan skill dir removed");
  assert.ok(!existsSync(new URL("skills/atelier-implement", root)), "atelier-implement skill dir removed");
});

test("atelier skill carries planning + implementing reference files and their shared assets", () => {
  assert.ok(existsSync(new URL("skills/atelier/SKILL.md", root)));
  assert.ok(existsSync(new URL("skills/atelier/planning.md", root)));
  assert.ok(existsSync(new URL("skills/atelier/implementing.md", root)));
  assert.ok(existsSync(new URL("skills/atelier/plan-template.md", root)));
  assert.ok(existsSync(new URL("skills/atelier/review-rubrics.md", root)));
});

test("SKILL.md routes to the planning + implementing modes and names the docs/atelier output home", async () => {
  const skill = await readFile(new URL("skills/atelier/SKILL.md", root), "utf8");

  assert.match(skill, /^name: atelier$/m, "single skill named atelier");
  assert.ok(skill.includes("Choose your mode"), "has a mode-routing section");
  assert.ok(skill.includes("planning.md"), "routes planning intent to planning.md");
  assert.ok(skill.includes("implementing.md"), "routes execution intent to implementing.md");
  assert.ok(
    skill.includes("docs/atelier/<YYYY-MM-DD>-<type>-<topic>/"),
    "carries the docs/atelier output path on the funnel so spec/plan land there",
  );
  assert.ok(skill.includes("Headless mode"), "advertises the headless (no-browser) planning variant");
});

test("planning.md drives the visual planning arc and hands off to implementing.md", async () => {
  const skill = await readFile(new URL("skills/atelier/planning.md", root), "utf8");

  assert.ok(skill.includes("atelier-axi playbook plan"), "opens the enriched plan playbook");
  assert.ok(skill.includes("implementing.md"), "hands off to the execution flow, not a separate skill");
  assert.ok(!skill.includes("atelier-implement"), "no dangling reference to the removed skill name");
  assert.ok(
    skill.includes("end-to-end verification") || skill.includes("End-to-end verification"),
    "encodes E2E verification",
  );
  assert.ok(
    skill.includes("evidence over claims") || skill.includes("Evidence over claims"),
    "encodes the evidence-over-claims principle",
  );
  assert.ok(skill.includes("docs/atelier/<YYYY-MM-DD>-<type>-<topic>/"), "writes durable records under docs/atelier");
  assert.ok(skill.includes("Session teardown"), "documents how to tear down the review session");
  assert.ok(skill.includes("atelier-axi end"), "ends the atelier session on teardown");
  assert.ok(skill.includes("Commit the finished documents"), "commits the finished records properly");
});

test("planning.md offers a headless chat-only planning mode that keeps the durable output", async () => {
  const skill = await readFile(new URL("skills/atelier/planning.md", root), "utf8");

  assert.ok(skill.includes("Headless mode"), "documents a headless mode section");
  assert.ok(skill.includes("one numbered message"), "batches the intake questions instead of dripping them");
  assert.ok(skill.includes("EXPLICITLY approves"), "keeps the approve-the-design gate in chat");
  assert.ok(
    skill.includes("large route writes `spec.md` + `plan.md`") && skill.includes("plan.md` only"),
    "keeps spec+plan on large and plan-only on small in headless mode",
  );
});

test("implementing.md executes a plan.md task-by-task in an isolated worktree", async () => {
  const skill = await readFile(new URL("skills/atelier/implementing.md", root), "utf8");

  assert.ok(skill.includes("plan.md"), "executes a plan.md");
  assert.ok(skill.includes("fresh subagent per task") || skill.includes("FRESH implementer subagent"));
  assert.ok(skill.includes("Iron Law"), "enforces the end-to-end verification Iron Law");
  assert.ok(skill.includes("treehouse"), "acquires an isolated dev worktree via treehouse");
  assert.ok(skill.includes("git worktree"), "falls back to git worktree when treehouse is absent");
  assert.ok(
    skill.includes("evidence over claims") || skill.includes("Evidence over claims"),
    "requires evidence before declaring success",
  );
});
