// TurboFlow shard: Batch model, persistence helpers, retry/reset/import batch shell
// Loaded in numeric order; depends on earlier shards sharing globals.

// TurboFlow side panel shard: Batch model, prompt-index JSON import, folder sync, queue UI
// Loaded by src/sidepanel/index.html in numeric order.

function dn() {
  return (
    "batch-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7)
  );
}
function cn(e, t = {}) {
  const a = t.runNow || !1,
    n = tfCurrentProjectFolder(t.name || "turboflow"),
    s = tfCurrentProjectName(t.name || n),
    o = {
      id: dn(),
      name: t.name || n,
      folder: n,
      projectName: s,
      projectFolder: n,
      batchKind: "video" === l.mode ? "clips" : "images",
      status: a ? "running" : "pending",
      collapsed: !1,
      createdAt: Date.now(),
      settings: {
        mode: l.mode,
        imageModel: l.settings.imageModel,
        imageRatio: l.settings.imageRatio,
        imageCount: l.settings.imageCount,
        videoQuality: l.settings.videoQuality,
        videoRatio: l.settings.videoRatio,
        videoMode: l.settings.videoMode,
        videoCount: l.settings.videoCount,
        videoDuration: l.settings.videoDuration || 8,
        startFrameMediaId: l.startFrameMediaId,
        endFrameMediaId: l.endFrameMediaId,
        referenceMediaIds: [...l.referenceMediaIds],
        imageReferenceMediaIds: [...l.imageReferenceMediaIds],
        naming: l.settings.naming || "numbered",
        namingPrefix: l.settings.namingPrefix || "",
        namingSeparator:
          void 0 !== l.settings.namingSeparator
            ? l.settings.namingSeparator
            : "-",
        startNumber: l.settings.startNumber || 1,
        perPromptReferences:
          "mapped" === l.referenceMode
            ? JSON.parse(JSON.stringify(l.promptReferenceMap))
            : null,
        perPromptStartFrames:
          "mapped" === l.referenceMode
            ? JSON.parse(JSON.stringify(l.promptStartFrameMap))
            : null,
        perPromptEndFrames:
          "mapped" === l.referenceMode
            ? JSON.parse(JSON.stringify(l.promptEndFrameMap))
            : null,
        perPromptThumbnails:
          "mapped" === l.referenceMode
            ? ye(
                l.promptReferenceMap,
                l.promptStartFrameMap,
                l.promptEndFrameMap,
              )
            : null,
        referenceMode: l.referenceMode,
        singlePromptBatch: !0 === l.singlePromptMode,
        projectName: s,
        projectFolder: n,
        batchKind: "video" === l.mode ? "clips" : "images",
      },
      prompts: e.map((e) => ({ text: e, status: "pending" })),
      stats: { total: 0, downloaded: 0, failed: 0 },
      startedAt: a ? Date.now() : null,
      completedAt: null,
    };
  return (
    l.batches.push(o),
    X(),
    Sn(),
    Te(
      `📦 Batch "${o.name}" created — ${e.length} prompts [${a ? "running" : "queued"}]`,
      a ? "success" : "info",
    ),
    o
  );
}
function pn(e) {
  return l.batches.find((t) => t.id === e);
}
function mn() {
  return l.batches.find((e) => "running" === e.status);
}
function un() {
  return (
    [...l.batches]
      .filter((e) => "pending" === e.status)
      .sort((e, t) => (e.createdAt || 0) - (t.createdAt || 0))[0] || null
  );
}
function gn(e, t) {
  const a = pn(e);
  a &&
    ((a.status = t),
    "running" === t && (a.startedAt = a.startedAt || Date.now()),
    ("done" !== t && "failed" !== t && "partial" !== t) ||
      (a.completedAt = Date.now()),
    X(),
    Sn());
}
function fn(e, t, a, r = null) {
  const n = pn(e);
  if (!n || !n.prompts[t]) return;
  n.prompts[t].status = a;
  r
    ? (n.prompts[t].lastError = String(r))
    : ["pending", "running", "submitted", "done"].includes(a) &&
      delete n.prompts[t].lastError;
  (X(), Sn());
}
function hn(e, t) {
  const a = pn(e);
  if (!a) return;
  const n = a.stats?.previousSucceeded || 0;
  ((a.stats = { ...t, previousSucceeded: n }), X(), Sn());
}
function bn(e) {
  const t = pn(e);
  t &&
    ("running" !== t.status
      ? ((l.batches = l.batches.filter((t) => t.id !== e)),
        X(),
        Sn(),
        Te(`🗑️ Batch "${t.name}" deleted`, "info"))
      : Te("⚠️ Can't delete a running batch — stop it first", "warn"));
}
function vn(e) {
  const t = pn(e);
  if (!t) return;
  const a = {
    ...JSON.parse(JSON.stringify(t)),
    id: dn(),
    name: t.name + " (copy)",
    status: "pending",
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    stats: { total: 0, downloaded: 0, failed: 0 },
  };
  (a.prompts.forEach((e) => ((e.status = "pending"), delete e.lastError)),
    l.batches.push(a),
    X(),
    Sn(),
    Te(`📋 Batch duplicated → "${a.name}"`, "success"));
}
function yn(e, t) {
  const a = pn(e);
  a &&
    ((a.name = t.trim() || a.name),
    (a.folder =
      t
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-") || a.folder),
    X(),
    Sn());
}
function wn(e) {
  const t = pn(e);
  if (!t) return;
  let a = 0;
  if (
    (t.prompts.forEach((e, promptIndex) => {
      ("failed" === e.status ||
        (typeof tfQueuePromptIsMissingMedia === "function" &&
          tfQueuePromptIsMissingMedia(t, e, promptIndex))) &&
        ((e.status = "pending"),
        delete e.lastError,
        delete e.localSavedCount,
        delete e.localExpectedCount,
        delete e.localSavedKeys,
        a++);
    }),
    0 === a)
  )
    return void Te(`✅ No failed prompts in "${t.name}"`, "info");
  t.status = "pending";
  const n = (t.stats?.downloaded || 0) + (t.stats?.previousSucceeded || 0);
  ((t.stats = { total: 0, downloaded: 0, failed: 0, previousSucceeded: n }),
    (t.completedAt = null),
    X(),
    Sn(),
    Te(`🔄 Reset ${a} failed prompts in "${t.name}"`, "success"));
}
function In(e) {
  if (!l.avgTimePerImage || l.avgTimePerImage <= 0) return null;
  const t =
      e.prompts.filter((e) => "pending" === e.status || "running" === e.status)
        .length * (e.settings.imageCount || 1),
    a = Math.round((t * l.avgTimePerImage) / 1e3);
  return a < 60 ? `~${a}s` : `~${Math.round(a / 60)}min`;
}
function En() {
  if (l.batches.find((e) => "running" === e.status))
    return void Te("⚠️ Stop the running batch first", "warn");
  const e = l.batches.length;
  ((l.batches = []), X(), Sn(), Te(`🗑️ Deleted all ${e} batches`, "info"));
}
function kn() {
  l.batches.find((e) => "running" === e.status)
    ? Te("⚠️ Stop the running batch first", "warn")
    : (l.batches.forEach((e) => {
        ((e.status = "pending"),
          (e.stats = { total: 0, downloaded: 0, failed: 0 }),
          (e.startedAt = null),
          (e.completedAt = null),
          e.prompts.forEach((e) => (e.status = "pending")));
      }),
      X(),
      Sn(),
      Te("🔄 All batches reset to pending", "success"));
}
function Mn() {
  const e = JSON.stringify(l.batches, null, 2),
    t = new Blob([e], { type: "application/json" }),
    a = URL.createObjectURL(t),
    n = document.createElement("a");
  ((n.href = a),
    (n.download = `turboflow-batches-${Date.now()}.json`),
    n.click(),
    URL.revokeObjectURL(a),
    Te(`📤 Exported ${l.batches.length} batches`, "success"));
}
function $n(e) {
  try {
    const t = JSON.parse(e);
    if (!Array.isArray(t)) throw new Error("Invalid format");
    let a = 0;
    for (const e of t)
      e.prompts &&
        Array.isArray(e.prompts) &&
        ((e.id = dn()),
        (e.status = "pending"),
        (e.startedAt = null),
        (e.completedAt = null),
        (e.stats = { total: 0, downloaded: 0, failed: 0 }),
        e.prompts.forEach((e) => (e.status = "pending")),
        l.batches.push(e),
        a++);
    (X(), Sn(), Te(`📥 Imported ${a} batches`, "success"));
  } catch (e) {
    Te(`❌ Import failed: ${e.message}`, "error");
  }
}
