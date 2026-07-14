# Review rubrics for planning-mode subagent reviewers

Dispatch each reviewer as a FRESH subagent. Give it only the inputs listed and the matching
rubric below. Fix the findings, then re-dispatch. After 3 rounds without a clean pass, stop and
surface the remaining findings to the user.

## Calibration (both reviewers)

Only flag issues that would cause real problems during planning or implementation — a missing
requirement, an internal contradiction, a requirement ambiguous enough to build the wrong
thing, a placeholder, or a task too vague to act on. Minor wording, stylistic preferences, and
"nice to have" suggestions are NOT issues. Approve unless there are serious gaps.

## Output format (both reviewers)

Return exactly:

- **Status:** `Approved` | `Issues Found`
- **Issues (if any):** one line each — `[<location>] <specific issue> — <why it matters for
planning/implementation>`, ordered most to least severe.
- **Recommendations (advisory, do not block approval):** optional improvement suggestions.

## Spec rubric (Phase 5, large route)

Inputs to pass: the `spec.md` text and the confirmed decisions from the atelier review.
Check:

1. **Completeness** — every confirmed decision and component is specified; no gap between the
   review surface and the spec.
2. **Internal consistency** — sections do not contradict each other; architecture matches the
   component descriptions.
3. **Ambiguity** — no requirement can be read two ways; each is concrete.
4. **Scope / decomposition** — focused enough for one implementation plan; flag if it should
   be split.
5. **YAGNI** — nothing specified beyond what the feature needs.
6. **Edge-case coverage** — failure modes, empty/error states, and the degradation paths are
   all addressed.

## Plan rubric (Phase 6)

Inputs to pass: the `plan.md`, plus the `spec.md` (large route) or the confirmed decisions from
the atelier review (small route, no `spec.md`). Treat that spec / decision set as the reference
the plan must stay consistent with.
Check:

1. **Spec↔plan consistency (two-way)** — forward: every spec requirement (or, on the small route
   with no `spec.md`, every confirmed decision from the review) maps to at least one plan task;
   backward: no plan task contradicts, silently drops, or invents scope beyond the spec /
   confirmed decisions. List gaps in BOTH directions.
2. **Project fit** — tasks follow the target project's conventions, commands, and file layout.
3. **No placeholders** — no "TBD", "add error handling", "similar to Task N", or code steps
   missing their code.
4. **Type/signature consistency** — names and signatures used in later tasks match earlier
   definitions.
5. **Bite-sized E2E-verification structure** — each task is implement → verify end-to-end
   against real user-expected behavior → commit, with exact paths and complete code.
6. **Independently testable** — each task ends with a deliverable a fresh reviewer could gate.
7. **Buildability** — could an engineer with zero context follow this plan end to end without
   getting stuck? Flag any step that assumes unstated knowledge.
