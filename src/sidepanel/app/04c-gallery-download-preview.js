// TurboFlow shard: Gallery download menu, confirm modal, preview modal
// Loaded in numeric order; depends on earlier shards sharing globals.

function Xa() {
  (r("#download-quality-dropdown").classList.remove("hidden"), (f = !0));
}
function Za() {
  (r("#download-quality-dropdown").classList.add("hidden"), (f = !1));
}
function en() {
  f ? Za() : Xa();
}
async function tn(e) {
  Za();
  const t = [],
    a = [];
  for (const e of g) {
    const n = u.get(e);
    if (!n) continue;
    const r = {
      mediaId: e,
      type: n.type || "image",
      promptIndex: n.promptIndex,
      workflowId: n.workflowId || null,
      isPortrait: n.isPortrait || !1,
      fileName: n.fileName || null,
    };
    "video" === n.type ? a.push(r) : t.push(r);
  }
  const n = r("#setting-folder").value.trim() || "turboflow";
  let o, s, i;
  "4k" === e
    ? ((o = "4k"), (s = "standard"), (i = "images: 4K"))
    : "2k" === e
      ? ((o = "2k"), (s = "standard"), (i = "images: 2K"))
      : "standard" === e
        ? ((o = "standard"), (s = "standard"), (i = "standard"))
        : "video-4k" === e
          ? ((o = "2k"), (s = "4k"), (i = "videos: 4K"))
          : "video-1080p" === e
            ? ((o = "2k"), (s = "1080p"), (i = "videos: 1080p"))
            : "video-standard" === e &&
              ((o = "2k"), (s = "standard"), (i = "videos: 720p"));
  const d = [...t, ...a];
  if (0 === d.length) return;
  Te(`📥 Downloading ${d.length} items (${i}) → ${n}/`, "info");
  let c = "landscape";
  for (const e of g) {
    const t = u.get(e);
    if (t && "video" === t.type) {
      c = t.isPortrait ? "portrait" : "landscape";
      break;
    }
  }
  await chrome.runtime.sendMessage({
    type: "DOWNLOAD_MULTIPLE",
    items: d,
    folder: n,
    quality: o,
    videoQuality: s,
    videoAspectRatio: c,
    naming: l.settings.naming || "numbered",
    namingPrefix: l.settings.namingPrefix || "",
    namingSeparator:
      void 0 !== l.settings.namingSeparator ? l.settings.namingSeparator : "-",
  });
}
function an({
  icon: e,
  title: t,
  message: a,
  confirmText: n,
  confirmClass: o,
}) {
  return new Promise((s) => {
    const i = r("#confirm-modal"),
      l = r("#confirm-icon"),
      d = r("#confirm-title"),
      c = r("#confirm-message"),
      p = r("#btn-confirm-ok"),
      m = r("#btn-confirm-cancel");
    function u(e) {
      ((i.style.display = "none"),
        p.removeEventListener("click", g),
        m.removeEventListener("click", f),
        i.removeEventListener("click", h),
        s(e));
    }
    function g() {
      u(!0);
    }
    function f() {
      u(!1);
    }
    function h(e) {
      e.target === i && u(!1);
    }
    ((l.textContent = e || "⚠️"),
      (d.textContent = t || "Are you sure?"),
      (c.textContent = a || ""),
      (p.textContent = n || "Delete"),
      (p.className = o || "btn-flow-danger"),
      (p.style.flex = "1"),
      (i.style.display = "flex"),
      p.addEventListener("click", g),
      m.addEventListener("click", f),
      i.addEventListener("click", h));
  });
}
function nn(e) {
  $ = [];
  const t = Ua();
  for (const e of t)
    for (const t of e.sortedPrompts)
      for (const e of t.items)
        e.isPlaceholder || e.mediaId.startsWith("placeholder-") || $.push(e);
  const a = $.findIndex((t) => t.mediaId === e);
  -1 !== a && ((L = a), on(), (r("#preview-modal").style.display = "flex"));
}
function rn() {
  ((r("#preview-modal").style.display = "none"), ln());
  const e = r("#preview-video");
  (e.pause(), (e.src = ""));
}
function on() {
  const e = $[L];
  if (!e) return;
  const t = r("#preview-image"),
    a = r("#preview-video"),
    n = r("#preview-number"),
    o = r("#preview-prompt"),
    s = r("#btn-preview-prev"),
    i = r("#btn-preview-next"),
    l = String(e.promptIndex + 1).padStart(3, "0");
  let d = e.suffix || "";
  if (!d) {
    const t = $.filter((t) => t.promptIndex === e.promptIndex);
    if (t.length > 1) {
      const a = t.indexOf(e);
      a > 0 && (d = String.fromCharCode(97 + a));
    }
  }
  ((n.textContent = "#" + l + d),
    (o.textContent = e.prompt || ""),
    (o.title = e.prompt || ""),
    "video" === e.type && e.videoUrl
      ? ((t.style.display = "none"),
        (a.style.display = "block"),
        (a.src = e.videoUrl))
      : e.fifeUrl &&
        ((a.style.display = "none"),
        a.pause(),
        (a.src = ""),
        (t.style.display = "block"),
        (t.src = e.fifeUrl)),
    (s.style.visibility = 0 === L ? "hidden" : "visible"),
    (i.style.visibility = L === $.length - 1 ? "hidden" : "visible"));
  const c = r("#preview-image-options"),
    p = r("#preview-video-options");
  c &&
    p &&
    ("video" === e.type
      ? ((c.style.display = "none"), (p.style.display = "block"))
      : ((c.style.display = "block"), (p.style.display = "none")));
  const m = r("#btn-preview-animate");
  (m && (m.style.display = xa(e) ? "inline-flex" : "none"), ln());
}
function sn() {
  (r("#preview-quality-dropdown").classList.remove("hidden"), (x = !0));
}
function ln() {
  (r("#preview-quality-dropdown").classList.add("hidden"), (x = !1));
}
