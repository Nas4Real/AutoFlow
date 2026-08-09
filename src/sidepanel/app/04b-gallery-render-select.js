// TurboFlow shard: Gallery grouping, rendering, item selection, batch/group deletion
// Loaded in numeric order; depends on earlier shards sharing globals.

function tfGalleryRatioClass(item) {
  return TFHtmlSafety.allowlistedToken(
    item.ratioClass,
    ["ratio-9-16", "ratio-16-9"],
    item.isPortrait ? "ratio-9-16" : "ratio-16-9",
  );
}
function Ua() {
  const e = new Map();
  for (const [t, a] of u) {
    const n = a.batchId || "__ungrouped__",
      r = a.batchName || "Ungrouped",
      o = a.projectFolder || a.projectName || r,
      s = a.projectName || a.projectFolder || r,
      i = a.batchKind || ("video" === a.type ? "clips" : "images");
    e.has(n) ||
      e.set(n, {
        batchId: n,
        batchName: r,
        projectKey: o,
        projectName: s,
        projectFolder: a.projectFolder || null,
        batchKind: i,
        prompts: new Map(),
        minPromptIndex: 1 / 0,
      });
    const l = e.get(n),
      d = a.promptIndex;
    (l.prompts.has(d) ||
      l.prompts.set(d, { promptIndex: d, prompt: a.prompt || "", items: [] }),
      l.prompts.get(d).items.push({ mediaId: t, ...a }),
      d < l.minPromptIndex && (l.minPromptIndex = d));
  }
  const projectOrder = new Map(),
    kindOrder = { images: 0, image: 0, clips: 1, video: 1 };
  for (const t of e.values()) {
    const e = t.projectKey || "__ungrouped_project__",
      a = projectOrder.get(e);
    (void 0 === a || t.minPromptIndex < a) && projectOrder.set(e, t.minPromptIndex);
  }
  const t = [...e.values()].sort((e, t) => {
    if ("__ungrouped__" === e.batchId) return 1;
    if ("__ungrouped__" === t.batchId) return -1;
    const a = projectOrder.get(e.projectKey) ?? e.minPromptIndex,
      n = projectOrder.get(t.projectKey) ?? t.minPromptIndex;
    if (a !== n) return n - a;
    const r = kindOrder[e.batchKind] ?? 9,
      o = kindOrder[t.batchKind] ?? 9;
    return r !== o ? r - o : e.minPromptIndex - t.minPromptIndex;
  });
  let a = null;
  for (const e of t) {
    e.showProjectHeader = e.projectKey !== a;
    a = e.projectKey;
  }
  for (const e of t) {
    e.sortedPrompts = [...e.prompts.values()].sort(
      (e, t) => e.promptIndex - t.promptIndex,
    );
    for (const t of e.sortedPrompts)
      t.items.sort((e, t) => {
        const a = e.suffix || "",
          n = t.suffix || "";
        return a.localeCompare(n);
      });
  }
  return t;
}
function Ba() {
  const e = r("#gallery-groups");
  if (0 === u.size)
    return (
      (e.innerHTML =
        '\n            <div class="gallery-empty-v2">\n                <span class="material-symbols-outlined">auto_awesome</span>\n                Images will appear here as they generate\n            </div>\n        '),
      void Ya()
    );
  const t = Ua();
  ((e.innerHTML = t
    .map((e) => {
      const t = e.sortedPrompts.reduce((e, t) => e + t.items.length, 0),
        a = e.sortedPrompts.length,
        n = e.sortedPrompts.reduce(
          (e, t) => e + t.items.filter((e) => "done" === e.status).length,
          0,
        ),
        r = e.sortedPrompts.reduce(
          (e, t) => e + t.items.filter((e) => "failed" === e.status).length,
          0,
        );
      let o, s;
      e.sortedPrompts.reduce(
        (e, t) => e + t.items.filter((e) => "generating" === e.status).length,
        0,
      ) > 0
        ? ((o = "Generating"), (s = "bgs-generating"))
        : r > 0 && n > 0
          ? ((o = "Partial"), (s = "bgs-partial"))
          : r > 0 && 0 === n
            ? ((o = "Failed"), (s = "bgs-failed"))
            : ((o = "Complete"), (s = "bgs-done"));
      const i = "__ungrouped__" === e.batchId,
        l = i ? "Ungrouped" : tfBatchKindLabel(e.batchKind),
        projectMeta =
          e.projectFolder && e.projectFolder !== e.projectName
            ? `<span class="project-gallery-meta">${se(e.projectFolder)}</span>`
            : "",
        projectHeader = e.showProjectHeader
          ? `\n    <div class="project-gallery-header">\n        <span class="project-gallery-title">${se(e.projectName || e.projectFolder || l)}</span>\n        ${projectMeta}\n    </div>\n`
          : "",
        d = [];
      for (const t of e.sortedPrompts)
        for (const e of t.items)
          e.isPlaceholder ||
            e.mediaId.startsWith("placeholder-") ||
            d.push(e.mediaId);
      const c = d.length > 0 && d.every((e) => g.has(e)),
        p = e.sortedPrompts
          .map((t) => {
            const a = String(t.promptIndex + 1).padStart(3, "0"),
              n =
                t.prompt.length > 50
                  ? t.prompt.substring(0, 47) + "..."
                  : t.prompt,
              r = t.items[0]?.refThumbs || [],
              o =
                r.length > 0
                  ? r
                      .map(
                        (e) =>
                          `<img class="gallery-group-ref-thumb" src="${TFHtmlSafety.safeMediaUrl(e)}" alt="ref">`,
                      )
                      .join("")
                  : "",
              s = t.items.length,
              i = 1 === s,
              l = t.items
                .map((e) => {
                  const a = String(e.promptIndex + 1).padStart(3, "0");
                  let n = e.suffix || "";
                  if (!n) {
                    const a = t.items;
                    if (a.length > 1) {
                      const t = a.indexOf(e);
                      t > 0 && (n = String.fromCharCode(97 + t));
                    }
                  }
                  const r = a + n,
                    o = g.has(e.mediaId),
                    s =
                      !e.localFile &&
                      !e.isPlaceholder &&
                      !e.mediaId.startsWith("placeholder-") &&
                      !e.mediaId.startsWith("local-file-");
                  let i, l;
                  switch (e.status) {
                    case "generating":
                    default:
                      ((i = "Generating"), (l = "st-generating"));
                      break;
                    case "ready":
                      ((i = "Ready"), (l = "st-ready"));
                      break;
                    case "downloading":
                      ((i = "Saving"), (l = "st-downloading"));
                      break;
                    case "done":
                      ((i = "Saved"), (l = "st-done"));
                      break;
                    case "failed":
                      ((i = "Failed"), (l = "st-failed"));
                  }
                  let d = "";
                  if (e.isPlaceholder || (!e.fifeUrl && "video" !== e.type)) {
                    const t = tfGalleryRatioClass(e),
                      a = "video" === e.type ? "🎬" : "🖼";
                    d = `\n                        <div class="shimmer-placeholder ${t} ${"failed" === e.status ? "shimmer-stopped" : ""}">\n                            <span class="placeholder-icon">${a}</span>\n                            <span class="placeholder-text">${i}</span>\n                        </div>\n                    `;
                  } else
                    d =
                      "video" === e.type && e.videoUrl
                        ? `\n<video src="${TFHtmlSafety.safeMediaUrl(e.videoUrl)}" autoplay loop muted playsinline></video>\n                        <div class="shimmer-placeholder" style="display:none">\n                            <span class="placeholder-icon">🎬</span>\n                            <span class="placeholder-text">${i}</span>\n                        </div>\n                    `
                        : "video" === e.type
                          ? `\n                        <div class="shimmer-placeholder ${tfGalleryRatioClass(e)} ${"failed" === e.status ? "shimmer-stopped" : ""}">\n                            <span class="placeholder-icon">🎬</span>\n                            <span class="placeholder-text">${i}</span>\n                        </div>\n                    `
                          : `\n<img src="${TFHtmlSafety.safeMediaUrl(e.fifeUrl)}" alt="#${se(r)}" loading="lazy" crossorigin="anonymous">\n                        <div class="shimmer-placeholder" style="display:none">\n                            <span class="placeholder-icon">🖼</span>\n                            <span class="placeholder-text">Error</span>\n                        </div>\n                    `;
                  return `\n                    <div class="gallery-item-v2 ${o ? "selected" : ""}"\n                         data-media-id="${se(e.mediaId)}" data-prompt-index="${se(e.promptIndex)}">\n${s ? `\n    <div class="gallery-item-check" data-check-id="${se(e.mediaId)}">\n        <span class="material-symbols-outlined">check</span>\n    </div>\n    <button class="gallery-item-delete" data-delete-id="${se(e.mediaId)}" title="Remove">\n        <span class="material-symbols-outlined">close</span>\n    </button>\n` : ""}\n${d}\n<div class="gallery-item-info-v2">\n    ${t.items.length > 1 ? `<span class="gallery-item-number">v${t.items.indexOf(e) + 1}</span>` : ""}\n    <span class="gallery-item-status ${l}">${i}</span>\n    ${s && xa(e) ? `\n        <button class="gallery-item-animate ${$a() ? "disabled" : ""}"\n                data-animate-id="${se(e.mediaId)}"\n                title="${$a() ? "Wait for current batch to finish" : "Animate this image"}"\n                ${$a() ? "disabled" : ""}>\n            <span class="material-symbols-outlined">play_circle</span>\n        </button>\n    ` : ""}\n</div>\n                    </div>\n                `;
                })
                .join(""),
              d = `${e.batchId}::${t.promptIndex}`;
            return `\n    <div class="prompt-group ${v.has(d) ? "collapsed" : ""}" data-group-index="${se(t.promptIndex)}" data-group-key="${se(d)}">\n        <div class="prompt-group-header" data-group-toggle="${se(t.promptIndex)}">\n                        <span class="material-symbols-outlined prompt-group-chevron">chevron_right</span>\n                        <div class="prompt-group-info">\n                            <span class="prompt-group-number">#${se(a)}</span>\n${o ? `<span class="gallery-group-refs">${o}</span>` : ""}\n<span class="prompt-group-text" title="${se(t.prompt)}">${se(n)}</span>\n                        </div>\n<span class="prompt-group-count">${s} ${1 === s ? "image" : "images"}</span>\n                        <button class="prompt-group-delete" data-delete-group="${se(t.promptIndex)}" data-delete-batch="${se(e.batchId)}" title="Remove group">\n                            <span class="material-symbols-outlined">close</span>\n                        </button>\n                    </div>\n                    <div class="prompt-group-body ${i ? "single-image" : ""}">\n                        ${l}\n                    </div>\n                </div>\n            `;
          })
          .join("");
      return `${projectHeader}\n    <div class="batch-gallery-group ${b.has(e.batchId) ? "collapsed" : ""}" data-batch-id="${se(e.batchId)}">\n        <div class="batch-gallery-header" data-batch-toggle="${se(e.batchId)}">\n                    <span class="material-symbols-outlined batch-gallery-chevron">chevron_right</span>\n                    <div class="batch-gallery-info">\n                        <span class="batch-gallery-name">${i ? "📁" : "📦"} ${se(l)}</span>\n                        <span class="batch-gallery-meta">${a} prompt${1 !== a ? "s" : ""} · ${t} item${1 !== t ? "s" : ""}</span>\n                    </div>\n                    <span class="batch-gallery-status ${s}">${o}</span>\n                    <button class="batch-gallery-select ${c ? "all-selected" : ""}" data-batch-select="${se(e.batchId)}" title="Select all in batch">\n                        <span class="material-symbols-outlined">${c ? "check_box" : "check_box_outline_blank"}</span>\n                    </button>\n                    <button class="batch-gallery-delete" data-delete-batch-group="${se(e.batchId)}" title="Remove batch from gallery">\n                        <span class="material-symbols-outlined">close</span>\n                    </button>\n                </div>\n                <div class="batch-gallery-body">\n                    ${p}\n                </div>\n            </div>\n        `;
    })
    .join("")),
    ja(),
    Ya());
}
function ja() {
  (tfBindGalleryImageErrors(),
    document.querySelectorAll("[data-batch-toggle]").forEach((e) => {
    e.addEventListener("click", (t) => {
      if (
        t.target.closest("[data-batch-select]") ||
        t.target.closest("[data-delete-batch-group]")
      )
        return;
      const a = e.closest(".batch-gallery-group"),
        n = a.dataset.batchId;
      (a.classList.toggle("collapsed"),
        a.classList.contains("collapsed") ? b.add(n) : b.delete(n));
    });
  }),
    document.querySelectorAll("[data-batch-select]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(), Ga(e.dataset.batchSelect));
      });
    }),
    document.querySelectorAll("[data-delete-batch-group]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(), Ha(e.dataset.deleteBatchGroup));
      });
    }),
    document.querySelectorAll("[data-group-toggle]").forEach((e) => {
      e.addEventListener("click", (t) => {
        if (t.target.closest(".prompt-group-delete")) return;
        const a = e.closest(".prompt-group"),
          n = a.dataset.groupKey;
        (a.classList.toggle("collapsed"),
          a.classList.contains("collapsed") ? v.add(n) : v.delete(n));
      });
    }),
    document.querySelectorAll(".gallery-item-check").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(), Qa(e.dataset.checkId));
      });
    }),
    document.querySelectorAll(".gallery-item-delete").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(), Ka(e.dataset.deleteId));
      });
    }),
    document.querySelectorAll(".gallery-item-animate").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(),
          e.disabled ||
            e.classList.contains("disabled") ||
            _a([e.dataset.animateId]));
      });
    }),
    document.querySelectorAll(".prompt-group-delete").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(),
          Ja(parseInt(e.dataset.deleteGroup), e.dataset.deleteBatch));
      });
    }),
    document.querySelectorAll(".gallery-item-v2 img").forEach((e) => {
      e.addEventListener("error", () => {
        e.style.display = "none";
        const t = e.nextElementSibling;
        t && (t.style.display = "flex");
      });
    }),
    document.querySelectorAll(".gallery-item-v2 video").forEach((e) => {
      e.addEventListener("error", () => {
        e.style.display = "none";
        const t = e.nextElementSibling;
        t && (t.style.display = "flex");
      });
    }),
    document.querySelectorAll(".gallery-item-v2").forEach((e) => {
      e.addEventListener("click", (t) => {
        if (
          t.target.closest(".gallery-item-check") ||
          t.target.closest(".gallery-item-delete")
        )
          return;
        const a = e.dataset.mediaId;
        a && !a.startsWith("placeholder-") && nn(a);
      });
    }));
}
function tfBindGalleryImageErrors() {
  document.querySelectorAll(".gallery-item-v2 img").forEach((e) => {
    e.addEventListener(
      "error",
      () => {
        const t = e.closest(".gallery-item-v2"),
          a = t?.querySelector(".shimmer-placeholder"),
          n = a?.querySelector(".placeholder-text");
        if (!t || !a) return;
        ((e.style.display = "none"),
          (a.style.display = "flex"),
          a.classList.add("shimmer-stopped"),
          n && (n.textContent = "Sync folder"),
          (t.title = "Preview is not available from this Flow account. Use the Gallery folder button and select the media folder."));
      },
      { once: !0 },
    );
  });
}
function Ga(e) {
  const t = [];
  for (const [a, n] of u)
    (n.batchId || "__ungrouped__") !== e ||
      n.isPlaceholder ||
      a.startsWith("placeholder-") ||
      t.push(a);
  (t.length > 0 && t.every((e) => g.has(e))
    ? t.forEach((e) => g.delete(e))
    : t.forEach((e) => g.add(e)),
    za(),
    Ya(),
    Ba());
}
async function Ha(e) {
  let t = 0;
  for (const [a, n] of u) (n.batchId || "__ungrouped__") === e && t++;
  if (
    0 !== t &&
    (await an({
      icon: "🗑",
      title: "Delete Batch from Gallery?",
      message: `This will remove all ${t} item${1 !== t ? "s" : ""} from this batch. This cannot be undone.`,
      confirmText: "Delete Batch",
      confirmClass: "btn-flow-danger",
    }))
  ) {
    for (const [t, a] of u)
      (a.batchId || "__ungrouped__") === e && (u.delete(t), g.delete(t));
    b.delete(e);
    for (const t of [...v]) t.startsWith(e + "::") && v.delete(t);
    (Ba(), ee(), Te(`🗑 Removed batch from gallery (${t} items)`, "info"));
  }
}
function Qa(e) {
  (g.has(e) ? g.delete(e) : g.add(e), za(), Ya());
}
function Wa() {
  const e = Va();
  (e.length > 0 && e.every((e) => g.has(e))
    ? g.clear()
    : e.forEach((e) => g.add(e)),
    za(),
    Ya());
}
function Va() {
  const e = [];
  for (const [t, a] of u)
    a.localFile ||
      a.isPlaceholder ||
      t.startsWith("placeholder-") ||
      t.startsWith("local-file-") ||
      e.push(t);
  return e;
}
function za() {
  document.querySelectorAll(".gallery-item-v2").forEach((e) => {
    const t = e.dataset.mediaId;
    e.classList.toggle("selected", g.has(t));
  });
}
function Ya() {
  const e = Va(),
    t = g.size,
    a = e.length,
    n = a > 0 && e.every((e) => g.has(e)),
    o = r("#gallery-selection-count");
  t > 0
    ? ((o.textContent = `${t} / ${a} selected`),
      o.classList.add("has-selection"))
    : ((o.textContent = `${a} items`), o.classList.remove("has-selection"));
  const s = r("#btn-select-all"),
    i = s.querySelector(".material-symbols-outlined"),
    l = r("#select-all-text");
  n && a > 0
    ? (s.classList.add("all-selected"),
      (i.textContent = "check_box"),
      (l.textContent = "Deselect All"))
    : t > 0
      ? (s.classList.remove("all-selected"),
        (i.textContent = "indeterminate_check_box"),
        (l.textContent = "Select All"))
      : (s.classList.remove("all-selected"),
        (i.textContent = "check_box_outline_blank"),
        (l.textContent = "Select All"));
  const d = r("#gallery-download-bar"),
    c = r("#btn-download-selected"),
    p = r("#download-bar-count");
  t > 0
    ? (d.classList.remove("hidden"), (c.disabled = !1), (p.textContent = t))
    : (d.classList.add("hidden"), (c.disabled = !0), Za());
  const m = r("#btn-animate-selected");
  if (m) {
    const e = $a();
    if (t > 0 && !e) {
      const e = [...g].some((e) => xa(u.get(e)));
      ((m.disabled = !e),
        (m.title = e
          ? "Animate selected images"
          : "No animatable images in selection"));
    } else
      ((m.disabled = !0),
        (m.title = e
          ? "Wait for current batch and downloads to finish"
          : "Select images to animate"));
  }
}
function Ka(e) {
  (u.delete(e),
    g.delete(e),
    Ba(),
    ee(),
    Te("🗑 Removed image from gallery", "info"));
}
async function Ja(e, t) {
  let a = 0;
  for (const [n, r] of u) {
    const n = r.batchId || "__ungrouped__";
    r.promptIndex === e && n === t && a++;
  }
  if (
    0 !== a &&
    (await an({
      icon: "🗑",
      title: "Delete Group?",
      message: `This will remove all ${a} item${1 !== a ? "s" : ""} from prompt #${e + 1}. This cannot be undone.`,
      confirmText: "Delete Group",
      confirmClass: "btn-flow-danger",
    }))
  ) {
    for (const [a, n] of u) {
      const r = n.batchId || "__ungrouped__";
      n.promptIndex === e && r === t && (u.delete(a), g.delete(a));
    }
    (v.delete(`${t}::${e}`),
      Ba(),
      ee(),
      Te(`🗑 Removed group #${e + 1} (${a} items)`, "info"));
  }
}
