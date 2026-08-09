// TurboFlow background runtime shard: Shared background state, speed controls, tab/connection/auth shell
// Loaded by src/background/runtime.js in numeric order.

const r = "6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV",
  n = 3e5,
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
  };
let i = null,
  s = null,
  c = null,
  l = null,
  d = null,
  u = null,
  p = 0,
  m = null,
  f = !1,
  g = 0,
  w = null,
  h = "flow-auto",
  _ = !0,
  y = !0,
  I = "2k",
  A = "standard",
  E = { total: 0, downloaded: 0, failed: 0 },
  T = 0,
  v = 0,
  b = 5e3,
  O = 0,
  P = 0,
  S = 0,
  M = 5e3,
  C = !1,
  R = !1,
  k = 0,
  L = 0,
  x = 5e3,
  N = !1,
  D = 0,
  U = 5e3,
  $ = !1,
  G = 0,
  F = 0,
  j = 0,
  H = 5e3,
  B = !1;
const V = new Map(),
  z = new Map(),
  K = new Set(),
  Y = new Map(),
  W = [];
let q = 0,
  Q = 3,
  J = 3;
const X = 1;
let Z = !1;
function ee(e) {
  ((J = { fast: 3, balanced: 2, slow: 1 }[e] || 3), Q > J && (Q = J));
}
let te = 0,
  ae = 0;
const re = new Map(),
  oe = new Map();
let ne = null;
function ie(e) {
  return !!e && !["PAYGATE_TIER_NOT_PAID", "PAYGATE_TIER_ONE"].includes(e);
}
let _vD = {
    status: "disconnected",
    flowTabId: null,
    hasProject: !1,
    lastCheck: 0,
    lastError: null,
  },
  se = null,
  ce = null,
  le = null,
  de = !1,
  ue = 0;
const pe = 3,
  me = 2;
let fe = 0,
  ge = null;
function we(e) {
  return new Promise((t) => setTimeout(t, e));
}
function he() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (e) {
    const t = (16 * Math.random()) | 0;
    return ("x" === e ? t : (3 & t) | 8).toString(16);
  });
}
function _e() {
  return Math.floor(3e5 * Math.random());
}
class ye extends Error {
  constructor(e) {
    (super(e), (this.name = "_xY"));
  }
}
function Ie(e) {
  if (!e) return !1;
  try {
    const t = new URL(e);
    return (
      "labs.google" === t.hostname &&
      /^\/fx\/(?:[^/]+\/)?tools\/flow(?:\/|$)/.test(t.pathname)
    );
  } catch (t) {
    return /labs\.google\/fx\/(?:[^/]+\/)?tools\/flow(?:[/?#]|$)/.test(e);
  }
}
let lastFlowTabSearch = null;
function shortDebugUrl(e) {
  return e ? e.slice(0, 160) : "";
}
function flowTabSearchDebugText() {
  if (!lastFlowTabSearch) return "";
  const e = lastFlowTabSearch.samples
      .map((e) => {
        const t = e.url || e.title || "no-url";
        return (e.active ? "active " : "") + t;
      })
      .join(" | "),
    t = lastFlowTabSearch.errors.slice(0, 3).join(" | ");
  return (
    `Scanned ${lastFlowTabSearch.scanned} tabs, matched ${lastFlowTabSearch.matched}.` +
    (e ? " Saw: " + e : "") +
    (t ? " Errors: " + t : "")
  ).slice(0, 700);
}
async function findFlowTabs() {
  const e = new Map(),
    r = [],
    o = [],
    t = async (t, a) => {
      try {
        for (const a of await chrome.tabs.query(t))
          a?.id && !e.has(a.id) && e.set(a.id, a);
      } catch (e) {
        r.push(a + ": " + (e?.message || String(e)));
      }
    };
  async function a(e) {
    const t = e.id;
    if (e.url) return e.url;
    try {
      const a = await chrome.scripting.executeScript({
        target: { tabId: t },
        world: "MAIN",
        func: () => window.location.href,
      });
      return a?.[0]?.result || null;
    } catch (e) {
      r.push("tab " + t + ": " + (e?.message || "script url blocked"));
      return null;
    }
  }
  (await t({ active: !0, lastFocusedWindow: !0 }, "last-focused active"),
    await t({ active: !0, currentWindow: !0 }, "current active"),
    await t({ active: !0 }, "all active"),
    await t({ url: "https://labs.google/fx/*" }, "labs.google query"),
    await t({}, "all tabs"));
  const n = [];
  for (const t of e.values()) {
    const e = await a(t);
    (o.length < 8 &&
      o.push({
        active: !!t.active,
        title: shortDebugUrl(t.title || ""),
        url: shortDebugUrl(e || t.url || ""),
      }),
      e && Ie(e) && n.push({ ...t, url: e }));
  }
  return (
    (lastFlowTabSearch = {
      scanned: e.size,
      matched: n.length,
      samples: o,
      errors: r,
    }),
    n
  );
}
function getProjectIdFromUrl(e) {
  if (!e) return null;
  try {
    const t = new URL(e).pathname.match(/\/project\/([^/?#]+)/);
    return t ? t[1] : null;
  } catch (t) {
    const a = e.match(/\/project\/([^/?#]+)/);
    return a ? a[1] : null;
  }
}

function tfIsFlowUrlForConnection(e) {
  if (!e) return false;
  try {
    const t = new URL(e);
    return t.hostname === "labs.google" && /^\/fx\/(?:[^/]+\/)?tools\/flow(?:\/|$)/.test(t.pathname);
  } catch (t) {
    return /labs\.google\/fx\/(?:[^/]+\/)?tools\/flow(?:[/?#]|$)/.test(String(e));
  }
}
function tfConnectionStateFromTab(e, t = {}) {
  const a = e?.url || e?.pendingUrl || t.url || "",
    r = t.projectId || getProjectIdFromUrl(a),
    o = !!(e && e.id && tfIsFlowUrlForConnection(a)),
    n = {
      status: o ? "connected" : "disconnected",
      flowTabId: o ? e.id : null,
      hasProject: o,
      hasProjectId: !!r,
      hasFlowUi: o,
      hasEditor: !!t.hasEditor,
      hasCreateButton: !!t.hasCreateButton,
      projectId: r || null,
      url: a,
      googlePaygateTier: ne,
      lastCheck: Date.now(),
      lastError: o ? null : "No Google Flow tab visible to this extension/profile.",
      debug: t.debug || "v5 direct mx connection responder"
    };
  if (o) {
    c = e.id;
    u = r || null;
    try {
      chrome.sidePanel?.setOptions({ tabId: e.id, path: "src/sidepanel/index.html", enabled: !0 }).catch(() => {});
    } catch (e) {}
  } else {
    c = null;
    u = null;
  }
  _vD = n;
  return n;
}
function tfRespondConnectionDirect(sendResponse) {
  let responded = false;
  const finish = (state) => {
    if (responded) return;
    responded = true;
    try {
      sendResponse({ state });
    } catch (err) {
      console.warn("[TurboFlow v6] sendResponse failed", err);
    }
  };
  const timeoutId = setTimeout(() => {
    finish(tfConnectionStateFromTab(null, { debug: "v6 tabs.query timeout" }));
  }, 1200);
  try {
    chrome.tabs.query({}, (tabsResult) => {
      clearTimeout(timeoutId);
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        return finish(tfConnectionStateFromTab(null, { debug: "tabs.query error: " + lastError.message }));
      }
      const tabs = Array.isArray(tabsResult) ? tabsResult : [];
      const flowTabs = tabs.filter((tab) => tfIsFlowUrlForConnection(tab.url || tab.pendingUrl || ""));
      flowTabs.sort((left, right) => {
        const leftHasProject = getProjectIdFromUrl(left.url || left.pendingUrl || "") ? 1 : 0;
        const rightHasProject = getProjectIdFromUrl(right.url || right.pendingUrl || "") ? 1 : 0;
        if (leftHasProject !== rightHasProject) return rightHasProject - leftHasProject;
        if (!!right.active !== !!left.active) return Number(!!right.active) - Number(!!left.active);
        return (right.lastAccessed || 0) - (left.lastAccessed || 0);
      });
      const sample = tabs
        .slice(0, 10)
        .map((tab) => `${tab.active ? "active " : ""}${String(tab.url || tab.pendingUrl || tab.title || "no-url").slice(0, 160)}`)
        .join(" | ");
      const debug = `v6 direct mx scanned ${tabs.length} tabs, matched ${flowTabs.length}${sample ? ". Saw: " + sample : ""}`;
      finish(tfConnectionStateFromTab(flowTabs[0] || null, { debug }));
    });
  } catch (err) {
    clearTimeout(timeoutId);
    finish(tfConnectionStateFromTab(null, { debug: "v6 direct exception: " + (err?.message || String(err)) }));
  }
}
function setFlowConnectionFromTab(e, t = {}) {
  if (!e?.id) return null;
  const a = t.projectId || getProjectIdFromUrl(t.url || e.url),
    r = {
      status: a ? "connected" : "connecting",
      flowTabId: e.id,
      hasProject: !!a,
      lastCheck: Date.now(),
      lastError: a ? null : "Open or create a project in Flow",
      googlePaygateTier: ne,
    };
  return (
    (c = e.id),
    (u = a || null),
    chrome.sidePanel
      ?.setOptions({ tabId: e.id, path: "src/sidepanel/index.html", enabled: !0 })
      .catch(() => {}),
    (_vD = r),
    Ke(),
    r
  );
}
let Ae = null;
async function Ee() {
  return (
    (i = LOCAL_USER),
    await chrome.storage.local.remove(["turboflowUser"]),
    await Se(),
    chrome.runtime
      .sendMessage({ type: "AUTH_STATE_CHANGED", user: i, plan: s })
      .catch(() => {}),
    i
  );
}
async function Te() {
  (i = LOCAL_USER),
    await chrome.storage.local.remove(["turboflowUser"]),
    await Se(),
    chrome.runtime
      .sendMessage({ type: "AUTH_STATE_CHANGED", user: i, plan: s })
      .catch(() => {});
}
async function ve() {
  (i = LOCAL_USER),
    await chrome.storage.local.remove(["turboflowUser"]),
    await Se(),
    chrome.runtime
      .sendMessage({ type: "AUTH_STATE_CHANGED", user: i, plan: s })
      .catch(() => {});
}
async function be() {
  return !0;
}
async function Oe() {
  return !0;
}
async function Pe(e, a, r) {
  return;
}
async function Se(e = !1) {
  return (
    (s = LOCAL_PLAN),
    await chrome.storage.local.set({
      turboflowPlan: s,
      turboflowPlanTime: Date.now(),
    }),
    chrome.runtime
      .sendMessage({ type: "PLAN_UPDATE", plan: s })
      .catch(() => {}),
    s
  );
}
async function Me(e, a) {
  return { allowed: !0, remaining: -1 };
}
let Ce = null;
function Re() {
  if (Ce) return Ce;
  let e = "unknown";
  try {
    const t = navigator.userAgent || "";
    t.includes("CrOS")
      ? (e = "ChromeOS")
      : t.includes("Windows")
        ? (e = "Windows")
        : t.includes("Mac")
          ? (e = "Mac")
          : t.includes("Linux")
            ? (e = "Linux")
            : t.includes("Android") && (e = "Android");
  } catch (e) {}
  let t = "unknown";
  try {
    t = navigator.language || "unknown";
  } catch (e) {}
  return ((Ce = { platform: e, locale: t }), Ce);
}
let ke = null;
function Le() {
  return ke;
}
function xe(e) {
  ke = e;
}
function Ne() {
  try {
    return chrome.runtime.getManifest().version;
  } catch (e) {
    return "unknown";
  }
}
function De() {
  const e = {
    usedMapper: !1,
    usedAutoChain: !1,
    usedLibrary: !1,
    usedVideoMode: !1,
    usedOnboarding: !1,
    librarySize: 0,
    queueSize: 0,
  };
  try {
    void 0 !== w?.videoRatio && (e.usedVideoMode = !0);
  } catch (e) {}
  return e;
}
async function Ue() {
  const e = De();
  try {
    const t = await chrome.storage.local.get([
      "turboflowImageLibrary",
      "flowAutoBatches",
      "flowAutoRefMode",
      "turboflowOnboardingDone",
    ]);
    if (
      (t.turboflowImageLibrary &&
        Array.isArray(t.turboflowImageLibrary) &&
        ((e.librarySize = t.turboflowImageLibrary.length),
        (e.usedLibrary = t.turboflowImageLibrary.length > 0)),
      t.flowAutoBatches && Array.isArray(t.flowAutoBatches))
    ) {
      e.queueSize = t.flowAutoBatches.length;
      const a = t.flowAutoBatches.filter(
        (e) => "done" === e.status || "partial" === e.status,
      );
      e.usedAutoChain = a.length > 1;
    }
    ("mapped" === t.flowAutoRefMode && (e.usedMapper = !0),
      t.turboflowOnboardingDone && (e.usedOnboarding = !0));
  } catch (e) {}
  return e;
}
async function $e(e, a, r = null) {
  return (
    (m = {
      unlockToken: "local",
      timestamp: Date.now(),
      promptCount: e,
      mode: a,
    }),
    { authorized: !0, remaining: -1, localOnly: !0 }
  );
}
async function Ge(e, a, r = null) {
  return ((m = null), { ok: !0, remaining: -1, localOnly: !0 });
}
async function Fe() {
  if (!c) return !1;
  try {
    _vD._recovering = !0;
    const e = (await chrome.tabs.get(c)).url;
    return e && Ie(e)
      ? (Kt("🔄 reCAPTCHA expired — reloading Flow page...", "warn"),
        (d = null),
        (u = null),
        await chrome.scripting.executeScript({
          target: { tabId: c },
          world: "MAIN",
          func: () => {
            window.location.href =
              window.location.href.split("?")[0] + "?t=" + Date.now();
          },
        }),
        await He(c, 3e4),
        await we(5e3),
        (await Ze())
          ? (await Qe(!0),
            await Xe(),
            await Ve(),
            (ge = "url_reload"),
            wt.push({
              at: Date.now() - lt,
              level: "url_reload",
              succeededBefore: E.total,
            }),
            Kt("✅ reCAPTCHA recovered via page reload", "success"),
            (_vD._recovering = !1),
            await we(3e3),
            !0)
          : ((_vD._recovering = !1), !1))
      : ((_vD._recovering = !1), !1);
  } catch (e) {
    return ((_vD._recovering = !1), !1);
  }
}
async function je() {
  if (!c) return !1;
  try {
    ((_vD._recovering = !0),
      Kt("🔄 Creating new project to reset reCAPTCHA session...", "warn"),
      (d = null),
      (u = null));
    const e = await chrome.scripting.executeScript({
        target: { tabId: c },
        world: "MAIN",
        func: async () => {
          try {
            const e = new Date(),
              t =
                e.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                }) +
                ", " +
                e.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: !1,
                }),
              a = await fetch("/fx/api/trpc/project.createProject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  json: { projectTitle: t, toolName: "PINHOLE" },
                }),
              });
            if (!a.ok) return { error: "HTTP " + a.status };
            const r = await a.json(),
              o = r?.result?.data?.json?.result?.projectId;
            return o
              ? { success: !0, projectId: o }
              : { error: "No projectId in response" };
          } catch (e) {
            return { error: e.message };
          }
        },
      }),
      t = e?.[0]?.result;
    if (!t?.success)
      return (
        Kt(
          "❌ Failed to create new project: " + (t?.error || "unknown"),
          "error",
        ),
        (_vD._recovering = !1),
        !1
      );
    const a = "https://labs.google/fx/tools/flow/project/" + t.projectId;
    return (
      await chrome.scripting.executeScript({
        target: { tabId: c },
        world: "MAIN",
        func: (e) => {
          window.location.href = e;
        },
        args: [a],
      }),
      await He(c, 3e4),
      await we(5e3),
      (await Ze())
        ? (await Qe(!0),
          await Xe(),
          await Ve(),
          (ge = "new_project"),
          wt.push({
            at: Date.now() - lt,
            level: "new_project",
            succeededBefore: E.total,
          }),
          Kt("✅ reCAPTCHA recovered via new project", "success"),
          (_vD._recovering = !1),
          await we(5e3),
          !0)
        : (Kt(
            "⚠️ New project created but reCAPTCHA still failing — try disabling VPN",
            "warn",
          ),
          (_vD._recovering = !1),
          !1)
    );
  } catch (e) {
    return (
      (_vD._recovering = !1),
      Kt("❌ New project recovery failed: " + e.message, "error"),
      !1
    );
  }
}
async function He(e, t) {
  return new Promise((a, r) => {
    const o = setTimeout(() => {
      (chrome.tabs.onUpdated.removeListener(n),
        r(new Error("Page load timed out")));
    }, t);
    function n(t, r) {
      t === e &&
        "complete" === r.status &&
        (chrome.tabs.onUpdated.removeListener(n), clearTimeout(o), a());
    }
    chrome.tabs.onUpdated.addListener(n);
  });
}
async function Be() {
  if (de) return !!le && (await le);
  if (ue >= 3)
    return (
      Kt(
        "⚠️ Max recovery attempts reached — close Flow tab and reopen manually",
        "error",
      ),
      zt("SHOW_FIX_UNUSUAL", {}),
      !1
    );
  let e;
  ((de = !0),
    ue++,
    (le = new Promise((t) => {
      e = t;
    })));
  try {
    if (fe < 2) {
      if ((fe++, await Fe())) return (e(!0), !0);
      Kt(
        "⚠️ Page reload didn't fix reCAPTCHA — escalating to new project...",
        "warn",
      );
    }
    return (await je())
      ? (e(!0), !0)
      : (Kt("❌ Please close the Flow tab, reopen it and try again", "error"),
        zt("SHOW_FIX_UNUSUAL", {}),
        e(!1),
        !1);
  } catch (t) {
    return (Kt("❌ Recovery crashed: " + t.message, "error"), e(!1), !1);
  } finally {
    ((de = !1), await we(2e3), (le = null));
  }
}
async function Ve() {
  const e = {
    status: "disconnected",
    flowTabId: null,
    hasProject: !1,
    lastCheck: Date.now(),
    lastError: null,
  };
  let t = null;
  try {
    const a = await findFlowTabs();
    if (0 === a.length)
      return (
        (e.lastError =
          "Cannot see a Google Flow tab. " + flowTabSearchDebugText()),
        (c = null),
        (_vD = e),
        Ke(),
        e
      );
    t = a.sort((e, t) =>
      "complete" === e.status && "complete" !== t.status
        ? -1
        : "complete" === t.status && "complete" !== e.status
          ? 1
          : (t.lastAccessed || 0) - (e.lastAccessed || 0),
    )[0];
    if (
      ((e.flowTabId = t.id),
      (c = t.id),
      chrome.sidePanel
        .setOptions({ tabId: t.id, path: "src/sidepanel/index.html", enabled: !0 })
        .catch(() => {}),
      "complete" !== t.status)
    )
      return (
        (e.status = "connecting"),
        (e.lastError = "Flow page is loading..."),
        (_vD = e),
        Ke(),
        e
      );
  } catch (t) {
    return (
      (e.lastError = "Open Google Flow to get started"),
      (_vD = e),
      Ke(),
      e
    );
  }
  try {
    const a = getProjectIdFromUrl(t?.url) || ((u = null), await Xe());
    ((u = a || null),
      (e.hasProject = !!a),
      a || (e.lastError = "Open or create a project in Flow"));
  } catch (a) {
    e.lastError = "Open or create a project in Flow";
  }
  return (
    e.flowTabId &&
      !f &&
      (ne && (e.googlePaygateTier = ne),
      st()
        .then((t) => {
          t && ((e.googlePaygateTier = t.tier), (_vD = e), Ke());
        })
        .catch(() => {})),
    e.flowTabId && e.hasProject
      ? ((e.status = "connected"), (e.lastError = null))
      : e.flowTabId && (e.status = "connecting"),
    (e.googlePaygateTier = ne),
    (_vD = e),
    Ke(),
    e
  );
}
async function ze() {
  if (!c) return Ve();
  try {
    const e = await chrome.tabs.get(c);
    return e.url && Ie(e.url)
      ? "complete" !== e.status
        ? ((_vD = {
            ..._vD,
            status: "connecting",
            flowTabId: e.id,
            hasProject: !1,
            lastError: "Flow page is loading...",
            lastCheck: Date.now(),
          }),
          Ke(),
          _vD)
        : "connected" === _vD.status && Date.now() - _vD.lastCheck < 3e4
          ? _vD
          : Ve()
      : ((c = null),
        (d = null),
        (u = null),
        (_vD = {
          status: "disconnected",
          flowTabId: null,
          hasProject: !1,
          lastCheck: Date.now(),
          lastError: "Flow tab navigated away — open Flow again",
        }),
        Ke(),
        _vD);
  } catch (e) {
    return (
      (c = null),
      (d = null),
      (u = null),
      (_vD = {
        status: "disconnected",
        flowTabId: null,
        hasProject: !1,
        lastCheck: Date.now(),
        lastError: "Flow tab was closed",
      }),
      Ke(),
      _vD
    );
  }
}
function Ke() {
  chrome.runtime
    .sendMessage({ type: "CONNECTION_STATE", state: _vD })
    .catch(() => {});
}
function Ye() {
  return;
}
function We() {
  return chrome.storage.local.remove([
    "activationPending",
    "activationStartedAt",
  ]);
}
(chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: !0 })
  .catch(() => {}),
  chrome.tabs.onUpdated.addListener((e, t, a) => {
    a.url &&
      (Ie(a.url)
        ? ((c = e),
          chrome.sidePanel
            .setOptions({ tabId: e, path: "src/sidepanel/index.html", enabled: !0 })
            .catch(() => {}),
          "loading" === t.status &&
            ((d = null),
            (u = null),
            (_vD = {
              status: "connecting",
              flowTabId: e,
              hasProject: !1,
              lastError: "Flow page is loading...",
              lastCheck: Date.now(),
            }),
            Ke()),
          "complete" === t.status && setTimeout(() => Ve(), 2e3))
        : e === c &&
          ((c = null),
          (d = null),
          (u = null),
          (_vD = {
            status: "disconnected",
            flowTabId: null,
            hasProject: !1,
            lastError: "Flow tab navigated away — open Flow again",
            lastCheck: Date.now(),
          }),
          Ke()));
  }),
  chrome.tabs.onRemoved.addListener((e) => {
    e === c &&
      ((c = null),
      (d = null),
      (u = null),
      (_vD = {
        status: "disconnected",
        flowTabId: null,
        hasProject: !1,
        lastError: "Flow tab was closed",
        lastCheck: Date.now(),
      }),
      Ke());
  }),
  chrome.tabs.onReplaced.addListener((e, t) => {
    t === c && ((c = e), setTimeout(() => Ve(), 2e3));
  }));
