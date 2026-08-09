// TurboFlow background runtime shard: Filename rules, frame cache, downloads, logs, download-history sync
// Loaded by src/background/runtime.js in numeric order.

function Rt(e, t, a, r, o, n) {
  e =
    (e || "turboflow")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 40) || "turboflow";
  const i = parseInt(o?.startNumber) || 1,
    s = String(t + (i - 1)).padStart(3, "0") + (a || "");
  switch (o?.naming || "numbered") {
    case "prompt":
      return `${e}/${(n || "image")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 30)
        .replace(/-+$/, "")}-${s}.${r}`;
    case "prefix":
      return `${e}/${(o?.namingPrefix || "img").replace(/[^a-zA-Z0-9_\-\.]/g, "-").replace(/[-_\.]+$/, "")}${"string" == typeof o?.namingSeparator ? o.namingSeparator : "-"}${s}.${r}`;
    default:
      return `${e}/${s}.${r}`;
  }
}
function tfNormalizeFramePath(e, t = "png") {
  const a = String(e || "")
    .replace(/\\/g, "/")
    .replace(/^[a-zA-Z]:/, "")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .filter((e) => "." !== e && ".." !== e)
    .map((e) => e.replace(/[<>:"|?*\x00-\x1f]/g, "-").trim())
    .filter(Boolean);
  if (!a.length) return null;
  let r = a.pop().replace(/\.[^/.]+$/, "");
  a.push(`${r}.${t}`);
  return a.join("/");
}
const TF_FRAME_CACHE_DB_VERSION = 2;
let tfFrameCacheDbPromise = null;
function tfFrameCacheDb() {
  if (tfFrameCacheDbPromise) return tfFrameCacheDbPromise;
  tfFrameCacheDbPromise = new Promise((e, t) => {
    const a = indexedDB.open("turboflow-frame-cache", TF_FRAME_CACHE_DB_VERSION);
    ((a.onupgradeneeded = () => {
      const e = a.result;
      e.objectStoreNames.contains("frames") ||
        e.createObjectStore("frames", { keyPath: "key" });
      e.objectStoreNames.contains("frameAliases") ||
        e.createObjectStore("frameAliases", { keyPath: "key" });
    }),
      (a.onsuccess = () => e(a.result)),
      (a.onerror = () => t(a.error || new Error("Frame cache open failed"))));
  });
  return tfFrameCacheDbPromise;
}
function tfFrameCacheStoreExists(e, t) {
  return !!e?.objectStoreNames && e.objectStoreNames.contains(t);
}
function tfFrameMediaAlias(e) {
  const t = String(e || "").trim();
  return t ? `media:${t}`.toLowerCase() : "";
}
function tfFrameHashAlias(e) {
  const t = String(e || "").trim().toLowerCase();
  return t ? (t.startsWith("sha256:") ? t : `sha256:${t}`) : "";
}
function tfFrameCacheLookupCandidates(e) {
  const t = [];
  const a = String(e || "").trim().toLowerCase();
  const r = tfNormalizeFramePath(e, "png");
  a && t.push(a);
  r && t.push(r.toLowerCase());
  return Array.from(new Set(t.filter(Boolean)));
}
function tfDataUrlBase64(e) {
  const t = String(e || "");
  const a = t.indexOf(",");
  return a >= 0 ? t.slice(a + 1) : t;
}
function tfBase64ByteLength(e) {
  const t = String(e || "").replace(/\s+/g, "");
  if (!t) return 0;
  const a = t.endsWith("==") ? 2 : t.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((t.length * 3) / 4) - a);
}
async function tfSha256Base64(e) {
  if (!globalThis.crypto?.subtle || typeof atob !== "function") return "";
  const t = atob(String(e || ""));
  const a = new Uint8Array(t.length);
  for (let e = 0; e < t.length; e++) a[e] = t.charCodeAt(e);
  const r = await globalThis.crypto.subtle.digest("SHA-256", a);
  return Array.from(new Uint8Array(r))
    .map((e) => e.toString(16).padStart(2, "0"))
    .join("");
}
function tfIdbGet(e, t, a) {
  if (!tfFrameCacheStoreExists(e, t) || !a) return Promise.resolve(null);
  return new Promise((r, o) => {
    const n = e.transaction(t, "readonly"),
      i = n.objectStore(t).get(a);
    ((i.onsuccess = () => r(i.result || null)),
      (i.onerror = () => o(i.error || new Error("Frame cache read failed"))));
  });
}
function tfWriteCachedFrame(e, t, a) {
  return new Promise((r, o) => {
    const n = e.transaction(["frames", "frameAliases"], "readwrite");
    n.objectStore("frames").put(t);
    a.forEach((e) => n.objectStore("frameAliases").put(e));
    ((n.oncomplete = () => r()),
      (n.onerror = () => o(n.error || new Error("Frame cache write failed"))));
  });
}
async function tfCacheFrameBase64(e, t, a = "image/png", r = {}) {
  const o = tfNormalizeFramePath(e, "png"),
    n = tfDataUrlBase64(t),
    i = tfFrameMediaAlias(r.mediaId),
    s = await tfSha256Base64(n).catch(() => ""),
    c = tfFrameHashAlias(s),
    l = o ? o.toLowerCase() : "",
    d = i || c || l;
  if (!d || !n) return null;
  try {
    const t = await tfFrameCacheDb(),
      u = Date.now(),
      p = {
        key: d,
        fileName: o || String(e || "").trim() || `${String(r.mediaId || "frame")}.png`,
        base64: n,
        mimeType: a || r.mimeType || "image/png",
        mediaId: String(r.mediaId || "").trim(),
        cacheKey: c,
        byteLength: tfBase64ByteLength(n),
        width: Number(r.width || 0) || null,
        height: Number(r.height || 0) || null,
        sourceUrl: r.sourceUrl || "",
        cachedAt: u,
      },
      m = Array.from(new Set([l, i, c].filter(Boolean)))
        .filter((e) => e !== d)
        .map((e) => ({ key: e, frameKey: d, updatedAt: u }));
    await tfWriteCachedFrame(t, p, m);
    Yt(`Cached local frame ${p.fileName}`, "info");
    return {
      cacheKey: p.cacheKey,
      fileName: p.fileName,
      mimeType: p.mimeType,
      byteLength: p.byteLength,
      cachedAt: p.cachedAt,
      mediaId: p.mediaId,
    };
  } catch (e) {
    Yt(`Frame cache skipped: ${e.message}`, "warn");
    return null;
  }
}
async function tfGetCachedFrame(e) {
  const t = tfFrameCacheLookupCandidates(e);
  if (!t.length) return null;
  const a = await tfFrameCacheDb();
  for (const e of t) {
    const t = await tfIdbGet(a, "frames", e);
    if (t?.base64) return t;
    const r = await tfIdbGet(a, "frameAliases", e);
    if (r?.frameKey) {
      const e = await tfIdbGet(a, "frames", r.frameKey);
      if (e?.base64) return e;
    }
  }
  return null;
}
async function tfUploadCachedFrame(e) {
  const t = await tfGetCachedFrame(e);
  if (!t?.base64) throw new Error("Frame is not in local cache");
  const a = t.fileName.split("/").pop() || "frame.png",
    r = await tt(t.base64, a, t.mimeType || "image/png");
  return { mediaId: r, fileName: t.fileName, mimeType: t.mimeType || "image/png" };
}
async function tfCaptureGeneratedImagePreview(e, t) {
  if (!c || !chrome.scripting?.executeScript) {
    throw new Error("Flow tab unavailable for preview cache");
  }
  const a = [
    e
      ? `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${encodeURIComponent(e)}`
      : "",
    t || "",
  ].filter(Boolean);
  if (!a.length) throw new Error("No image URL available for preview cache");
  const r = await chrome.scripting.executeScript({
      target: { tabId: c },
      world: "MAIN",
      func: async (e) => {
        async function t(e) {
          return await new Promise((t) => {
            const a = new Image();
            ((a.crossOrigin = "anonymous"),
              (a.onload = () => {
                try {
                  const r = document.createElement("canvas");
                  ((r.width = a.naturalWidth),
                    (r.height = a.naturalHeight),
                    r.getContext("2d").drawImage(a, 0, 0));
                  const o = r.width || 0,
                    n = r.height || 0;
                  r.toBlob((a) => {
                    if (!a) return void t({ error: "Canvas toBlob failed" });
                    const r = new FileReader();
                    ((r.onloadend = () =>
                      t({
                        base64: String(r.result || "").split(",")[1] || "",
                        mimeType: a.type || "image/png",
                        width: o,
                        height: n,
                        byteLength: a.size || 0,
                        sourceUrl: e,
                      })),
                      (r.onerror = () => t({ error: "Preview read failed" })),
                      r.readAsDataURL(a));
                  }, "image/png");
                } catch (e) {
                  t({ error: e.message || "Canvas capture failed" });
                }
              }),
              (a.onerror = () => t({ error: "Image load failed" })),
              (a.src = e));
          });
        }
        let a = "";
        for (const r of e) {
          const e = await t(r);
          if (e?.base64) return e;
          a = e?.error || "Image capture failed";
        }
        return { error: a || "Image capture failed" };
      },
      args: [a],
    }),
    o = r?.[0]?.result;
  if (!o?.base64) throw new Error(o?.error || "Preview cache capture failed");
  return o;
}
async function tfCacheGeneratedImagePreview(e = {}) {
  const t = String(e.mediaId || "").trim(),
    a = String(e.fileName || "").trim() || (t ? `${t}.png` : ""),
    r = e.cacheKey || tfFrameMediaAlias(t) || a,
    o = r ? await tfGetCachedFrame(r).catch(() => null) : null;
  if (o?.base64) {
    return {
      cacheKey: o.cacheKey || "",
      fileName: o.fileName || a,
      mimeType: o.mimeType || "image/png",
      byteLength: o.byteLength || tfBase64ByteLength(o.base64),
      cachedAt: o.cachedAt || null,
      mediaId: o.mediaId || t,
      base64: e.includeBase64 ? o.base64 : null,
    };
  }
  const n = await tfCaptureGeneratedImagePreview(t, e.fifeUrl || e.previewUrl || "");
  const i = await tfCacheFrameBase64(a, n.base64, n.mimeType || "image/png", {
    mediaId: t,
    width: n.width,
    height: n.height,
    sourceUrl: n.sourceUrl || e.fifeUrl || "",
  });
  if (i && e.notify !== false) {
    zt("PREVIEW_CACHED", {
      mediaId: t,
      promptIndex: e.promptIndex,
      mediaType: "image",
      uiBatchId: e.uiBatchId || null,
      fileName: i.fileName || a,
      cacheKey: i.cacheKey || "",
      cachedFileName: i.fileName || a,
      mimeType: i.mimeType || "image/png",
      byteLength: i.byteLength || 0,
    });
  }
  return i
    ? Object.assign({}, i, { base64: e.includeBase64 ? n.base64 : null })
    : null;
}
function tfExactDownloadName(e, t, a, r, o = null) {
  const n = e?.perPromptFileNames?.[t];
  if (!n) return null;
  const i = String(n)
    .replace(/\\/g, "/")
    .replace(/^[a-zA-Z]:/, "")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .filter((e) => "." !== e && ".." !== e)
    .map((e) => e.replace(/[<>:"|?*\x00-\x1f]/g, "-").trim())
    .filter(Boolean);
  if (!i.length) return null;
  let s = i.pop();
  const c = s.replace(/\.[^/.]+$/, ""),
    l = parseInt(e?.imageCount) || 1,
    d =
      l > 1 && Number.isInteger(o)
        ? `__${o + 1}`
        : a
          ? a
          : "",
    u = `${c}${d}`;
  return (i.push(`${u}.${r}`), i.join("/"));
}
function kt(e, t) {
  if (K.has(e)) return;
  K.add(e);
  const a = V.get(t);
  if (void 0 === a)
    return void zt("LOG", {
      message: `⚠️ Unknown batchId ${t.substring(0, 8)}... — skipping`,
      type: "error",
    });
  z.has(a) || z.set(a, []);
  const r = z.get(a),
    o = r.length;
  r.push(e);
  const n = a + 1;
  let i = "";
  o > 0 && (i = String.fromCharCode(97 + o));
  const s = String(n).padStart(3, "0") + i;
  if (!_)
    return (
      E.total++,
      E.downloaded++,
      void zt("IMAGE_READY", { message: `🖼 #${s} generated`, stats: { ...E } })
    );
  const c = Y.get(e);
  (W.push({
    mediaId: e,
    promptIndex: a,
    fileNum: n,
    fileSuffix: i,
    type: "image",
    status: "pending",
    prompt: c?.prompt || "",
    namingSettings: w,
    fileName: tfExactDownloadName(w, a, i, "png", o),
  }),
    E.total++,
    zt("IMAGE_READY", {
      message: `🖼 #${s} generated — downloading 2K`,
      stats: { ...E },
    }),
    Z || Vt());
}
function Lt(e, t, a) {
  if (
    (zt("LOG", {
      message: `📥 Video #${String(a + 1).padStart(3, "0")} queued for download`,
      type: "info",
    }),
    W.some((e) => e.mediaId === t && "video" === e.type))
  )
    return;
  K.add(t);
  const r = a + 1,
    o = String(r).padStart(3, "0"),
    n = Y.get(t);
  if (!y)
    return (
      E.total++,
      E.downloaded++,
      void zt("IMAGE_READY", { message: `🎬 #${o} generated`, stats: { ...E } })
    );
  (W.push({
    mediaId: t,
    videoUrl: e,
    promptIndex: a,
    fileNum: r,
    fileSuffix: "",
    type: "video",
    status: "pending",
    prompt: n?.prompt || "",
    namingSettings: w,
    fileName: tfExactDownloadName(w, a, "", "mp4"),
    workflowId: n?.workflowId || null,
    videoAspectRatio: w?.videoRatio || "landscape",
  }),
    E.total++,
    zt("IMAGE_READY", {
      message: `🎬 #${o} generated — downloading`,
      stats: { ...E },
    }),
    zt("LOG", {
      message: `📥 Queue now has ${W.length} items, worker running: ${Z}`,
      type: "info",
    }),
    Z || Vt());
}
function xt(e, t) {
  return new Promise((a, r) => {
    chrome.downloads.download(
      { url: e, filename: t, saveAs: !1, conflictAction: "uniquify" },
      (e) => {
        chrome.runtime.lastError
          ? r(new Error(chrome.runtime.lastError.message))
          : (re.set(e, t), a(e));
      },
    );
  });
}
function Nt(e) {
  return new Promise((t) => {
    (oe.set(e, () => {
      (re.delete(e), t());
    }),
      setTimeout(() => {
        oe.has(e) && (oe.delete(e), re.delete(e), t());
      }, 6e4));
  });
}
async function Dt(e, t, a) {
  const r = String(e.fileNum).padStart(3, "0") + (e.fileSuffix || ""),
    o = "video" === e.type ? "mp4" : "png",
    n = e.fileName || Rt(h, e.fileNum, e.fileSuffix, o, e.namingSettings, e.prompt);
  for (let e = 0; e < 15; e++) {
    try {
      if ("complete" === (await chrome.tabs.get(c)).status) break;
    } catch (e) {}
    await we(1e3);
  }
  ((e.status = "downloading"),
    q++,
    zt("DOWNLOAD_STARTED", { mediaId: e.mediaId }));
  try {
    "image" === e.type
      ? await Ut(e, r, n, t, a)
      : "video" === e.type && (await Bt(e, r, n, t, a));
  } catch (t) {
    e.retried
      ? ((e.status = "failed"),
        E.failed++,
        zt("LOG", { message: `❌ #${r} download failed`, type: "error" }),
        zt("DOWNLOAD_FAILED", { mediaId: e.mediaId }))
      : ((e.retried = !0),
        (e.status = "pending"),
        zt("LOG", { message: `⟳ #${r} retrying...`, type: "warn" }));
  }
  q--;
}
async function Ut(e, t, a, r, o) {
  let n = null,
    i = r;
  null === ce && (ce = "standard");
  const s = "4k" === I && !N,
    c = "standard" === I;
  if (s) {
    if (((n = await $t(e, t, i, o)), n?.success && n.base64))
      return (
        await jt(e, t, a, n.base64),
        void ((null !== ce && "standard" !== ce) || (ce = "4k"))
      );
    i = await Qe(!0);
  }
  if (!c && !R && ((n = await Gt(e, t, i, o)), n?.success && n.base64))
    return (
      await jt(e, t, a, n.base64),
      void (s
        ? "4k" === ce
          ? (ce = "4k_with_fallback")
          : (null !== ce && "standard" !== ce) || (ce = "4k_with_fallback")
        : (null !== ce && "standard" !== ce) || (ce = "2k"))
    );
  (await Ht(e, t, a),
    "4k" === ce
      ? (ce = "4k_with_fallback")
      : "2k" === ce
        ? (ce = "2k_with_fallback")
        : null === ce && (ce = "standard"));
}
async function $t(e, t, a, r) {
  let o = null,
    n = a;
  for (let a = 0; a <= 3; a++) {
    const i = Date.now() - L;
    if (i < x) {
      const e = x - i;
      await we(e);
    }
    if (((o = await at(e.mediaId, r, n, "4k")), o?.success))
      return ((x = 5e3), Q !== J && (Q = J), o);
    const s = o?.error || "",
      c = o?.status,
      l = s.includes("429"),
      d = s.includes("500"),
      u = 403 === c || s.includes("403"),
      p = s.includes("DAILY_QUOTA_REACHED") || s.includes("RESOURCE_EXHAUSTED"),
      m = s.includes("permission") || s.includes("PERMISSION_DENIED");
    if (u && m)
      return (
        (N = !0),
        Kt(
          "⚠️ 4K upscale requires Google AI Ultra — downloading in 2K instead",
          "warn",
        ),
        null
      );
    if (l && p)
      return (
        (N = !0),
        Kt(
          "⚠️ Your Google account's 4K upscale limit reached — switching to 2K",
          "warn",
        ),
        null
      );
    if (u) return null;
    if ((!l && !d) || 3 === a) break;
    if (l)
      ((L = Date.now()),
        k++,
        (x = Math.min(1.5 * x, 2e4)),
        1 !== Q && ((Q = 1), Kt("⏳ 4K rate limited — slowing down", "warn")),
        zt("LOG", {
          message: `🛑 4K upscale ${t} rate limited — cooldown ${(x / 1e3).toFixed(1)}s (${a + 1}/3)`,
          type: "warn",
        }));
    else {
      const e = 1500 * Math.pow(1.5, a) + 500 * Math.random();
      (zt("LOG", {
        message: `⏳ 4K upscale ${t} server error — retry in ${(e / 1e3).toFixed(1)}s (${a + 1}/3)`,
        type: "warn",
      }),
        await we(e));
    }
    n = await Qe(!0);
  }
  return null;
}
async function Gt(e, t, a, r) {
  let o = null,
    n = a;
  for (let a = 0; a <= 3; a++) {
    const i = Date.now() - S;
    if (i < M) {
      const e = M - i;
      await we(e);
    }
    if (((o = await at(e.mediaId, r, n, "2k")), o?.success))
      return ((M = 5e3), Q !== J && (Q = J), o);
    const s = o?.error || "",
      c = s.includes("429"),
      l = s.includes("500"),
      d = s.includes("DAILY_QUOTA_REACHED") || s.includes("RESOURCE_EXHAUSTED");
    if (c && d)
      return (
        (R = !0),
        Kt(
          "⚠️ Your Google account's 2K upscale limit reached — switching to standard quality",
          "warn",
        ),
        null
      );
    if ((!c && !l) || 3 === a) break;
    if (c)
      ((S = Date.now()),
        P++,
        (M = Math.min(1.5 * M, 2e4)),
        1 !== Q && ((Q = 1), Kt("⏳ Rate limited — slowing down", "warn")),
        zt("LOG", {
          message: `🛑 Upscale ${t} rate limited — global cooldown ${(M / 1e3).toFixed(1)}s (${a + 1}/3)`,
          type: "warn",
        }));
    else {
      const e = 1500 * Math.pow(1.5, a) + 500 * Math.random();
      (zt("LOG", {
        message: `⏳ Upscale ${t} server error — retry in ${(e / 1e3).toFixed(1)}s (${a + 1}/3)`,
        type: "warn",
      }),
        await we(e));
    }
    n = await Qe(!0);
  }
  return null;
}
async function Ft(e, t, a, r) {
  let o = a;
  for (let a = 0; a <= 3; a++) {
    const n = Date.now() - j;
    if (n < H) {
      const e = H - n;
      await we(e);
    }
    try {
      const t = await ot(
        e.mediaId,
        e.workflowId,
        r,
        o,
        e.videoAspectRatio || "landscape",
      );
      if (t?.upsampledMediaId) {
        H = 5e3;
        const a = await nt(t.upsampledMediaId, r, o, e.promptIndex);
        return a ? { success: !0, downloadUrl: a } : null;
      }
      return null;
    } catch (e) {
      const r = e.message || "",
        n = r.includes("429"),
        i = r.includes("500"),
        s =
          r.includes("DAILY_QUOTA_REACHED") || r.includes("RESOURCE_EXHAUSTED"),
        c = r.includes("403"),
        l = r.includes("permission") || r.includes("PERMISSION_DENIED");
      if ("_xY" === e.name) throw e;
      if (c && l)
        return (
          (B = !0),
          Kt(
            "⚠️ 4K video upscale requires Google AI Ultra — downloading in 1080p instead",
            "warn",
          ),
          null
        );
      if (n && s)
        return (
          (B = !0),
          Kt(
            "⚠️ Your Google account's 4K video upscale limit reached — switching to 1080p",
            "warn",
          ),
          null
        );
      if (c) return null;
      if ((!n && !i) || 3 === a) break;
      if (n)
        ((j = Date.now()),
          F++,
          (H = Math.min(1.5 * H, 3e4)),
          zt("LOG", {
            message: `🛑 4K video upscale ${t} rate limited — cooldown ${(H / 1e3).toFixed(1)}s (${a + 1}/3)`,
            type: "warn",
          }));
      else {
        const e = 5e3 * Math.pow(2, a) + 2e3 * Math.random();
        (zt("LOG", {
          message: `⏳ 4K video upscale ${t} server error — retry in ${(e / 1e3).toFixed(0)}s (${a + 1}/3)`,
          type: "warn",
        }),
          await we(e));
      }
      o = await Qe(!0);
    }
  }
  return null;
}
async function jt(e, t, a, r) {
  e.fileName && (await tfCacheFrameBase64(e.fileName, r, "image/png"));
  const o = await chrome.scripting.executeScript({
      target: { tabId: c },
      world: "MAIN",
      func: (e) => {
        const t = atob(e),
          a = new Uint8Array(t.length);
        for (let e = 0; e < t.length; e++) a[e] = t.charCodeAt(e);
        return URL.createObjectURL(new Blob([a], { type: "image/png" }));
      },
      args: [r],
    }),
    n = o?.[0]?.result;
  if (!n) throw new Error("Failed to create blob URL");
  const i = await xt(n, a);
  (await Nt(i),
    chrome.scripting
      .executeScript({
        target: { tabId: c },
        world: "MAIN",
        func: (e) => URL.revokeObjectURL(e),
        args: [n],
      })
      .catch(() => {}),
    (e.status = "done"),
    E.downloaded++,
    zt("DOWNLOAD_COMPLETE", {
      message: `✅ #${t} saved (${((3 * r.length) / 4 / 1024 / 1024).toFixed(1)}MB)`,
      stats: { ...E },
      mediaId: e.mediaId,
      fileName: e.fileName || null,
    }));
}
async function Ht(e, t, a) {
  if (!e.mediaId) throw new Error("No mediaId available for standard download");
  Kt(`📥 #${t} downloading standard quality`, "info");
  const r = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${e.mediaId}`,
    o = await chrome.scripting.executeScript({
      target: { tabId: c },
      world: "MAIN",
      func: async (e) => {
        try {
          return await new Promise((t) => {
            const a = new Image();
            ((a.crossOrigin = "anonymous"),
              (a.onload = () => {
                try {
                  const e = document.createElement("canvas");
                  ((e.width = a.naturalWidth),
                    (e.height = a.naturalHeight),
                    e.getContext("2d").drawImage(a, 0, 0),
                    e.toBlob((e) => {
                      if (!e) return void t({ error: "Canvas toBlob failed" });
                      const a = URL.createObjectURL(e),
                        r = new FileReader();
                      ((r.onloadend = () =>
                        t({
                          url: a,
                          size: e.size,
                          base64: String(r.result || "").split(",")[1] || null,
                        })),
                        (r.onerror = () => t({ url: a, size: e.size })),
                        r.readAsDataURL(e));
                    }, "image/png"));
                } catch (e) {
                  t({ error: "Canvas error: " + e.message });
                }
              }),
              (a.onerror = () => {
                t({ error: "Image load failed" });
              }),
              (a.src = e));
          });
        } catch (e) {
          return { error: e.message };
        }
      },
      args: [r],
    }),
    n = o?.[0]?.result;
  if (!n?.url)
    throw new Error(
      "Failed to fetch standard image: " + (n?.error || "unknown"),
    );
  e.fileName && n.base64 && (await tfCacheFrameBase64(e.fileName, n.base64, "image/png"));
  const i = await xt(n.url, a);
  (await Nt(i),
    chrome.scripting
      .executeScript({
        target: { tabId: c },
        world: "MAIN",
        func: (e) => URL.revokeObjectURL(e),
        args: [n.url],
      })
      .catch(() => {}),
    (e.status = "done"),
    E.downloaded++,
    zt("DOWNLOAD_COMPLETE", {
      message: `✅ #${t} saved (${(n.size / 1024 / 1024).toFixed(1)}MB)`,
      stats: { ...E },
      mediaId: e.mediaId,
      fileName: e.fileName || null,
    }));
}
async function Bt(e, t, a, r, o) {
  const n = "4k" === A && e.workflowId && !B,
    i = ("1080p" === A || "4k" === A) && e.workflowId && !$;
  let s = null,
    l = "720p";
  if (n) {
    const a = Date.now() - j;
    if (a < H) {
      const e = H - a;
      await we(e);
    }
    zt("LOG", {
      message: `🎬 Upscaling #${t} to 4K (this may take several minutes)...`,
      type: "info",
    });
    for (let e = 0; e < 30; e++) {
      try {
        if (!c) {
          await we(2e3);
          continue;
        }
        if ("complete" === (await chrome.tabs.get(c)).status) break;
      } catch (e) {}
      await we(1e3);
    }
    await we(5e3);
    try {
      const a = await Ft(e, t, r, o);
      a?.success && a.downloadUrl
        ? ((s = a.downloadUrl), (l = "4K"))
        : zt("LOG", {
            message: `⚠️ #${t} 4K upscale failed — trying 1080p`,
            type: "warn",
          });
    } catch (e) {
      if ("_xY" === e.name) throw e;
      zt("LOG", {
        message: `⚠️ #${t} 4K upscale error: ${e.message} — trying 1080p`,
        type: "warn",
      });
    }
  }
  if (s || !i || $) !s && "4k" === A && B && !$ && e.workflowId;
  else {
    const a = Date.now() - D;
    if (a < U) {
      const e = U - a;
      await we(e);
    }
    if (
      (zt("LOG", { message: `🎬 Upscaling #${t} to 1080p...`, type: "info" }),
      !n)
    ) {
      for (let e = 0; e < 30; e++) {
        try {
          if (!c) {
            await we(2e3);
            continue;
          }
          if ("complete" === (await chrome.tabs.get(c)).status) break;
        } catch (e) {}
        await we(1e3);
      }
      await we(5e3);
    }
    try {
      let a = null,
        n = await Qe(!0);
      for (let i = 0; i <= 3; i++)
        try {
          ((a = await rt(
            e.mediaId,
            e.workflowId,
            o,
            n || r,
            e.videoAspectRatio || "landscape",
          )),
            (U = 5e3),
            Q !== J && (Q = J));
          break;
        } catch (e) {
          const r = e.message || "",
            o = r.includes("429"),
            s = r.includes("500"),
            c =
              r.includes("DAILY_QUOTA_REACHED") ||
              r.includes("RESOURCE_EXHAUSTED");
          if ("_xY" === e.name) throw e;
          if (o && c) {
            (($ = !0),
              Kt(
                "⚠️ Your Google account's 1080p upscale limit reached — switching to 720p for remaining videos",
                "warn",
              ),
              (a = null));
            break;
          }
          if (
            (o &&
              ((D = Date.now()),
              G++,
              (U = Math.min(1.5 * U, 3e4)),
              1 !== Q &&
                ((Q = 1),
                Kt("⏳ Video upscale rate limited — slowing down", "warn")),
              zt("LOG", {
                message: `🛑 Video upscale ${t} rate limited — cooldown ${(U / 1e3).toFixed(1)}s (${i + 1}/3)`,
                type: "warn",
              })),
            (o || s) && i < 3)
          ) {
            const e = 5e3 * Math.pow(2, i) + 2e3 * Math.random();
            (zt("LOG", {
              message: `⏳ Video upscale retry ${i + 1}/3 in ${(e / 1e3).toFixed(0)}s...`,
              type: "warn",
            }),
              await we(e),
              (n = await Qe(!0)));
            continue;
          }
          throw e;
        }
      if (a?.upsampledMediaId) {
        const i = await nt(a.upsampledMediaId, o, n || r, e.promptIndex);
        i
          ? ((s = i), (l = "1080p"))
          : zt("LOG", {
              message: `⚠️ #${t} 1080p upscale polling failed — downloading 720p`,
              type: "warn",
            });
      }
    } catch (e) {
      if ("_xY" === e.name) throw e;
      zt("LOG", {
        message: `⚠️ #${t} 1080p upscale error: ${e.message} — downloading 720p`,
        type: "warn",
      });
    }
  }
  if (
    (s || ((s = e.videoUrl), s || (s = await it(e.mediaId, r)), (l = "720p")),
    !s)
  )
    throw new Error("No video URL");
  const d = await xt(s, a);
  (await Nt(d),
    (e.status = "done"),
    E.downloaded++,
    "4K" === l
      ? null === ce
        ? (ce = "4k_video")
        : "4k_video" !== ce && (ce = "4k_video_with_fallback")
      : "1080p" === l
        ? "4k_video" === ce
          ? (ce = "4k_video_with_fallback")
          : null === ce
            ? (ce = "1080p")
            : "1080p" !== ce && (ce = "1080p_with_fallback")
        : "4k_video" === ce
          ? (ce = "4k_video_with_fallback")
          : "1080p" === ce
            ? (ce = "1080p_with_fallback")
            : null === ce && (ce = "720p"),
    zt("DOWNLOAD_COMPLETE", {
      message: `✅ #${t} saved (${l})`,
      stats: { ...E },
      mediaId: e.mediaId,
    }));
}
async function Vt() {
  if (Z) return;
  Z = !0;
  let e = 0;
  for (;;) {
    const t = W.filter((e) => "pending" === e.status).sort(
      (e, t) => e.fileNum - t.fileNum,
    );
    if (0 === t.length) {
      (e++, await we(1e3));
      const t = E.downloaded + E.failed,
        a = E.total;
      if (a > 0 && t >= a && !f) break;
      if (!f && 0 === a && e > 10) break;
      if (f) {
        e = 0;
        continue;
      }
      if (e > 120) {
        zt("LOG", {
          message: `⏰ Downloads timed out — ${E.downloaded}/${E.total} saved`,
          type: "warn",
        });
        break;
      }
      continue;
    }
    if (((e = 0), !c)) {
      await we(1e3);
      continue;
    }
    const a = await Qe(),
      r = await Xe();
    if (!a || !r) {
      ((d = null), await we(2e3));
      continue;
    }
    const o = "4k" !== A || B ? Q : 1,
      n = Math.min(Q, o) - q;
    if (n <= 0) {
      await we(300);
      continue;
    }
    const i = Date.now() - S;
    if (i < M) {
      const e = M - i;
      await we(e);
      continue;
    }
    const s = t.slice(0, n);
    for (const e of s) (Dt(e, a, r), await we(300));
    zt("STATS_UPDATE", { stats: { ...E } });
  }
  for (; q > 0; ) await we(300);
  ((Z = !1),
    E.total > 0 &&
      Kt(
        `🏁 ${E.downloaded} image${1 !== E.downloaded ? "s" : ""} saved${E.failed > 0 ? ` · ${E.failed} failed` : ""}`,
        E.failed > 0 ? "warn" : "success",
      ),
    zt("STATS_UPDATE", { stats: { ...E } }));
}
function zt(e, t) {
  const a = {
    type: "FROM_BACKGROUND",
    subType: e,
    message: t.message || "",
    stats: t.stats || null,
    promptIndex: t.promptIndex,
    status: t.status,
    error: t.error || null,
    uiBatchId: t.uiBatchId || null,
    logType: t.type || "info",
    logLevel: t.level || "user",
    mediaId: t.mediaId || null,
    fifeUrl: t.fifeUrl || null,
    mediaType: t.mediaType || null,
    prompt: t.prompt || null,
    videoUrl: t.videoUrl || null,
    workflowId: t.workflowId || null,
    fileName: t.fileName || null,
    cacheKey: t.cacheKey || null,
    cachedFileName: t.cachedFileName || null,
    mimeType: t.mimeType || null,
    byteLength: t.byteLength || 0,
    totalPrompts: t.totalPrompts,
    successfulPrompts: t.successfulPrompts,
    failedPrompts: t.failedPrompts,
    totalImages: t.totalImages,
  };
  chrome.runtime.sendMessage(a).catch(() => {});
}
function Kt(e, t = "info") {
  zt("LOG", { message: e, type: t, level: "user" });
}
function Yt(e, t = "info") {
  zt("LOG", { message: e, type: t, level: "debug" });
}
function tfStripDownloadCopySuffix(e) {
  return String(e || "").replace(/\s+\(\d+\)(?=\.[^/.]+$)/, "");
}
function tfNormalizeDownloadLookupPath(e, t = null) {
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
function tfDownloadLookupKey(e, t = null) {
  const a = tfNormalizeDownloadLookupPath(e, t)
    .split("/")
    .filter(Boolean)
    .pop();
  return a || "";
}
function tfDownloadLookupKeys(e, t = null) {
  const a = tfNormalizeDownloadLookupPath(e, t),
    r = tfDownloadLookupKey(a, t),
    o = new Set();
  return (a && o.add(a), r && o.add(r), [...o]);
}
function tfSearchDownloads(e = {}) {
  return new Promise((t, a) => {
    chrome.downloads.search(e, (e) => {
      chrome.runtime.lastError
        ? a(new Error(chrome.runtime.lastError.message))
        : t(e || []);
    });
  });
}
async function tfCheckDownloadHistory(e) {
  const t = Array.isArray(e) ? e : [];
  if (!t.length) return [];
  const a = await tfSearchDownloads({
      limit: 10000,
      orderBy: ["-startTime"],
    }),
    r = new Map();
  for (const e of a) {
    if ("complete" !== e.state || !e.filename || !/\.(png|jpe?g|webp|mp4)$/i.test(e.filename))
      continue;
    if (!1 === e.exists) continue;
    const t = e.filename.toLowerCase().endsWith(".mp4") ? "mp4" : "png";
    for (const a of tfDownloadLookupKeys(e.filename, t)) r.has(a) || r.set(a, e);
  }
  const o = [];
  for (const e of t) {
    const t = e.ext || (String(e.fileName || "").toLowerCase().endsWith(".mp4") ? "mp4" : "png"),
      a = [
        ...(Array.isArray(e.lookupKeys) ? e.lookupKeys : []),
        ...tfDownloadLookupKeys(e.fileName, t),
      ],
      n = a.find((e) => r.has(e)),
      i = n ? r.get(n) : null;
    i &&
      o.push({
        key: e.key || tfDownloadLookupKey(e.fileName, t),
        fileName: e.fileName || "",
        downloadFilename: i.filename,
        id: i.id,
        startTime: i.startTime || null,
      });
  }
  return o;
}
