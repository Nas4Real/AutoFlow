// TurboFlow shard: Animation setup, preview-ready upsert, placeholder lifecycle
// Loaded in numeric order; depends on earlier shards sharing globals.

// TurboFlow side panel shard: Gallery rendering, preview modal, manual downloads
// Loaded by src/sidepanel/index.html in numeric order.

(r("#btn-close-picker")?.addEventListener("click", Rt),
  r("#picker-modal")?.addEventListener("click", (e) => {
    e.target === r("#picker-modal") && Rt();
  }),
  r("#btn-picker-done")?.addEventListener("click", () => {
    $t ? Te("⚠️ Please wait for uploads to finish", "warn") : (M && M(E), Rt());
  }),
  r("#btn-picker-upload")?.addEventListener("click", () => {
    r("#picker-upload-input").click();
  }),
  r("#picker-upload-input")?.addEventListener("change", async (e) => {
    (await Nt(e.target.files), (e.target.value = ""));
  }),
  r("#btn-picker-upload-more")?.addEventListener("click", () => {
    r("#picker-upload-more-input").click();
  }),
  r("#picker-upload-more-input")?.addEventListener("change", async (e) => {
    (await Nt(e.target.files), (e.target.value = ""));
  }),
  r("#btn-close-mapper")?.addEventListener("click", Vt),
  r("#btn-mapper-cancel")?.addEventListener("click", Vt),
  r("#reference-mapper-modal")?.addEventListener("click", (e) => {
    e.target === r("#reference-mapper-modal") && Vt();
  }),
  r("#btn-mapper-save")?.addEventListener("click", Jt),
  r("#btn-mapper-1to1")?.addEventListener("click", ma),
  r("#btn-mapper-all")?.addEventListener("click", ua),
  r("#btn-mapper-autotag")?.addEventListener("click", ga),
  r("#btn-mapper-clear")?.addEventListener("click", fa),
  r("#btn-mapper-add-prompt")?.addEventListener("click", oa),
  r("#btn-open-mapper")?.addEventListener("click", Wt),
  r("#btn-open-mapper-video")?.addEventListener("click", Wt),
  r("#btn-open-mapper-vidref")?.addEventListener("click", Wt),
  r("#mapper-strip-tags")?.addEventListener("change", (e) => {
    ((l.stripTagsOnSave = e.target.checked), J());
  }),
  r("#btn-edit-mapping")?.addEventListener("click", Wt),
  r("#btn-unlock-clear")?.addEventListener("click", async () => {
    if (
      await an({
        icon: "🔓",
        title: "Unlock Prompt Box?",
        message:
          "This only clears the current prompt-box assignments. Your queue, failed jobs, and imported batches stay saved.",
        confirmText: "Unlock",
        confirmClass: "btn-flow-danger",
      })
    ) {
      tfResetPromptComposerMapping({
        showToast: !0,
        message: "Reference mapping cleared - back to normal mode",
      });
    }
  }));
const La = new Map();
function xa(e) {
  return (
    !!e &&
    "video" !== e.type &&
    !e.localFile &&
    !e.isPlaceholder &&
    !(
      !e.mediaId ||
      e.mediaId.startsWith("placeholder-") ||
      e.mediaId.startsWith("local-file-")
    ) &&
    "failed" !== e.status &&
    "generating" !== e.status
  );
}
async function Sa(e) {
  return tfImageUrlToDataPreview(e, 60, 0.6);
}
async function tfImageUrlToDataPreview(e, t = 220, a = 0.78) {
  return new Promise((r) => {
    const n = new Image();
    ((n.crossOrigin = "anonymous"),
      (n.onload = () => {
        try {
          const e = document.createElement("canvas");
          let o = n.width,
            s = n.height;
          (o > s
            ? o > t && ((s = Math.round((s * t) / o)), (o = t))
            : s > t && ((o = Math.round((o * t) / s)), (s = t)),
            (e.width = o),
            (e.height = s),
            e.getContext("2d").drawImage(n, 0, 0, o, s),
            r(e.toDataURL("image/jpeg", a)));
        } catch (e) {
          r(null);
        }
      }),
      (n.onerror = () => r(null)),
      (n.src = e));
  });
}
function tfCaptureGalleryPreview(e, t, a) {
  if (!e || "video" === a || !t || tfIsLocalPreviewUrl(t)) return;
  tfImageUrlToDataPreview(t, 220, 0.78).then((t) => {
    const a = u.get(e);
    if (!t || !a || "video" === a.type) return;
    ((a.fifeUrl = t), Fa(), Ca());
  });
}
async function tfRepairGalleryPreviewFromCache(e, t) {
  const a = u.get(e);
  if (!a || "video" === a.type || !t) return !1;
  try {
    const n = await chrome.runtime.sendMessage({
      type: "GET_CACHED_FRAME",
      fileName: t,
    });
    if (!n?.ok || !n.base64) return !1;
    const r = await ce(n.base64, n.mimeType || "image/png", 220, 0.78);
    if (!r) return !1;
    return ((a.fifeUrl = r), (a.fileName = t), Fa(), Ca(), !0);
  } catch (e) {
    return !1;
  }
}
const tfGalleryCacheRepairSeen = new Set();
let tfGalleryCacheRepairQueue = [],
  tfGalleryCacheRepairRunning = !1;
function tfQueueGalleryCacheRepair(e, t) {
  if (!e || !t) return;
  const a = `${e}|${t}`;
  if (tfGalleryCacheRepairSeen.has(a)) return;
  (tfGalleryCacheRepairSeen.add(a),
    tfGalleryCacheRepairQueue.push({ mediaId: e, fileName: t }));
  if (!tfGalleryCacheRepairRunning) {
    tfGalleryCacheRepairRunning = !0;
    setTimeout(tfRunGalleryCacheRepairQueue, 0);
  }
}
async function tfRunGalleryCacheRepairQueue() {
  try {
    for (; tfGalleryCacheRepairQueue.length; ) {
      const e = tfGalleryCacheRepairQueue.shift();
      await tfRepairGalleryPreviewFromCache(e.mediaId, e.fileName);
      await ie(80);
    }
  } finally {
    tfGalleryCacheRepairRunning = !1;
    tfGalleryCacheRepairQueue.length &&
      ((tfGalleryCacheRepairRunning = !0),
      setTimeout(tfRunGalleryCacheRepairQueue, 0));
  }
}
async function _a(e) {
  if (!e || 0 === e.length) return;
  if ($a())
    return void Gn({
      icon: "⏳",
      title: "Wait for Current Batch",
      message:
        "You can't start animating while a batch is generating or downloads are in progress.",
      hint: "Wait for the current batch to finish, or stop it from the Queue tab.",
    });
  const t = e.map((e) => u.get(e)).filter((e) => e && xa(e));
  0 !== t.length
    ? await Pa(t)
    : Gn({
        icon: "⚠️",
        title: "No Animatable Images",
        message:
          "Selected items are not animatable. Wait for images to finish generating.",
        hint: "Already-generated videos and failed items can't be animated.",
      });
}
async function Pa(e) {
  (Te(
    `✨ Setting up animate flow for ${e.length} image${e.length > 1 ? "s" : ""}...`,
    "info",
  ),
    (l.mode = "video"),
    o("[data-mode]").forEach((e) =>
      e.classList.toggle("active", "video" === e.dataset.mode),
    ),
    (r("#image-settings").style.display = "none"),
    (r("#video-settings").style.display = "block"),
    (l.settings.videoMode = "start_frame"),
    o("[data-vid-mode]").forEach((e) =>
      e.classList.toggle("active", "start_frame" === e.dataset.vidMode),
    ),
    "function" == typeof Wn && Wn(),
    (l.singlePromptMode = !0));
  const t = r("#single-prompt-toggle");
  (t && (t.checked = !0),
    "function" == typeof tr && tr(),
    "function" == typeof er && er(),
    (l.referenceMode = "mapped"),
    (l.promptStartFrameMap = {}),
    (l.promptReferenceMap = {}),
    (l.promptEndFrameMap = {}),
    e.forEach((e, t) => {
      l.promptStartFrameMap[t] = e.mediaId;
    }));
  for (const t of e)
    if (!La.has(t.mediaId)) {
      let e = null;
      (t.fifeUrl && (e = await Sa(t.fifeUrl)),
        La.set(t.mediaId, e || t.fifeUrl));
    }
  ((r("#prompt-input").value = ""),
    "function" == typeof Hn && Hn(),
    J(),
    o(".tab").forEach((e) => e.classList.remove("active")),
    o(".tab-content").forEach((e) => e.classList.remove("active")),
      r('[data-tab="generate"]')?.classList.add("active"),
      r("#tab-generate")?.classList.add("active"),
    setTimeout(() => {
      Wt();
    }, 200),
    Te(
      `✅ ${e.length} start frame${e.length > 1 ? "s" : ""} loaded — type your prompt and save.`,
      "success",
    ),
    "function" == typeof le &&
      le("animate_flow_started", { image_count: e.length }));
}
function Aa(e) {
  const t = r("#mapping-preview-section"),
    a = r("#mapping-preview-list");
  if (!t || !a) return;
  if (0 === e.length) return void (t.style.display = "none");
  t.style.display = "block";
  const n = t.querySelector(".mapping-preview-title");
  n && (n.textContent = "📎 Start Frames Ready");
  const o = ve(e[0].mediaId),
    s = o
      ? `<img class="mapping-preview-thumb" src="${o}" alt="frame">`
      : '<span class="mapping-preview-icon">🖼</span>';
  a.innerHTML = `\n        <div class="mapping-preview-row mapping-preview-row-compact">\n            ${s}\n            <span class="mapping-preview-count">${e.length} start frame${e.length > 1 ? "s" : ""} ready — type your prompt above</span>\n        </div>\n    `;
}
let Ta = null;
function Ca() {
  (Ta && clearTimeout(Ta),
    (Ta = setTimeout(() => {
      (ee(), (Ta = null));
    }, 2e3)));
}
let Ra = null;
function Fa() {
  Ra ||
    (Ra = requestAnimationFrame(() => {
      (Ba(), (Ra = null));
    }));
}
function Da(e) {
  const {
    mediaId: t,
    fifeUrl: a,
    promptIndex: n,
    prompt: r,
    type: o,
    videoUrl: s,
    workflowId: i,
    batchId: l,
    batchName: d,
    projectName: projectName,
    projectFolder: projectFolder,
    batchKind: batchKind,
    fileName: _fileName,
  } = e;
  if (!t) return;
  const c = h + n,
    p =
      "video" === o
        ? null
        : `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${t}`;
  if (u.has(t)) {
    const e = u.get(t);
    return (
      s && (e.videoUrl = s),
      !e.fifeUrl && p && (e.fifeUrl = p),
      _fileName && (e.fileName = _fileName),
      projectName && (e.projectName = projectName),
      projectFolder && (e.projectFolder = projectFolder),
      batchKind && (e.batchKind = batchKind),
      tfCaptureGalleryPreview(t, e.fifeUrl || a || p, o),
      Fa(),
      void Ca()
    );
  }
  let m = !1;
  if (l)
    for (const [e, d] of u)
      if (
        d.isPlaceholder &&
        d.batchId === l &&
        d.originalIndex === n
      ) {
        const placeholderSuffix = d.suffix,
          placeholderPortrait = d.isPortrait,
          placeholderBatchId = d.batchId,
          placeholderBatchName = d.batchName,
          placeholderPromptIndex = d.promptIndex,
          placeholderRefs = d.refThumbs || [],
          placeholderOriginalIndex = d.originalIndex,
          placeholderProjectName = d.projectName,
          placeholderProjectFolder = d.projectFolder,
          placeholderBatchKind = d.batchKind;
        (u.delete(e),
          u.set(t, {
            mediaId: t,
            promptIndex: placeholderPromptIndex,
            prompt: r || "",
            fifeUrl: a || p,
            videoUrl: s || null,
            status: "ready",
            type: o || "image",
            isPlaceholder: !1,
            suffix: placeholderSuffix,
            isPortrait: placeholderPortrait,
            originalIndex: placeholderOriginalIndex,
            workflowId: i || null,
            refThumbs: placeholderRefs,
            batchId: placeholderBatchId,
            batchName: placeholderBatchName,
            projectName: placeholderProjectName || projectName || null,
            projectFolder: placeholderProjectFolder || projectFolder || null,
            batchKind: placeholderBatchKind || batchKind || null,
            fileName: _fileName || null,
          }),
          (m = !0));
        break;
      }
  if (!m)
    for (const [e, n] of u)
      if (n.isPlaceholder && n.promptIndex === c) {
        const g = n.suffix,
          f = n.isPortrait,
          h = n.batchId,
          b = n.batchName,
          v = n.originalIndex;
        (u.delete(e),
          u.set(t, {
            mediaId: t,
            promptIndex: c,
            prompt: r || "",
            fifeUrl: a || p,
            videoUrl: s || null,
            status: "ready",
            type: o || "image",
            isPlaceholder: !1,
            suffix: g,
            isPortrait: f,
            originalIndex: v,
            workflowId: i || null,
            refThumbs: n.refThumbs || [],
            batchId: h || l || null,
            batchName: b || d || null,
            projectName: n.projectName || projectName || null,
            projectFolder: n.projectFolder || projectFolder || null,
            batchKind: n.batchKind || batchKind || null,
            fileName: _fileName || null,
          }),
          (m = !0));
        break;
      }
  (m ||
    u.set(t, {
      mediaId: t,
      promptIndex: c,
      prompt: r || "",
      fifeUrl: a || p,
      videoUrl: s || null,
      status: "ready",
      type: o || "image",
      isPlaceholder: !1,
      originalIndex: n,
      workflowId: i || null,
      batchId: l || null,
      batchName: d || null,
      projectName: projectName || null,
      projectFolder: projectFolder || null,
      batchKind: batchKind || null,
      fileName: _fileName || null,
    }),
    tfCaptureGalleryPreview(t, a || p, o),
    Fa(),
    Ca());
}
function Na(e, t) {
  const a = u.get(e);
  if (!a) return;
  a.status = t;
  const n = document.querySelector(`.gallery-item-v2[data-media-id="${e}"]`);
  if (n) {
    const e = n.querySelector(".gallery-item-status");
    if (e) {
      const a = {
          generating: { label: "Generating", cls: "st-generating" },
          ready: { label: "Ready", cls: "st-ready" },
          downloading: { label: "Saving", cls: "st-downloading" },
          done: { label: "Saved", cls: "st-done" },
          failed: { label: "Failed", cls: "st-failed" },
        },
        n = a[t] || a.generating;
      ((e.textContent = n.label),
        (e.className = "gallery-item-status " + n.cls));
    }
  } else Fa();
  Ca();
}
function qa(e, t, a, n) {
  const s = t.imageCount || 1,
    i = t.mode || "image",
    d = Ma("image" === i ? t.aspectRatio : t.videoRatio, i),
    c = "ratio-9-16" === d || "ratio-3-4" === d,
    p = a || e.map((e, t) => t),
    m = n?.batchId || null,
    f = n?.batchName || null,
    projectName = n?.projectName || null,
    projectFolder = n?.projectFolder || null,
    batchKind = n?.batchKind || null;
  let b = !1,
    v = [];
  if (m)
    for (const [e, t] of u)
      t.batchId === m && (v.push({ key: e, item: t }), (b = !0));
  if (!b) {
    let e = -1;
    for (const [t, a] of u) a.promptIndex > e && (e = a.promptIndex);
    h = e + 1;
  }
  (e.forEach((e, a) => {
    const n = p[a],
      r = "video" === i ? t.videoCount || 1 : s;
    let o;
    if (b) {
      const e = v.find(({ item: e }) => e.originalIndex === n);
      if (e) {
        o = e.item.promptIndex;
        for (const { key: e, item: t } of v)
          t.originalIndex === n && (u.delete(e), g.delete(e));
      } else o = h + a;
    } else o = h + a;
    for (let t = 0; t < r; t++) {
      const a = `placeholder-${o}-${t}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        s = r > 1 && t > 0 ? String.fromCharCode(97 + t) : "";
      let p = [];
      const g = l.activeBatchId ? pn(l.activeBatchId) : null,
        h = g?.settings;
      if ("mapped" === h?.referenceMode && h?.perPromptThumbnails) {
        const e = h.perPromptStartFrames?.[n];
        if (e) {
          const t = h.perPromptThumbnails[e];
          t && p.push(t);
        }
        const t = h.perPromptReferences?.[n] || [];
        for (const e of t) {
          const t = h.perPromptThumbnails[e];
          t && p.push(t);
        }
      }
      u.set(a, {
        mediaId: a,
        promptIndex: o,
        prompt: e.substring(0, 60),
        fifeUrl: null,
        status: "generating",
        type: i,
        isPlaceholder: !0,
        suffix: s,
        isPortrait: c,
        ratioClass: d,
        originalIndex: n,
        refThumbs: p,
        batchId: m,
        batchName: f,
        projectName,
        projectFolder,
        batchKind,
      });
    }
  }),
    g.clear(),
    Ba(),
    ee(),
    o(".tab").forEach((e) => e.classList.remove("active")),
    o(".tab-content").forEach((e) => e.classList.remove("active")),
    r('[data-tab="queue"]')?.classList.add("active"),
    r("#tab-queue")?.classList.add("active"));
}
function Oa() {
  let e = 0;
  for (const [t, a] of u)
    a.isPlaceholder &&
      "generating" === a.status &&
      ((a.status = "failed"), e++);
  return (e > 0 && (Ba(), Ca()), e);
}
