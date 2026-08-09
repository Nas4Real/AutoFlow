// TurboFlow side panel shard: Shared side panel state, storage, low-level helpers, upload helpers
// Loaded by src/sidepanel/index.html in numeric order.

let e = null,
  t = null;
const r = (e) => document.querySelector(e),
  o = (e) => document.querySelectorAll(e),
  LOCAL_USER = {
    email: "local@extension.invalid",
    name: "Local User",
    picture: "",
    token: "local",
  },
  LOCAL_PLAN = {
    plan: "pro",
    promptsPerDay: 0,
    promptsUsedToday: 0,
    promptsRemaining: -1,
    trial: !1,
    localOnly: !0,
  },
  TF_JACK_REFERENCE_SOURCE = "json-jack-reference";
let s = null,
  i = null;
const l = {
  queue: [],
  batches: [],
  activeBatchId: null,
  gallery: [],
  mode: "image",
  singlePromptMode: !1,
  stripTagsOnSave: !1,
  speedMode: "fast",
  settings: {
    imageModel: "NARWHAL",
    imageRatio: "IMAGE_ASPECT_RATIO_LANDSCAPE",
    imageCount: 2,
    videoQuality: "lite",
    videoRatio: "landscape",
    videoMode: "text",
    videoCount: 1,
    videoDuration: 8,
    autoDownloadImages: !1,
    autoDownloadVideos: !1,
    imageDownloadQuality: "standard",
    videoDownloadQuality: "standard",
    folder: "turboflow",
    videoProjectName: "",
    namingSeparator: "-",
    startNumber: 1,
  },
  startFrameMediaId: null,
  endFrameMediaId: null,
  referenceMediaIds: [],
  imageReferenceMediaIds: [],
  stats: { total: 0, downloaded: 0, failed: 0 },
  avgTimePerImage: null,
  batchStartTime: null,
  promptReferenceMap: {},
  promptStartFrameMap: {},
  promptEndFrameMap: {},
  referenceMode: "shared",
};
let d = [],
  c = null,
  p = !1,
  m = null;
const u = new Map(),
  g = new Set();
let f = !1,
  h = 0;
const b = new Set(),
  v = new Set();
let y = [],
  w = null,
  I = null,
  E = [],
  k = 10,
  M = null,
  $ = [],
  L = 0,
  x = !1,
  S = !0,
  _ = { all: 0, errors: 0, activity: 0 },
  P = "all",
  A = !1,
  T = null,
  C = null,
  R = 0,
  F = null,
  D = 0,
  N = !1,
  q = 0,
  O = !1,
  U = !1,
  B = !1,
  j = !1,
  G = !1,
  H = !1,
  Q = [],
  W = [],
  V = [],
  z = [],
  Y = null,
  K = [],
  tfPendingAutoRunAfterRelink = null;
function J() {
  chrome.storage.local.set({
    flowAutoQueue: l.queue,
    flowAutoSettings: l.settings,
    flowAutoMode: l.mode,
    flowAutoRefMap: l.promptReferenceMap,
    flowAutoRefMode: l.referenceMode,
    flowAutoStartFrameMap: l.promptStartFrameMap,
    flowAutoEndFrameMap: l.promptEndFrameMap,
    flowAutoSinglePromptMode: l.singlePromptMode,
    flowAutoStripTagsOnSave: l.stripTagsOnSave,
    flowAutoSpeedMode: l.speedMode,
  });
}
function X() {
  chrome.storage.local.set({
    flowAutoBatches: l.batches,
    flowAutoAvgTime: l.avgTimePerImage,
  });
}
async function Z() {
  const e = await chrome.storage.local.get([
    "flowAutoQueue",
    "flowAutoSettings",
    "flowAutoMode",
    "flowAutoRefMap",
    "flowAutoRefMode",
    "flowAutoStartFrameMap",
    "flowAutoEndFrameMap",
    "flowAutoSinglePromptMode",
    "flowAutoStripTagsOnSave",
    "flowAutoSpeedMode",
    "flowAutoSlowMode",
  ]);
  if (
    (e.flowAutoQueue && (l.queue = e.flowAutoQueue),
    e.flowAutoMode &&
      ((l.mode = e.flowAutoMode),
      o("[data-mode]").forEach((e) =>
        e.classList.toggle("active", e.dataset.mode === l.mode),
      ),
      (r("#image-settings").style.display =
        "image" === l.mode ? "block" : "none"),
      (r("#video-settings").style.display =
        "video" === l.mode ? "block" : "none")),
    e.flowAutoSettings)
  ) {
    ((l.settings = { ...l.settings, ...e.flowAutoSettings }),
      (r("#setting-autodownload-images").checked =
        !1 !== l.settings.autoDownloadImages),
      (r("#setting-autodownload-videos").checked =
        !1 !== l.settings.autoDownloadVideos),
      (r("#setting-image-quality").value =
        l.settings.imageDownloadQuality || "2k"),
      (r("#setting-video-quality-dl").value =
        l.settings.videoDownloadQuality || "standard"),
      "IMAGEN_3_5" === l.settings.imageModel &&
        (l.settings.imageModel = "GEM_PIX_2"));
    const t = !1 !== l.settings.autoDownloadImages;
    ((r("#setting-image-quality-row").style.opacity = t ? "1" : "0.4"),
      (r("#setting-image-quality").disabled = !t));
    const a = !1 !== l.settings.autoDownloadVideos;
    ((r("#setting-video-quality-row").style.opacity = a ? "1" : "0.4"),
      (r("#setting-video-quality-dl").disabled = !a),
      (r("#setting-folder").value = l.settings.folder || "turboflow"),
      (r("#setting-video-project-name").value =
        l.settings.videoProjectName ||
        ("turboflow" !== l.settings.folder ? l.settings.folder || "" : "")),
      tfSyncProjectFolder(!0),
      (r("#setting-image-model").value = l.settings.imageModel || "GEM_PIX_2"),
      (r("#setting-video-quality").value = l.settings.videoQuality || "fast"),
      (r("#setting-naming").value = l.settings.naming || "numbered"));
    const n = !1;
    ((r("#setting-prefix-row").style.display = n ? "flex" : "none"),
      (r("#setting-separator-row").style.display = n ? "flex" : "none"),
      (r("#setting-separator").value =
        void 0 !== l.settings.namingSeparator
          ? l.settings.namingSeparator
          : "-"),
      (r("#setting-start-number").value = l.settings.startNumber || 1),
      o("[data-img-ratio]").forEach((e) =>
        e.classList.toggle(
          "active",
          e.dataset.imgRatio === l.settings.imageRatio,
        ),
      ),
      o("[data-img-count]").forEach((e) =>
        e.classList.toggle(
          "active",
          parseInt(e.dataset.imgCount) === l.settings.imageCount,
        ),
      ),
      o("[data-vid-ratio]").forEach((e) =>
        e.classList.toggle(
          "active",
          e.dataset.vidRatio === l.settings.videoRatio,
        ),
      ),
      o("[data-vid-count]").forEach((e) =>
        e.classList.toggle(
          "active",
          parseInt(e.dataset.vidCount) === (l.settings.videoCount || 1),
        ),
      ),
      o("[data-vid-duration]").forEach((e) =>
        e.classList.toggle(
          "active",
          parseInt(e.dataset.vidDuration) === (l.settings.videoDuration || 8),
        ),
      ),
      o("[data-vid-mode]").forEach((e) =>
        e.classList.toggle(
          "active",
          e.dataset.vidMode === (l.settings.videoMode || "text"),
        ),
      ),
      "quality" === l.settings.videoQuality &&
        (r('[data-vid-mode="reference"]')?.classList.add("locked"),
        "reference" === l.settings.videoMode &&
          ((l.settings.videoMode = "text"),
          o("[data-vid-mode]").forEach((e) =>
            e.classList.toggle("active", "text" === e.dataset.vidMode),
          ))),
      "video" === l.mode && Wn());
  }
  (e.flowAutoRefMap && (l.promptReferenceMap = e.flowAutoRefMap),
    e.flowAutoRefMode && (l.referenceMode = e.flowAutoRefMode),
    e.flowAutoStartFrameMap &&
      (l.promptStartFrameMap = e.flowAutoStartFrameMap),
    e.flowAutoEndFrameMap && (l.promptEndFrameMap = e.flowAutoEndFrameMap),
    void 0 !== e.flowAutoSinglePromptMode &&
      (l.singlePromptMode = e.flowAutoSinglePromptMode),
    void 0 !== e.flowAutoStripTagsOnSave &&
      (l.stripTagsOnSave = e.flowAutoStripTagsOnSave),
    void 0 !== e.flowAutoSpeedMode
      ? (l.speedMode = e.flowAutoSpeedMode)
      : void 0 !== e.flowAutoSlowMode &&
        ((l.speedMode = e.flowAutoSlowMode ? "slow" : "fast"),
        chrome.storage.local.set({ flowAutoSpeedMode: l.speedMode }),
        chrome.storage.local.remove("flowAutoSlowMode")));
  const t = await chrome.storage.local.get([
    "flowAutoBatches",
    "flowAutoAvgTime",
  ]);
  (t.flowAutoBatches &&
    ((l.batches = t.flowAutoBatches),
    l.batches.forEach((e) => {
      ("done" !== e.status && "partial" !== e.status) || (e.collapsed = !0);
    }),
    Sn()),
    t.flowAutoAvgTime && (l.avgTimePerImage = t.flowAutoAvgTime),
    Ia(),
    ka(),
    Ea(),
    "function" == typeof Ue && Ue(),
    "function" == typeof tr && tr(),
    "function" == typeof er && er(),
    "function" == typeof Qn && Qn());
  "function" == typeof tfRefreshGenerateSurface && tfRefreshGenerateSurface();
  const a = document.querySelector("#single-prompt-toggle");
  a && (a.checked = l.singlePromptMode);
}
function ee() {
  const e = u,
    t = g;
  if (e.size > 3e3) {
    const a = [...e.entries()].sort(
      (e, t) => e[1].promptIndex - t[1].promptIndex,
    );
    a.slice(0, a.length - 3e3).forEach(([a]) => {
      (e.delete(a), t.delete(a));
    });
  }
  const a = [];
  for (const [t, n] of e) {
    let e = n.fifeUrl;
    (n.localFile ||
      tfIsLocalPreviewUrl(e) ||
      n.isPlaceholder ||
      "video" === n.type ||
      !t ||
      t.startsWith("placeholder-") ||
      (e = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${t}`),
      a.push({
        mediaId: t,
        promptIndex: n.promptIndex,
        prompt: n.prompt || "",
        fifeUrl: e,
        videoUrl: n.videoUrl || null,
        status: n.status || "ready",
        type: n.type || "image",
        suffix: n.suffix || "",
        isPortrait: n.isPortrait || !1,
        ratioClass: n.ratioClass || null,
        isPlaceholder: n.isPlaceholder || !1,
        originalIndex: n.originalIndex,
        workflowId: n.workflowId || null,
        refThumbs: n.refThumbs || [],
        batchId: n.batchId || null,
        batchName: n.batchName || null,
        projectName: n.projectName || null,
        projectFolder: n.projectFolder || null,
        batchKind: n.batchKind || null,
        fileName: n.fileName || null,
        localFile: n.localFile || !1,
        localSyncId: n.localSyncId || null,
      }));
  }
  chrome.storage.local.set({ turboflowGallery: a });
}
async function te() {
  const e = await chrome.storage.local.get("turboflowGallery");
  let a = 0;
  if (e.turboflowGallery && Array.isArray(e.turboflowGallery)) {
    for (const t of e.turboflowGallery) {
      if (!t.mediaId) continue;
      if (
        t.localFile &&
        "video" !== t.type &&
        String(t.mediaId || "").startsWith("local-file-") &&
        (!t.fifeUrl ||
          String(t.fifeUrl).includes("media.getMediaUrlRedirect"))
      ) {
        a++;
        continue;
      }
      let e = t.fifeUrl || null;
      (t.localFile ||
        tfIsLocalPreviewUrl(e) ||
        t.isPlaceholder ||
        "video" === t.type ||
        !t.mediaId ||
        t.mediaId.startsWith("placeholder-") ||
        (e = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${t.mediaId}`),
        u.set(t.mediaId, {
          mediaId: t.mediaId,
          promptIndex: t.promptIndex,
          prompt: t.prompt || "",
          fifeUrl: e,
          videoUrl: t.videoUrl || null,
          status: t.status || "ready",
          type: t.type || "image",
          isPlaceholder: t.isPlaceholder || !1,
          originalIndex: t.originalIndex,
          suffix: t.suffix || "",
          isPortrait: t.isPortrait || !1,
          ratioClass: t.ratioClass || null,
          workflowId: t.workflowId || null,
          refThumbs: t.refThumbs || [],
          batchId: t.batchId || null,
          batchName: t.batchName || null,
          projectName: t.projectName || null,
          projectFolder: t.projectFolder || null,
          batchKind: t.batchKind || null,
          fileName: t.fileName || null,
          localFile: t.localFile || !1,
          localSyncId: t.localSyncId || null,
        }));
    }
    let t = -1;
    for (const [e, a] of u) a.promptIndex > t && (t = a.promptIndex);
    ((h = t + 1), Ba(), a > 0 && ee());
    if ("function" == typeof tfQueueGalleryCacheRepair)
      for (const [e, t] of u)
        "video" === t.type ||
          !t.fileName ||
          tfIsLocalPreviewUrl(t.fifeUrl) ||
          tfQueueGalleryCacheRepair(e, t.fileName);
  }
}
function ae() {
  const e = y.filter((e) => !e.uploading);
  chrome.storage.local.set({ turboflowImageLibrary: e });
}
async function ne() {
  const e = await chrome.storage.local.get("turboflowImageLibrary");
  e.turboflowImageLibrary &&
    Array.isArray(e.turboflowImageLibrary) &&
    ((y = e.turboflowImageLibrary), tfNormalizeJackLibraryEntries(), kt());
}
function re() {
  chrome.storage.local.set({ turboflowMapperImages: K });
}
async function oe() {
  const e = await chrome.storage.local.get("turboflowMapperImages");
  e.turboflowMapperImages &&
    Array.isArray(e.turboflowMapperImages) &&
    (K = e.turboflowMapperImages);
}
function se(e) {
  const t = document.createElement("div");
  return ((t.textContent = e), t.innerHTML);
}
function tfSafeFolderName(e, t = "turboflow") {
  const a = String(e || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop();
  return (
    String(a || "")
      .replace(/[<>:"|?*\x00-\x1f]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\.+|\.+$/g, "")
      .substring(0, 80) || t
  );
}
function tfCurrentProjectName(e = "turboflow") {
  const t = r("#setting-video-project-name")?.value;
  return String(t || l.settings.videoProjectName || e || "turboflow").trim();
}
function tfCurrentProjectFolder(e = "turboflow") {
  return tfSafeFolderName(tfCurrentProjectName(e), tfSafeFolderName(e));
}
function tfSyncProjectFolder(e = !1) {
  const t = r("#setting-video-project-name");
  if (!t) return;
  e && (t.value = l.settings.videoProjectName || "");
  const a = tfCurrentProjectFolder();
  ((l.settings.videoProjectName = t.value.trim()),
    (l.settings.folder = a));
  const n = r("#setting-folder");
  n && (n.value = a);
  e || J();
}
function tfPrefixDownloadPath(e, t) {
  const a = tfCleanDownloadPath(e || "media/item.png"),
    n = tfSafeFolderName(t || l.settings.folder || "turboflow");
  return a.toLowerCase().startsWith(n.toLowerCase() + "/") ? a : `${n}/${a}`;
}
function tfBatchKindLabel(e) {
  return "clips" === e
    ? "Clip generation"
    : "images" === e
      ? "Image generation"
      : "video" === e
        ? "Clip generation"
        : "Image generation";
}
function tfIsLocalPreviewUrl(e) {
  return /^(data:image\/|blob:|filesystem:)/i.test(String(e || ""));
}
function ie(e) {
  return new Promise((t) => setTimeout(t, e));
}
function le(e, t = {}) {
  return;
}
function de() {
  return {
    usedMapper: O,
    usedAutoChain: U,
    usedTags: B,
    usedLibrary: j,
    usedVideo: G,
  };
}
function ce(e, t, a = 120, n = 0.7) {
  return new Promise((r) => {
    const o = new Image();
    ((o.onload = () => {
      const e = document.createElement("canvas");
      let t = o.width,
        s = o.height;
      (t > s
        ? t > a && ((s = Math.round((s * a) / t)), (t = a))
        : s > a && ((t = Math.round((t * a) / s)), (s = a)),
        (e.width = t),
        (e.height = s),
        e.getContext("2d").drawImage(o, 0, 0, t, s),
        r(e.toDataURL("image/jpeg", n)));
    }),
      (o.onerror = () => r(null)),
      (o.src = `data:${t};base64,${e}`));
  });
}
function pe(e) {
  return !!e && !["PAYGATE_TIER_NOT_PAID", "PAYGATE_TIER_ONE"].includes(e);
}
function me() {
  const e = [];
  (e.push(String(navigator.hardwareConcurrency || 0)),
    e.push(String(window.devicePixelRatio || 1)),
    e.push(String(navigator.maxTouchPoints || 0)));
  const t = navigator.userAgent || "";
  t.includes("Windows")
    ? e.push("Windows")
    : t.includes("Mac")
      ? e.push("Mac")
      : t.includes("CrOS")
        ? e.push("ChromeOS")
        : t.includes("Linux")
          ? e.push("Linux")
          : t.includes("Android")
            ? e.push("Android")
            : e.push("unknown");
  try {
    e.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown");
  } catch (t) {
    e.push("unknown");
  }
  e.push(String(screen.colorDepth || 0));
  try {
    const t = document.createElement("canvas");
    ((t.width = 200), (t.height = 50));
    const a = t.getContext("2d");
    ((a.textBaseline = "top"),
      (a.font = "14px Arial"),
      (a.fillStyle = "#f60"),
      a.fillRect(50, 0, 100, 50),
      (a.fillStyle = "#069"),
      a.fillText("TurboFlow:fp", 2, 15),
      (a.fillStyle = "rgba(102, 204, 0, 0.7)"),
      a.fillText("TurboFlow:fp", 4, 17),
      a.beginPath(),
      a.arc(50, 25, 20, 0, 2 * Math.PI),
      (a.fillStyle = "#a8c7fa"),
      a.fill());
    const n = t.toDataURL();
    let r = 0,
      o = 5381;
    for (let e = 0; e < n.length; e++) {
      const t = n.charCodeAt(e);
      ((r = (r << 5) - r + t), (r &= r), (o = ((o << 5) + o) ^ t), (o &= o));
    }
    e.push("c:" + (r >>> 0).toString(36) + ":" + (o >>> 0).toString(36));
  } catch (t) {
    e.push("canvas-error");
  }
  try {
    const t = document.createElement("canvas"),
      a = t.getContext("webgl") || t.getContext("experimental-webgl");
    if (a) {
      const t = a.getExtension("WEBGL_debug_renderer_info");
      (t
        ? (e.push(a.getParameter(t.UNMASKED_VENDOR_WEBGL) || ""),
          e.push(a.getParameter(t.UNMASKED_RENDERER_WEBGL) || ""))
        : (e.push(a.getParameter(a.VENDOR) || ""),
          e.push(a.getParameter(a.RENDERER) || "")),
        e.push(String(a.getParameter(a.MAX_TEXTURE_SIZE) || 0)),
        e.push(String(a.getParameter(a.MAX_RENDERBUFFER_SIZE) || 0)));
      const n = a.getExtension("WEBGL_lose_context");
      n && n.loseContext();
    } else e.push("webgl-unavailable");
  } catch (t) {
    e.push("webgl-error");
  }
  return e.join("|");
}
function ue() {
  const e = l.mode,
    t = l.settings.videoMode;
  return "video" === e && "text" === t
    ? "disabled"
    : "video" === e && "start_frame" === t
      ? "start_frame"
      : "video" === e && "start_end_frame" === t
        ? "start_end_frame"
        : "reference";
}
function ge() {
  return (
    Object.keys(l.promptReferenceMap).length > 0 ||
    Object.keys(l.promptStartFrameMap).length > 0 ||
    Object.keys(l.promptEndFrameMap).length > 0
  );
}
function fe(e) {
  return "mapped" === l.referenceMode
    ? l.promptReferenceMap[e] || []
    : l.imageReferenceMediaIds;
}
function he(e) {
  return "mapped" === l.referenceMode
    ? l.promptStartFrameMap[e] || null
    : l.startFrameMediaId;
}
function be() {
  ((l.promptReferenceMap = {}),
    (l.promptStartFrameMap = {}),
    (l.promptEndFrameMap = {}),
    (l.referenceMode = "shared"),
    (K = []),
    chrome.storage.local.remove([
      "flowAutoRefMap",
      "flowAutoRefMode",
      "turboflowMapperImages",
      "flowAutoStartFrameMap",
      "flowAutoEndFrameMap",
    ]),
    J());
}
function tfResetPromptComposerMapping(e = {}) {
  const t = !0 === e.showToast;
  if ((be(), l.singlePromptMode)) {
    l.singlePromptMode = !1;
    const e = r("#single-prompt-toggle");
    e && (e.checked = !1);
  }
  (void 0 !== La && La.clear(),
    "function" == typeof tr && tr(),
    "function" == typeof er && er(),
    "function" == typeof Hn && Hn(),
    J(),
    Ia(),
    ka(),
    Ea(),
    t &&
      Te(e.message || "Reference mapping cleared - back to normal mode", "info"));
}
function ve(e) {
  const t = K.find((t) => t.mediaId === e);
  if (t?.thumbnail) return t.thumbnail;
  const a = y.find((t) => t.mediaId === e);
  return a?.thumbnail
    ? a.thumbnail
    : void 0 !== La && La.has(e)
      ? La.get(e)
      : null;
}
function ye(e, t, a) {
  const n = {};
  for (const t of Object.values(e || {}))
    for (const e of t) {
      if (n[e]) continue;
      const t = ve(e);
      t && (n[e] = t);
    }
  for (const e of Object.values(t || {})) {
    if (!e || n[e]) continue;
    const t = ve(e);
    t && (n[e] = t);
  }
  for (const e of Object.values(a || {})) {
    if (!e || n[e]) continue;
    const t = ve(e);
    t && (n[e] = t);
  }
  return n;
}
async function we(e, t = {}) {
  const {
      maxConcurrent: a = 10,
      delayBetweenMs: n = 100,
      onProgress: r = null,
      onFileStart: o = null,
      uploadFn: s = null,
    } = t,
    i = new Array(e.length).fill(null);
  let l = 0,
    d = 0,
    c = 0,
    p = a,
    m = 0,
    u = n,
    g = 0;
  return new Promise((t) => {
    async function f(c) {
      const f = e[c];
      (d++, o && o(c, f.name));
      try {
        const e = s || _e,
          t = await e(f);
        ((i[c] = { success: !0, entry: t, fileName: f.name }),
          (m = 0),
          p < a &&
            Date.now() - g > 5e3 &&
            ((p = Math.min(p + 2, a)), (u = Math.max(u - 25, n))));
      } catch (e) {
        i[c] = { success: !1, error: e.message, fileName: f.name };
        const t = e.message || "",
          a =
            t.includes("Rejected by Google") ||
            t.includes("corrupted") ||
            t.includes("unsupported") ||
            t.includes("too large") ||
            t.includes("400") ||
            t.includes("INVALID_ARGUMENT"),
          n =
            t.includes("Script execution failed") ||
            t.includes("Cannot access") ||
            t.includes("No tab") ||
            t.includes("Frame with"),
          r =
            t.includes("429") ||
            t.includes("Rate limited") ||
            t.includes("quota");
        a ||
          (n
            ? ((p = Math.max(3, Math.floor(p / 2))),
              (u = Math.min(2 * u, 800)),
              (g = Date.now()),
              Te(
                `⚡ Upload concurrency reduced to ${p}x (Chrome overloaded)`,
                "warn",
              ))
            : r
              ? ((p = Math.max(2, Math.floor(0.6 * p))),
                (u = Math.min(2 * u, 1e3)),
                (g = Date.now()),
                Te(
                  `⏳ Upload concurrency reduced to ${p}x (rate limited)`,
                  "warn",
                ))
              : (m++,
                m >= 3 &&
                  ((p = Math.max(3, p - 2)),
                  (u = Math.min(1.5 * u, 600)),
                  (g = Date.now()))));
      }
      if ((d--, l++, r)) {
        const t = i[c];
        r(l, e.length, f.name, t.success);
      }
      (l >= e.length && (t(i), 1)) || h();
    }
    function h() {
      for (; c < e.length && d < p; )
        if ((f(c++), c < e.length && d < p)) return void setTimeout(h, u);
    }
    0 !== e.length ? h() : t(i);
  });
}
function Ie(e) {
  const t = (e || "").toLowerCase();
  return t.includes("public_error_minor_upload") ||
    t.includes("invalid_argument")
    ? "Rejected by Google — image may be corrupted, too large, or in an unsupported format. Try re-saving as JPG/PNG under 10MB."
    : t.includes("too large") ||
        t.includes("payload too large") ||
        t.includes("413")
      ? "Image file is too large. Resize or compress it and try again."
      : t.includes("unsupported") ||
          t.includes("invalid mime") ||
          t.includes("invalid image")
        ? "Unsupported image format. Use JPG, PNG, or WebP."
        : t.includes("permission") ||
            t.includes("forbidden") ||
            t.includes("403")
          ? "Access denied — your Flow session may have expired. Refresh the Flow page."
          : t.includes("401") || t.includes("unauthorized")
            ? "Session expired — refresh the Flow page and try again."
            : t.includes("429") || t.includes("rate") || t.includes("quota")
              ? "Rate limited — too many uploads. Wait a moment and try again."
              : t.includes("500") || t.includes("502") || t.includes("503")
                ? "Google server error — try again in a few seconds."
                : t.includes("failed to fetch") ||
                    t.includes("networkerror") ||
                    t.includes("network")
                  ? "Network error — check your internet connection and try again."
                  : t.includes("timeout")
                    ? "Upload timed out — check your connection and try again."
                    : t.includes("extension context invalidated") ||
                        t.includes("could not establish connection")
                      ? "Extension disconnected — reload the extension and try again."
                      : e.substring(0, 120).replace(/\{.*$/s, "").trim() ||
                        "Upload failed — unknown error.";
}
