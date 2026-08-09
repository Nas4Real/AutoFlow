// TurboFlow background runtime shard: Chrome download listeners and runtime message router
// Loaded by src/background/runtime.js in numeric order.

(chrome.downloads.onChanged.addListener((e) => {
  if (
    e.state &&
    ("complete" === e.state.current || "interrupted" === e.state.current)
  ) {
    const t = oe.get(e.id);
    t && (oe.delete(e.id), t());
  }
}),
  chrome.downloads.onDeterminingFilename.addListener((e, t) => {
    const a = re.get(e.id);
    t(
      a
        ? { filename: a, conflictAction: "uniquify" }
        : { filename: e.filename || "download", conflictAction: "uniquify" },
    );
  }),
  chrome.runtime.onMessage.addListener((e, a, r) => {
    if ("FLOW_PAGE_READY" === e.type) {
      const t = a?.tab;
      return (
        t && Ie(e.url || t.url)
          ? r({
              ok: !0,
              state: setFlowConnectionFromTab(t, {
                url: e.url || t.url,
                projectId: e.projectId,
              }),
            })
          : r({ ok: !1 }),
        !0
      );
    }
    if ("CHECK_CONNECTION" === e.type)
      return (tfRespondConnectionDirect(r), !0);
    if ("GET_CONNECTION_STATE" === e.type)
      return (tfRespondConnectionDirect(r), !0);
    if ("SET_FINGERPRINT" === e.type)
      return (xe(e.fingerprint), r({ ok: !0 }), !0);
    if ("CLAIM_OFFER" === e.type)
      return (r({ ok: !1, error: "Account features removed" }), !0);
    if ("SIGN_IN" === e.type)
      return (
        e.fingerprint && xe(e.fingerprint),
        Ee()
          .then((e) => r({ ok: !0, user: e, plan: s }))
          .catch((e) => r({ ok: !1, error: e.message })),
        !0
      );
    if ("SIGN_OUT" === e.type) return (Te().then(() => r({ ok: !0 })), !0);
    if ("GET_AUTH_STATE" === e.type)
      return (r({ user: i || LOCAL_USER, plan: s || LOCAL_PLAN }), !0);
    if ("GET_PLAN" === e.type)
      return (s ? r({ plan: s }) : Se().then((e) => r({ plan: e })), !0);
    if ("REFRESH_PLAN" === e.type)
      return (Se(!0).then((e) => r({ plan: e })), !0);
    if ("GET_PORTAL_URL" === e.type)
      return (r({ ok: !1, error: "Account features removed" }), !0);
    if ("START_ACTIVATION_POLLING" === e.type) return (r({ ok: !0 }), !0);
    if ("STOP_ACTIVATION_POLLING" === e.type) return (We(), r({ ok: !0 }), !0);
    if ("GET_PREVIEWS" === e.type) {
      const e = [];
      for (const [t, a] of Y)
        e.push({
          mediaId: t,
          fifeUrl: a.fifeUrl,
          promptIndex: a.promptIndex,
          prompt: a.prompt?.substring(0, 60),
          type: a.type,
        });
      return (
        e.sort((e, t) => e.promptIndex - t.promptIndex),
        r({ previews: e }),
        !0
      );
    }
    if ("GET_FULL_STATE" === e.type) {
      const e = [];
      for (const [t, a] of Y) {
        const r = (z.get(a.promptIndex) || []).indexOf(t),
          o = r > 0 ? String.fromCharCode(97 + r) : "";
        e.push({
          mediaId: t,
          fifeUrl: a.fifeUrl,
          videoUrl:
            "video" === a.type
              ? `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${t}`
              : null,
          promptIndex: a.promptIndex,
          prompt: a.prompt,
          type: a.type,
          workflowId: a.workflowId || null,
          suffix: o,
          seed: a.seed,
          fileName: a.fileName || null,
        });
      }
      return (
        r({ running: f, stats: { ...E }, items: e, downloadFolder: h, _vC: g }),
        !0
      );
    }
    if ("DOWNLOAD_SINGLE" === e.type) {
      const { mediaId: t, mediaType: a, promptIndex: o, folder: n, fileName: _ } = e,
        i = n || h || "turboflow";
      return c
        ? ((async () => {
            try {
              const e = await Qe(),
                n = await Xe();
              if (!e || !n) throw new Error("Missing auth/project");
              const s = void 0 !== o ? o + 1 : 1;
              let l = "";
              if (z.has(o)) {
                const e = z.get(o).indexOf(t);
                e > 0 && (l = String.fromCharCode(97 + e));
              }
              const d = "video" === a ? "mp4" : "png",
                u = Y.get(t)?.prompt || "",
                p = _ || Rt(i, s, l, d, w, u),
                m = String(s).padStart(3, "0") + l;
              if (
                (zt("LOG", {
                  message: `📥 Manual download: #${m}.${d}`,
                  type: "info",
                }),
                "video" === a)
              ) {
                const e = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${t}`,
                  a = await xt(e, p);
                (await Nt(a),
                  zt("LOG", {
                    message: `✅ #${m}.${d} saved`,
                    type: "success",
                  }),
                  zt("DOWNLOAD_COMPLETE", {
                    message: `✓ ${m}.${d} saved manually`,
                    stats: { ...E },
                    mediaId: t,
                  }));
              } else {
                let a = await at(t, n, e);
                if (a?.success && a.base64) {
                  const e = await chrome.scripting.executeScript({
                      target: { tabId: c },
                      world: "MAIN",
                      func: (e) => {
                        const t = atob(e),
                          a = new Uint8Array(t.length);
                        for (let e = 0; e < t.length; e++)
                          a[e] = t.charCodeAt(e);
                        return URL.createObjectURL(
                          new Blob([a], { type: "image/png" }),
                        );
                      },
                      args: [a.base64],
                    }),
                    r = e?.[0]?.result;
                  if (!r) throw new Error("Failed to create blob URL");
                  const o = await xt(r, p);
                  (await Nt(o),
                    chrome.scripting
                      .executeScript({
                        target: { tabId: c },
                        world: "MAIN",
                        func: (e) => URL.revokeObjectURL(e),
                        args: [r],
                      })
                      .catch(() => {}));
                  const n = ((3 * a.base64.length) / 4 / 1024 / 1024).toFixed(
                    1,
                  );
                  (zt("LOG", {
                    message: `✅ #${m}.${d} (${n}MB 2K) saved`,
                    type: "success",
                  }),
                    zt("DOWNLOAD_COMPLETE", {
                      message: `✓ ${m}.${d} (${n}MB) saved manually`,
                      stats: { ...E },
                      mediaId: t,
                    }));
                } else {
                  const e = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${t}`,
                    a = await chrome.scripting.executeScript({
                      target: { tabId: c },
                      world: "MAIN",
                      func: async (e) =>
                        await new Promise((t) => {
                          const a = new Image();
                          ((a.crossOrigin = "anonymous"),
                            (a.onload = () => {
                              try {
                                const e = document.createElement("canvas");
                                ((e.width = a.naturalWidth),
                                  (e.height = a.naturalHeight),
                                  e.getContext("2d").drawImage(a, 0, 0),
                                  e.toBlob((e) => {
                                    t(
                                      e
                                        ? {
                                            url: URL.createObjectURL(e),
                                            size: e.size,
                                          }
                                        : { error: "Canvas toBlob failed" },
                                    );
                                  }, "image/png"));
                              } catch (e) {
                                t({ error: "Canvas error: " + e.message });
                              }
                            }),
                            (a.onerror = () =>
                              t({ error: "Image load failed" })),
                            (a.src = e));
                        }),
                      args: [e],
                    }),
                    r = a?.[0]?.result;
                  if (!r?.url)
                    throw new Error(
                      "Standard download failed: " + (r?.error || "unknown"),
                    );
                  const o = await xt(r.url, p);
                  (await Nt(o),
                    chrome.scripting
                      .executeScript({
                        target: { tabId: c },
                        world: "MAIN",
                        func: (e) => URL.revokeObjectURL(e),
                        args: [r.url],
                      })
                      .catch(() => {}),
                    zt("LOG", {
                      message: `✅ #${m}.${d} (standard) saved`,
                      type: "success",
                    }),
                    zt("DOWNLOAD_COMPLETE", {
                      message: `✓ ${m}.${d} saved manually (standard)`,
                      stats: { ...E },
                      mediaId: t,
                    }));
                }
              }
              r({ ok: !0 });
            } catch (e) {
              (zt("LOG", {
                message: `❌ Manual download failed: ${e.message}`,
                type: "error",
              }),
                r({ ok: !1, error: e.message }));
            }
          })(),
          !0)
        : (r({ ok: !1, error: "No Flow tab" }), !0);
    }
    if ("DOWNLOAD_MULTIPLE" === e.type) {
      const { items: t, folder: a, quality: o } = e,
        n = a || h || "turboflow",
        i = "standard" === o,
        s = "4k" === o;
      if (!t || 0 === t.length) return (r({ ok: !1, error: "No items" }), !0);
      const l = i ? "standard" : "2K upscaled";
      return (
        zt("LOG", {
          message: `📥 Downloading ${t.length} items (${l}) → ${n}/ (${J}x parallel)`,
          type: "info",
        }),
        (async () => {
          if (!c)
            return void zt("LOG", { message: "❌ No Flow tab", type: "error" });
          const a = await Qe(),
            r = await Xe();
          if (!a || !r)
            return void zt("LOG", {
              message: "❌ Missing auth/project",
              type: "error",
            });
          const d = t.map((e) => {
            const t = void 0 !== e.promptIndex ? e.promptIndex : 0,
              a = t + 1;
            let r = "";
            if (z.has(t)) {
              const a = z.get(t).indexOf(e.mediaId);
              a > 0 && (r = String.fromCharCode(97 + a));
            }
            return {
              mediaId: e.mediaId,
              type: e.type || "image",
              promptIndex: t,
              fileNum: a,
              fileSuffix: r,
              status: "pending",
              workflowId: e.workflowId || null,
              isPortrait: e.isPortrait || !1,
              fileName: e.fileName || null,
            };
          });
          let u = 0,
            p = 0,
            m = 0;
          async function f(t) {
            const l = "video" === t.type ? "mp4" : "png",
              d = {
                naming: e.naming || "numbered",
                namingPrefix: e.namingPrefix || "",
                namingSeparator:
                  void 0 !== e.namingSeparator ? e.namingSeparator : "-",
              },
              f = Y.get(t.mediaId)?.prompt || "",
              g = t.fileName || Rt(n, t.fileNum, t.fileSuffix, l, d, f),
              w = String(t.fileNum).padStart(3, "0") + (t.fileSuffix || "");
            (m++, zt("DOWNLOAD_STARTED", { mediaId: t.mediaId }));
            try {
              if ("video" === t.type) {
                const n = e.videoQuality || o || "standard";
                let i = null,
                  s = "720p";
                if ("4k" === n) {
                  const o = Y.get(t.mediaId),
                    n = t.workflowId || o?.workflowId;
                  if (n) {
                    try {
                      zt("LOG", {
                        message: `🎬 Upscaling #${w} to 4K (this may take several minutes)...`,
                        type: "info",
                      });
                      const o = await ot(
                        t.mediaId,
                        n,
                        r,
                        a,
                        t.isPortrait
                          ? "portrait"
                          : e.videoAspectRatio || "landscape",
                      );
                      o?.upsampledMediaId &&
                        ((i = await nt(
                          o.upsampledMediaId,
                          r,
                          a,
                          t.promptIndex,
                        )),
                        i && (s = "4K"));
                    } catch (e) {
                      zt("LOG", {
                        message: `⚠️ 4K upscale failed: ${e.message} — trying 1080p`,
                        type: "warn",
                      });
                    }
                    if (!i)
                      try {
                        const o = await rt(
                          t.mediaId,
                          n,
                          r,
                          a,
                          t.isPortrait
                            ? "portrait"
                            : e.videoAspectRatio || "landscape",
                        );
                        o?.upsampledMediaId &&
                          ((i = await nt(
                            o.upsampledMediaId,
                            r,
                            a,
                            t.promptIndex,
                          )),
                          i && (s = "1080p"));
                      } catch (e) {}
                  } else
                    zt("LOG", {
                      message: `⚠️ #${w} cannot upscale to 4K — workflow ID missing (likely from older session). Downloading 720p.`,
                      type: "warn",
                    });
                } else if ("1080p" === n) {
                  const o = Y.get(t.mediaId),
                    n = t.workflowId || o?.workflowId;
                  if (n)
                    try {
                      zt("LOG", {
                        message: `🎬 Upscaling #${w} to 1080p...`,
                        type: "info",
                      });
                      const o = await rt(
                        t.mediaId,
                        n,
                        r,
                        a,
                        t.isPortrait
                          ? "portrait"
                          : e.videoAspectRatio || "landscape",
                      );
                      o?.upsampledMediaId &&
                        ((i = await nt(
                          o.upsampledMediaId,
                          r,
                          a,
                          t.promptIndex,
                        )),
                        i && (s = "1080p"));
                    } catch (e) {
                      zt("LOG", {
                        message: `⚠️ Upscale failed: ${e.message} — using 720p`,
                        type: "warn",
                      });
                    }
                }
                i ||
                  ((i = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${t.mediaId}`),
                  (s = "720p"));
                const c = await xt(i, g);
                (await Nt(c),
                  u++,
                  zt("DOWNLOAD_COMPLETE", {
                    message: `✓ ${w}.${l} saved (${s})`,
                    stats: { ...E },
                    mediaId: t.mediaId,
                  }));
              } else if (i) {
                const e = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${t.mediaId}`;
                for (let e = 0; e < 15; e++) {
                  try {
                    if ("complete" === (await chrome.tabs.get(c)).status) break;
                  } catch (e) {}
                  await we(1e3);
                }
                const a = await chrome.scripting.executeScript({
                    target: { tabId: c },
                    world: "MAIN",
                    func: async (e) =>
                      await new Promise((t) => {
                        const a = new Image();
                        ((a.crossOrigin = "anonymous"),
                          (a.onload = () => {
                            try {
                              const e = document.createElement("canvas");
                              ((e.width = a.naturalWidth),
                                (e.height = a.naturalHeight),
                                e.getContext("2d").drawImage(a, 0, 0),
                                e.toBlob((e) => {
                                  t(
                                    e
                                      ? {
                                          url: URL.createObjectURL(e),
                                          size: e.size,
                                        }
                                      : { error: "Canvas toBlob failed" },
                                  );
                                }, "image/png"));
                            } catch (e) {
                              t({ error: "Canvas error: " + e.message });
                            }
                          }),
                          (a.onerror = () => t({ error: "Image load failed" })),
                          (a.src = e));
                      }),
                    args: [e],
                  }),
                  r = a?.[0]?.result;
                if (!r?.url)
                  throw new Error(
                    "Standard download failed: " + (r?.error || "unknown"),
                  );
                const o = await xt(r.url, g);
                (await Nt(o),
                  chrome.scripting
                    .executeScript({
                      target: { tabId: c },
                      world: "MAIN",
                      func: (e) => URL.revokeObjectURL(e),
                      args: [r.url],
                    })
                    .catch(() => {}));
                const n = (r.size / 1024 / 1024).toFixed(1);
                (u++,
                  zt("DOWNLOAD_COMPLETE", {
                    message: `✅ #${w}.${l} saved (${n}MB standard)`,
                    stats: { ...E },
                    mediaId: t.mediaId,
                  }));
              } else {
                const e = s && !N ? "4k" : "2k",
                  o = "4k" === e ? Date.now() - L : Date.now() - S,
                  n = "4k" === e ? x : M;
                o < n && (await we(n - o));
                let i = a,
                  d = null,
                  p = "4k" === e ? N : R;
                if (!p)
                  for (let a = 0; a <= 3; a++) {
                    if (((d = await at(t.mediaId, r, i, e)), d?.success)) {
                      M = 5e3;
                      break;
                    }
                    const o = d?.error || "",
                      n = o.includes("429"),
                      s =
                        o.includes("DAILY_QUOTA_REACHED") ||
                        o.includes("RESOURCE_EXHAUSTED");
                    if (n && s) {
                      ("4k" === e
                        ? ((N = !0),
                          zt("LOG", {
                            message:
                              "🚫 4K upscale quota reached — falling back to 2K",
                            type: "warn",
                          }))
                        : ((R = !0),
                          zt("LOG", {
                            message:
                              "🚫 Upscale quota reached — remaining items will use standard quality",
                            type: "warn",
                          })),
                        (p = !0),
                        (d = null));
                      break;
                    }
                    const c = o.includes("403"),
                      l =
                        o.includes("permission") ||
                        o.includes("PERMISSION_DENIED");
                    if ("4k" === e && c && l) {
                      ((N = !0),
                        zt("LOG", {
                          message: "⚠️ 4K requires Google AI Ultra — using 2K",
                          type: "warn",
                        }),
                        (p = !0),
                        (d = null));
                      break;
                    }
                    if ((!n && !o.includes("500")) || 3 === a) break;
                    n &&
                      ("4k" === e
                        ? ((L = Date.now()), (x = Math.min(1.5 * x, 2e4)))
                        : ((S = Date.now()), (M = Math.min(1.5 * M, 2e4))));
                    const u = 2e3 * Math.pow(1.5, a) + 500 * Math.random();
                    (await we(u), (i = await Qe(!0)));
                  }
                if (d?.success && d.base64) {
                  const a = await chrome.scripting.executeScript({
                      target: { tabId: c },
                      world: "MAIN",
                      func: (e) => {
                        const t = atob(e),
                          a = new Uint8Array(t.length);
                        for (let e = 0; e < t.length; e++)
                          a[e] = t.charCodeAt(e);
                        return URL.createObjectURL(
                          new Blob([a], { type: "image/png" }),
                        );
                      },
                      args: [d.base64],
                    }),
                    r = a?.[0]?.result;
                  if (!r) throw new Error("Failed to create blob URL");
                  const o = await xt(r, g);
                  (await Nt(o),
                    chrome.scripting
                      .executeScript({
                        target: { tabId: c },
                        world: "MAIN",
                        func: (e) => URL.revokeObjectURL(e),
                        args: [r],
                      })
                      .catch(() => {}));
                  const n = ((3 * d.base64.length) / 4 / 1024 / 1024).toFixed(
                    1,
                  );
                  (u++,
                    zt("DOWNLOAD_COMPLETE", {
                      message: `✓ ${w}.${l} (${n}MB ${"4k" === e ? "4K" : "2K"})`,
                      stats: { ...E },
                      mediaId: t.mediaId,
                    }));
                } else {
                  const e = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${t.mediaId}`,
                    a = await chrome.scripting.executeScript({
                      target: { tabId: c },
                      world: "MAIN",
                      func: async (e) =>
                        await new Promise((t) => {
                          const a = new Image();
                          ((a.crossOrigin = "anonymous"),
                            (a.onload = () => {
                              try {
                                const e = document.createElement("canvas");
                                ((e.width = a.naturalWidth),
                                  (e.height = a.naturalHeight),
                                  e.getContext("2d").drawImage(a, 0, 0),
                                  e.toBlob((e) => {
                                    t(
                                      e
                                        ? {
                                            url: URL.createObjectURL(e),
                                            size: e.size,
                                          }
                                        : { error: "Canvas toBlob failed" },
                                    );
                                  }, "image/png"));
                              } catch (e) {
                                t({ error: "Canvas error: " + e.message });
                              }
                            }),
                            (a.onerror = () =>
                              t({ error: "Image load failed" })),
                            (a.src = e));
                        }),
                      args: [e],
                    }),
                    r = a?.[0]?.result;
                  if (!r?.url)
                    throw new Error(
                      "Standard download failed: " + (r?.error || "unknown"),
                    );
                  const o = await xt(r.url, g);
                  (await Nt(o),
                    chrome.scripting
                      .executeScript({
                        target: { tabId: c },
                        world: "MAIN",
                        func: (e) => URL.revokeObjectURL(e),
                        args: [r.url],
                      })
                      .catch(() => {}),
                    u++,
                    zt("DOWNLOAD_COMPLETE", {
                      message: `✓ ${w}.${l} (standard)`,
                      stats: { ...E },
                      mediaId: t.mediaId,
                    }));
                }
              }
            } catch (e) {
              (p++,
                zt("LOG", {
                  message: `❌ #${String(t.fileNum).padStart(3, "0")}${t.fileSuffix || ""} failed: ${e.message}`,
                  type: "error",
                }),
                zt("DOWNLOAD_FAILED", { mediaId: t.mediaId }));
            }
            m--;
          }
          const g = Q;
          let w,
            h = 0;
          const _ = new Promise((e) => {
            w = e;
          });
          (await (async function e() {
            for (; h < d.length && m < g; )
              (f(d[h++]).then(() => {
                u + p >= d.length
                  ? (zt("LOG", {
                      message: `✅ Download complete: ${u} saved${p > 0 ? `, ${p} failed` : ""} (${l})`,
                      type: u > 0 ? "success" : "error",
                    }),
                    w())
                  : e();
              }),
                await we(300));
          })(),
            await _);
        })(),
        r({ ok: !0 }),
        !0
      );
    }
    if ("UPLOAD_CACHED_FRAME" === e.type)
      return (
        (async () => {
          try {
            const t = await tfUploadCachedFrame(e.fileName);
            r({ ok: !0, ...t });
          } catch (e) {
            r({ ok: !1, error: e.message });
          }
        })(),
        !0
      );
    if ("GET_CACHED_FRAME" === e.type)
      return (
        (async () => {
          try {
            const t =
              (await tfGetCachedFrame(e.cacheKey)) ||
              (await tfGetCachedFrame(tfFrameMediaAlias(e.mediaId))) ||
              (await tfGetCachedFrame(e.fileName));
            r({
              ok: !!t?.base64,
              base64: t?.base64 || null,
              mimeType: t?.mimeType || "image/png",
              cacheKey: t?.cacheKey || "",
              fileName: t?.fileName || "",
              cachedAt: t?.cachedAt || null,
            });
          } catch (e) {
            r({ ok: !1, error: e.message });
          }
        })(),
        !0
      );
    if ("CACHE_IMAGE_PREVIEW" === e.type)
      return (
        (async () => {
          try {
            const t = await tfCacheGeneratedImagePreview({
              mediaId: e.mediaId,
              fifeUrl: e.fifeUrl,
              previewUrl: e.previewUrl,
              fileName: e.fileName,
              cacheKey: e.cacheKey,
              uiBatchId: e.uiBatchId || null,
              promptIndex: e.promptIndex,
              includeBase64: !0,
              notify: !1,
            });
            r({
              ok: !!t?.cacheKey || !!t?.base64,
              base64: t?.base64 || null,
              mimeType: t?.mimeType || "image/png",
              cacheKey: t?.cacheKey || "",
              fileName: t?.fileName || "",
              byteLength: t?.byteLength || 0,
              cachedAt: t?.cachedAt || null,
            });
          } catch (e) {
            r({ ok: !1, error: e.message });
          }
        })(),
        !0
      );
    if ("CHECK_DOWNLOAD_HISTORY" === e.type)
      return (
        (async () => {
          try {
            const t = await tfCheckDownloadHistory(e.expected || []);
            r({ ok: !0, matches: t });
          } catch (e) {
            r({ ok: !1, error: e.message });
          }
        })(),
        !0
      );
    if ("UPLOAD_IMAGE" === e.type)
      return (
        (async () => {
          try {
            const t = await tt(e.base64Data, e.fileName, e.mimeType);
            r({ ok: !0, mediaId: t });
          } catch (e) {
            (zt("LOG", {
              message: `❌ Upload failed: ${e.message}`,
              type: "error",
            }),
              r({ ok: !1, error: e.message }));
          }
        })(),
        !0
      );
    if ("GET_PAGE_STATE" === e.type)
      return c
        ? (chrome.tabs.sendMessage(c, { type: "GET_PAGE_STATE" }, (e) => r(e)),
          !0)
        : (r({ hasEditor: !1 }), !0);
    if ("GET_ALL_IMAGES" === e.type)
      return c
        ? (chrome.tabs.sendMessage(c, { type: "GET_ALL_IMAGES" }, (e) => r(e)),
          !0)
        : (r({ images: [] }), !0);
    if ("START_BATCH" === e.type) {
      const t = e.prompts || [],
        a = e.settings || {};
      a.uiBatchId = e.batchId || null;
      ((h = a.folder || "flow-auto"),
        (_ = !1 !== a.autoDownloadImages),
        (y = !1 !== a.autoDownloadVideos),
        (I = a.imageDownloadQuality || "2k"),
        (A = a.videoDownloadQuality || "standard"));
      const o = e.promptIndexMap || t.map((e, t) => t),
        n = "video" === (a.mode || "image") ? 1 : a.imageCount || 1;
      return (
        (g = t.length * n),
        zt("LOG", {
          message: `📨 START_BATCH received: ${t.length} prompts, mode=${a.mode}, expecting ${g} total images`,
          type: "info",
        }),
        (E = { total: 0, downloaded: 0, failed: 0 }),
        (d = null),
        (u = null),
        V.clear(),
        z.clear(),
        K.clear(),
        Y.clear(),
        oe.clear(),
        (W.length = 0),
        (q = 0),
        (Z = !1),
        re.clear(),
        ee(a.speedMode || "fast"),
        (Q = J),
        (S = 0),
        (M = 5e3),
        (C = !1),
        (R = !1),
        (O = 0),
        (P = 0),
        (ue = 0),
        (fe = 0),
        (ge = null),
        (T = 0),
        (v = 0),
        (b = 3e3),
        (N = !1),
        (L = 0),
        (x = 5e3),
        (k = 0),
        (B = !1),
        (j = 0),
        (H = 5e3),
        (F = 0),
        (D = 0),
        (U = 5e3),
        ($ = !1),
        (G = 0),
        (ce = null),
        St(t, a, o).catch((e) => {
          (zt("LOG", {
            message: `💀 FATAL: _dG crashed: ${e.message}`,
            type: "error",
          }),
            zt("LOG", {
              message: `Stack: ${e.stack?.substring(0, 300)}`,
              type: "error",
            }),
            _t("script_failed"));
          const a = Et();
          (Ge(0, t.length, a).catch(() => {}), (f = !1));
        }),
        r({ ok: !0 }),
        !0
      );
    }
    if ("STOP_BATCH" === e.type)
      return (
        (f = !1),
        (C = !0),
        (ut = !0),
        _t("user_stopped"),
        zt("LOG", { message: "⏹ Stopped by user", type: "warn" }),
        r({ ok: !0 }),
        !0
      );
    if ("GET_STATS" === e.type)
      return (
        r({
          stats: { ...E },
          queueLength: W.filter((e) => "pending" === e.status).length,
          downloading: Z,
          isRunning: f,
          mappedBatches: V.size,
        }),
        !0
      );
    if ("DOWNLOAD_GALLERY_2K" === e.type) {
      if (!c) return (r({ results: [] }), !0);
      const t = e.mediaIds || [];
      return (
        (h = e.folder || h),
        (g = t.length),
        t.forEach((e, t) => {
          K.has(e) ||
            (K.add(e),
            W.push({
              mediaId: e,
              fileNum: t + 1,
              promptIndex: t,
              fileSuffix: "",
              type: "image",
              status: "pending",
            }),
            E.total++);
        }),
        Z || Vt(),
        r({ ok: !0, queued: t.length }),
        !0
      );
    }
    if ("API_INTERCEPTED" === e.type) {
      if (_vD._recovering) return;
      if (
        "VIDEO_GENERATE_RESPONSE" === e.eventType ||
        "VIDEO_STATUS_CHECK" === e.eventType
      )
        return;
      if (void 0 !== w?.videoRatio && f) return;
      for (const { batchId, mediaId } of tfInterceptedMediaPairs(e, a)) {
        if (Y.get(mediaId)?.type === "image") {
          kt(mediaId, batchId);
        }
      }
    }
    return !1;
  }),
  ve(),
  chrome.storage.local
    .get(["turboflowGoogleTier", "turboflowGoogleTierAt"])
    .then((e) => {
      e.turboflowGoogleTier &&
        (Date.now() - (e.turboflowGoogleTierAt || 0)) / 36e5 < 24 &&
        (ne = e.turboflowGoogleTier);
    })
    .catch(() => {}));
