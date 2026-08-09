// TurboFlow shard: Generation shared helpers, safety/error classification, request scheduler
// Loaded in numeric order; depends on earlier shards sharing globals.

// TurboFlow background runtime shard: Image/video generation orchestration and polling
// Loaded by src/background/runtime.js in numeric order.

function ht() {
  ((ct = {}),
    (lt = 0),
    (dt = 0),
    (ut = !1),
    (pt = !1),
    (mt = {}),
    (ft = 0),
    (gt = 0),
    (wt = []));
}
function _t(e) {
  (ct[e] || (ct[e] = 0), ct[e]++);
}
function yt(e) {
  if (!e) return "unknown";
  const t = e.toLowerCase();
  return t.includes("recaptcha") || t.includes("captcha") || t.includes("bot")
    ? "recaptcha_blocked"
    : t.includes("daily_quota_reached") || t.includes("resource_exhausted")
      ? "daily_quota"
      : t.includes("401") ||
          t.includes("session expired") ||
          t.includes("authentication credentials")
        ? "auth_expired"
        : t.includes("429") || t.includes("rate limit")
          ? "rate_limited_429"
          : t.includes("500") || t.includes("502") || t.includes("503")
            ? "server_error_500"
            : t.includes("403") ||
                t.includes("access denied") ||
                t.includes("forbidden") ||
                t.includes("blocked by google")
              ? "access_denied_403"
              : t.includes("400") || t.includes("rejected")
                ? "google_rejected_400"
                : t.includes("timeout") || t.includes("timed out")
                  ? "timeout"
                  : t.includes("failed to fetch") ||
                      t.includes("networkerror") ||
                      t.includes("network") ||
                      t.includes("econnreset")
                    ? "network_error"
                    : t.includes("script") ||
                        t.includes("no flow tab") ||
                        t.includes("missing auth")
                      ? "script_failed"
                      : "unknown";
}
function It(e, t) {
  if (!e || "string" != typeof e) return;
  let a = e.substring(0, 500);
  (a.includes("HTTP 500") &&
    a.includes("Internal error encountered") &&
    (a = "HTTP 500: Google internal error"),
    t?.videoModelKey && (a = "[" + t.videoModelKey + "] " + a),
    mt[a] || (mt[a] = 0),
    mt[a]++);
}
function At() {
  let e = null,
    t = 0;
  for (const [a, r] of Object.entries(mt)) r > t && ((t = r), (e = a));
  return e;
}
function Et() {
  const e = Date.now(),
    t = lt > 0 && dt > 0 ? dt - lt : null,
    a = lt > 0 ? e - lt : null,
    r = a && t && a > t ? a - t : null,
    o = { ...ct };
  return (
    ut && (o.user_stopped = 1),
    {
      duration: { totalMs: a, generationMs: t, downloadMs: r },
      errors: Object.keys(o).length > 0 ? o : null,
      autoChained: pt,
      speedMode: w?.speedMode || "fast",
      totalImagesGenerated: gt,
      rateLimitHits: O,
      upscaleRateLimitHits: P,
      videoUpscaleRateLimitHits: G,
      fourKVideoUpscaleRateLimitHits: F,
      topErrorMessage: At(),
      videoPollDurationMs: ft > 0 ? ft : null,
      actualDownloadQuality: void 0 !== ce ? ce : null,
      recaptchaRecoveries: ue,
      recaptchaRecoveryLevel: ge,
      recoveryLog: wt,
      downloadTotal: E.total,
      downloadSaved: E.downloaded,
      downloadFailed: E.failed,
      autoDownloadImages: _,
      autoDownloadVideos: y,
      imageModel: w?.imageModel || null,
      videoModelKey: null,
    }
  );
}
function Tt(e, t, a, r, o) {
  if (((o = o || 8), "omni_flash" === t)) {
    const t = "_" + o + "s";
    switch (e) {
      case "text":
      default:
        return "abra_t2v" + t;
      case "reference":
        return "abra_r2v" + t;
      case "start_frame":
        return "abra_i2v" + t;
    }
  }
  const n = 8 !== o,
    i = n ? "_" + o + "s" : "";
  if ("lite" === t)
    switch (e) {
      case "text":
      default:
        return "veo_3_1_t2v_lite" + i;
      case "start_frame":
        return n ? "veo_3_1_i2v_s_lite" + i : "veo_3_1_i2v_lite";
      case "start_end_frame":
        return n
          ? "veo_3_1_i2v_s_lite" + i + "_fl"
          : "veo_3_1_interpolation_lite";
      case "reference":
        return "veo_3_1_r2v_lite";
    }
  if ("lite_lp" === t)
    switch (e) {
      case "text":
        return n
          ? "veo_3_1_t2v_lite" + i + "_low_priority"
          : "veo_3_1_t2v_lite_low_priority";
      case "start_frame":
        return n
          ? "veo_3_1_i2v_s_lite" + i + "_low_priority"
          : "veo_3_1_i2v_lite_low_priority";
      case "start_end_frame":
        return n
          ? "veo_3_1_i2v_s_lite" + i + "_fl_low_priority"
          : "veo_3_1_interpolation_lite_low_priority";
      case "reference":
        return "veo_3_1_r2v_lite_low_priority";
      default:
        return "veo_3_1_t2v_lite_low_priority";
    }
  if ("relaxed" === t)
    switch (e) {
      case "text": {
        let e = "veo_3_1_t2v_fast";
        return (
          "portrait" === a && (e += "_portrait"),
          (e += "_ultra_relaxed"),
          e
        );
      }
      case "start_frame": {
        let e = "veo_3_1_i2v_s_fast";
        return (
          "portrait" === a && (e += "_portrait"),
          (e += "_ultra_relaxed"),
          e
        );
      }
      case "start_end_frame": {
        let e = "veo_3_1_i2v_s_fast_fl";
        return (
          "portrait" === a && (e += "_portrait"),
          (e += "_ultra_relaxed"),
          e
        );
      }
      case "reference": {
        let e = "veo_3_1_r2v_fast";
        return (
          (e += "landscape" === a ? "_landscape" : "_portrait"),
          (e += "_ultra_relaxed"),
          e
        );
      }
      default:
        return "veo_3_1_t2v_fast_ultra_relaxed";
    }
  if ("fast" === t)
    switch (e) {
      case "text": {
        if (n) return "veo_3_1_t2v_fast" + i;
        let e = "veo_3_1_t2v_fast";
        return (
          "portrait" === a && (e += "_portrait"),
          r && (e += "_ultra"),
          e
        );
      }
      case "start_frame": {
        if (n) return "veo_3_1_i2v_s_fast" + i;
        let e = "veo_3_1_i2v_s_fast";
        return (
          "portrait" === a && (e += "_portrait"),
          r && (e += "_ultra"),
          e
        );
      }
      case "start_end_frame": {
        if (n) return "veo_3_1_i2v_s_fast" + i + "_fl";
        let e = "veo_3_1_i2v_s_fast";
        return (
          "portrait" === a && (e += "_portrait"),
          r && (e += "_ultra"),
          (e += "_fl"),
          e
        );
      }
      case "reference": {
        let e = "veo_3_1_r2v_fast";
        return (
          (e += "landscape" === a ? "_landscape" : "_portrait"),
          r && (e += "_ultra"),
          e
        );
      }
      default:
        return "veo_3_1_t2v_fast" + (r ? "_ultra" : "");
    }
  switch (e) {
    case "text": {
      if (n) return "veo_3_1_t2v_quality" + i;
      let e = "veo_3_1_t2v";
      return ("portrait" === a && (e += "_portrait"), e);
    }
    case "start_frame": {
      if (n) return "veo_3_1_i2v_s_quality" + i;
      let e = "veo_3_1_i2v_s";
      return ("portrait" === a && (e += "_portrait"), e);
    }
    case "start_end_frame": {
      if (n) return "veo_3_1_i2v_s_quality" + i + "_fl";
      let e = "veo_3_1_i2v_s";
      return ("portrait" === a && (e += "_portrait"), (e += "_fl"), e);
    }
    case "reference": {
      let e = "veo_3_1_r2v";
      return ((e += "landscape" === a ? "_landscape" : "_portrait"), e);
    }
    default:
      return "veo_3_1_t2v";
  }
}
function vt(e) {
  switch (e) {
    case "text":
    default:
      return "batchAsyncGenerateVideoText";
    case "start_frame":
      return "batchAsyncGenerateVideoStartImage";
    case "start_end_frame":
      return "batchAsyncGenerateVideoStartAndEndImage";
    case "reference":
      return "batchAsyncGenerateVideoReferenceImages";
  }
}
async function bt(e, t, a = 200, q = {}) {
  const r = new Array(e.length);
  let o,
    n = 0,
    i = 0,
    s = !1,
    c = t;
  const l = [],
    d = new Map(),
    u = new Set();
  let p = 0,
    quotaWarned = !1;
  const m = new Promise((e) => {
    o = e;
  });
  function g() {
    return (
      !!s ||
      (r.filter((e) => void 0 !== e).length === e.length &&
        ((s = !0), o(r), !0))
    );
  }
  function w(a, o, i) {
    if ((n--, i)) {
      const t = o?.message || String(o),
        n = t.includes("429");
      if ((p++, p >= 15)) {
        ((r[a] = { status: "rejected", reason: o }),
          d.delete(a),
          u.delete(a),
          f &&
            ((f = !1),
            zt("LOG", {
              message:
                "🛑 Too many consecutive failures — stopping batch. Check your Flow page and try again.",
              type: "error",
            })));
        for (let t = 0; t < e.length; t++)
          void 0 === r[t] &&
            (r[t] = {
              status: "rejected",
              reason: new Error("Stopped — too many consecutive failures"),
            });
        return void g();
      }
      if (
        ("_xY" === o?.name || t.includes("DAILY_QUOTA_REACHED")) &&
        "video" !== q.mode
      ) {
        quotaWarned ||
          ((quotaWarned = !0),
          (c = 1),
          zt("LOG", {
            message:
              "Flow returned a quota response for image generation. Slowing down and retrying instead of treating it as a daily account limit.",
            type: "warn",
          }));
        const n = d.get(a) || 0;
        if (n < 3) {
          const e = 1e4 * Math.pow(2, n) + 2e3 * Math.random(),
            t = l.findIndex((e) => e.index === a);
          if ((d.set(a, n + 1), t >= 0 && l.splice(t, 1), u.has(a))) return;
          return (
            u.add(a),
            void setTimeout(() => {
              (u.delete(a), l.push({ index: a }));
            }, e)
          );
        }
        return (
          (r[a] = { status: "rejected", reason: o }),
          d.delete(a),
          u.delete(a),
          void g()
        );
      }
      if (
        (_t(yt(t)),
        It(t),
        "_xY" === o?.name || t.includes("DAILY_QUOTA_REACHED"))
      ) {
        ((r[a] = { status: "rejected", reason: o }),
          d.delete(a),
          C ||
            ((C = !0),
            (f = !1),
            zt("LOG", {
              message:
                "🚫 Your Google account's daily generation limit reached. Try again in a few hours.",
              type: "error",
            }),
            zt("QUOTA_EXHAUSTED", {
              message:
                "Google Flow video/animation generation limit reached for this account. Image generation may still work manually.",
              type: "video",
            })));
        for (let t = 0; t < e.length; t++)
          void 0 === r[t] &&
            (r[t] = {
              status: "rejected",
              reason: new Error("Skipped — daily quota reached"),
            });
        return void g();
      }
      if (
        le &&
        (t.includes("No Flow tab") ||
          t.includes("Script execution failed") ||
          t.includes("Script failed") ||
          t.includes("Missing auth/project") ||
          t.includes("No reCAPTCHA token") ||
          t.includes("reCAPTCHA blocked") ||
          t.includes("reCAPTCHA recovery failed") ||
          t.includes("Failed to fetch") ||
          t.includes("NetworkError") ||
          t.includes("network") ||
          t.includes("Load failed") ||
          t.includes("aborted") ||
          t.includes("scripting.executeScript") ||
          t.includes("Error in invocation") ||
          t.includes("Cannot access") ||
          t.includes("Frame with") ||
          t.includes("No tab") ||
          t.includes("No frame"))
      ) {
        c = 2;
        const e = l.findIndex((e) => e.index === a);
        return (
          e >= 0 && l.splice(e, 1),
          void le
            .then(() => {
              setTimeout(
                () => {
                  l.push({ index: a });
                },
                2e3 + 1e3 * Math.random(),
              );
            })
            .catch(() => {
              l.push({ index: a });
            })
        );
      }
      const i = d.get(a) || 0,
        s = t.includes("429 Throttled") || t.includes("429 Rate limited"),
        m = t.includes("500"),
        w =
          t.includes("403") &&
          !t.includes("reCAPTCHA blocked") &&
          !t.includes("Blocked by Google"),
        h = t.includes("Google rejected"),
        _ = n || m || w || h,
        y = h ? 1 : 3;
      if (
        (n && O++,
        s &&
          ((v = Date.now()),
          T++,
          (b = Math.min(2 * b, 3e4)),
          c > 1 &&
            ((c = 1),
            Kt(
              "⏳ Google is throttling — slowing down to 1 at a time...",
              "warn",
            ))),
        _ && i < y)
      ) {
        const e = 5e3 * Math.pow(2.5, i) + 2e3 * Math.random();
        d.set(a, i + 1);
        const t = l.findIndex((e) => e.index === a);
        if ((t >= 0 && l.splice(t, 1), u.has(a))) return;
        return (
          u.add(a),
          void setTimeout(() => {
            (u.delete(a), l.push({ index: a }));
          }, e)
        );
      }
      ((r[a] = { status: "rejected", reason: o }), d.delete(a), u.delete(a));
    } else {
      ((r[a] = { status: "fulfilled", value: o }),
        d.delete(a),
        u.delete(a),
        (p = 0));
      const e = l.findIndex((e) => e.index === a);
      e >= 0 && l.splice(e, 1);
      const n = Date.now() - v;
      c < t &&
        v > 0 &&
        n > 12e4 &&
        ((c = Math.min(c + 1, t)),
        (b = Math.max(b / 1.3, 5e3)),
        (v = Date.now()),
        c === t && Kt("✓ Pacing recovered — running at full speed", "success"));
    }
    g();
  }
  function h(t) {
    (n++,
      u.delete(t),
      e[t]()
        .then((e) => w(t, e, !1))
        .catch((e) => w(t, e, !0)));
  }
  const _ = setInterval(() => {
    if (g()) clearInterval(_);
    else {
      if (!f && 0 === l.length) {
        for (let t = 0; t < e.length; t++)
          void 0 === r[t] &&
            (r[t] = {
              status: "rejected",
              reason: new Error("Skipped — generation stopped"),
            });
        return (g(), void clearInterval(_));
      }
      if (!(n >= c)) {
        if (l.length > 0) return void h(l.shift().index);
        if (i < e.length) return void h(i++);
      }
    }
  }, a);
  return m;
}
