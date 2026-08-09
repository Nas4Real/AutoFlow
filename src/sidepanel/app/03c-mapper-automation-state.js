// TurboFlow shard: Mapper bulk assignment, auto-tag, clear, and preview state updates
// Loaded in numeric order; depends on earlier shards sharing globals.

function ma() {
  const e = r("#mapper-bulk-file-input");
  e.value = "";
  const t = ue(),
    a = "start_frame" === t || "start_end_frame" === t,
    n = async (t) => {
      e.removeEventListener("change", n);
      const r = Array.from(t.target.files).filter((e) =>
        e.type.startsWith("image/"),
      );
      if (0 === r.length) return;
      let o = 0;
      if (l.singlePromptMode && a)
        for (let e = 0; e < W.length; e++) {
          if (!W[e]) {
            o = e;
            break;
          }
          o = e + 1;
        }
      const s =
          l.singlePromptMode && a ? r.length : Math.min(r.length, z.length),
        i = r.slice(0, s);
      if (!(await St("upload images"))) return;
      ba(`Uploading ${s} images... (0/${s})`);
      const d = await we(i, {
        maxConcurrent: 10,
        delayBetweenMs: 100,
        onProgress: (e, t, a, n) => {
          va(`Uploading ${t} images... (${e}/${t})`);
        },
      });
      ya();
      let c = 0,
        p = 0;
      const m = [],
        u = [];
      if (
        (d.forEach((e, t) => {
          const n = l.singlePromptMode && a ? o + t : t;
          e && e.success
            ? (a
                ? (W[n] = e.entry.mediaId)
                : (Q[n] || (Q[n] = []),
                  Q[n].includes(e.entry.mediaId) || Q[n].push(e.entry.mediaId)),
              c++)
            : (p++,
              e &&
                (m.push(e.fileName),
                u.push(n),
                Te(`❌ "${e.fileName}" — ${e.error}`, "error")));
        }),
        l.singlePromptMode)
      ) {
        const e = W.filter((e) => e).length,
          t = z[0] || "";
        for (; z.length < e; ) z.push(t);
      }
      (ea(),
        le("mapper_action", {
          action: "auto_1to1",
          prompts: z.length,
          images: c,
        }));
      const g =
        r.length > z.length ? ` (${r.length - z.length} extras ignored)` : "";
      if (0 === p)
        Te(`🔗 Auto 1:1 — ${c} images mapped successfully${g}`, "success");
      else {
        Te(`🔗 Auto 1:1 — ${c} images mapped${g}`, c > 0 ? "success" : "warn");
        const e = u.map((e) => `#${e + 1}`).join(", ");
        (Te(
          `⚠️ ${p} image${p > 1 ? "s" : ""} rejected — prompt${p > 1 ? "s" : ""} ${e} ${p > 1 ? "have" : "has"} no reference. Fix below ↓`,
          "warn",
        ),
          ha());
      }
      r.length < z.length &&
        Te(
          `ℹ️ Prompts #${r.length + 1}–#${z.length} have no image — only ${r.length} files for ${z.length} prompts`,
          "info",
        );
    };
  (e.addEventListener("change", n), e.click());
}
function ua() {
  if (l.singlePromptMode)
    return void Te(
      '⚠️ "Same for All" doesn\'t apply in single-prompt mode. Use Auto 1:1 to add multiple start frames.',
      "warn",
    );
  const e = ue(),
    t = "start_frame" === e || "start_end_frame" === e,
    a = r(t ? "#mapper-file-input" : "#mapper-bulk-file-input");
  a.value = "";
  const n = async (e) => {
    a.removeEventListener("change", n);
    const r = Array.from(e.target.files).filter((e) =>
      e.type.startsWith("image/"),
    );
    if (0 === r.length) return;
    t &&
      r.length > 1 &&
      Te(
        "ℹ️ One start frame per prompt — using first image (end frames must be set manually)",
        "info",
      );
    const o = t ? [r[0]] : r,
      s = o.length;
    if (!(await St("upload images"))) return;
    ba(`Uploading ${s} image${s > 1 ? "s" : ""}...`);
    const i = await we(o, {
      maxConcurrent: 10,
      delayBetweenMs: 100,
      onProgress: (e, t, a, n) => {
        t > 1 && va(`Uploading ${t} images... (${e}/${t})`);
      },
    });
    ya();
    const l = [];
    let d = 0;
    const c = [];
    if (
      (i.forEach((e) => {
        e && e.success
          ? l.push(e.entry.mediaId)
          : (d++,
            e &&
              (c.push(e.fileName),
              Te(`❌ "${e.fileName}" — ${e.error}`, "error")));
      }),
      0 !== l.length)
    ) {
      for (let e = 0; e < z.length; e++)
        if (t) W[e] = l[0];
        else {
          Q[e] || (Q[e] = []);
          for (const t of l) Q[e].includes(t) || Q[e].push(t);
        }
      (ea(),
        le("mapper_action", {
          action: "same_for_all",
          prompts: z.length,
          images: l.length,
        }),
        0 === d
          ? Te(
              `📋 Same for All — applied ${l.length} image${l.length > 1 ? "s" : ""} to all ${z.length} prompts`,
              "success",
            )
          : (Te(
              `📋 Same for All — applied ${l.length} image${l.length > 1 ? "s" : ""} to all ${z.length} prompts`,
              "success",
            ),
            Te(
              `⚠️ ${d} image${d > 1 ? "s" : ""} rejected: ${c.map((e) => `"${e}"`).join(", ")}. Try re-saving as JPG/PNG.`,
              "warn",
            )));
    } else Te("❌ All uploads failed — no references applied", "error");
  };
  (a.addEventListener("change", n), a.click());
}
function ga() {
  const e = ue(),
    t = "start_frame" === e || "start_end_frame" === e;
  if (0 === gt().length)
    return void Te(
      "⚠️ No tagged images in library — tag images in the Library tab first",
      "warn",
    );
  let a = 0,
    n = new Set();
  const r = /@([a-z0-9_-]+)/gi;
  for (let e = 0; e < z.length; e++) {
    const o = [...z[e].matchAll(r)];
    if (0 !== o.length)
      for (const r of o) {
        const o = r[1].toLowerCase(),
          s = ft(o);
        s
          ? t
            ? ((W[e] = s.mediaId), a++)
            : (Q[e] || (Q[e] = []),
              Q[e].includes(s.mediaId) || (Q[e].push(s.mediaId), a++))
          : n.add(o);
      }
  }
  if (
    (ea(),
    le("mapper_action", { action: "auto_tag", prompts: z.length, matches: a }),
    0 === a && 0 === n.size)
  )
    Te(
      "⚠️ No @tags found in prompts — use @tagname in your prompt text",
      "warn",
    );
  else if (0 === a && n.size > 0)
    Te(`⚠️ No library images tagged with @${[...n].join(", @")}`, "warn");
  else {
    a > 0 && (B = !0);
    let e = `🏷 Auto-Tag — ${a} match${1 !== a ? "es" : ""} mapped`;
    (n.size > 0 && (e += ` (no match for @${[...n].join(", @")})`),
      Te(e, "success"));
  }
}
function fa() {
  ("start_frame" === ue() ? (W = z.map(() => null)) : (Q = z.map(() => [])),
    ea(),
    Te("🗑 All mappings cleared", "info"),
    le("mapper_action", { action: "clear", prompts: z.length }));
}
function ha() {
  const e = ue();
  let t = -1;
  for (let a = 0; a < z.length; a++)
    if ("start_frame" === e) {
      if (!W[a]) {
        t = a;
        break;
      }
    } else if ("start_end_frame" === e) {
      if (!W[a] || !V[a]) {
        t = a;
        break;
      }
    } else if (!Q[a] || 0 === Q[a].length) {
      t = a;
      break;
    }
  -1 !== t &&
    setTimeout(() => {
      const e = document.querySelector(`[data-mapper-row="${t}"]`);
      e &&
        (e.scrollIntoView({ behavior: "smooth", block: "center" }),
        e.classList.add("mapper-row-highlight"),
        setTimeout(() => e.classList.remove("mapper-row-highlight"), 2e3));
    }, 150);
}
function ba(e) {
  const t = r("#mapper-upload-progress"),
    a = r("#mapper-upload-progress-text");
  (t && (t.style.display = "flex"), a && (a.textContent = e), wa(!0));
}
function va(e) {
  const t = r("#mapper-upload-progress-text");
  t && (t.textContent = e);
}
function ya() {
  const e = r("#mapper-upload-progress");
  (e && (e.style.display = "none"), wa(!1));
}
function wa(e) {
  [
    "#btn-mapper-1to1",
    "#btn-mapper-all",
    "#btn-mapper-autotag",
    "#btn-mapper-clear",
    "#btn-mapper-save",
  ].forEach((t) => {
    const a = r(t);
    a && (a.disabled = e);
  });
}
function Ia() {
  const e = r("#prompt-input"),
    t = r("#prompt-lock-overlay"),
    a = r("#prompt-footer-normal"),
    n = r("#prompt-footer-locked"),
    o = r("#img-reference-section"),
    s = r("#btn-open-mapper-video"),
    i = r("#btn-open-mapper-vidref");
  if ("mapped" === l.referenceMode) {
    if (
      ((e.readOnly = !0),
      e.classList.add("locked"),
      t && (t.style.display = "flex"),
      a && (a.style.display = "none"),
      n)
    ) {
      n.style.display = "flex";
      const t = r("#prompt-count-locked");
      if (t)
        if (l.singlePromptMode) {
          const e = Object.keys(l.promptStartFrameMap || {}).filter(
            (e) => l.promptStartFrameMap[e],
          ).length;
          t.textContent = 1 === e ? "1 frame" : `${e} frames`;
        } else {
          const a = e.value.split("\n").filter((e) => e.trim().length > 0);
          t.textContent = 1 === a.length ? "1 prompt" : `${a.length} prompts`;
        }
    }
    (o && (o.style.display = "none"),
      s && (s.style.display = "none"),
      i && (i.style.display = "none"));
    const d = r("#btn-open-mapper");
    d && (d.style.display = "none");
    const c = r("#btn-import-txt");
    c && (c.disabled = !0);
  } else {
    ((e.readOnly = !1),
      e.classList.remove("locked"),
      t && (t.style.display = "none"),
      a && (a.style.display = "flex"),
      n && (n.style.display = "none"),
      o && (o.style.display = "block"));
    const s = r("#btn-import-txt");
    (s && (s.disabled = !1), Ea());
  }
}
function Ea() {
  const e = r("#btn-open-mapper"),
    t = r("#btn-open-mapper-video"),
    a = r("#btn-open-mapper-vidref");
  if (!e || !t || !a) return;
  if ("mapped" === l.referenceMode)
    return (
      (e.style.display = "none"),
      (t.style.display = "none"),
      void (a.style.display = "none")
    );
  const n = l.mode,
    o = l.settings.videoMode || "text";
  ((e.style.display = "none"),
    (t.style.display = "none"),
    (a.style.display = "none"),
    "image" !== n
      ? "text" !== o &&
        ("start_frame" !== o && "start_end_frame" !== o
          ? "reference" !== o || (a.style.display = "inline-flex")
          : (t.style.display = "inline-flex"))
      : (e.style.display = "inline-flex"));
}
function ka() {
  const e = r("#mapping-preview-section"),
    t = r("#mapping-preview-list");
  if (!e || !t) return;
  if ("mapped" !== l.referenceMode) return void (e.style.display = "none");
  const a = r("#prompt-input")
    .value.split("\n")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  if (0 === a.length) return void (e.style.display = "none");
  const n = ue(),
    o = "start_frame" === n,
    s = "start_end_frame" === n;
  if (l.singlePromptMode && o) {
    const a = Object.keys(l.promptStartFrameMap)
      .map(Number)
      .sort((e, t) => e - t)
      .map((e) => l.promptStartFrameMap[e])
      .filter(Boolean);
    if (0 === a.length) return void (e.style.display = "none");
    e.style.display = "block";
    const n = e.querySelector(".mapping-preview-title");
    return (
      n && (n.textContent = "📎 Start Frames"),
      void (t.innerHTML = `\n        <div class="mapping-preview-row mapping-preview-row-compact">\n            <span class="mapping-preview-icon">🖼️</span>\n            <span class="mapping-preview-count">${a.length} start frame${a.length > 1 ? "s" : ""} assigned</span>\n        </div>\n    `)
    );
  }
  e.style.display = "block";
  const i = e.querySelector(".mapping-preview-title");
  (i &&
    (i.textContent = o
      ? "📎 Start Frame Mapping"
      : s
        ? "📎 Start + End Frame Mapping"
        : "📎 Reference Mapping"),
    (t.innerHTML = a
      .map((e, t) => {
        const a = e.length > 40 ? e.substring(0, 37) + "..." : e;
        if (o) {
          const e = l.promptStartFrameMap[t],
            n = e ? ve(e) : null;
          return `\n                <div class="mapping-preview-row">\n                    <span class="mapping-preview-num">${t + 1}.</span>\n                    ${n ? `<img class="mapping-preview-thumb" src="${n}" alt="frame">` : e ? '<span class="mapping-preview-icon">🖼</span>' : '<span class="mapping-preview-shared">(no frame)</span>'}\n                    <span class="mapping-preview-prompt">${se(a)}</span>\n                </div>\n            `;
        }
        if (s) {
          const e = l.promptStartFrameMap[t],
            n = l.promptEndFrameMap[t],
            r = e ? ve(e) : null,
            o = n ? ve(n) : null;
          return `\n                <div class="mapping-preview-row">\n                    <span class="mapping-preview-num">${t + 1}.</span>\n                    ${r ? `<img class="mapping-preview-thumb" src="${r}" alt="start">` : e ? '<span class="mapping-preview-icon">🖼</span>' : '<span class="mapping-preview-shared">(no start)</span>'}\n                    <span class="mapping-preview-arrow">→</span>\n                    ${o ? `<img class="mapping-preview-thumb" src="${o}" alt="end">` : n ? '<span class="mapping-preview-icon">🖼</span>' : '<span class="mapping-preview-shared">(no end)</span>'}\n                    <span class="mapping-preview-prompt">${se(a)}</span>\n                </div>\n            `;
        }
        {
          const e = l.promptReferenceMap[t] || [];
          return `\n                <div class="mapping-preview-row">\n                    <span class="mapping-preview-num">${t + 1}.</span>\n                    ${e
            .map((e) => {
              const t = ve(e);
              return t
                ? `<img class="mapping-preview-thumb" src="${t}" alt="ref">`
                : '<span class="mapping-preview-icon">🖼</span>';
            })
            .join(
              "",
            )}${0 === e.length ? '<span class="mapping-preview-shared">(no reference)</span>' : ""}\n                    <span class="mapping-preview-prompt">${se(a)}</span>\n                </div>\n            `;
        }
      })
      .join("")));
}
function Ma(e, t) {
  if ("video" === t) return "portrait" === e ? "ratio-9-16" : "ratio-16-9";
  switch (e) {
    case "IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE":
      return "ratio-4-3";
    case "IMAGE_ASPECT_RATIO_SQUARE":
      return "ratio-1-1";
    case "IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR":
      return "ratio-3-4";
    case "IMAGE_ASPECT_RATIO_PORTRAIT":
      return "ratio-9-16";
    default:
      return "ratio-16-9";
  }
}
function $a() {
  if (l.activeBatchId) return !0;
  if (l.batches.some((e) => "running" === e.status)) return !0;
  const e = l.stats || {};
  if (e.total > 0 && e.downloaded + e.failed < e.total) return !0;
  for (const [e, t] of u)
    if ("generating" === t.status || "downloading" === t.status) return !0;
  return !1;
}
