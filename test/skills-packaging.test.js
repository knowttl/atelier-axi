import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("published package includes the planning and execution skills", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));

  assert.ok(packageJson.files.includes("skills/lavish-plan"), "ships skills/lavish-plan");
  assert.ok(packageJson.files.includes("skills/lavish-implement"), "ships skills/lavish-implement");
});

test("lavish-plan skill exists with its reference files and driver anchors", async () => {
  assert.ok(existsSync(new URL("skills/lavish-plan/SKILL.md", root)));
  assert.ok(existsSync(new URL("skills/lavish-plan/plan-template.md", root)));
  assert.ok(existsSync(new URL("skills/lavish-plan/review-rubrics.md", root)));

  const skill = await readFile(new URL("skills/lavish-plan/SKILL.md", root), "utf8");
  assert.match(skill, /^name: lavish-plan$/m);
  assert.ok(skill.includes("lavish-axi playbook plan"), "opens the enriched plan playbook");
  assert.ok(skill.includes("lavish-implement"), "hands off to the execution skill");
});

test("lavish-implement skill exists and is independently triggerable", async () => {
  assert.ok(existsSync(new URL("skills/lavish-implement/SKILL.md", root)));

  const skill = await readFile(new URL("skills/lavish-implement/SKILL.md", root), "utf8");
  assert.match(skill, /^name: lavish-implement$/m);
  assert.ok(skill.includes("plan.md"), "executes a plan.md");
  assert.ok(skill.includes("fresh subagent per task") || skill.includes("FRESH implementer subagent"));
});
