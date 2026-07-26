import assert from "node:assert/strict";
import test from "node:test";

import {
  createWhiteboardPersistencePayload,
  findDuplicateElementIds,
  fitSavedSceneShapesToFreeText,
  fitShapesToFreeText,
  normalizeExcalidrawSceneTarget,
  planSavedSceneTextMetricsMigration,
  repairSavedSceneTextMetrics,
  sanitizeSceneLink,
  sceneIsImageFallback,
  summarizeSceneEdits,
  SUMMARY_MAX_LINE_CHARS,
} from "../src/whiteboard-core.js";

function rect(id, opts = {}) {
  return { id, type: "rectangle", x: 0, y: 0, width: 100, height: 40, ...opts };
}

function boundLabel(id, containerId, text) {
  return { id, type: "text", containerId, text, x: 10, y: 10, width: 80, height: 20 };
}

// ---------------------------------------------------------------------------
// sanitizeSceneLink
// ---------------------------------------------------------------------------

test("sanitizeSceneLink allows http(s) and mailto only", () => {
  assert.equal(sanitizeSceneLink("https://example.com/a?b=1"), "https://example.com/a?b=1");
  assert.equal(sanitizeSceneLink("http://localhost:3000"), "http://localhost:3000");
  assert.equal(sanitizeSceneLink("mailto:kun@example.com"), "mailto:kun@example.com");
});

test("sanitizeSceneLink rejects dangerous or unknown schemes", () => {
  assert.equal(sanitizeSceneLink("javascript:alert(1)"), "");
  assert.equal(sanitizeSceneLink("JAVASCRIPT:alert(1)"), "");
  assert.equal(sanitizeSceneLink("data:text/html,<script>1</script>"), "");
  assert.equal(sanitizeSceneLink("file:///etc/passwd"), "");
  assert.equal(sanitizeSceneLink("vbscript:x"), "");
  assert.equal(sanitizeSceneLink("relative/path"), "");
  assert.equal(sanitizeSceneLink(""), "");
  assert.equal(sanitizeSceneLink(null), "");
});

// ---------------------------------------------------------------------------
// sceneIsImageFallback
// ---------------------------------------------------------------------------

test("sceneIsImageFallback is true only for a non-empty all-image scene", () => {
  assert.equal(sceneIsImageFallback([{ id: "i1", type: "image" }]), true);
  assert.equal(sceneIsImageFallback([{ id: "i1", type: "image" }, rect("r1")]), false);
  assert.equal(sceneIsImageFallback([]), false);
  assert.equal(sceneIsImageFallback(null), false);
});

test("sceneIsImageFallback ignores deleted elements", () => {
  assert.equal(
    sceneIsImageFallback([
      { id: "i1", type: "image" },
      { ...rect("r1"), isDeleted: true },
    ]),
    true,
  );
});

// ---------------------------------------------------------------------------
// findDuplicateElementIds
// ---------------------------------------------------------------------------

test("findDuplicateElementIds finds repeated ids (parallel-edge upstream bug)", () => {
  assert.deepEqual(findDuplicateElementIds([rect("A"), rect("B"), rect("A")]), ["A"]);
  assert.deepEqual(findDuplicateElementIds([rect("A"), rect("B")]), []);
  assert.deepEqual(findDuplicateElementIds([]), []);
});

// ---------------------------------------------------------------------------
// repairSavedSceneTextMetrics
// ---------------------------------------------------------------------------

test("saved text repair only expands metrics", () => {
  const text = {
    id: "label",
    type: "text",
    x: 42,
    y: 17,
    width: 80,
    height: 20,
    text: "Edited label",
    originalText: "Edited label",
    containerId: "box",
    strokeColor: "#e03131",
    boundElements: [{ id: "arrow", type: "arrow" }],
    customData: { userEdit: true },
  };
  const { elements, repaired } = repairSavedSceneTextMetrics([text, rect("box")], {
    measure: () => ({ width: 118.5, height: 24 }),
  });
  assert.equal(repaired, 1);
  assert.deepEqual(elements[0], { ...text, width: 118.5, height: 24 });
  assert.strictEqual(elements[1].id, "box");
});

test("saved text migration defers without converter provenance", () => {
  assert.deepEqual(planSavedSceneTextMetricsMigration(1, false), {
    shouldMigrate: false,
    nextVersion: 1,
  });
  assert.deepEqual(planSavedSceneTextMetricsMigration(1, true), {
    shouldMigrate: true,
    nextVersion: 2,
  });
});

// ---------------------------------------------------------------------------
// fitShapesToFreeText
// ---------------------------------------------------------------------------

function freeText(id, opts = {}) {
  return { id, type: "text", x: 0, y: 0, width: 40, height: 20, text: "label", ...opts };
}

test("fitShapesToFreeText grows a shape whose free-standing label overflows it", () => {
  const shape = rect("entity", { x: 0, y: 0, width: 100, height: 40 });
  const label = freeText("attr", { x: 20, y: 10, width: 140, height: 20 });
  const { elements, grown } = fitShapesToFreeText([shape, label], { padding: 0 });
  assert.equal(grown, 1);
  assert.equal(elements[0].x, 0);
  assert.equal(elements[0].x + elements[0].width, 160);
  assert.deepEqual(elements[1], label);
});

test("fitShapesToFreeText leaves shapes that already contain their label alone", () => {
  const elements = [rect("entity"), freeText("attr", { x: 20, y: 10 })];
  const result = fitShapesToFreeText(elements);
  assert.equal(result.grown, 0);
  assert.deepEqual(result.elements, elements);
});

test("fitShapesToFreeText ignores bound labels, which the converter already fits", () => {
  const elements = [rect("box"), { ...boundLabel("t1", "box", "Long label"), width: 400 }];
  assert.equal(fitShapesToFreeText(elements).grown, 0);
});

test("fitShapesToFreeText sizes an ellipse and a diamond to their inscribed box", () => {
  const label = freeText("attr", { x: 45, y: 20, width: 20, height: 10 });
  const shapes = /** @type {[string, number][]} */ ([
    ["ellipse", Math.SQRT2],
    ["diamond", 2],
  ]);
  for (const [type, ratio] of shapes) {
    const { elements } = fitShapesToFreeText([rect("s", { type, width: 10, height: 10, x: 50, y: 20 }), label], {
      padding: 0,
    });
    assert.equal(elements[0].width, 20 * ratio, type);
    assert.equal(elements[0].height, 10 * ratio, type);
  }
});

test("fitShapesToFreeText picks the innermost shape a label sits in", () => {
  const outer = rect("outer", { x: 0, y: 0, width: 500, height: 300 });
  const inner = rect("inner", { x: 100, y: 100, width: 60, height: 40 });
  const label = freeText("attr", { x: 70, y: 110, width: 120, height: 20 });
  const { elements } = fitShapesToFreeText([outer, inner, label], { padding: 0 });
  assert.deepEqual(elements[0], outer);
  assert.equal(elements[1].x, 70);
  assert.equal(elements[1].width, 120);
});

test("fitShapesToFreeText stretches the rules a grown shape encloses", () => {
  const shape = rect("entity", { x: 0, y: 0, width: 100, height: 40 });
  const divider = {
    id: "row",
    type: "line",
    x: 0,
    y: 20,
    width: 100,
    height: 0,
    points: [
      [0, 0],
      [100, 0],
    ],
  };
  const outside = {
    id: "edge",
    type: "line",
    x: 300,
    y: 0,
    width: 50,
    height: 0,
    points: [
      [0, 0],
      [50, 0],
    ],
  };
  const { elements } = fitShapesToFreeText(
    [shape, divider, outside, freeText("attr", { x: 20, y: 10, width: 140, height: 20 })],
    { padding: 0 },
  );
  assert.equal(elements[1].width, 160);
  assert.deepEqual(/** @type {any} */ (elements[1]).points, [
    [0, 0],
    [160, 0],
  ]);
  assert.deepEqual(elements[2], outside);
});

test("saved-scene fitting leaves user-authored elements out of migration", () => {
  const shape = rect("entity", { x: 0, y: 0, width: 100, height: 40 });
  const divider = {
    id: "row",
    type: "line",
    x: 0,
    y: 20,
    width: 100,
    height: 0,
    points: [
      [0, 0],
      [100, 0],
    ],
  };
  const label = freeText("attr", { x: 20, y: 10, width: 140, height: 20 });
  const note = freeText("note", { x: 10, y: 10, width: 300, height: 20 });
  const annotation = {
    id: "annotation",
    type: "line",
    x: 0,
    y: 30,
    width: 100,
    height: 0,
    points: [
      [0, 0],
      [100, 0],
    ],
  };
  const baseline = [shape, divider, label];
  const { elements, grown } = fitSavedSceneShapesToFreeText(
    [...structuredClone(baseline), note, annotation],
    baseline,
    { padding: 0 },
  );
  assert.equal(grown, 1);
  assert.equal(elements[0].width, 160);
  assert.equal(elements[1].width, 160);
  assert.deepEqual(elements[3], note);
  assert.deepEqual(elements[4], annotation);
  assert.deepEqual(fitSavedSceneShapesToFreeText(elements, []).elements, elements);
});

test("whiteboard persistence payload keeps migration and baseline fields together", () => {
  const scene = { elements: [rect("edited")] };
  const baselineElements = [rect("original")];
  assert.deepEqual(
    createWhiteboardPersistencePayload({ sceneSourceHash: "hash-1", textMetricsVersion: 1, baselineElements }, scene),
    {
      sourceHash: "hash-1",
      textMetricsVersion: 1,
      scene,
      baseline: { elements: baselineElements },
    },
  );
  assert.equal(
    createWhiteboardPersistencePayload(
      {
        sceneSourceHash: "hash-1",
        textMetricsVersion: 1,
        baselineElements,
        baselineAvailable: false,
      },
      scene,
    ).baseline,
    null,
  );
});

// ---------------------------------------------------------------------------
// summarizeSceneEdits
// ---------------------------------------------------------------------------

test("summarizeSceneEdits reports no changes for an identical scene", () => {
  const baseline = [rect("Login"), boundLabel("t1", "Login", "Login page")];
  const { stats, totalChanges, lines } = summarizeSceneEdits(baseline, structuredClone(baseline));
  assert.deepEqual(stats, { added: 0, removed: 0, moved: 0, relabeled: 0, drawn: 0 });
  assert.equal(totalChanges, 0);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /No element changes/);
});

test("summarizeSceneEdits counts moved and resized elements once", () => {
  const baseline = [rect("Auth")];
  const edited = [rect("Auth", { x: 120, y: -35, width: 140 })];
  const { stats, lines } = summarizeSceneEdits(baseline, edited);
  assert.equal(stats.moved, 1);
  assert.match(lines[0], /Moved by \(120, -35\) and resized by \(40, 0\)/);
  assert.match(lines[0], /\(Auth\)/);
});

test("summarizeSceneEdits ignores sub-epsilon jitter", () => {
  const baseline = [rect("Auth")];
  const edited = [rect("Auth", { x: 1.4, y: -1.2 })];
  assert.equal(summarizeSceneEdits(baseline, edited).totalChanges, 0);
});

test("summarizeSceneEdits reports relabeled bound text against the container", () => {
  const baseline = [rect("Auth"), boundLabel("t1", "Auth", "Valid?")];
  const edited = [rect("Auth"), boundLabel("t1", "Auth", "Session valid?")];
  const { stats, lines } = summarizeSceneEdits(baseline, edited);
  assert.deepEqual(stats, { added: 0, removed: 0, moved: 0, relabeled: 1, drawn: 0 });
  assert.match(lines[0], /Relabeled rectangle \(Auth\): "Valid\?" -> "Session valid\?"/);
});

test("summarizeSceneEdits reports added arrows with their endpoints", () => {
  const baseline = [rect("Home"), rect("Logout")];
  const edited = [
    ...structuredClone(baseline),
    {
      id: "arrow-1",
      type: "arrow",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      startBinding: { elementId: "Home" },
      endBinding: { elementId: "Logout" },
    },
  ];
  const { stats, lines } = summarizeSceneEdits(baseline, edited);
  assert.equal(stats.added, 1);
  assert.match(lines[0], /Added arrow \(arrow-1\) from rectangle \(Home\) to rectangle \(Logout\)/);
});

test("summarizeSceneEdits classifies freedraw strokes as drawn", () => {
  const baseline = [rect("A")];
  const edited = [...structuredClone(baseline), { id: "fd1", type: "freedraw", x: 33.7, y: 41.2 }];
  const { stats, lines } = summarizeSceneEdits(baseline, edited);
  assert.deepEqual(stats, { added: 0, removed: 0, moved: 0, relabeled: 0, drawn: 1 });
  assert.match(lines[0], /Drew a freehand mark near \(34, 41\)/);
});

test("summarizeSceneEdits reports removals, treating isDeleted as removed", () => {
  const baseline = [rect("A"), rect("B")];
  const edited = [rect("A"), { ...rect("B"), isDeleted: true }];
  const { stats, lines } = summarizeSceneEdits(baseline, edited);
  assert.equal(stats.removed, 1);
  assert.match(lines[0], /Removed rectangle \(B\)/);
});

test("summarizeSceneEdits does not report a new container's label as a separate add", () => {
  const baseline = [rect("A")];
  const edited = [...structuredClone(baseline), rect("New1"), boundLabel("t9", "New1", "Logout")];
  const { stats, lines } = summarizeSceneEdits(baseline, edited);
  assert.equal(stats.added, 1);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /Added rectangle "Logout" \(New1\)/);
});

test("summarizeSceneEdits bounds output lines and clamps line length", () => {
  const baseline = [];
  const edited = Array.from({ length: 60 }, (_, i) => rect(`el-${i}`, { text: "x".repeat(500) }));
  const { lines, stats } = summarizeSceneEdits(baseline, edited, { maxLines: 10 });
  assert.equal(stats.added, 60);
  assert.equal(lines.length, 11);
  assert.match(lines[10], /and 50 more changes/);
  assert.ok(lines[0].length <= SUMMARY_MAX_LINE_CHARS);
});

// ---------------------------------------------------------------------------
// normalizeExcalidrawSceneTarget
// ---------------------------------------------------------------------------

test("normalizeExcalidrawSceneTarget strips to the fixed shape", () => {
  const out = normalizeExcalidrawSceneTarget({
    type: "excalidraw-scene",
    diagramIndex: 2,
    diagramId: "mermaid-3",
    sourceHash: "abc123",
    scenePath: "/state/whiteboards/k/2.excalidraw",
    previewPath: "/state/whiteboards/k/2.png",
    imageFallback: false,
    stats: { added: 3, removed: 1, moved: 2, relabeled: 1, drawn: 4 },
    injected: "nope",
    __proto__: null,
  });
  assert.deepEqual(out, {
    type: "excalidraw-scene",
    diagramIndex: 2,
    diagramId: "mermaid-3",
    sourceHash: "abc123",
    scenePath: "/state/whiteboards/k/2.excalidraw",
    previewPath: "/state/whiteboards/k/2.png",
    imageFallback: false,
    stats: { added: 3, removed: 1, moved: 2, relabeled: 1, drawn: 4 },
  });
});

test("normalizeExcalidrawSceneTarget coerces hostile values to bounded safe ones", () => {
  const out = normalizeExcalidrawSceneTarget({
    diagramIndex: "999999",
    diagramId: 42,
    stats: { added: -5, removed: "1e9", moved: NaN, relabeled: 2.7, drawn: { evil: true } },
  });
  assert.equal(out.diagramIndex, 999);
  assert.equal(out.diagramId, "42");
  assert.equal(out.scenePath, "");
  assert.equal(out.imageFallback, false);
  assert.deepEqual(out.stats, { added: 0, removed: 10_000, moved: 0, relabeled: 3, drawn: 0 });
});
