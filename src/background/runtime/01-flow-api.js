// TurboFlow background runtime shard: Google Flow auth tokens and API helpers
// Loaded by src/background/runtime.js in numeric order.

let qe = null;
async function Qe(e = !1) {
  if (!c) return null;
  if (!e && d && Date.now() - p < n) return d;
  if (qe && !e) return qe;
  qe = Je();
  try {
    return await qe;
  } finally {
    qe = null;
  }
}
async function Je() {
  try {
    const e = await chrome.scripting.executeScript({
      target: { tabId: c },
      world: "MAIN",
      func: async () => {
        try {
          const e = await fetch("/fx/api/auth/session", {
            credentials: "include",
          });
          return (await e.json()).access_token || null;
        } catch (e) {
          return null;
        }
      },
    });
    return ((d = e?.[0]?.result || null), (p = Date.now()), d);
  } catch (e) {
    return null;
  }
}
async function Xe() {
  if (u) return u;
  if (!c) return null;
  try {
    const e = await chrome.scripting.executeScript({
      target: { tabId: c },
      world: "MAIN",
      func: () => {
        const e =
          window.location.pathname.match(/\/project\/([^/?#]+)/) ||
          window.location.href.match(/\/project\/([^/?#]+)/);
        return e ? e[1] : null;
      },
    });
    return ((u = e?.[0]?.result || null), u);
  } catch (e) {
    return null;
  }
}
async function Ze() {
  if (!c) return null;
  try {
    const e = await chrome.scripting.executeScript({
      target: { tabId: c },
      world: "MAIN",
      func: async (e) => {
        try {
          return "undefined" != typeof grecaptcha && grecaptcha.enterprise
            ? await grecaptcha.enterprise.execute(e, {
                action: "IMAGE_GENERATION",
              })
            : null;
        } catch (e) {
          return null;
        }
      },
      args: [r],
    });
    return e?.[0]?.result || null;
  } catch (e) {
    return null;
  }
}
async function et(e, t, a, o = "IMAGE_GENERATION", n = 0) {
  if (!c) throw new Error("No Flow tab");
  if (le && 0 === n) {
    if (await le) {
      const a = await Qe(!0);
      if (a) return et(e, t, a, o, 0);
    }
    throw new Error("reCAPTCHA recovery failed — cannot make API call");
  }
  const i = await chrome.scripting.executeScript({
      target: { tabId: c },
      world: "MAIN",
      func: (e, t) => {
        const a = window.grecaptcha?.enterprise;
        return a ? a.execute(e, { action: t }) : Promise.resolve(null);
      },
      args: [r, o],
    }),
    s = i?.[0]?.result;
  if (!s) throw new Error("No reCAPTCHA token — try refreshing the Flow page");
  if (
    (t.clientContext?.recaptchaContext &&
      (t.clientContext.recaptchaContext.token = s),
    t.requests)
  )
    for (const e of t.requests)
      e.clientContext?.recaptchaContext &&
        (e.clientContext.recaptchaContext.token = s);
  const l = JSON.stringify(t),
    u = await chrome.scripting.executeScript({
      target: { tabId: c },
      world: "MAIN",
      func: async (e, t, a) => {
        try {
          const r = await fetch(e, {
              method: "POST",
              headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                Authorization: "Bearer " + a,
              },
              body: t,
            }),
            o = await r.text();
          if (!r.ok)
            return {
              error: "HTTP " + r.status + ": " + o.substring(0, 300),
              status: r.status,
              errText: o.substring(0, 500),
            };
          let n;
          try {
            n = JSON.parse(o);
          } catch (e) {
            n = o;
          }
          return { success: !0, data: n };
        } catch (e) {
          return { error: e.message };
        }
      },
      args: [e, l, a],
    }),
    p = u?.[0]?.result;
  if (!p) throw new Error("Script execution failed");
  if (p.error) {
    let r = null,
      i = null;
    try {
      const e = JSON.parse(p.errText || "");
      r = e?.error?.message || null;
      const t = e?.error?.details;
      if (Array.isArray(t))
        for (const e of t)
          if (e.reason) {
            i = e.reason;
            break;
          }
    } catch (e) {}
    const s = (e) =>
      r && i
        ? `${r} [${i}]`
        : r || (i ? `[${i}]` : p.errText?.substring(0, 200) || e);
    if (400 === p.status)
      throw new Error("Rejected (400): " + s("Bad request"));
    if (401 === p.status) {
      if (0 === n) {
        ((d = null), await we(1e3));
        const a = await Qe(!0);
        if (a) return et(e, t, a, o, 1);
      }
      throw new Error(
        "Session expired (401) — refresh the Flow page and try again",
      );
    }
    if (429 === p.status) {
      const e =
          "DAILY_QUOTA_REACHED" === i ||
          (p.errText || "").includes("DAILY_QUOTA_REACHED"),
        t =
          "PUBLIC_ERROR_USER_REQUESTS_THROTTLED" === i ||
          (p.errText || "").includes("PUBLIC_ERROR_USER_REQUESTS_THROTTLED");
      if (e)
        throw new ye(
          "Your Google account's daily generation limit reached. Try again in a few hours.",
        );
      if (t) throw new Error("429 Throttled: " + s("throttled"));
      if ((p.errText || "").includes("RESOURCE_EXHAUSTED"))
        throw new Error("429 Rate limited: " + s("rate limited"));
      throw new Error("429: " + s("rate limited"));
    }
    if (403 === p.status) {
      const r = (p.errText || "").toLowerCase(),
        i =
          r.includes("recaptcha") || r.includes("captcha") || r.includes("bot"),
        s =
          r.includes("permission") ||
          r.includes("forbidden") ||
          r.includes("auth");
      if (0 === n) return (await we(1500), et(e, t, (await Qe(!0)) || a, o, 1));
      if (1 === n && i && (await Be())) {
        const a = await Qe(!0);
        if (a) return et(e, t, a, o, 2);
      }
      if (i)
        throw new Error(
          "reCAPTCHA blocked — close the Flow tab, reopen it, and try again",
        );
      if (s)
        throw new Error(
          "Access denied (403) — your Flow session may have expired. Refresh the Flow page and try again",
        );
      throw new Error(
        "Blocked by Google (403) — refresh the Flow page, disable VPN if active, and try again",
      );
    }
    throw new Error(p.error);
  }
  return p.data;
}
async function tt(e, t, a, r = 0) {
  const o = await Qe(),
    n = await Xe();
  if (!o || !n) throw new Error("Missing auth/project");
  const i = await chrome.scripting.executeScript({
      target: { tabId: c },
      world: "MAIN",
      func: async (e, t, a, r, o) => {
        try {
          const n = await fetch(
            "https://aisandbox-pa.googleapis.com/v1/flow/uploadImage",
            {
              method: "POST",
              headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                Authorization: "Bearer " + o,
              },
              body: JSON.stringify({
                clientContext: { projectId: r, tool: "PINHOLE" },
                fileName: t,
                imageBytes: e,
                isHidden: !1,
                isUserUploaded: !0,
                mimeType: a,
              }),
            },
          );
          if (!n.ok) {
            const e = await n.text();
            return {
              error: "HTTP " + n.status + ": " + e.substring(0, 300),
              status: n.status,
            };
          }
          return { success: !0, data: await n.json() };
        } catch (e) {
          return { error: e.message, isNetworkError: !0 };
        }
      },
      args: [e, t, a, n, o],
    }),
    s = i?.[0]?.result;
  if (!s) {
    if (r < 3) {
      const o = 1e3 * Math.pow(2, r) + 500 * Math.random();
      return (await we(o), tt(e, t, a, r + 1));
    }
    throw new Error("Script execution failed after 3 retries");
  }
  if (s.error) {
    if (400 === s.status || 404 === s.status || 422 === s.status)
      throw new Error(s.error);
    if (
      (s.isNetworkError ||
        429 === s.status ||
        500 === s.status ||
        502 === s.status ||
        503 === s.status ||
        s.error.includes("Failed to fetch") ||
        s.error.includes("NetworkError") ||
        s.error.includes("network") ||
        s.error.includes("ECONNRESET") ||
        s.error.includes("timeout")) &&
      r < 3
    ) {
      const o =
        429 === s.status
          ? 3e3 * Math.pow(2, r) + 1e3 * Math.random()
          : 1e3 * Math.pow(1.5, r) + 500 * Math.random();
      return (
        await we(o),
        (401 !== s.status && 403 !== s.status) || (d = null),
        tt(e, t, a, r + 1)
      );
    }
    throw new Error(s.error);
  }
  const l = s.data?.media?.name;
  if (!l) throw new Error("No mediaId in upload response");
  return (
    zt("LOG", {
      message: `📤 Uploaded "${t}" → mediaId: ${l.substring(0, 8)}...`,
      type: "success",
    }),
    l
  );
}
async function at(e, t, a, o = "2k") {
  const n = ";" + Date.now() + Math.random(),
    i =
      "4k" === o
        ? "UPSAMPLE_IMAGE_RESOLUTION_4K"
        : "UPSAMPLE_IMAGE_RESOLUTION_2K",
    s = "4k" === o ? "PAYGATE_TIER_TWO" : "PAYGATE_TIER_NOT_PAID",
    l = await chrome.scripting.executeScript({
      target: { tabId: c },
      world: "MAIN",
      func: async (e, t, a, r, o, n, i) => {
        try {
          let s = null;
          if (
            ("undefined" != typeof grecaptcha &&
              grecaptcha.enterprise &&
              (s = await grecaptcha.enterprise.execute(o, {
                action: "IMAGE_GENERATION",
              })),
            !s)
          )
            return { error: "No reCAPTCHA token" };
          const c = await fetch(
            "https://aisandbox-pa.googleapis.com/v1/flow/upsampleImage",
            {
              method: "POST",
              headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                Authorization: "Bearer " + r,
              },
              body: JSON.stringify({
                mediaId: e,
                targetResolution: n,
                clientContext: {
                  projectId: t,
                  tool: "PINHOLE",
                  recaptchaContext: {
                    applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
                    token: s,
                  },
                  sessionId: a,
                  userPaygateTier: i,
                },
              }),
            },
          );
          if (!c.ok) {
            const e = await c.text();
            return {
              error: "HTTP " + c.status + ": " + e.substring(0, 500),
              status: c.status,
            };
          }
          const l = await c.json();
          return l.encodedImage
            ? { success: !0, base64: l.encodedImage }
            : { error: "No encodedImage" };
        } catch (e) {
          return { error: e.message };
        }
      },
      args: [e, t, n, a, r, i, s],
    });
  return l?.[0]?.result || { error: "Script failed" };
}
async function rt(e, t, a, r, o) {
  const n = {
      mediaGenerationContext: { batchId: he() },
      clientContext: {
        projectId: a,
        tool: "PINHOLE",
        userPaygateTier: "PAYGATE_TIER_NOT_PAID",
        sessionId: ";" + Date.now() + Math.random(),
        recaptchaContext: {
          token: "PLACEHOLDER",
          applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
        },
      },
      requests: [
        {
          resolution: "VIDEO_RESOLUTION_1080P",
          aspectRatio:
            "portrait" === o
              ? "VIDEO_ASPECT_RATIO_PORTRAIT"
              : "VIDEO_ASPECT_RATIO_LANDSCAPE",
          seed: _e(),
          videoModelKey: "veo_3_1_upsampler_1080p",
          metadata: { workflowId: t },
          videoInput: { mediaId: e },
        },
      ],
      useV2ModelConfig: !0,
    },
    i = await et(
      "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo",
      n,
      r,
      "VIDEO_GENERATION",
    ),
    s = i?.media?.[0]?.name,
    c = i?.operations?.[0]?.status;
  if (!s) throw new Error("No upsampled mediaId in response");
  return { upsampledMediaId: s, status: c };
}
async function ot(e, t, a, r, o) {
  const n = {
      mediaGenerationContext: { batchId: he() },
      clientContext: {
        projectId: a,
        tool: "PINHOLE",
        userPaygateTier: "PAYGATE_TIER_TWO",
        sessionId: ";" + Date.now() + Math.random(),
        recaptchaContext: {
          token: "PLACEHOLDER",
          applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB",
        },
      },
      requests: [
        {
          resolution: "VIDEO_RESOLUTION_4K",
          aspectRatio:
            "portrait" === o
              ? "VIDEO_ASPECT_RATIO_PORTRAIT"
              : "VIDEO_ASPECT_RATIO_LANDSCAPE",
          seed: _e(),
          videoModelKey: "veo_3_1_upsampler_4k",
          metadata: { workflowId: t },
          videoInput: { mediaId: e },
        },
      ],
      useV2ModelConfig: !0,
    },
    i = await et(
      "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo",
      n,
      r,
      "VIDEO_GENERATION",
    ),
    s = i?.media?.[0]?.name,
    c = i?.operations?.[0]?.status;
  if (!s) throw new Error("No upsampled mediaId in 4K response");
  return { upsampledMediaId: s, status: c };
}
async function nt(e, t, a, r) {
  for (let a = 0; a < 120; a++) {
    await we(5e3);
    try {
      const o = await Qe();
      if (!o) continue;
      const n = await chrome.scripting.executeScript({
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
                  body: JSON.stringify({ media: [{ name: e, projectId: t }] }),
                },
              );
              return r.ok
                ? { success: !0, data: await r.json() }
                : { error: "HTTP " + r.status };
            } catch (e) {
              return { error: e.message };
            }
          },
          args: [e, t, o],
        }),
        i = n?.[0]?.result;
      if (!i?.success) continue;
      const s = i.data?.media?.[0],
        l = s?.mediaMetadata?.mediaStatus?.mediaGenerationStatus;
      if (
        "MEDIA_GENERATION_STATUS_COMPLETED" === l ||
        "MEDIA_GENERATION_STATUS_COMPLETE" === l ||
        "MEDIA_GENERATION_STATUS_SUCCESSFUL" === l
      )
        return (
          zt("LOG", {
            message: `✅ Video #${r + 1} upscaled to 1080p!`,
            type: "success",
          }),
          `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${e}`
        );
      if ("MEDIA_GENERATION_STATUS_FAILED" === l)
        return (
          zt("LOG", {
            message: `❌ Video #${r + 1} upscale failed`,
            type: "error",
          }),
          null
        );
      a % 6 == 0 &&
        Kt(
          `⏳ Video #${String(r + 1).padStart(3, "0")} upscaling... (${Math.round((5e3 * a) / 1e3)}s)`,
          "info",
        );
    } catch (e) {}
  }
  return (
    zt("LOG", {
      message: `⏰ Video #${r + 1} upscale timed out`,
      type: "error",
    }),
    null
  );
}
async function it(e, t) {
  return `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${e}`;
}
async function st() {
  if (!c) return null;
  try {
    const e = await Qe();
    if (!e) return null;
    const t = await chrome.scripting.executeScript({
        target: { tabId: c },
        world: "MAIN",
        func: async (e, t) => {
          try {
            const a = await fetch(
              "https://aisandbox-pa.googleapis.com/v1/credits?key=" + t,
              { headers: { Authorization: "Bearer " + e } },
            );
            return a.ok
              ? { success: !0, data: await a.json() }
              : { error: "HTTP " + a.status };
          } catch (e) {
            return { error: e.message };
          }
        },
        args: [e, o],
      }),
      a = t?.[0]?.result;
    if (!a?.success) return null;
    const r = a.data?.userPaygateTier || null;
    return (
      (ne = r),
      r &&
        chrome.storage.local
          .set({ turboflowGoogleTier: r, turboflowGoogleTierAt: Date.now() })
          .catch(() => {}),
      {
        tier: r,
        sku: a.data?.sku || null,
        serviceTier: a.data?.serviceTier || null,
        credits: a.data?.credits ?? null,
      }
    );
  } catch (e) {
    return null;
  }
}
let ct = {},
  lt = 0,
  dt = 0,
  ut = !1,
  pt = !1,
  mt = {},
  ft = 0,
  gt = 0,
  wt = [];
