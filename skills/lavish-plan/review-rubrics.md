# Review rubrics for lavish-plan subagent reviewers

Dispatch each reviewer as a FRESH subagent. Give it only the inputs listed and instruct it to
return findings as a ranked list — `[blocker|major|minor] <location> — <issue> — Fix: <fix>` —
plus a one-line verdict. Fix findings, then re-dispatch. After 3 rounds without a clean pass,
stop and surface the remaining findings to the user.

## Spec rubric (Phase 5, large route)

Inputs to pass: the `spec.md` text and the confirmed decisions from the lavish review.
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

Inputs to pass: the `spec.md` (if any) and the `plan.md`.
Check:

1. **Spec↔plan coverage** — every spec requirement maps to at least one plan task; list gaps.
2. **Project fit** — tasks follow the target project's conventions, commands, and file layout.
3. **No placeholders** — no "TBD", "add error handling", "similar to Task N", or code steps
   missing their code.
4. **Type/signature consistency** — names and signatures used in later tasks match earlier
   definitions.
5. **Bite-sized TDD structure** — each task is failing test → run fail → minimal impl → run
   pass → commit, with exact paths and complete code.
6. **Independently testable** — each task ends with a deliverable a fresh reviewer could gate.
