// TurboFlow shard: Image generation paths, reference image upload, image prompt status handling
// Loaded in numeric order; depends on earlier shards sharing globals.

async function Ot(e, t = 3, a = 3e3) {
  for (let r = 0; r <= t; r++)
    try {
      return await e();
    } catch (e) {
      if (!e.message || !e.message.includes("429") || r === t) throw e;
      const o = a * Math.pow(2, r) + 1e3 * Math.random();
      (zt("LOG", {
        message: `⏳ Rate limited — retrying in ${(o / 1e3).toFixed(1)}s (attempt ${r + 1}/${t})`,
        type: "warn",
      }),
        await we(o));
    }
}
function tfQueueGeneratedImagePreviewCache(e) {
  if (typeof tfCacheGeneratedImagePreview !== "function") return;
  tfCacheGeneratedImagePreview(e).catch((e) => {
    if (typeof Yt === "function") {
      Yt(`Preview cache skipped: ${e.message}`, "warn");
    } else if (typeof zt === "function") {
      zt("LOG", {
        message: `Preview cache skipped: ${e.message}`,
        type: "warn",
        level: "debug",
      });
    }
  });
}
async function Pt(e, t, a) {
  const r = await Qe(),
    o = await Xe();
  if (!r || !o) throw new Error("Missing auth/project");
  const n = he(),
    i = ";" + Date.now(),
    s = t.imageCount || 1;
  V.set(n, a);
  const c = `https://aisandbox-pa.googleapis.com/v1/projects/${o}/flowMedia:batchGenerateImages`,
    l = [];
  for (let a = 0; a < s; a++) {
    const a = _e();
    l.push({
      seed: a,
      payload: {
        clientContext: {
          recaptchaContext: {
            applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
            token: "PLACEHOLDER",
          },
          projectId: o,
          tool: "PINHOLE",
          sessionId: i,
        },
        mediaGenerationContext: { batchId: n },
        requests: [
          {
            clientContext: {
              recaptchaContext: {
                applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
                token: "PLACEHOLDER",
              },
              projectId: o,
              tool: "PINHOLE",
              sessionId: i,
            },
            imageAspectRatio: t.aspectRatio || "IMAGE_ASPECT_RATIO_LANDSCAPE",
            imageInputs: [],
            imageModelName: t.imageModel || "NARWHAL",
            seed: a,
            structuredPrompt: { parts: [{ text: e }] },
          },
        ],
      },
    });
  }
  const d = l.map((t, o) =>
      (async () => {
        try {
          const o = await et(c, t.payload, r);
          let mediaCreated = 0;
          if (o?.workflows)
            for (const r of o.workflows) {
              const n = r?.metadata?.batchId,
                i = r?.metadata?.primaryMediaId;
              if (i && n) {
                mediaCreated++;
                V.has(n) || V.set(n, a);
                let r = null;
                if (o.media && Array.isArray(o.media))
                  for (const e of o.media) {
                    const t = e?.image?.generatedImage?.fifeUrl;
                    if (t) {
                      r = t;
                      break;
                    }
                  }
                const previewFileName = tfExactDownloadName(w, a, "", "png", o);
                (Y.set(i, {
                  fifeUrl: r,
                  prompt: e,
                  promptIndex: a,
                  type: "image",
                  seed: t.seed,
                  fileName: previewFileName,
                }),
                  kt(i, n),
                  zt("PREVIEW_READY", {
                    mediaId: i,
                    fifeUrl: r,
                    promptIndex: a,
                    prompt: e.substring(0, 60),
                    mediaType: "image",
                    uiBatchId: w?.uiBatchId || null,
                    fileName: previewFileName,
                  }),
                  tfQueueGeneratedImagePreviewCache({
                    mediaId: i,
                    fifeUrl: r,
                    promptIndex: a,
                    uiBatchId: w?.uiBatchId || null,
                    fileName: previewFileName,
                  }));
              }
            }
          if (0 === mediaCreated)
            throw new Error("Flow accepted the request but returned no image media");
          return { success: !0 };
        } catch (e) {
          return (
            zt("LOG", {
              message: `⚠️ Request ${o + 1}/${s} failed: ${e.message}`,
              type: "warn",
            }),
            { success: !1, error: e.message }
          );
        }
      })(),
    ),
    u = (await Promise.allSettled(d)).filter(
      (e) => "rejected" === e.status || !1 === e.value?.success,
    ).length;
  return (
    u > 0 &&
      zt("LOG", {
        message: `⚠️ ${u}/${s} failed for prompt ${a + 1}`,
        type: "warn",
      }),
    { batchId: n, count: s, failed: u }
  );
}
async function St(e, t, a = null) {
  const r = Date.now(),
    o = a || e.map((e, t) => t);
  const failStartup = (message, code = "script_failed") => {
    o.forEach((promptIndex) => {
      zt("PROMPT_STATUS", {
        promptIndex,
        status: "failed",
        error: message,
        uiBatchId: t.uiBatchId || null,
      });
    });
    _t(code);
    f = !1;
  };
  (ht(), (pt = t._autoChained || !1));
  const n = t.mode || "image";
  Kt("⚙️ Preparing batch...", "info");
  const s = await $e(e.length, n, t);
  if (!s.authorized)
    return s.banned
      ? void zt("BANNED", { message: s.reason })
      : (zt("LOG", { message: `🚫 ${s.reason}`, type: "error" }),
        void 0 !== s.remaining &&
          zt("LIMIT_REACHED", {
            message: s.reason,
            remaining: s.remaining || 0,
          }),
        void (
          s.serverDown &&
          zt("LOG", {
            message: "💡 Check your internet connection and try again.",
            type: "warn",
          })
        ));
  (Kt("✅ Ready to go", "success"),
    (f = !0),
    (w = {
      naming: t.naming || "numbered",
      namingPrefix: t.namingPrefix || "",
      namingSeparator:
        "string" == typeof t.namingSeparator ? t.namingSeparator : "-",
      startNumber: t.startNumber || 1,
      videoRatio: t.videoRatio || "landscape",
      speedMode: t.speedMode || "fast",
      imageCount: t.imageCount || 1,
      perPromptFileNames: t.perPromptFileNames || null,
      uiBatchId: t.uiBatchId || null,
    }));
  const l = "video" === n,
    p = l ? t.videoCount || 1 : t.imageCount || 1,
    m = p > 1 ? ` Ã— ${p}` : "",
    g = e.length * p;
  if (
    (Kt(
      `⚡ Generating ${g} ${l ? "video" : "image"}${g > 1 ? "s" : ""} from ${e.length} prompt${e.length > 1 ? "s" : ""}${m}`,
      "success",
    ),
    Kt("🔄 Connecting to Flow...", "info"),
    !c)
  )
    return (
      Kt("❌ No Flow tab found — open Google Flow and try again", "error"),
      void failStartup("No Flow tab found - open Google Flow and try again")
    );
  const h = await Qe(!0);
  if (!h)
    return (
      Kt("❌ Authentication failed — try refreshing the Flow page", "error"),
      void failStartup("Authentication failed - refresh the Flow page")
    );
  const _ = await Xe();
  if (!_)
    return (
      Kt("❌ No project open — create or open a project in Flow", "error"),
      void failStartup("No Flow project open - create or open a project in Flow")
    );
  if (!(await Ze()))
    return (
      Kt(
        "❌ Security check failed — refresh the Flow page. Disable VPN if active.",
        "error",
      ),
      void failStartup("Security check failed - refresh Flow page", "recaptcha_blocked")
    );
  (Kt("✅ Connected", "success"),
    (lt = Date.now()),
    "image" === n
      ? await Mt(e, t, o, h, _)
      : "video" === n && (await Ct(e, t, o, h, _)),
    (dt = Date.now()),
    (gt = E.total));
  let y = 0;
  if ("video" === n) {
    const e = new Set(
        W.filter((e) => "video" === e.type).map((e) => e.promptIndex),
      ),
      t = new Set();
    for (const [e, a] of Y)
      "video" === a.type && void 0 !== a.promptIndex && t.add(a.promptIndex);
    y = Math.max(e.size, t.size);
  } else y = z.size;
  const I = e.length,
    A = I - y,
    T = Date.now() - r,
    v =
      T < 6e4
        ? `${(T / 1e3).toFixed(0)}s`
        : `${Math.floor(T / 6e4)}m ${Math.round((T % 6e4) / 1e3)}s`;
  if (
    (f || C || (ut = !0),
    f &&
      (A > 0 && y > 0
        ? Kt(
            `⚠️ Done — ${y}/${I} prompts succeeded, ${A} failed (${v})`,
            "warn",
          )
        : A > 0
          ? Kt(`❌ Failed — all ${I} prompts errored (${v})`, "error")
          : Kt(`✅ All ${I} prompts generated (${v})`, "success")),
    A > 0)
  ) {
    const e = new Set();
    if ("video" === n) {
      for (const t of W)
        "video" === t.type && void 0 !== t.promptIndex && e.add(t.promptIndex);
      for (const [, t] of Y)
        "video" === t.type && void 0 !== t.promptIndex && e.add(t.promptIndex);
    } else for (const t of z.keys()) e.add(t);
    const t = o
      .filter((t) => !e.has(t))
      .map((e) => "#" + String(e + 1).padStart(3, "0"));
    if (t.length > 0) {
      const e = "video" === n ? "Video" : "Image",
        a = 40;
      let r;
      ((r =
        t.length > a
          ? t.slice(0, a).join(", ") + `, +${t.length - a} more`
          : t.join(", ")),
        Kt(
          `❌ Failed ${e.toLowerCase()}${t.length > 1 ? "s" : ""}: ${r}`,
          "error",
        ));
    }
  }
  const b = Et();
  ((b.featureFlags = t.featureFlags || null),
    (b.uploadsThisSession = t.uploadsThisSession || 0),
    "video" === n &&
      (b.videoModelKey = Tt(
        t.videoMode || "text",
        t.videoQuality || "lite",
        t.videoRatio || "landscape",
        ie(ne),
        t.videoDuration || 8,
      )));
  const O = await Ge(y, A, b);
  if (
    (O?.ok &&
      (O.deducted > 0
        ? Kt(
            `📊 ${O.deducted} prompts deducted · ${O.remaining} remaining today`,
            "info",
          )
        : O.plan),
    zt("BATCH_GENERATION_DONE", {
      message: "All API requests completed",
      totalPrompts: I,
      successfulPrompts: y,
      failedPrompts: A,
      totalImages: E.total,
    }),
    c && E.total > 0)
  ) {
    const e = setInterval(() => {
      E.downloaded + E.failed >= E.total &&
        !Z &&
        (clearInterval(e), (d = null), (u = null), chrome.tabs.reload(c));
    }, 2e3);
    setTimeout(() => clearInterval(e), 3e5);
  }
  ((te = 0), (ae = 0), (f = !1));
}
async function Mt(e, t, a, r, o) {
  const n = t.imageCount || 1;
  ((te = e.length * n), (ae = 0));
  const i = {
      fast: { concurrent: 3, stagger: 100 },
      balanced: { concurrent: 2, stagger: 2e3 },
      slow: { concurrent: 1, stagger: 3e3 },
    },
    s = i[t.speedMode || "fast"] || i.fast,
    c = s.concurrent,
    l = s.stagger,
    d = [];
  for (let r = 0; r < e.length; r++) {
    const o = e[r],
      i = a[r],
      s = he(),
      c = ";" + Date.now() + r;
    (V.set(s, i),
      zt("LOG", {
        message: `🖊 #${r + 1} — "${o.substring(0, 50) + (o.length > 50 ? "..." : "")}"`,
        type: "info",
      }),
      zt("PROMPT_STATUS", { promptIndex: i, status: "running" }));
    for (let e = 0; e < n; e++) {
      const a = _e(),
        l = i,
        u = 250 * (r * n + e),
        m = e;
      d.push(async () => {
        if (!f) return { success: !1, promptIndex: l };
        if (C) return { success: !1, promptIndex: l, quotaHit: !0 };
        u > 0 && (await we(u));
        const e = await Qe(),
          r = await Xe();
        if (!e || !r) throw new Error("Missing auth/project");
        const n = `https://aisandbox-pa.googleapis.com/v1/projects/${r}/flowMedia:batchGenerateImages`,
          i = [];
        if ("mapped" === t.referenceMode) {
          const e = t.perPromptReferences?.[l];
          if (e && e.length > 0)
            for (const t of e)
              i.push({ imageInputType: "IMAGE_INPUT_TYPE_REFERENCE", name: t });
        } else if (
          t.imageReferenceMediaIds &&
          t.imageReferenceMediaIds.length > 0
        )
          for (const e of t.imageReferenceMediaIds)
            i.push({ imageInputType: "IMAGE_INPUT_TYPE_REFERENCE", name: e });
        const d = {
            clientContext: {
              recaptchaContext: {
                applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
                token: "PLACEHOLDER",
              },
              projectId: r,
              tool: "PINHOLE",
              sessionId: c,
            },
            mediaGenerationContext: { batchId: s },
            useNewMedia: !0,
            requests: [
              {
                clientContext: {
                  recaptchaContext: {
                    applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
                    token: "PLACEHOLDER",
                  },
                  projectId: r,
                  tool: "PINHOLE",
                  sessionId: c,
                },
                imageAspectRatio:
                  t.aspectRatio || "IMAGE_ASPECT_RATIO_LANDSCAPE",
                imageInputs: i,
                imageModelName: t.imageModel || "NARWHAL",
                seed: a,
                structuredPrompt: { parts: [{ text: o }] },
              },
            ],
          },
          p = await et(n, d, e, "IMAGE_GENERATION");
        let mediaCreated = 0;
        if (p?.workflows)
          for (const e of p.workflows) {
            const flowBatchId = e?.metadata?.batchId,
              r = e?.metadata?.primaryMediaId;
            if (r && flowBatchId) {
              mediaCreated++;
              V.has(flowBatchId) || V.set(flowBatchId, l);
              let e = null;
              if (p.media && Array.isArray(p.media))
                for (const t of p.media) {
                  const a = t?.image?.generatedImage?.fifeUrl;
                  if (a) {
                    e = a;
                    break;
                  }
                }
              const previewFileName = tfExactDownloadName(w, l, "", "png", m);
              (Y.set(r, {
                fifeUrl: e,
                prompt: o,
                promptIndex: l,
                type: "image",
                seed: a,
                fileName: previewFileName,
              }),
                kt(r, flowBatchId),
                zt("PREVIEW_READY", {
                  mediaId: r,
                  fifeUrl: e,
                  promptIndex: l,
                  prompt: o.substring(0, 60),
                  mediaType: "image",
                  uiBatchId: t.uiBatchId || null,
                  fileName: previewFileName,
                }),
                tfQueueGeneratedImagePreviewCache({
                  mediaId: r,
                  fifeUrl: e,
                  promptIndex: l,
                  uiBatchId: t.uiBatchId || null,
                  fileName: previewFileName,
                }));
            }
          }
        if (0 === mediaCreated)
          throw new Error("Flow accepted the request but returned no image media");
        return { success: !0, promptIndex: l };
      });
    }
  }
  const u = new Map(),
    p = new Map(),
    m = d.map((e, r) => {
      const o = a[Math.floor(r / n)];
      return async () => {
        try {
          const t = await e();
          if (!1 === t?.success) return t;
          if (void 0 !== t?.promptIndex) {
            const e = t.promptIndex;
            (u.set(e, (u.get(e) || 0) + 1),
              u.get(e) >= n &&
                (zt("PROMPT_STATUS", { promptIndex: e, status: "submitted" }),
                zt("LOG", {
                  message: `✓ Prompt #${e + 1} complete (${n}/${n})`,
                  type: "success",
                })));
          }
        } catch (e) {
          const failureReason = e.message || "Unknown error";
          if (
            (_t(yt(e.message)),
            It(e.message, {
              videoModelKey: "image:" + (t.imageModel || "unknown"),
            }),
            f && !le)
          ) {
            let t = e.message || "Unknown error";
            (t.includes("PUBLIC_ERROR_UNSAFE_GENERATION")
              ? (t = "Blocked by safety filter — try rewording the prompt")
              : t.includes("PUBLIC_ERROR_UNSAFE_IMAGE_UPLOAD")
                ? (t = "Reference image blocked by safety filter")
                : t.includes("reCAPTCHA blocked")
                  ? (t = "reCAPTCHA blocked — refresh Flow page or disable VPN")
                  : t.includes("Access denied")
                    ? (t = "Session expired — refresh Flow page")
                    : t.includes("Blocked by Google")
                      ? (t = "Blocked by Google — refresh Flow page")
                      : t.includes("Rejected (400)") ||
                        (t.includes("500")
                          ? (t = "Server error (500)")
                          : t.includes("429")
                            ? (t = "Rate limited (429)")
                            : t.includes("403")
                              ? (t = "Access denied (403) — refresh Flow page")
                              : t.length > 150 &&
                                (t = t.substring(0, 150) + "...")),
              zt("LOG", {
                message: `❌ Prompt #${o + 1} failed — ${t}`,
                type: "error",
              }));
          }
          if (
            (p.set(o, (p.get(o) || 0) + 1),
            (u.get(o) || 0) + p.get(o) >= n && f && !le)
          ) {
            const e = u.get(o) || 0;
            0 === e
              ? (zt("PROMPT_STATUS", {
                  promptIndex: o,
                  status: "failed",
                  error: failureReason,
                }),
                zt("LOG", {
                  message: `❌ Prompt #${o + 1} failed — all ${n} request(s) errored`,
                  type: "error",
                }))
              : (zt("PROMPT_STATUS", { promptIndex: o, status: "submitted" }),
                zt("LOG", {
                  message: `⚠️ Prompt #${o + 1} partial — ${e}/${n} succeeded`,
                  type: "warn",
                }));
          }
          throw e;
        }
      };
    });
  await bt(m, c, l, { mode: "image" });
}
