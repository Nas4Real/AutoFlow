// TurboFlow side panel shard: Announcements, logs, connection badge, local auth shell
// Loaded by src/sidepanel/index.html in numeric order.

let Ee = null;
async function ke() {
  Me();
}
function Me() {
  Ee = null;
  const e = r("#announcement-bar");
  e && (e.style.display = "none");
}
async function $e() {
  if (!Ee) return;
  le("announcement_dismissed", {
    announcement_id: Ee.id,
    announcement_type: Ee.type,
    time_visible_ms: void 0 !== Ze && Ze ? Date.now() - Ze : null,
  });
  const e = await chrome.storage.local.get("turboflowDismissedAnns"),
    t = Array.isArray(e.turboflowDismissedAnns) ? e.turboflowDismissedAnns : [];
  (t.includes(Ee.id) ||
    (t.push(Ee.id),
    await chrome.storage.local.set({ turboflowDismissedAnns: t })),
    Me());
}
function Le(e, t) {
  if (!e || !t) return 0;
  const a = e.split(".").map(Number),
    n = t.split(".").map(Number);
  for (let e = 0; e < 3; e++) {
    const t = a[e] || 0,
      r = n[e] || 0;
    if (t < r) return -1;
    if (t > r) return 1;
  }
  return 0;
}
function xe() {
  try {
    return chrome.runtime.getManifest().version;
  } catch (e) {
    return "0.0.0";
  }
}
function Se() {
  const e = document.getElementById("version-badge");
  if (!e) return;
  const t = xe();
  e.textContent = "v" + t;
}
async function _e(e) {
  if (K.length >= 500)
    throw new Error(
      "Mapper image limit reached (500). Save mapping and start a new batch.",
    );
  const t = await Vn(e),
    a = await ce(t, e.type, 30, 0.5);
  if (!a) throw new Error('Failed to create thumbnail for "' + e.name + '"');
  let n = null;
  for (let r = 0; r <= 3; r++)
    try {
      const o = await chrome.runtime.sendMessage({
        type: "UPLOAD_IMAGE",
        base64Data: t,
        fileName: e.name,
        mimeType: e.type || "image/jpeg",
      });
      if (!o.ok) {
        const t = o.error || "Upload failed";
        if (
          t.includes("400") ||
          t.includes("INVALID_ARGUMENT") ||
          t.includes("INVALID_REQUEST") ||
          t.includes("Bad request") ||
          t.includes("unsupported") ||
          t.includes("too large")
        )
          throw new Error(t);
        if (
          (t.includes("Failed to fetch") ||
            t.includes("NetworkError") ||
            t.includes("network") ||
            t.includes("timeout") ||
            t.includes("Script execution failed") ||
            t.includes("429") ||
            t.includes("500") ||
            t.includes("502") ||
            t.includes("503")) &&
          r < 3
        ) {
          n = t;
          const a = 1500 * Math.pow(1.5, r) + 500 * Math.random();
          (Te(
            `⟳ Upload "${e.name}" failed — retry ${r + 1}/3 in ${(a / 1e3).toFixed(1)}s`,
            "warn",
          ),
            await ie(a));
          continue;
        }
        throw new Error(t);
      }
      const s = {
        id:
          "map-" +
          Date.now() +
          "-" +
          Math.random().toString(36).substring(2, 7),
        mediaId: o.mediaId,
        fileName: e.name,
        thumbnail: a,
        mimeType: e.type || "image/jpeg",
      };
      return (K.push(s), re(), s);
    } catch (t) {
      n = t.message || String(t);
      const a =
          n.includes("Extension context invalidated") ||
          n.includes("Could not establish connection") ||
          n.includes("Receiving end does not exist"),
        o =
          n.includes("400") ||
          n.includes("INVALID_ARGUMENT") ||
          n.includes("INVALID_REQUEST") ||
          n.includes("Bad request") ||
          n.includes("unsupported") ||
          n.includes("too large");
      if (a || o) throw new Error(Ie(n));
      if (r < 3) {
        const t = 1500 * Math.pow(1.5, r) + 500 * Math.random();
        (Te(
          `⟳ Upload "${e.name}" error — retry ${r + 1}/3 in ${(t / 1e3).toFixed(1)}s`,
          "warn",
        ),
          await ie(t));
        continue;
      }
    }
  throw new Error(Ie(n || "Upload failed after 3 retries"));
}
const Pe = r("#log-list");
const TF_STUDIO_LOG_KEY = "flowAutoLogs";
const TF_STUDIO_LOG_LIMIT = 500;
let TF_STUDIO_LOG_BUFFER = null;
let TF_STUDIO_LOG_LOADING = false;
let TF_STUDIO_LOG_PENDING = [];
function Ae(e) {
  return "error" === e || "warn" === e ? "error" : "activity";
}
function flushStudioLogBuffer(e) {
  if (!Array.isArray(TF_STUDIO_LOG_BUFFER) || !TF_STUDIO_LOG_PENDING.length) return;
  TF_STUDIO_LOG_BUFFER = TF_STUDIO_LOG_BUFFER.concat(TF_STUDIO_LOG_PENDING).slice(
    -TF_STUDIO_LOG_LIMIT,
  );
  TF_STUDIO_LOG_PENDING = [];
  e.set({ [TF_STUDIO_LOG_KEY]: TF_STUDIO_LOG_BUFFER });
}
function persistStudioLog(e, t, a, n, o) {
  const s = globalThis.chrome?.storage?.local;
  if (!s || "function" != typeof s.get || "function" != typeof s.set) return;
  const i = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    message: String(e || ""),
    type: String(t || "info"),
    level: String(a || "user"),
    category: String(n || "activity"),
    time: String(o || ""),
    created_at: new Date().toISOString(),
  };
  TF_STUDIO_LOG_PENDING.push(i);
  if (Array.isArray(TF_STUDIO_LOG_BUFFER)) {
    flushStudioLogBuffer(s);
    return;
  }
  if (TF_STUDIO_LOG_LOADING) return;
  TF_STUDIO_LOG_LOADING = true;
  try {
    s.get([TF_STUDIO_LOG_KEY], (e) => {
      TF_STUDIO_LOG_LOADING = false;
      if (globalThis.chrome?.runtime?.lastError) {
        TF_STUDIO_LOG_BUFFER = [];
        TF_STUDIO_LOG_PENDING = [];
        return;
      }
      TF_STUDIO_LOG_BUFFER = Array.isArray(e?.[TF_STUDIO_LOG_KEY])
        ? e[TF_STUDIO_LOG_KEY].slice(-TF_STUDIO_LOG_LIMIT)
        : [];
      flushStudioLogBuffer(s);
    });
  } catch (e) {
    TF_STUDIO_LOG_LOADING = false;
  }
}
globalThis.chrome?.storage?.onChanged?.addListener?.((e, t) => {
  if ("local" !== t || !e?.[TF_STUDIO_LOG_KEY]) return;
  TF_STUDIO_LOG_BUFFER = Array.isArray(e[TF_STUDIO_LOG_KEY].newValue)
    ? e[TF_STUDIO_LOG_KEY].newValue.slice(-TF_STUDIO_LOG_LIMIT)
    : [];
  TF_STUDIO_LOG_PENDING = [];
});
function Te(e, t = "info", a = "user") {
  if ("debug" === a && !A) return;
  e = globalThis.TFProjectDomain?.repairTextEncoding?.(e) || String(e || "");
  const n = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    o = document.createElement("div"),
    s = Ae(t);
  persistStudioLog(e, t, a, s, n);
  ((o.className = `log-entry log-${t}`),
    (o.dataset.logCategory = s),
    (o.dataset.logLevel = a),
    (o.innerHTML = `<span class="log-time">${n}</span><span class="log-msg">${se(e)}</span>`),
    "all" !== P && P !== s && o.classList.add("log-hidden"));
  const i = (r("#log-search")?.value || "").toLowerCase();
  if (
    (i && !e.toLowerCase().includes(i) && o.classList.add("log-hidden"),
    Pe.appendChild(o),
    _.all++,
    "error" === s ? _.errors++ : _.activity++,
    Ce(),
    S && (Pe.scrollTop = Pe.scrollHeight),
    Pe.children.length > 2200)
  ) {
    for (let e = 0; e < 200 && Pe.firstChild; e++) {
      const e = Pe.firstChild,
        t = e?.dataset?.logCategory;
      (Pe.removeChild(e), _.all--, "error" === t ? _.errors-- : _.activity--);
    }
    Ce();
  }
}
function Ce() {
  const e = r("#lfc-all"),
    t = r("#lfc-errors"),
    a = r("#lfc-activity");
  (e && (e.textContent = _.all),
    t && (t.textContent = _.errors),
    a && (a.textContent = _.activity));
}
function Re(e) {
  P = e;
  const t = (r("#log-search")?.value || "").toLowerCase();
  Pe.querySelectorAll(".log-entry").forEach((a) => {
    const n = a.dataset.logCategory,
      r = a.dataset.logLevel,
      o = a.querySelector(".log-msg")?.textContent?.toLowerCase() || "",
      s = "all" === e || e === n,
      i = !t || o.includes(t),
      l = "debug" !== r || A;
    a.classList.toggle("log-hidden", !s || !i || !l);
  });
}
(r("#btn-clear-logs").addEventListener("click", () => {
  ((Pe.innerHTML = ""),
    (_ = { all: 0, errors: 0, activity: 0 }),
    (TF_STUDIO_LOG_BUFFER = []),
    (TF_STUDIO_LOG_PENDING = []),
    globalThis.chrome?.storage?.local?.set?.({ [TF_STUDIO_LOG_KEY]: [] }),
    Ce(),
    Te("Logs cleared", "info"));
}),
  o("[data-log-filter]").forEach((e) => {
    e.addEventListener("click", () => {
      (o("[data-log-filter]").forEach((e) => e.classList.remove("active")),
        e.classList.add("active"),
        Re(e.dataset.logFilter));
    });
  }),
  r("#log-search")?.addEventListener("input", () => {
    Re(P);
  }),
  r("#btn-autoscroll")?.addEventListener("click", () => {
    ((S = !S),
      r("#btn-autoscroll").classList.toggle("active", S),
      S && (Pe.scrollTop = Pe.scrollHeight));
  }),
  r("#btn-export-logs")?.addEventListener("click", async () => {
    const e = Pe.querySelectorAll(".log-entry"),
      t = [];
    e.forEach((e) => {
      const a = e.querySelector(".log-time")?.textContent || "",
        n = e.querySelector(".log-msg")?.textContent || "",
        r = e.classList.contains("log-error")
          ? "ERROR"
          : e.classList.contains("log-warn")
            ? "WARN"
            : e.classList.contains("log-success")
              ? "OK"
              : "INFO";
      t.push(`[${a}] [${r}] ${n}`);
    });
    const a = t.join("\n");
    try {
      await navigator.clipboard.writeText(a);
      const e = r("#btn-export-logs"),
        n = e.querySelector(".material-symbols-outlined");
      ((n.textContent = "check"),
        e.classList.add("active"),
        setTimeout(() => {
          ((n.textContent = "content_copy"), e.classList.remove("active"));
        }, 2e3),
        Te(`📋 ${t.length} log entries copied to clipboard`, "success"));
    } catch (e) {
      const t = new Blob([a], { type: "text/plain" }),
        n = URL.createObjectURL(t),
        r = document.createElement("a");
      ((r.href = n),
        (r.download = `turboflow-logs-${Date.now()}.txt`),
        r.click(),
        URL.revokeObjectURL(n),
        Te("📄 Logs exported as file", "success"));
    }
  }),
  Pe.addEventListener("scroll", () => {
    S &&
      (Pe.scrollHeight - Pe.scrollTop - Pe.clientHeight < 30 ||
        ((S = !1), r("#btn-autoscroll")?.classList.remove("active")));
  }));
const Fe = r("#status-badge");
function De(a, n, o = 5e3) {
  const s = r("#status-badge");
  ((s.textContent = a),
    (s.className = n),
    (e = !0),
    t && clearTimeout(t),
    (t = setTimeout(() => {
      ((e = null), (t = null), T && Ne(T));
    }, o)));
}
function Ne(t) {
  if (!t) return;
  if (
    ((T = t),
    t.googlePaygateTier &&
      t.googlePaygateTier !== F &&
      ((F = t.googlePaygateTier), Ue(), "function" == typeof Qn && Qn()),
    e)
  )
    return;
  const a = r("#status-badge"),
    n = r("#sc-tab"),
    o = r("#sc-project"),
    s = r("#status-error-msg"),
    i = !r("#btn-stop").disabled;
  switch (t.status) {
    case "connected":
      i
        ? ((a.textContent = "Running"), (a.className = "badge badge-running"))
        : ((a.textContent = "Connected"),
          (a.className = "badge badge-connected"));
      break;
    case "connecting":
      ((a.textContent = "Connecting..."),
        (a.className = "badge badge-connecting"));
      break;
    default:
      ((a.textContent = "Disconnected"),
        (a.className = "badge badge-disconnected"));
  }
  function l(e, t, a) {
    e &&
      (a
        ? ((e.textContent = "sync"),
          (e.className = "material-symbols-outlined status-check-icon loading"))
        : t
          ? ((e.textContent = "check_circle"),
            (e.className = "material-symbols-outlined status-check-icon ok"))
          : ((e.textContent = "cancel"),
            (e.className =
              "material-symbols-outlined status-check-icon fail")));
  }
  const d = "connecting" === t.status;
  (l(n, !!t.flowTabId),
    l(o, t.hasProject, d && !!t.flowTabId),
    t.lastError && "connected" !== t.status
      ? ((s.textContent = "💡 " + t.lastError), (s.style.display = "block"))
      : (s.style.display = "none"));
}
function qe() {
  async function e() {
    try {
      const t = await chrome.runtime.sendMessage({
        type: "CHECK_CONNECTION",
        deep: !1,
      });
      if (t?.state) {
        Ne(t.state);
        const a = "connected" === t.state.status ? 1e4 : 3e3;
        a !== R && ((R = a), clearInterval(C), (C = setInterval(e, R)));
      }
    } catch (e) {}
  }
  (C && clearInterval(C), (R = 3e3), (C = setInterval(e, 3e3)), e());
}
async function Oe() {
  try {
    const e = await chrome.runtime.sendMessage({
      type: "CHECK_CONNECTION",
      deep: !0,
    });
    if (e?.state) {
      if ((Ne(e.state), "connected" === e.state.status)) return !0;
      const t = !!e.state.flowTabId,
        a = e.state.hasProject;
      return (
        t
          ? a ||
            Gn({
              icon: "📂",
              title: "No Flow Project Open",
              message:
                "Flow is open, but you need to <strong>create or open a Flow project</strong> first.",
              hint: 'Go to your Flow tab and create a new Flow project or open an existing one. The status badge will update to "Connected" automatically.',
            })
          : Gn({
              icon: "🔌",
              title: "Not Connected to Flow",
              message:
                "You need an open <strong>Google Flow</strong> tab to generate images.",
              hint: '<strong>Step 1:</strong> Open <a href="https://labs.google/fx/tools/flow" target="_blank" style="color:#a8c7fa">labs.google/fx/tools/flow</a><br>\n                           <strong>Step 2:</strong> Sign in with Google if Flow asks<br>\n                           <strong>Step 3:</strong> Create or open a Flow project<br>\n                           <strong>Step 4:</strong> Wait for the status badge to show "Connected"',
            }),
        !1
      );
    }
  } catch (e) {}
  return !1;
}
function Ue() {
  const e = !0,
    t = pe(F),
    a = !1 !== l.settings.autoDownloadImages,
    n = e && t && a,
    o = r("#setting-image-quality"),
    s = o?.querySelector('option[value="4k"]');
  if (s) {
    if (((s.disabled = !n), n)) s.textContent = "4K Upscale â­";
    else {
      let n = "";
      (e
        ? t
          ? a || (n = "Enable auto-download")
          : (n = "Google AI Ultra required")
        : (n = "Google account tier required"),
        (s.textContent = "4K Upscale 🔒 " + n));
    }
    n ||
      "4k" !== l.settings.imageDownloadQuality ||
      ((l.settings.imageDownloadQuality = "2k"), (o.value = "2k"), J());
  }
  const d = r("#dl-quality-4k");
  d &&
    (n
      ? ((d.style.display = "flex"),
        (d.disabled = !1),
        (d.style.opacity = "1"),
        (d.style.cursor = "pointer"))
      : ((d.style.display = "flex"),
        (d.disabled = !0),
        (d.style.opacity = "0.4"),
        (d.style.cursor = "not-allowed")));
  const c = r('[data-preview-quality="4k"]');
  c &&
    (n
      ? ((c.style.display = "flex"),
        (c.disabled = !1),
        (c.style.opacity = "1"),
        (c.style.cursor = "pointer"))
      : ((c.style.display = "flex"),
        (c.disabled = !0),
        (c.style.opacity = "0.4"),
        (c.style.cursor = "not-allowed")));
  const p = !1 !== l.settings.autoDownloadVideos,
    m = e && t && p,
    u = r("#setting-video-quality-dl"),
    g = u?.querySelector('option[value="4k"]');
  if (g) {
    if (((g.disabled = !m), m))
      g.textContent = "4K Upscale â­ Very slow (one at a time)";
    else {
      let a = "";
      (e
        ? t
          ? p || (a = "Enable auto-download")
          : (a = "Google AI Ultra required")
        : (a = "Google account tier required"),
        (g.textContent = "4K Upscale ⚠️ Very slow 🔒 " + a));
    }
    m ||
      "4k" !== l.settings.videoDownloadQuality ||
      ((l.settings.videoDownloadQuality = "standard"),
      (u.value = "standard"),
      J());
  }
  const f = e && t,
    h = r("#dl-quality-video-4k");
  if (h)
    if (f)
      ((h.disabled = !1),
        (h.style.opacity = "1"),
        (h.style.cursor = "pointer"),
        (h.title = ""));
    else {
      ((h.disabled = !0),
        (h.style.opacity = "0.4"),
        (h.style.cursor = "not-allowed"));
      let a = "";
      (e
        ? t || (a = "Google AI Ultra required")
        : (a = "Google account tier required"),
        (h.title = a));
    }
  const b = r('[data-preview-quality="video-4k"]');
  if (b)
    if (f)
      ((b.disabled = !1),
        (b.style.opacity = "1"),
        (b.style.cursor = "pointer"),
        (b.title = ""));
    else {
      ((b.disabled = !0),
        (b.style.opacity = "0.4"),
        (b.style.cursor = "not-allowed"));
      let a = "";
      (e
        ? t || (a = "Google AI Ultra required")
        : (a = "Google account tier required"),
        (b.title = a));
    }
  const v = e && t,
    y = r("#setting-video-quality"),
    w = y?.querySelector('option[value="relaxed"]');
  if (w) {
    if (((w.disabled = !v), v))
      w.textContent = "⏳ Veo 3.1 — Fast (Lower Priority)";
    else {
      let a = "";
      (e
        ? t || (a = "Google AI Ultra required")
        : (a = "Google account tier required"),
        (w.textContent = "⏳ Veo 3.1 — Fast (Lower Priority) 🔒 " + a));
    }
    v ||
      "relaxed" !== l.settings.videoQuality ||
      ((l.settings.videoQuality = "fast"), (y.value = "fast"), J());
  }
  const I = y?.querySelector('option[value="lite_lp"]');
  if (I) {
    if (((I.disabled = !v), v))
      I.textContent = "🎬 Veo 3.1 — Lite (Lower Priority)";
    else {
      let a = "";
      (e
        ? t || (a = "Google AI Ultra required")
        : (a = "Google account tier required"),
        (I.textContent = "🎬 Veo 3.1 — Lite (Lower Priority) 🔒 " + a));
    }
    v ||
      "lite_lp" !== l.settings.videoQuality ||
      ((l.settings.videoQuality = "lite"), (y.value = "lite"), J());
  }
}
(r("#btn-recheck")?.addEventListener("click", async (e) => {
  e.stopPropagation();
  const t = r("#btn-recheck"),
    a = t.innerHTML;
  ((t.innerHTML =
    '<div class="uploading-spinner" style="width:12px;height:12px;border-width:1.5px"></div> Checking...'),
    (t.disabled = !0));
  try {
    const e = await chrome.runtime.sendMessage({
      type: "CHECK_CONNECTION",
      deep: !0,
    });
    (e?.state && Ne(e.state),
      e?.state?.lastError && Te("Connection: " + e.state.lastError, "warn"));
  } catch (e) {
    Te("Connection check failed: " + e.message, "error");
  }
  ((t.innerHTML = a), (t.disabled = !1));
}),
  r("#status-wrapper")?.addEventListener("click", (e) => {
    e.target.closest("#btn-recheck") ||
      r("#status-wrapper").classList.toggle("detail-open");
  }),
  document.addEventListener("click", (e) => {
    e.target.closest("#status-wrapper") ||
      r("#status-wrapper")?.classList.remove("detail-open");
  }),
  qe());
const Be = r("#auth-screen"),
  je = r("#main-app"),
  Ge = document.getElementById("loading-screen");
async function He() {
  Qe();
}
function Qe() {
  ((s = LOCAL_USER), (i = LOCAL_PLAN), We());
}
function We() {
  s = s || LOCAL_USER;
  i = i || LOCAL_PLAN;
  Ge && (Ge.style.display = "none");
  Be && (Be.style.display = "none");
  je && (je.style.display = "block");
  Ve();
  Ye();
  // Tour popup disabled by user preference.
  // at().then((e) => {
  //   e && setTimeout(() => rt(), 500);
  // });
}
function Ve() {
  const e = r("#plan-banner"),
    t = r("#plan-free"),
    a = r("#plan-pro"),
    n = r("#plan-activating"),
    o = r("#plan-footer-email");
  e && (e.style.display = "none");
  t && (t.style.display = "none");
  a && (a.style.display = "none");
  n && (n.style.display = "none");
  o && (o.textContent = "");
}
async function ze() {
  i = LOCAL_PLAN;
  Ye();
}
function Ye() {
  const e = r("#img-count-pro-badge");
  (e && (e.style.display = "none"),
    [r("#img-count-2"), r("#img-count-3"), r("#img-count-4")].forEach((e) => {
      e && e.classList.remove("locked");
    }));
  const t = r("#vid-count-pro-badge");
  (t && (t.style.display = "none"),
    [r("#vid-count-2"), r("#vid-count-3"), r("#vid-count-4")].forEach((e) => {
      e && e.classList.remove("locked");
    }));
  const a = r("#vid-mode-pro-badge");
  (a && (a.style.display = "none"),
    [r("#vid-mode-start"), r("#vid-mode-se"), r("#vid-mode-ref")].forEach(
      (e) => {
        e && e.classList.remove("locked");
      },
    ));
}
(r("#btn-sign-out")?.addEventListener("click", async () => {
    (await chrome.runtime.sendMessage({ type: "SIGN_OUT" }),
      (s = LOCAL_USER),
      (i = LOCAL_PLAN),
      We());
  }),
  r("#btn-upgrade")?.addEventListener("click", () => {}),
  r("#btn-close-upgrade")?.addEventListener("click", () => {}),
  r("#btn-close-limit")?.addEventListener("click", () => {}),
  r("#btn-upgrade-from-limit")?.addEventListener("click", () => {}),
  r("#btn-trial-welcome-close")?.addEventListener("click", () => {}),
  r("#btn-keep-pro")?.addEventListener("click", () => {}),
  r("#btn-ban-signout")?.addEventListener("click", We),
  r("#btn-manage-sub")?.addEventListener("click", () => {}));
