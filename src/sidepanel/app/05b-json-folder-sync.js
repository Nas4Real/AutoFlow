// TurboFlow shard: Prompt-index JSON import, exact filename matching, folder sync, account frame relink, Jack attach
// Loaded in numeric order; depends on earlier shards sharing globals.

function tfCleanDownloadPath(e, t) {
  let a = String(e || "")
    .replace(/\\/g, "/")
    .replace(/^[a-zA-Z]:/, "")
    .replace(/^\/+/, "")
    .trim();
  const n = a
    .split("/")
    .filter(Boolean)
    .filter((e) => "." !== e && ".." !== e)
    .map((e) =>
      e
        .replace(/[<>:"|?*\x00-\x1f]/g, "-")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  n.length || n.push("item");
  let r = n.pop();
  return (
    t && (r = r.replace(/\.[^/.]+$/, "") + "." + t),
    n.push(r),
    n.join("/")
  );
}
function tfFolderFromPath(e) {
  const t = tfCleanDownloadPath(e || "media/item.png"),
    a = t.lastIndexOf("/");
  return a > 0 ? t.slice(0, a) : "media";
}
function tfBatchNameFromFile(e) {
  return String(e || "prompt-index")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9 _.-]+/g, " ")
    .trim();
}
function tfReadPromptIndexJson(e) {
  const t = JSON.parse(e),
    a = Array.isArray(t)
      ? t
      : Array.isArray(t?.items)
        ? t.items
        : Array.isArray(t?.prompts)
          ? t.prompts
          : null;
  if (!a) throw new Error("Expected an array of prompt objects");
  const n = a
    .map((e, t) => {
      const a = String(e?.file_name || e?.fileName || "").trim(),
        n = String(e?.image_prompt || e?.imagePrompt || "").trim(),
        r = String(e?.animation_prompt || e?.animationPrompt || "").trim();
      if (!a || !n)
        throw new Error(`Item ${t + 1} needs file_name and image_prompt`);
      return {
        fileName: tfCleanDownloadPath(a, "png"),
        imagePrompt: n,
        animationPrompt: r,
        originalIndex: t,
      };
    })
    .filter((e) => e.imagePrompt);
  if (!n.length) throw new Error("No image prompts found");
  return n;
}
function tfCreatePromptIndexBatch({
  name: e,
  folder: t,
  prompts: a,
  settings: n,
  projectName: projectName,
  projectFolder: projectFolder,
  batchKind: batchKind,
}) {
  const r = {
    id: dn(),
    name: e,
    folder: t,
    projectName: projectName || e,
    projectFolder: projectFolder || t,
    batchKind: batchKind || n?.mode || "image",
    status: "pending",
    collapsed: !1,
    createdAt: Date.now(),
    settings: n,
    prompts: a.map((e) => ({ text: e.text, status: "pending" })),
    stats: { total: 0, downloaded: 0, failed: 0 },
    startedAt: null,
    completedAt: null,
  };
  return (l.batches.push(r), r);
}
async function tfImportPromptIndexJson(e, t, options = {}) {
  const promptImport = globalThis.TFProjectPromptImport;
  if (!promptImport || "function" != typeof promptImport.importPromptJson)
    throw new Error("Project prompt import API unavailable.");
  const importResult = await promptImport.importPromptJson(e, { sourceName: t }),
    importedCount = importResult.records.length,
    blockedCount = importResult.summary.blocked_count,
    a = importResult.records
      .filter((record) => record.status === "ready")
      .map((record) => ({
        fileName: tfCleanDownloadPath(record.file_name, "png"),
        imagePrompt: record.image_prompt,
        animationPrompt: record.animation_prompt || "",
      })),
    n = tfBatchNameFromFile(t),
    s = tfFolderFromPath(a[0]?.fileName),
    projectName = tfCurrentProjectName(n),
    projectFolder = tfCurrentProjectFolder(n),
    folder = `${projectFolder}/${s}`,
    i = {};
  if (!1 === options.createLegacyBatches) return importResult;
  if (!a.length) {
    Te(
      `Imported ${importedCount} prompt${1 === importedCount ? "" : "s"}; ${blockedCount} blocked in Studio`,
      "warning",
    );
    return importResult;
  }
  tfResetPromptComposerMapping();
  a.forEach((e, t) => {
    i[t] = tfPrefixDownloadPath(e.fileName, projectFolder);
  });
  const d = tfCreatePromptIndexBatch({
    name: `${projectName} - images`,
    folder: folder,
    prompts: a.map((e) => ({ text: e.imagePrompt })),
    projectName,
    projectFolder,
    batchKind: "images",
    settings: {
      mode: "image",
      imageModel: l.settings.imageModel,
      imageRatio: l.settings.imageRatio || "IMAGE_ASPECT_RATIO_LANDSCAPE",
      imageCount: l.settings.imageCount || 1,
      imageReferenceMediaIds: [],
      requiresJackReference: !0,
      naming: "numbered",
      namingPrefix: "",
      namingSeparator: "-",
      startNumber: 1,
      perPromptFileNames: i,
      referenceMode: "shared",
      projectName,
      projectFolder,
      batchKind: "images",
    },
  });
  let c = 0;
  const p = [],
    m = {},
    g = {};
  a.forEach((e, t) => {
    if (!e.animationPrompt) return;
    p.push({ text: e.animationPrompt });
    m[c] = t;
    g[c] = tfPrefixDownloadPath(tfCleanDownloadPath(e.fileName, "mp4"), projectFolder);
    c++;
  });
  c > 0 &&
    tfCreatePromptIndexBatch({
      name: `${projectName} - clips`,
      folder: folder,
      prompts: p,
      projectName,
      projectFolder,
      batchKind: "clips",
      settings: {
        mode: "video",
        videoQuality: l.settings.videoQuality,
        videoRatio: l.settings.videoRatio || "landscape",
        videoMode: "start_frame",
        videoCount: 1,
        videoDuration: 8,
        startFrameMediaId: null,
        endFrameMediaId: null,
        referenceMediaIds: [],
        imageReferenceMediaIds: [],
        naming: "numbered",
        namingPrefix: "",
        namingSeparator: "-",
        startNumber: 1,
        perPromptStartFrames: {},
        perPromptEndFrames: null,
        perPromptReferences: null,
        perPromptThumbnails: {},
        perPromptFileNames: g,
        referenceMode: "mapped",
        jsonSourceBatchId: d.id,
        jsonSourcePromptIndexes: m,
        projectName,
        projectFolder,
        batchKind: "clips",
      },
    });
  (X(),
    Sn(),
    o(".tab").forEach((e) => e.classList.remove("active")),
    o(".tab-content").forEach((e) => e.classList.remove("active")),
    r('[data-tab="queue"]').classList.add("active"),
    r("#tab-queue").classList.add("active"),
    Te(
      `Imported ${a.length} image prompt${1 === a.length ? "" : "s"}${c ? ` and ${c} animation prompt${1 === c ? "" : "s"}` : ""}${blockedCount ? `; ${blockedCount} blocked in Studio` : ""} from ${t}`,
      "success",
    ),
    tfScheduleDownloadHistorySync(500));
  return importResult;
}
function tfFileBaseName(e) {
  return String(e || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.toLowerCase();
}
function tfVariantDownloadPath(e, t = 1, a = "png") {
  const n = tfCleanDownloadPath(e || "", a).split("/").filter(Boolean);
  if (!n.length) return null;
  const r = n.pop().replace(/\.[^/.]+$/, "");
  return (n.push(`${r}__${t}.${a}`), n.join("/"));
}
function tfStripDownloadCopySuffix(e) {
  return String(e || "").replace(/\s+\(\d+\)(?=\.[^/.]+$)/, "");
}
function tfNormalizeMediaLookupPath(e, t = null) {
  let a = String(e || "")
    .replace(/\\/g, "/")
    .replace(/^[a-zA-Z]:/, "")
    .replace(/^\/+/, "")
    .toLowerCase()
    .split("/")
    .filter(Boolean)
    .join("/");
  if (!a) return "";
  a = tfStripDownloadCopySuffix(a);
  return t ? a.replace(/\.[^/.]+$/, "") + "." + t : a;
}
function tfMediaLookupKey(e, t = null) {
  return tfFileBaseName(tfNormalizeMediaLookupPath(e, t));
}
function tfMediaLookupKeys(e, t = null) {
  const a = tfNormalizeMediaLookupPath(e, t),
    n = tfMediaLookupKey(a, t),
    r = new Set();
  return (a && r.add(a), n && r.add(n), [...r]);
}
function tfBatchMediaExtension(e) {
  return "video" === e?.settings?.mode ? "mp4" : "png";
}
function tfExpectedPromptMediaFiles(e, t) {
  const a = e?.settings?.perPromptFileNames || {},
    n = a[t];
  if (!n) return [];
  const r = tfBatchMediaExtension(e),
    o = tfBatchExpectedMediaCount(e),
    s = [];
  for (let a = 1; a <= o; a++) {
    const i =
      o > 1
        ? tfVariantDownloadPath(n, a, r) || tfCleanDownloadPath(n, r)
        : tfCleanDownloadPath(n, r);
    s.push({
      batch: e,
      batchId: e.id,
      promptIndex: t,
      variant: a,
      expectedCount: o,
      ext: r,
      type: "mp4" === r ? "video" : "image",
      fileName: i,
      key: tfMediaLookupKey(i, r),
      lookupKeys: tfMediaLookupKeys(i, r),
    });
  }
  return s;
}
function tfCollectExpectedJsonMedia(e = null) {
  const t = [];
  for (const a of l.batches) {
    if (e && a.id !== e) continue;
    if (!a?.settings?.perPromptFileNames) continue;
    a.prompts?.forEach((e, n) => {
      t.push(...tfExpectedPromptMediaFiles(a, n));
    });
  }
  return t.filter((e) => e.key);
}
function tfBuildSelectedMediaFileIndex(e) {
  const t = new Map();
  for (const a of Array.from(e || [])) {
    if (!/\.(png|jpe?g|webp|mp4)$/i.test(a.name || "")) continue;
    const e = a.name.toLowerCase().endsWith(".mp4") ? "mp4" : "png",
      n = a.webkitRelativePath || a.name || "";
    for (const r of tfMediaLookupKeys(n, e)) t.has(r) || t.set(r, a);
    for (const r of tfMediaLookupKeys(a.name || "", e)) t.has(r) || t.set(r, a);
  }
  return t;
}
function tfFindSelectedMediaFile(e, t) {
  for (const a of e.lookupKeys || []) if (t.has(a)) return t.get(a);
  return null;
}
function tfGalleryPromptIndexForBatchPrompt(e, t) {
  for (const [, a] of u)
    if (a.batchId === e.id && a.originalIndex === t) return a.promptIndex;
  return t;
}
function tfLocalGalleryId(e) {
  return (
    "local-file-" +
    String(e.batchId || "batch").replace(/[^a-z0-9_-]+/gi, "-") +
    "-" +
    e.promptIndex +
    "-" +
    e.variant +
    "-" +
    e.ext
  );
}
function tfExpectedVariantSuffix(e) {
  return e.variant > 1 ? String.fromCharCode(96 + e.variant) : "";
}
function tfExpectedLocalSyncId(e) {
  return `${e.batchId}:${e.promptIndex}:${e.variant}:${e.ext}`;
}
function tfFindGalleryItemForExpectedFile(e) {
  const t = new Set(e.lookupKeys || []);
  for (const [a, n] of u) {
    if (n.batchId !== e.batchId || n.originalIndex !== e.promptIndex) continue;
    if (n.localSyncId === tfExpectedLocalSyncId(e))
      return a;
    if (n.fileName) {
      const a = tfMediaLookupKey(n.fileName, e.ext);
      if (a && t.has(a)) return n.mediaId;
    }
    const r = n.suffix || "";
    if (r === tfExpectedVariantSuffix(e)) return n.mediaId;
  }
  return null;
}
function tfPrunePromptGalleryToExpectedFiles(e, t, a) {
  const n = new Set(a.map(tfExpectedLocalSyncId)),
    r = new Set(a.flatMap((e) => e.lookupKeys || []));
  let o = !1;
  for (const [a, s] of [...u]) {
    if (s.batchId !== e.id || s.originalIndex !== t) continue;
    if (s.localSyncId && n.has(s.localSyncId)) continue;
    if (s.fileName) {
      const e = tfMediaLookupKey(s.fileName, s.type === "video" ? "mp4" : "png");
      if (e && r.has(e)) continue;
    }
    (u.delete(a), g.delete(a), (o = !0));
  }
  return o;
}
async function tfUpsertLocalGalleryFile(e, t) {
  const a = e.ext,
    n = tfExpectedLocalSyncId(e),
    r = tfFindGalleryItemForExpectedFile(e),
    o = r && u.get(r),
    s = !o || o.isPlaceholder || String(r).startsWith("placeholder-"),
    i = s ? tfLocalGalleryId(e) : r,
    l = tfGalleryPromptIndexForBatchPrompt(e.batch, e.promptIndex);
  let d = o?.fifeUrl || null;
  if (t && "image" === e.type)
    try {
      const e = await Vn(t);
      d = (await ce(e, t.type || "image/png", 220, 0.78)) || d;
    } catch (e) {}
  s && r && u.delete(r);
  u.set(i, {
    mediaId: i,
    promptIndex: l,
    prompt: e.batch.prompts?.[e.promptIndex]?.text || "",
    fifeUrl: d,
    videoUrl: null,
    status: "done",
    type: e.type,
    isPlaceholder: !1,
    suffix: e.variant > 1 ? String.fromCharCode(96 + e.variant) : "",
    isPortrait: o?.isPortrait || !1,
    ratioClass: o?.ratioClass || null,
    originalIndex: e.promptIndex,
    workflowId: o?.workflowId || null,
    refThumbs: o?.refThumbs || [],
    batchId: e.batchId,
    batchName: e.batch.name,
    projectName: e.batch.projectName || e.batch.settings?.projectName || null,
    projectFolder:
      e.batch.projectFolder || e.batch.settings?.projectFolder || null,
    batchKind: e.batch.batchKind || e.batch.settings?.batchKind || null,
    fileName: e.fileName,
    localFile: !0,
    localSyncId: n,
  });
  return !0;
}
function tfRefreshBatchStatusFromSavedFiles(e) {
  if (!e?.prompts?.length) return !1;
  let t = !1,
    a = 0,
    n = 0,
    r = 0;
  const o = tfBatchExpectedMediaCount(e);
  e.prompts.forEach((s, i) => {
    const l = Math.max(s.localSavedCount || 0, tfBatchPromptGalleryCount(e, i));
    l >= o
      ? (a++,
        ("done" !== s.status || s.lastError) &&
          ((s.status = "done"), delete s.lastError, (t = !0)))
      : ("failed" === s.status && n++,
        ("pending" === s.status || "running" === s.status) && r++);
  });
  if ("running" === e.status && r > 0) return t;
  const s = e.prompts.length;
  if (s > 0 && a === s && "done" !== e.status)
    ((e.status = "done"), (e.completedAt = Date.now()), (e.collapsed = !0), (t = !0));
  else if (a > 0 && "running" !== e.status && "partial" !== e.status && a < s)
    ((e.status = n > 0 ? "partial" : e.status), (t = !0));
  return t;
}
function tfGroupExpectedByPrompt(e) {
  const t = new Map();
  for (const a of e) {
    const e = `${a.batchId}:${a.promptIndex}`,
      n = t.get(e) || { batch: a.batch, promptIndex: a.promptIndex, items: [] };
    (n.items.push(a), t.set(e, n));
  }
  return t;
}
async function tfApplyJsonMediaMatches(e, t, a = {}) {
  const n = !0 === a.createGallery,
    r = tfGroupExpectedByPrompt(e);
  let o = 0,
    s = 0,
    i = 0,
    d = !1;
  for (const e of r.values()) {
    const a = [];
    for (const r of e.items) {
      const e = t(r);
      if (!e) continue;
      a.push(r.key);
      n && (await tfUpsertLocalGalleryFile(r, e.file || null)) && s++;
    }
    if (a.length > 0) {
      const t = e.batch.prompts?.[e.promptIndex];
      if (t) {
        const n = new Set(Array.isArray(t.localSavedKeys) ? t.localSavedKeys : []);
        a.forEach((e) => n.add(e));
        const l = n.size,
          r = e.items.length;
        ((t.localSavedKeys = [...n]),
          (t.localSavedCount = l),
          (t.localExpectedCount = r),
          l >= r
            ? ((t.status = "done"), delete t.lastError, o++)
            : (t.lastError = `Saved ${l}/${r} expected files found`),
          i++);
      }
    }
    n &&
      a.length >= e.items.length &&
      tfPrunePromptGalleryToExpectedFiles(e.batch, e.promptIndex, e.items) &&
      (d = !0);
  }
  let l = !1;
  for (const e of new Set([...r.values()].map((e) => e.batch)))
    tfRefreshBatchStatusFromSavedFiles(e) && (l = !0);
  return { promptsDone: o, promptsTouched: i, galleryItems: s, changed: i > 0 || s > 0 || l || d };
}
let tfDownloadHistorySyncTimer = null,
  tfDownloadHistorySyncRunning = !1,
  tfDownloadHistoryLastRun = 0;
function tfScheduleDownloadHistorySync(e = 1200) {
  (tfDownloadHistorySyncTimer && clearTimeout(tfDownloadHistorySyncTimer),
    (tfDownloadHistorySyncTimer = setTimeout(() => {
      ((tfDownloadHistorySyncTimer = null),
        tfSyncJsonMediaFromDownloadHistory({ silent: !0 }));
    }, e)));
}
async function tfSyncJsonMediaFromDownloadHistory(e = {}) {
  const t = tfCollectExpectedJsonMedia(e.batchId || null);
  if (!t.length || tfDownloadHistorySyncRunning) return null;
  const a = Date.now();
  if (!e.force && a - tfDownloadHistoryLastRun < 1e4) return null;
  tfDownloadHistorySyncRunning = !0;
  tfDownloadHistoryLastRun = a;
  try {
    const a = await chrome.runtime.sendMessage({
      type: "CHECK_DOWNLOAD_HISTORY",
      expected: t.map((e) => ({
        key: e.key,
        fileName: e.fileName,
        ext: e.ext,
        lookupKeys: e.lookupKeys,
      })),
    });
    if (!a?.ok) return null;
    const n = new Map((a.matches || []).map((e) => [e.key, e])),
      r = await tfApplyJsonMediaMatches(
        t,
        (e) => (n.has(e.key) ? { history: n.get(e.key) } : null),
        { createGallery: !1 },
      );
    return (
      r?.changed &&
        (X(),
        Sn(),
        !e.silent &&
          Te(
            `Synced ${r.promptsDone} prompt${1 === r.promptsDone ? "" : "s"} from Chrome downloads.`,
            "success",
          )),
      r
    );
  } catch (t) {
    return e.silent || Te(`Download sync failed: ${t.message}`, "warn"), null;
  } finally {
    tfDownloadHistorySyncRunning = !1;
  }
}
async function tfSyncJsonMediaFromFiles(e, t = {}) {
  const a = tfCollectExpectedJsonMedia(t.batchId || null);
  if (!a.length) return { promptsDone: 0, galleryItems: 0, changed: !1 };
  const n = tfBuildSelectedMediaFileIndex(e),
    r = await tfApplyJsonMediaMatches(
      a,
      (e) => {
        const t = tfFindSelectedMediaFile(e, n);
        return t ? { file: t } : null;
      },
      { createGallery: !0 },
    );
  return (
    r.changed &&
      (X(),
      Ba(),
      ee(),
      Sn(),
      !t.silent &&
        Te(
          `Synced ${r.galleryItems} file${1 === r.galleryItems ? "" : "s"} from the media folder.`,
          "success",
        )),
    r
  );
}
function tfFindSelectedFrameFile(e, t) {
  for (const a of tfMediaLookupKeys(e || "", "png")) if (t.has(a)) return t.get(a);
  return null;
}
async function tfRelinkJsonFramesFromFiles(e, options = {}) {
  const t = Array.from(e || []).filter(
    (e) => e.type?.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(e.name),
  ),
    hasFiles = t.length > 0;
  if (!(await Oe())) return;
  const targetBatchId = options.batchId || options.batch?.id || null,
    silent = !0 === options.silent,
    currentProjectId = await tfCurrentFlowProjectId(),
    a = l.batches.filter(
      (e) =>
        e.settings?.jsonSourceBatchId &&
        (!targetBatchId || e.id === targetBatchId),
    );
  if (!a.length)
    return (
      silent || Te("No JSON animation batch found in the queue", "warn"),
      { relinked: 0, missing: 0, usedFiles: hasFiles, needed: 0 }
    );
  const n = new Map();
  t.forEach((e) => {
    for (const t of tfMediaLookupKeys(e.webkitRelativePath || e.name || "", "png"))
      n.has(t) || n.set(t, e);
    for (const t of tfMediaLookupKeys(e.name || "", "png")) n.has(t) || n.set(t, e);
  });
  const r = new Map();
  let o = 0,
    s = 0,
    needed = 0;
  for (const e of a) {
    const t = e.settings,
      a = pn(t.jsonSourceBatchId),
      i = a?.settings?.perPromptFileNames || {},
      c = a?.settings?.imageCount || 1,
      d = t.jsonSourcePromptIndexes || {};
    t.perPromptStartFrames = t.perPromptStartFrames || {};
    t.perPromptThumbnails = t.perPromptThumbnails || {};
    for (let a = 0; a < e.prompts.length; a++) {
      if ("pending" !== e.prompts[a]?.status) continue;
      needed++;
      const p = Number(void 0 !== d[a] ? d[a] : a),
        m = i[p];
      if (!m) {
        s++;
        continue;
      }
      const u = c > 1 ? tfVariantDownloadPath(m, 1, "png") || m : m,
        g = tfFindSelectedFrameFile(u, n) || tfFindSelectedFrameFile(m, n);
      const f = tfCleanDownloadPath(u, "png").toLowerCase();
      let h =
        r.get(f) ||
        y.find(
          (e) =>
            e.mediaId &&
            !e.uploading &&
            e.jsonFileName === u &&
            currentProjectId &&
            e.flowProjectId === currentProjectId,
        );
      if (!h) {
        if (g) {
          h = await yt(g);
          h &&
            ((h.source = "json-relinked-frame"),
            (h.jsonFileName = u),
            (h.flowProjectId = currentProjectId),
            ae());
        } else
          try {
            const e = await chrome.runtime.sendMessage({
              type: "UPLOAD_CACHED_FRAME",
              fileName: u,
            });
            if (e?.ok && e.mediaId) {
              h = {
                id: dt(),
                mediaId: e.mediaId,
                fileName: tfFileBaseName(e.fileName || u) || "frame.png",
                thumbnail: null,
                uploadedAt: Date.now(),
                mimeType: e.mimeType || "image/png",
                uploading: !1,
                tag: null,
                source: "json-cached-frame",
                jsonFileName: u,
                flowProjectId: currentProjectId,
              };
              (y.push(h), ae(), kt());
            }
          } catch (e) {}
        r.set(f, h);
      }
      if (h?.mediaId) {
        t.perPromptStartFrames[a] = h.mediaId;
        h.thumbnail && (t.perPromptThumbnails[h.mediaId] = h.thumbnail);
        o++;
      } else s++;
    }
    t.referenceMode = "mapped";
  }
  (X(),
    Sn(),
    !silent &&
      o > 0
      ? Te(
          `Relinked ${o} animation frame${1 === o ? "" : "s"} to the current account.`,
          "success",
        )
      : !silent &&
        Te(
          hasFiles
            ? "No matching JSON frame files were found"
            : "No cached JSON frames were found",
          "warn",
        ),
    !silent &&
      s > 0 &&
      Te(
        hasFiles
          ? `${s} expected frame file${1 === s ? "" : "s"} not selected`
          : `${s} frame${1 === s ? "" : "s"} missing from local cache`,
        "warn",
      ));
  return { relinked: o, missing: s, usedFiles: hasFiles, needed };
}
async function tfEnsureJsonAnimationFramesForBatch(e, t = {}) {
  if (!e?.settings?.jsonSourceBatchId) return !0;
  const a = await tfRelinkJsonFramesFromFiles([], {
    silent: !0,
    batchId: e.id,
  });
  if (!a) return !1;
  if (0 === a.needed || 0 === a.missing)
    return (
      a.relinked > 0 &&
        Te(
          `Auto-attached ${a.relinked} start frame${1 === a.relinked ? "" : "s"} to this Google Flow project.`,
          "success",
        ),
      !0
    );
  return (
    (tfPendingAutoRunAfterRelink = {
      batchId: e.id,
      keepChain: !!t.keepChain,
    }),
    Te(
      "Some generated start frames were not in the local cache. Select the downloaded media folder once and TurboFlow will continue automatically.",
      "warn",
    ),
    r("#json-frame-file-input")?.click(),
    !1
  );
}
async function tfOpenGoogleAccountChooser() {
  if (nr())
    return void Gn({
      icon: "⏳",
      title: "Batch Still Active",
      message: "Stop or wait for the current batch before switching accounts.",
      hint: "The queue and failed prompts are saved locally, so switching accounts will not clear them.",
    });
  await chrome.tabs.create({
    url: "https://accounts.google.com/AccountChooser?continue=https%3A%2F%2Fmyaccount.google.com%2F&service=accountsettings",
  });
  Te(
    "Queue kept. Choose the account, then open Google Flow in that account. TurboFlow will auto-attach cached frames when you retry.",
    "info",
  );
}
async function tfLoadBundledJackFile() {
  const e = chrome.runtime.getURL("assets/reference/Jack.jpg"),
    t = await fetch(e);
  if (!t.ok) throw new Error("Bundled Jack reference image was not found");
  const a = await t.blob();
  return new File([a], "Jack.jpg", { type: a.type || "image/jpeg" });
}
async function tfCurrentFlowProjectId() {
  try {
    const e = await chrome.runtime.sendMessage({
      type: "CHECK_CONNECTION",
      deep: !0,
    });
    return e?.state?.projectId || null;
  } catch (e) {
    return null;
  }
}
async function tfEnsureJackReferenceForBatch(e) {
  const t = e?.settings;
  if (!t?.requiresJackReference || "image" !== t.mode) return !0;
  if (!(await Oe())) return !1;
  const a = await tfCurrentFlowProjectId(),
    n = tfFindReusableJackReference(a);
  if (n?.mediaId)
    return (
      tfMarkJackSystemReference(n, a),
      ae(),
      kt(),
      (t.imageReferenceMediaIds = [n.mediaId]),
      X(),
      Sn(),
      !0
    );
  try {
    Te("Uploading Jack reference for JSON image prompts...", "info");
    const n = await tfLoadBundledJackFile(),
      r = await yt(n);
    if (!r?.mediaId) throw new Error("Jack upload did not return a media ID");
    return (
      tfMarkJackSystemReference(r, a),
      (t.imageReferenceMediaIds = [r.mediaId]),
      ae(),
      kt(),
      X(),
      Sn(),
      Te("Jack reference attached to JSON image batch", "success"),
      !0
    );
  } catch (e) {
    return (
      Te(`Could not attach Jack reference: ${e.message}`, "error"),
      !1
    );
  }
}
