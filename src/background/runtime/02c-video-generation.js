// TurboFlow shard: Video generation polling and prompt status handling
// Loaded in numeric order; depends on earlier shards sharing globals.

async function Ct(e, t, a, r, o) {
  const n = {
      fast: { concurrent: 2, stagger: 1e3 },
      balanced: { concurrent: 1, stagger: 2e3 },
      slow: { concurrent: 1, stagger: 3e3 },
    },
    i = n[t.speedMode || "fast"] || n.fast,
    s = i.concurrent,
    l = i.stagger,
    d = t.videoCount || 1;
  ((te = e.length * d), (ae = 0));
  const u = [];
  for (let r = 0; r < e.length; r++) {
    const o = e[r],
      n = a[r],
      i = he(),
      s = ";" + Date.now() + r;
    (V.set(i, n),
      zt("LOG", {
        message: `🎬 #${r + 1} — "${o.substring(0, 50) + (o.length > 50 ? "..." : "")}"`,
        type: "info",
      }),
      zt("PROMPT_STATUS", {
        promptIndex: n,
        status: "running",
        uiBatchId: t.uiBatchId || null,
      }));
    for (let e = 0; e < d; e++) {
      const a = _e(),
        l = 250 * (r * d + e);
      u.push(async () => {
        if (!f) return { success: !1, promptIndex: n };
        if (C) return { success: !1, promptIndex: n, quotaHit: !0 };
        l > 0 && (await we(l));
        const r = await Qe(),
          u = await Xe();
        if (!r || !u) throw new Error("Missing auth/project");
        const p = t.videoRatio || "landscape",
          m = t.videoQuality || "lite",
          g = ie(ne),
          w = t.videoMode || "text",
          h = Tt(w, m, p, g, t.videoDuration || 8),
          _ = `https://aisandbox-pa.googleapis.com/v1/video:${vt(w)}`,
          y = {
            aspectRatio:
              "landscape" === p
                ? "VIDEO_ASPECT_RATIO_LANDSCAPE"
                : "VIDEO_ASPECT_RATIO_PORTRAIT",
            seed: a,
            metadata: {},
            textInput: { structuredPrompt: { parts: [{ text: o }] } },
            videoModelKey: h,
          };
        if ("start_frame" === w || "start_end_frame" === w)
          if ("mapped" === t.referenceMode) {
            const e = t.perPromptStartFrames?.[n];
            e &&
              (y.startImage = {
                mediaId: e,
                cropCoordinates: { top: 0, left: 0, bottom: 1, right: 1 },
              });
          } else
            t.startFrameMediaId &&
              (y.startImage = {
                mediaId: t.startFrameMediaId,
                cropCoordinates: { top: 0, left: 0, bottom: 1, right: 1 },
              });
        if ("start_end_frame" === w)
          if ("mapped" === t.referenceMode) {
            const e = t.perPromptEndFrames?.[n];
            e &&
              (y.endImage = {
                mediaId: e,
                cropCoordinates: { top: 0, left: 0, bottom: 1, right: 1 },
              });
          } else
            t.endFrameMediaId &&
              (y.endImage = {
                mediaId: t.endFrameMediaId,
                cropCoordinates: { top: 0, left: 0, bottom: 1, right: 1 },
              });
        if ("reference" === w)
          if ("mapped" === t.referenceMode) {
            const e = t.perPromptReferences?.[n];
            e &&
              e.length > 0 &&
              (y.referenceImages = e.map((e) => ({
                mediaId: e,
                imageUsageType: "IMAGE_USAGE_TYPE_ASSET",
              })));
          } else
            t.referenceMediaIds &&
              t.referenceMediaIds.length > 0 &&
              (y.referenceImages = t.referenceMediaIds.map((e) => ({
                mediaId: e,
                imageUsageType: "IMAGE_USAGE_TYPE_ASSET",
              })));
        const I = {
            mediaGenerationContext: {
              batchId: i,
              audioFailurePreference: "BLOCK_SILENCED_VIDEOS",
            },
            clientContext: {
              projectId: u,
              tool: "PINHOLE",
              recaptchaContext: {
                applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
                token: "PLACEHOLDER",
              },
              sessionId: s,
              userPaygateTier: ne || "PAYGATE_TIER_NOT_PAID",
            },
            requests: [y],
            useV2ModelConfig: !0,
          },
          A = await et(_, I, r, "VIDEO_GENERATION"),
          E = A?.media?.[0]?.name;
        if (!E) throw new Error("No mediaId in response");
        const T = A?.workflows?.[0]?.metadata?.batchId;
        T && !V.has(T) && V.set(T, n);
        const v = A?.workflows?.[0]?.name;
        Y.set(E, {
          fifeUrl: null,
          prompt: o,
          promptIndex: n,
          type: "video",
          workflowId: v,
          fileName: tfExactDownloadName(w, n, "", "mp4"),
        });
        let b = null,
          O = 0;
        for (let t = 0; t < 120; t++) {
          if (!f) return { success: !1, promptIndex: n };
          const a = Date.now();
          (await we(5e3), (ft += Date.now() - a));
          try {
            const a = await Qe();
            if (!a) {
              if ((O++, O >= 5))
                throw new Error(
                  "Polling failed — lost auth token after 5 consecutive failures",
                );
              continue;
            }
            const r = await chrome.scripting.executeScript({
                target: { tabId: c },
                world: "MAIN",
                func: async (e, t, a) => {
                  try {
                    const r = await fetch(
                      "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "text/plain;charset=UTF-8",
                          Authorization: "Bearer " + a,
                        },
                        body: JSON.stringify({
                          media: [{ name: e, projectId: t }],
                        }),
                      },
                    );
                    if (!r.ok) {
                      const e = await r.text();
                      return {
                        error: "HTTP " + r.status,
                        errText: e.substring(0, 300),
                      };
                    }
                    return { success: !0, data: await r.json() };
                  } catch (e) {
                    return { error: e.message };
                  }
                },
                args: [E, u, a],
              }),
              o = r?.[0]?.result;
            if (!o || o.error) {
              O++;
              const e = o?.error || "Script execution failed";
              if (e.includes("429")) {
                const e = Math.min(1e4, 15e3);
                await we(e);
              }
              if (O >= 5)
                throw new Error(
                  `Polling failed after 5 consecutive errors: ${e}`,
                );
              continue;
            }
            O = 0;
            const i = o.data?.media?.[0],
              s = i?.mediaMetadata?.mediaStatus?.mediaGenerationStatus;
            if (
              "MEDIA_GENERATION_STATUS_COMPLETED" === s ||
              "MEDIA_GENERATION_STATUS_COMPLETE" === s ||
              "MEDIA_GENERATION_STATUS_SUCCESSFUL" === s
            ) {
              b = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${E}`;
              break;
            }
            if ("MEDIA_GENERATION_STATUS_FAILED" === s) {
              const e =
                i?.mediaMetadata?.mediaStatus?.failureReason ||
                i?.mediaMetadata?.mediaStatus?.errorMessage ||
                "unknown";
              throw (
                JSON.stringify(i?.mediaMetadata?.mediaStatus || {}).substring(
                  0,
                  300,
                ),
                new Error(`Google rejected video: ${e}`)
              );
            }
            t % 6 == 0 &&
              Kt(
                `⏳ Video #${String(n + 1).padStart(3, "0")}${d > 1 ? String.fromCharCode(97 + e) : ""} still generating... (${Math.round((5e3 * t) / 1e3)}s)`,
                "info",
              );
          } catch (e) {
            if (
              e.message.includes("Google rejected") ||
              e.message.includes("Polling failed")
            )
              throw e;
            if ((O++, O >= 5))
              throw new Error(
                `Polling crashed after 5 consecutive errors: ${e.message}`,
              );
          }
        }
        if (!b) throw new Error("Video generation timed out after 600s");
        const P = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${E}`;
        return (
          zt("PREVIEW_READY", {
            mediaId: E,
            fifeUrl: null,
            promptIndex: n,
            prompt: o.substring(0, 60),
            mediaType: "video",
            videoUrl: P,
            workflowId: v,
            uiBatchId: t.uiBatchId || null,
            fileName: tfExactDownloadName(w, n, "", "mp4"),
          }),
          Lt(b, E, n),
          { success: !0, promptIndex: n }
        );
      });
    }
  }
  const p = new Map(),
    m = new Map(),
    g = u.map((e, r) => {
      const o = Math.floor(r / d),
        n = a[o];
      return async () => {
        try {
          const t = await e();
          if (!1 === t?.success) {
            if (
              (m.set(n, (m.get(n) || 0) + 1),
              (p.get(n) || 0) + m.get(n) >= d && f && !le)
            ) {
              const e = p.get(n) || 0;
              e > 0
                ? (zt("PROMPT_STATUS", {
                    promptIndex: n,
                    status: "submitted",
                    uiBatchId: t.uiBatchId || null,
                  }),
                  Kt(`⚠️ Prompt #${n + 1} partial — ${e}/${d} videos`, "warn"))
                : zt("PROMPT_STATUS", {
                    promptIndex: n,
                    status: "failed",
                    uiBatchId: t.uiBatchId || null,
                  });
            }
            return t;
          }
          if (t?.success && void 0 !== t?.promptIndex) {
            const e = t.promptIndex;
            (p.set(e, (p.get(e) || 0) + 1),
              p.get(e) >= d &&
                (zt("PROMPT_STATUS", {
                  promptIndex: e,
                  status: "submitted",
                  uiBatchId: t.uiBatchId || null,
                }),
                Kt(
                  `✅ Prompt #${e + 1} complete (${d}/${d} videos)`,
                  "success",
                )));
          }
          return t;
        } catch (e) {
          const failureReason = e.message || "Unknown error";
          if (
            (It(e.message, { videoModelKey: t.videoQuality || "unknown" }),
            f && !le)
          ) {
            let t = e.message || "Unknown error";
            if (
              (t.includes("404") && t.includes("NOT_FOUND")) ||
              t.includes("Requested entity was not found")
            )
              throw (
                zt("STALE_REFERENCES", {
                  message:
                    "Some reference images are from a previous project and are no longer valid.",
                }),
                (f = !1),
                e
              );
            (t.includes("PUBLIC_ERROR_UNSAFE_GENERATION")
              ? (t = "Blocked by safety filter — try rewording the prompt")
              : t.includes("PUBLIC_ERROR_UNSAFE_IMAGE_UPLOAD")
                ? (t = "Reference image blocked by safety filter")
                : t.includes("Google rejected")
                  ? (t = "Generation failed by Google")
                  : t.includes("timed out")
                    ? (t = "Generation timed out")
                    : t.includes("Polling failed")
                      ? (t = "Lost connection during generation")
                      : t.includes("reCAPTCHA blocked")
                        ? (t = "reCAPTCHA blocked — refresh Flow page")
                        : t.includes("Rejected (400)") ||
                          (t.includes("429")
                            ? (t = "Rate limited (429)")
                            : t.includes("403")
                              ? (t = "Access denied — refresh Flow page")
                              : t.includes("500")
                                ? (t = "Server error (500)")
                                : t.length > 150 &&
                                  (t = t.substring(0, 150) + "...")),
              Kt(
                `❌ Video #${String(n + 1).padStart(3, "0")} failed — ${t}`,
                "error",
              ));
          }
          if (
            (m.set(n, (m.get(n) || 0) + 1),
            (p.get(n) || 0) + m.get(n) >= d && f && !le)
          ) {
            const e = p.get(n) || 0;
            0 === e
              ? zt("PROMPT_STATUS", {
                promptIndex: n,
                status: "failed",
                error: failureReason,
                uiBatchId: t.uiBatchId || null,
              })
              : (zt("PROMPT_STATUS", {
                  promptIndex: n,
                  status: "submitted",
                  uiBatchId: t.uiBatchId || null,
                }),
                Kt(`⚠️ Prompt #${n + 1} partial — ${e}/${d} videos`, "warn"));
          }
          throw e;
        }
      };
    });
  await bt(g, s, l, { mode: "video" });
}
