// TurboFlow side panel shard: Tour content, image library, Jack reference helpers
// Loaded by src/sidepanel/index.html in numeric order.

let Ke = null,
  Je = "yearly";
function Xe(e) {
  We();
}
let Ze = null;
function et(e) {
  Me();
}
const tt = [
  {
    type: "welcome",
    icon: "⚡",
    title: "Welcome to TurboFlow!",
    desc: "Let's take a quick tour so you can start generating in under a minute.",
    btnText: "Show Me Around",
  },
  {
    type: "spotlight",
    target: ".tabs",
    icon: "📑",
    title: "Your 5 Tabs",
    desc: "<strong>Control</strong> — settings & prompts<br><strong>Queue</strong> — batch management & auto-chaining<br><strong>Gallery</strong> — view, select & download results<br><strong>Library</strong> — save & tag reference images<br><strong>Logs</strong> — detailed activity log",
    position: "bottom",
  },
  {
    type: "spotlight",
    target: '[data-mode="image"]',
    icon: "🎨",
    title: "Generation Mode",
    desc: "Switch between <strong>Image</strong> and <strong>Video</strong> generation. Each has its own settings — models, aspect ratios, and modes.",
    position: "bottom",
    targetParent: ".pill-group",
  },
  {
    type: "spotlight",
    target: "#setting-image-model",
    icon: "🤖",
    title: "AI Model",
    desc: "<strong>Nano Banana Pro</strong> — newest, best quality<br><strong>Nano Banana 2</strong> — fast, reliable<br><br>Both are Google's latest image models.",
    position: "bottom",
  },
  {
    type: "spotlight",
    target: '[data-img-ratio="IMAGE_ASPECT_RATIO_LANDSCAPE"]',
    icon: "📐",
    title: "Aspect Ratio",
    desc: "Choose <strong>Landscape</strong> (16:9) or <strong>Portrait</strong> (9:16). This applies to every image in the batch.",
    position: "bottom",
    targetParent: ".pill-group",
  },
  {
    type: "spotlight",
    target: '[data-img-count="1"]',
    icon: "✖️",
    title: "Images Per Prompt",
    desc: "Generate <strong>1 to 4 variants</strong> per prompt. Great for exploring different interpretations of the same idea.",
    position: "bottom",
    targetParent: ".pill-group",
  },
  {
    type: "spotlight",
    target: "#img-reference-section",
    icon: "🖼️",
    title: "Reference Images",
    desc: "<strong>Add Reference Images (Same for All)</strong> — pick images from your Library to guide every prompt's style.<br><br><strong>Assign Different Image for Each Prompt</strong> — give each prompt its own reference image. Supports auto 1:1 mapping, @tag matching, and bulk upload.",
    position: "top",
  },
  {
    type: "spotlight",
    target: ".settings-card",
    icon: "⚙️",
    title: "Download Settings",
    desc: "<strong>Auto-download</strong> - images and videos download automatically<br><strong>Quality</strong> - choose 2K or Standard for images, 720p or 1080p for videos",
    position: "top",
  },
  {
    type: "spotlight",
    target: "#prompt-input",
    icon: "✍️",
    title: "Your Prompts",
    desc: "Type one prompt per line. Each line = one generation.<br><br>You can <strong>import a .txt file</strong> with the upload button. Paste 10 or 500 — TurboFlow handles it all.<br><br>💡 When you assign different images per prompt, the textarea locks to keep prompts synced with their images.",
    position: "top",
  },
  {
    type: "spotlight",
    target: "#btn-start",
    icon: "🚀",
    title: "Generate Now",
    desc: "Click to <strong>start generating immediately</strong>. Prompts fire and the results appear live in the Gallery tab.",
    position: "top",
  },
  {
    type: "spotlight",
    target: "#btn-add-queue",
    icon: "📋",
    title: "Add to Queue",
    desc: "Don't want to run now? Add prompts to the <strong>Queue</strong> instead.<br><br>Stack multiple batches with different settings, then hit <strong>Run All</strong> — they <strong>auto-run</strong> one after another. You can also duplicate, retry failed prompts, and import/export batches.",
    position: "top",
  },
  {
    type: "spotlight",
    target: '[data-tab="gallery"]',
    icon: "🖼",
    title: "Gallery",
    desc: "All generated images and videos appear here, <strong>grouped by prompt</strong>.<br><br><strong>Select</strong> items individually or all at once, then <strong>download</strong> in your preferred quality — 2K upscaled, standard, 720p, or 1080p.",
    position: "bottom",
  },
  {
    type: "spotlight",
    target: '[data-tab="library"]',
    icon: "📚",
    title: "Image Library",
    desc: "Upload images to use as <strong>references, start frames, or end frames</strong> across all your batches.<br><br>💡 <strong>Tag images</strong> with @names (e.g. @hero, @logo) then use those @tags in your prompts — the <strong>Auto-Tag</strong> mapper will match them automatically.",
    position: "bottom",
  },
  {
    type: "welcome",
    icon: "🎉",
    title: "You're All Set!",
    desc: "Open Google Flow, type your prompts, and hit generate.<br>TurboFlow handles the rest.<br><br>💡 <strong>Tip:</strong> Check the <strong>Logs tab</strong> for detailed status on every generation.",
    btnText: "Start Creating",
    isFinal: !0,
  },
];
async function at() {
  return !(await chrome.storage.local.get("turboflowOnboardingDone"))
    .turboflowOnboardingDone;
}
async function nt() {
  await chrome.storage.local.set({ turboflowOnboardingDone: !0 });
}
function rt() {
  ((D = 0), (N = !0), document.body.classList.add("onboarding-active"), it());
}
function ot() {
  ((N = !1), document.body.classList.remove("onboarding-active"));
  const e = document.getElementById("onboarding-container");
  (e && (e.innerHTML = ""),
    nt(),
    i?.trial &&
      i?.trialEndsAt &&
      new Date(i.trialEndsAt).getTime() - Date.now() > 0 &&
      setTimeout(() => lt(), 500));
}
function st() {
  (chrome.storage.local.remove("turboflowOnboardingDone"), rt());
}
function it() {
  const e = document.getElementById("onboarding-container");
  if (!e) return;
  const t = tt[D];
  if (!t) return void ot();
  const a = tt.length,
    n = tt
      .map(
        (e, t) =>
          `<div class="onboarding-dot ${t === D ? "active" : t < D ? "completed" : ""}"></div>`,
      )
      .join("");
  if ("welcome" === t.type)
    e.innerHTML = `\n            <div class="onboarding-overlay"></div>\n            <div class="onboarding-welcome">\n                <div class="onboarding-welcome-card">\n                    <div class="onboarding-welcome-icon">${t.icon}</div>\n                    <h2 class="onboarding-welcome-title">${t.title}</h2>\n                    <p class="onboarding-welcome-desc">${t.desc.replace(/\n/g, "<br>")}</p>\n                    <div class="onboarding-step-indicator" style="justify-content:center;margin-bottom:16px">\n                        ${n}\n                    </div>\n                    <button class="onboarding-btn-start" id="onboarding-next">\n                        ${t.btnText || "Next"}\n                    </button>\n                    <br>\n                    ${t.isFinal ? "" : '<button class="onboarding-skip-tour" id="onboarding-skip">Skip tour</button>'}\n                </div>\n            </div>\n        `;
  else if ("spotlight" === t.type) {
    let r = document.querySelector(t.target);
    if (!r) return (D++, void it());
    if (t.targetParent) {
      const e = r.closest(t.targetParent);
      e && (r = e);
    }
    (r.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      setTimeout(() => {
        const o = r.getBoundingClientRect(),
          s = window.innerHeight,
          i = `\n                top: ${o.top - 6}px;\n                left: ${o.left - 6}px;\n                width: ${o.width + 12}px;\n                height: ${o.height + 12}px;\n            `;
        let l = "",
          d = "",
          c = t.position;
        const p = s - o.bottom,
          m = o.top;
        "bottom" === c && p < 200
          ? (c = "top")
          : "top" === c && m < 200 && (c = "bottom");
        let u = o.left;
        (u + 300 > window.innerWidth - 12 && (u = window.innerWidth - 300 - 12),
          (u = Math.max(12, u)),
          "bottom" === c
            ? ((l = `top: ${o.bottom + 16}px; left: ${u}px;`),
              (d = "arrow-top"))
            : "top" === c &&
              ((l = `bottom: ${s - o.top + 16}px; left: ${u}px;`),
              (d = "arrow-bottom")),
          (l += ` max-width: ${Math.min(300, window.innerWidth - 24)}px;`));
        const g = o.left + o.width / 2;
        l += ` --arrow-left: ${Math.max(16, Math.min(g - u, 284))}px;`;
        const f = D === a - 1 ? "Finish" : "Next";
        e.innerHTML = `\n                <div class="onboarding-spotlight spotlight-pulse" style="${i}"></div>\n                <div class="onboarding-tooltip ${d}" style="${l}">\n                    <div class="onboarding-step-indicator">\n                        ${n}\n                    </div>\n                    <div class="onboarding-icon">${t.icon}</div>\n                    <div class="onboarding-title">${t.title}</div>\n                    <div class="onboarding-desc">${t.desc}</div>\n                    <div class="onboarding-actions">\n                        <button class="onboarding-btn-skip" id="onboarding-skip">Skip</button>\n                        <button class="onboarding-btn-next" id="onboarding-next">\n                            ${f}\n                            <span class="material-symbols-outlined" style="font-size:16px">arrow_forward</span>\n                        </button>\n                    </div>\n                </div>\n            `;
      }, 150));
  }
  setTimeout(() => {
    (document
      .getElementById("onboarding-next")
      ?.addEventListener("click", () => {
        (D++,
          D >= a
            ? (le("onboarding_step", { step: a, completed: !0 }), ot())
            : (le("onboarding_step", { step: D }), it()));
      }),
      document
        .getElementById("onboarding-skip")
        ?.addEventListener("click", () => {
          (le("onboarding_step", { step: D, skipped: !0 }), ot());
        }));
  }, 200);
}
function lt() {
  const e = r("#trial-welcome-modal");
  if (!e) return;
  const t = new Date(i.trialEndsAt).getTime() - Date.now(),
    a = Math.ceil(t / 36e5);
  ((r("#trial-welcome-hours").textContent = a + "h"),
    (e.style.display = "flex"));
}
function dt() {
  return "lib-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
}
function ct() {
  const e = JSON.stringify(y),
    t = new Blob([e]).size;
  return t < 1024
    ? t + " B"
    : t < 1048576
      ? (t / 1024).toFixed(1) + " KB"
      : (t / 1048576).toFixed(1) + " MB";
}
function pt(e) {
  return y.find((t) => t.mediaId === e);
}
function mt(e, t) {
  if (!t) return !1;
  if (
    !(t = t
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .substring(0, 20))
  )
    return !1;
  const a = y.find((a) => a.tag === t && a.id !== e);
  if (a)
    return (
      Te(`⚠️ Tag "@${t}" is already used by "${a.fileName}"`, "warn"),
      !1
    );
  const n = y.find((t) => t.id === e);
  return (
    !!n &&
    ((n.tag = t),
    ae(),
    kt(),
    Te(`🏷️ Tagged "${n.fileName}" as @${t}`, "info"),
    !0)
  );
}
function ut(e) {
  const t = y.find((t) => t.id === e);
  if (!t || !t.tag) return;
  const a = t.tag;
  ((t.tag = null),
    ae(),
    kt(),
    Te(`🏷️ Removed @${a} tag from "${t.fileName}"`, "info"));
}
function gt() {
  return y.filter((e) => e.tag && e.mediaId && !e.uploading && !e.hiddenInLibrary);
}
function ft(e) {
  return e
    ? ((e = e.toLowerCase()),
      y.find((t) => t.tag === e && t.mediaId && !t.uploading && !t.hiddenInLibrary) ||
        null)
    : null;
}
function ht(e) {
  if (!e) return "img";
  let t = e.replace(/\.[^.]+$/, "");
  return (
    (t = t.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")),
    (t = t.replace(/-+/g, "-").replace(/^-+|-+$/g, "")),
    (t = t.substring(0, 20).replace(/-+$/, "")),
    t || "img"
  );
}
function bt(e, t) {
  const a = (e) => y.some((a) => a.tag === e && a.id !== t);
  if (!a(e)) return e;
  for (let t = 2; t <= 99; t++) {
    const n = "-" + t,
      r = 20 - n.length,
      o = e.substring(0, r) + n;
    if (!a(o)) return o;
  }
  return null;
}
function tfIsJackFileName(e) {
  return "jack" === String(e || "").replace(/\.[^.]+$/, "").toLowerCase();
}
function tfIsJackAutoTag(e) {
  return /^jack(?:-\d+)?$/.test(String(e || "").toLowerCase());
}
function tfIsJackSystemReference(e) {
  return (
    !!e &&
    (e.source === TF_JACK_REFERENCE_SOURCE ||
      (tfIsJackFileName(e.fileName) &&
        (!0 === e.hiddenInLibrary || tfIsJackAutoTag(e.tag))))
  );
}
function tfMarkJackSystemReference(e, t = null) {
  if (!e) return !1;
  let a = !1;
  (e.source !== TF_JACK_REFERENCE_SOURCE &&
    ((e.source = TF_JACK_REFERENCE_SOURCE), (a = !0)),
    !0 !== e.hiddenInLibrary && ((e.hiddenInLibrary = !0), (a = !0)),
    t && e.flowProjectId !== t && ((e.flowProjectId = t), (a = !0)),
    e.tag &&
      tfIsJackAutoTag(e.tag) &&
      ((e.tag = null), (a = !0)));
  return a;
}
function tfNormalizeJackLibraryEntries() {
  let e = !1;
  for (const t of y)
    tfIsJackSystemReference(t) && (e = tfMarkJackSystemReference(t) || e);
  return (e && ae(), e);
}
function tfFindReusableJackReference(e) {
  const t = y
    .filter(
      (t) =>
        t.mediaId &&
        !t.uploading &&
        (tfIsJackSystemReference(t) || tfIsJackFileName(t.fileName)) &&
        (!e || !t.flowProjectId || t.flowProjectId === e),
    )
    .sort((t, a) => {
      const n = t.flowProjectId && t.flowProjectId === e ? 2 : 0,
        r = a.flowProjectId && a.flowProjectId === e ? 2 : 0,
        o = tfIsJackSystemReference(t) ? 1 : 0,
        s = tfIsJackSystemReference(a) ? 1 : 0;
      return r + s - (n + o) || (a.uploadedAt || 0) - (t.uploadedAt || 0);
    });
  return t[0] || null;
}
function vt() {
  tfNormalizeJackLibraryEntries();
  const e = y.filter(
    (e) => e.mediaId && !e.uploading && !e.tag && !e.hiddenInLibrary,
  );
  if (0 === e.length) return void Te("✓ All images are already tagged", "info");
  let t = 0,
    a = 0;
  for (const n of e) {
    const e = bt(ht(n.fileName), n.id);
    e ? ((n.tag = e), t++) : a++;
  }
  t > 0 && (ae(), kt());
  const n = y.filter((e) => e.tag && e.id).length - t;
  let r = `🏷️ Auto-tagged ${t} image${1 !== t ? "s" : ""}`;
  (n > 0 && (r += ` (${n} already had tags)`),
    a > 0 && (r += ` — ${a} skipped`),
    Te(r, t > 0 ? "success" : "info"),
    "function" == typeof le &&
      le("library_auto_tag", { tagged: t, skipped: a }));
}
async function yt(e) {
  if (y.filter((e) => !e.uploading).length >= 500)
    return (
      Te("⚠️ Library full — max 500 images. Remove some first.", "warn"),
      null
    );
  const t = await Vn(e),
    a = await ce(t, e.type);
  if (!a)
    return (Te(`❌ Failed to create thumbnail for "${e.name}"`, "error"), null);
  const n = dt(),
    r = {
      id: n,
      mediaId: null,
      fileName: e.name,
      thumbnail: a,
      uploadedAt: Date.now(),
      mimeType: e.type || "image/jpeg",
      uploading: !0,
      tag: null,
    };
  (y.push(r), kt());
  let o = null;
  for (let a = 0; a <= 3; a++)
    try {
      const r = await chrome.runtime.sendMessage({
        type: "UPLOAD_IMAGE",
        base64Data: t,
        fileName: e.name,
        mimeType: e.type || "image/jpeg",
      });
      if (!r.ok) {
        const t = r.error || "Upload failed";
        if (
          t.includes("400") ||
          t.includes("INVALID_ARGUMENT") ||
          t.includes("INVALID_REQUEST") ||
          t.includes("Bad request") ||
          t.includes("unsupported") ||
          t.includes("too large")
        )
          return (
            (y = y.filter((e) => e.id !== n)),
            kt(),
            Te(`❌ "${e.name}" — ${Ie(t)}`, "error"),
            null
          );
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
          a < 3
        ) {
          o = t;
          const n = 1500 * Math.pow(1.5, a) + 500 * Math.random();
          (Te(
            `⟳ "${e.name}" upload retry ${a + 1}/3 in ${(n / 1e3).toFixed(1)}s`,
            "warn",
          ),
            await ie(n));
          continue;
        }
        throw new Error(t);
      }
      const s = y.find((e) => e.id === n);
      return (
        s && ((s.mediaId = r.mediaId), (s.uploading = !1)),
        ae(),
        kt(),
        Te(`📸 "${e.name}" added to library`, "success"),
        q++,
        (j = !0),
        s
      );
    } catch (t) {
      o = t.message || String(t);
      const r =
          o.includes("Extension context invalidated") ||
          o.includes("Could not establish connection") ||
          o.includes("Receiving end does not exist"),
        s =
          o.includes("400") ||
          o.includes("INVALID_ARGUMENT") ||
          o.includes("INVALID_REQUEST") ||
          o.includes("Bad request") ||
          o.includes("unsupported") ||
          o.includes("too large");
      if (r || s || a >= 3)
        return (
          (y = y.filter((e) => e.id !== n)),
          kt(),
          Te(`❌ "${e.name}" — ${Ie(o)}`, "error"),
          null
        );
      const i = 1500 * Math.pow(1.5, a) + 500 * Math.random();
      (Te(
        `⟳ "${e.name}" upload error — retry ${a + 1}/3 in ${(i / 1e3).toFixed(1)}s`,
        "warn",
      ),
        await ie(i));
    }
  return (
    (y = y.filter((e) => e.id !== n)),
    kt(),
    Te(`❌ "${e.name}" — ${Ie(o)}`, "error"),
    null
  );
}
async function wt(e, t = null) {
  const a = [];
  let n = 0,
    r = 0,
    o = 0;
  return new Promise((s) => {
    async function i(o) {
      const i = e[o];
      r++;
      const d = await yt(i);
      ((a[o] = d),
        r--,
        n++,
        t && t(n, e.length, i.name, !!d),
        (n >= e.length && (s(a), 1)) || l());
    }
    function l() {
      for (; o < e.length && r < 10; )
        if ((i(o++), o < e.length && r < 10)) return void setTimeout(l, 100);
    }
    0 !== e.length ? l() : s(a);
  });
}
function It(e) {
  const t = y.find((t) => t.id === e);
  if (!t) return;
  const a = t.fileName;
  ((y = y.filter((t) => t.id !== e)),
    t.mediaId &&
      ((l.imageReferenceMediaIds = l.imageReferenceMediaIds.filter(
        (e) => e !== t.mediaId,
      )),
      (l.referenceMediaIds = l.referenceMediaIds.filter(
        (e) => e !== t.mediaId,
      )),
      l.startFrameMediaId === t.mediaId && (l.startFrameMediaId = null),
      l.endFrameMediaId === t.mediaId && (l.endFrameMediaId = null)),
    ae(),
    kt(),
    Te(`🗑 "${a}" removed from library`, "info"));
}
function Et() {
  if (0 === y.length) return;
  const e = y.length;
  ((y = []),
    (l.imageReferenceMediaIds = []),
    (l.referenceMediaIds = []),
    (l.startFrameMediaId = null),
    (l.endFrameMediaId = null),
    ae(),
    kt(),
    Te(`🗑 Library cleared — ${e} images removed`, "info"));
}
function kt() {
  const e = r("#library-grid"),
    t = r("#library-count"),
    a = r("#library-footer"),
    n = r("#library-storage-info");
  if (!e) return;
  const o = y.filter((e) => e.thumbnail && !e.hiddenInLibrary);
  if (0 === o.length)
    return (
      (e.innerHTML =
        '\n            <div class="empty-state" style="grid-column: 1/-1">\n                <span class="material-symbols-outlined">photo_library</span>\n                Upload images to use as references, start frames, or end frames across all your batches\n            </div>\n        '),
      (t.textContent = "0 images"),
      void (a.style.display = "none")
    );
  ((t.textContent = `${o.length} image${1 !== o.length ? "s" : ""}`),
    (a.style.display = "flex"),
    (n.textContent = `${o.length} images · ${ct()}`),
    (e.innerHTML =
      o
        .map((e) => {
          const t = e.uploading,
            a =
              e.fileName.length > 14
                ? e.fileName.substring(0, 11) + "..."
                : e.fileName,
            n = e.mediaId ? e.mediaId.substring(0, 12) + "..." : "uploading...";
          let r = "";
          return (
            (r = t
              ? ""
              : e.tag
                ? `\n                <div class="library-item-tag">\n                    <span class="tag-pill" data-lib-tag-id="${e.id}">\n                        @${se(e.tag)}\n                        <button class="tag-remove" data-tag-remove="${e.id}" title="Remove tag">✕</button>\n                    </span>\n                </div>\n            `
                : `\n                <div class="library-item-tag">\n                    <button class="tag-add-btn" data-tag-add="${e.id}" title="Add tag for auto-mapping">+ Tag</button>\n                    <div class="tag-input-wrapper" data-tag-input-wrapper="${e.id}" style="display:none">\n                        <input type="text" class="tag-input-field" data-tag-input="${e.id}"\n                            placeholder="tag name" maxlength="20" spellcheck="false">\n                    </div>\n                </div>\n            `),
            `\n            <div class="library-item ${t ? "uploading" : ""}" data-lib-id="${se(e.id)}">\n                <div class="library-item-overlay">\n                    <div class="uploading-spinner"></div>\n                </div>\n                <img class="library-item-img" src="${TFHtmlSafety.safeMediaUrl(e.thumbnail)}" alt="${se(e.fileName)}" loading="lazy">\n                <div class="library-item-info">\n                    <span class="library-item-name" title="${se(e.fileName)}">${se(a)}</span>\n                    ${t ? "" : `\n                        <button class="library-item-delete" data-lib-delete="${se(e.id)}" title="Remove">\n                            <span class="material-symbols-outlined">close</span>\n                        </button>\n                    `}\n                </div>\n                ${r}\n                <div class="library-item-mediaid">${n}</div>\n            </div>\n        `
          );
        })
        .join("") +
      '\n        <div class="library-upload-card" id="library-upload-card">\n            <span class="material-symbols-outlined">add_photo_alternate</span>\n            <span>Upload</span>\n        </div>\n    '),
    e.querySelectorAll("[data-lib-delete]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(), It(e.dataset.libDelete));
      });
    }));
  const s = e.querySelector("#library-upload-card");
  (s &&
    s.addEventListener("click", () => {
      r("#library-upload-input").click();
    }),
    e.querySelectorAll("[data-tag-add]").forEach((t) => {
      t.addEventListener("click", (a) => {
        a.stopPropagation();
        const n = t.dataset.tagAdd;
        t.style.display = "none";
        const r = e.querySelector(`[data-tag-input-wrapper="${n}"]`);
        if (r) {
          r.style.display = "flex";
          const e = r.querySelector(`[data-tag-input="${n}"]`);
          e && e.focus();
        }
      });
    }),
    e.querySelectorAll("[data-tag-input]").forEach((e) => {
      const t = e.dataset.tagInput;
      (e.addEventListener("keydown", (a) => {
        if ("Enter" === a.key) {
          a.preventDefault();
          const n = e.value.trim();
          n ? mt(t, n) : kt();
        }
        "Escape" === a.key && kt();
      }),
        e.addEventListener("blur", () => {
          const a = e.value.trim();
          a ? mt(t, a) : kt();
        }),
        e.addEventListener("input", () => {
          e.value = e.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
        }));
    }),
    e.querySelectorAll("[data-tag-remove]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(), ut(e.dataset.tagRemove));
      });
    }));
}
(r("#btn-library-upload")?.addEventListener("click", () => {
  r("#library-upload-input").click();
}),
  r("#library-upload-input")?.addEventListener("change", async (e) => {
    const t = Array.from(e.target.files);
    if (!t.length) return;
    const a = t.filter((e) => e.type.startsWith("image/"));
    if (a.length)
      if (await St("upload images")) {
        if (1 === a.length) await yt(a[0]);
        else {
          Te(`📤 Uploading ${a.length} images (10x parallel)...`, "info");
          const e = (await wt(a, (e, t, a, n) => {})).filter(
              (e) => null !== e,
            ).length,
            t = a.length - e;
          t > 0
            ? Te(`📤 Upload complete: ${e} succeeded, ${t} failed`, "warn")
            : Te(`📤 All ${e} images uploaded successfully`, "success");
        }
        e.target.value = "";
      } else e.target.value = "";
    else Te("⚠️ No image files selected", "warn");
  }),
  r("#btn-library-clear")?.addEventListener("click", () => {
    0 !== y.length && Et();
  }),
  r("#btn-library-autotag")?.addEventListener("click", () => {
    0 !== y.length ? vt() : Te("⚠️ Library is empty", "warn");
  }));
