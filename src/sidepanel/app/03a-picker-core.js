// TurboFlow shard: Image picker setup, uploads, reference selectors, mapper modal open/close
// Loaded in numeric order; depends on earlier shards sharing globals.

// TurboFlow side panel shard: Image picker and per-prompt mapper
// Loaded by src/sidepanel/index.html in numeric order.

const Mt = r("#library-grid");
Mt &&
  (Mt.addEventListener("dragover", (e) => {
    (e.preventDefault(), Mt.classList.add("drag-over"));
  }),
  Mt.addEventListener("dragleave", () => {
    Mt.classList.remove("drag-over");
  }),
  Mt.addEventListener("drop", async (e) => {
    (e.preventDefault(), Mt.classList.remove("drag-over"));
    const t = Array.from(e.dataTransfer.files).filter((e) =>
      e.type.startsWith("image/"),
    );
    t.length &&
      (await St("upload images")) &&
      (1 === t.length
        ? await yt(t[0])
        : (Te(`📤 Uploading ${t.length} images (10x parallel)...`, "info"),
          await wt(t)));
  }));
let $t = !1,
  Lt = 0,
  xt = 0;
async function St(e) {
  try {
    const t = await chrome.runtime.sendMessage({
        type: "GET_CONNECTION_STATE",
      }),
      a = t?.state;
    return (
      !(!a || "connected" !== a.status) ||
      (Te(
        `❌ Cannot ${e} — not connected. ${a?.lastError || "Open Google Flow with a Flow project first"}`,
        "error",
      ),
      Gn({
        icon: "🔌",
        title: "Not Connected to Flow",
        message: `You need an open Google Flow project to to ${e}.`,
        hint: '<strong>Step 1:</strong> Open <a href="https://labs.google/fx/tools/flow" target="_blank" style="color:#a8c7fa">labs.google/fx</a><br><strong>Step 2:</strong> Sign in with Google if Flow asks<br><strong>Step 3:</strong> Create or open a Flow project<br><strong>Step 4:</strong> Wait for the status badge to show "Connected"',
      }),
      !1)
    );
  } catch (t) {
    return (
      Te(`❌ Cannot ${e} — connection check failed`, "error"),
      Gn({
        icon: "🔌",
        title: "Connection Check Failed",
        message: "Could not verify connection to Google Flow.",
        hint: "Make sure you have a Flow project open and try again.",
      }),
      !1
    );
  }
}
function _t(e) {
  const t = r("#picker-upload-progress"),
    a = r("#picker-upload-progress-text");
  (t && (t.style.display = "flex"), a && (a.textContent = e), Tt(!0));
}
function Pt(e) {
  const t = r("#picker-upload-progress-text");
  t && (t.textContent = e);
}
function At() {
  const e = r("#picker-upload-progress");
  (e && (e.style.display = "none"), Tt(!1));
}
function Tt(e) {
  const t = r("#btn-picker-done"),
    a = r("#btn-picker-upload"),
    n = r("#btn-picker-upload-more");
  (r("#btn-close-picker"),
    t && (t.disabled = e),
    a && (a.disabled = e),
    n && (n.disabled = e));
}
function Ct(e) {
  ((w = e.mode || "multi"),
    (I = e.role || "image_reference"),
    (k = e.maxSelect || 10),
    (E = [...(e.currentSelection || [])]),
    (M = e.onDone || null),
    ($t = !1),
    (Lt = 0),
    (xt = 0),
    At(),
    (r("#picker-title").textContent =
      {
        start_frame: "Choose Start Frame",
        end_frame: "Choose End Frame",
        video_reference: "Choose Reference Images",
        image_reference: "Choose Reference Images",
      }[I] || "Select Image"),
    (r("#picker-modal").style.display = "flex"),
    Ft());
}
function Rt() {
  ((r("#picker-modal").style.display = "none"),
    (w = null),
    (I = null),
    (E = []),
    (M = null),
    ($t = !1),
    At());
}
function Ft() {
  const e = r("#picker-grid"),
    t = r("#picker-empty"),
    a = r("#picker-selected-count"),
    n = y.filter((e) => e.mediaId && !e.uploading);
  if (0 === n.length)
    return (
      (e.style.display = "none"),
      (t.style.display = "flex"),
      void (a.textContent = "0 selected")
    );
  ((e.style.display = "grid"),
    (t.style.display = "none"),
    (e.innerHTML = n
      .map((e) => {
        const t = E.includes(e.mediaId),
          a =
            e.fileName.length > 12
              ? e.fileName.substring(0, 9) + "..."
              : e.fileName;
        return `\n            <div class="picker-item ${t ? "selected" : ""}" data-picker-media="${se(e.mediaId)}">\n                <div class="picker-item-check">\n                    <span class="material-symbols-outlined">check</span>\n                </div>\n                <img class="picker-item-img" src="${TFHtmlSafety.safeMediaUrl(e.thumbnail)}" alt="${se(e.fileName)}" loading="lazy">\n                <div class="picker-item-name">${se(a)}</div>\n            </div>\n        `;
      })
      .join("")),
    Dt(),
    e.querySelectorAll(".picker-item").forEach((t) => {
      t.addEventListener("click", () => {
        if ($t) return;
        const a = t.dataset.pickerMedia;
        if ("single" === w) E = E.includes(a) ? [] : [a];
        else if (E.includes(a)) E = E.filter((e) => e !== a);
        else {
          if (E.length >= k)
            return void Te(`⚠️ Maximum ${k} images allowed`, "warn");
          E.push(a);
        }
        (e.querySelectorAll(".picker-item").forEach((e) => {
          const t = e.dataset.pickerMedia;
          e.classList.toggle("selected", E.includes(t));
        }),
          Dt());
      });
    }));
}
function Dt() {
  const e = r("#picker-selected-count"),
    t = E.length;
  e.textContent =
    "single" === w
      ? 0 === t
        ? "None selected"
        : "1 selected"
      : `${t}${k < 99 ? "/" + k : ""} selected`;
}
async function Nt(e) {
  const t = Array.from(e).filter((e) => e.type.startsWith("image/"));
  if (t.length) {
    if (await St("upload images")) {
      if (
        (($t = !0),
        (Lt = t.length),
        (xt = 0),
        _t(
          `Uploading ${t.length} image${t.length > 1 ? "s" : ""}... (0/${t.length})`,
        ),
        1 === t.length)
      ) {
        const e = await yt(t[0]);
        ((xt = 1), Pt(e ? "Upload complete" : "Upload failed"));
      } else
        await wt(t, (e, t, a, n) => {
          ((xt = e), Pt(`Uploading ${t} images... (${e}/${t})`));
        });
      (($t = !1), At(), Ft());
    }
  } else Te("⚠️ No image files selected", "warn");
}
function qt() {
  Ct({
    mode: "multi",
    role: "image_reference",
    maxSelect: 10,
    currentSelection: [...l.imageReferenceMediaIds],
    onDone: (e) => {
      ((l.imageReferenceMediaIds = e), jt(), J());
    },
  });
}
function Ot() {
  Ct({
    mode: "multi",
    role: "video_reference",
    maxSelect: 10,
    currentSelection: [...l.referenceMediaIds],
    onDone: (e) => {
      ((l.referenceMediaIds = e), Gt(), J());
    },
  });
}
function Ut() {
  Ct({
    mode: "single",
    role: "start_frame",
    maxSelect: 1,
    currentSelection: l.startFrameMediaId ? [l.startFrameMediaId] : [],
    onDone: (e) => {
      ((l.startFrameMediaId = e[0] || null), Ht(), J());
    },
  });
}
function Bt() {
  Ct({
    mode: "single",
    role: "end_frame",
    maxSelect: 1,
    currentSelection: l.endFrameMediaId ? [l.endFrameMediaId] : [],
    onDone: (e) => {
      ((l.endFrameMediaId = e[0] || null), Qt(), J());
    },
  });
}
function jt() {
  const e = r("#img-reference-list");
  e &&
    (0 !== l.imageReferenceMediaIds.length
      ? ((e.innerHTML = l.imageReferenceMediaIds
          .map((e, t) => {
            const a = pt(e),
              n = a?.thumbnail || "";
            return `\n            <div class="reference-item">\n                ${n ? `<img src="${TFHtmlSafety.safeMediaUrl(n)}" alt="Reference">` : '<span style="font-size:18px">🖼</span>'}\n                <span class="ref-info">${se(a?.fileName || e.substring(0, 12) + "...")}</span>\n                <button class="btn-remove" data-remove-imgref="${t}">✕</button>\n            </div>\n        `;
          })
          .join("")),
        e.querySelectorAll("[data-remove-imgref]").forEach((e) => {
          e.addEventListener("click", () => {
            const t = parseInt(e.dataset.removeImgref);
            (l.imageReferenceMediaIds.splice(t, 1), jt(), J());
          });
        }))
      : (e.innerHTML = ""));
}
function Gt() {
  const e = r("#reference-list");
  e &&
    (0 !== l.referenceMediaIds.length
      ? ((e.innerHTML = l.referenceMediaIds
          .map((e, t) => {
            const a = pt(e),
              n = a?.thumbnail || "";
            return `\n            <div class="reference-item">\n                ${n ? `<img src="${TFHtmlSafety.safeMediaUrl(n)}" alt="Reference">` : '<span style="font-size:18px">🖼</span>'}\n                <span class="ref-info">${se(a?.fileName || e.substring(0, 12) + "...")}</span>\n                <button class="btn-remove" data-remove-vidref="${t}">✕</button>\n            </div>\n        `;
          })
          .join("")),
        e.querySelectorAll("[data-remove-vidref]").forEach((e) => {
          e.addEventListener("click", () => {
            const t = parseInt(e.dataset.removeVidref);
            (l.referenceMediaIds.splice(t, 1), Gt(), J());
          });
        }))
      : (e.innerHTML = ""));
}
function Ht() {
  const e = r("#start-frame-preview");
  if (!e) return;
  if (!l.startFrameMediaId)
    return (
      (e.className = "upload-preview"),
      (e.innerHTML =
        '\n            <button class="btn-flow-secondary" id="btn-upload-start">\n                <span class="material-symbols-outlined">photo_library</span>\n                Choose Start Frame\n            </button>\n        '),
      void e.querySelector("#btn-upload-start")?.addEventListener("click", Ut)
    );
  const t = pt(l.startFrameMediaId),
    a = t?.thumbnail || "",
    n = t?.fileName || "Start Frame";
  ((e.className = "upload-preview has-image"),
    (e.innerHTML = `\n        ${a ? `<img src="${TFHtmlSafety.safeMediaUrl(a)}" alt="Start frame">` : ""}\n        <div class="upload-info">\n            <div class="filename">${se(n)}</div>\n            <div class="media-id">${l.startFrameMediaId.substring(0, 16)}...</div>\n        </div>\n        <button class="btn-remove" id="btn-change-start">Change</button>\n        <button class="btn-remove" id="btn-remove-start">✕</button>\n    `),
    e.querySelector("#btn-change-start")?.addEventListener("click", Ut),
    e.querySelector("#btn-remove-start")?.addEventListener("click", () => {
      ((l.startFrameMediaId = null), Ht(), J());
    }));
}
function Qt() {
  const e = r("#end-frame-preview");
  if (!e) return;
  if (!l.endFrameMediaId)
    return (
      (e.className = "upload-preview"),
      (e.innerHTML =
        '\n            <button class="btn-flow-secondary" id="btn-upload-end">\n                <span class="material-symbols-outlined">photo_library</span>\n                Choose End Frame\n            </button>\n        '),
      void e.querySelector("#btn-upload-end")?.addEventListener("click", Bt)
    );
  const t = pt(l.endFrameMediaId),
    a = t?.thumbnail || "",
    n = t?.fileName || "End Frame";
  ((e.className = "upload-preview has-image"),
    (e.innerHTML = `\n        ${a ? `<img src="${TFHtmlSafety.safeMediaUrl(a)}" alt="End frame">` : ""}\n        <div class="upload-info">\n            <div class="filename">${se(n)}</div>\n            <div class="media-id">${l.endFrameMediaId.substring(0, 16)}...</div>\n        </div>\n        <button class="btn-remove" id="btn-change-end">Change</button>\n        <button class="btn-remove" id="btn-remove-end">✕</button>\n    `),
    e.querySelector("#btn-change-end")?.addEventListener("click", Bt),
    e.querySelector("#btn-remove-end")?.addEventListener("click", () => {
      ((l.endFrameMediaId = null), Qt(), J());
    }));
}
function Wt() {
  const e = ue();
  if ("disabled" === e)
    return void Te(
      "⚠️ Video text mode doesn't support per-prompt mapping",
      "warn",
    );
  let t = r("#prompt-input")
    .value.split("\n")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  if (0 === t.length) {
    if (
      !(
        Object.keys(l.promptStartFrameMap || {}).length > 0 &&
        l.singlePromptMode
      )
    )
      return void Gn({
        icon: "✍️",
        title: "Prompts Required",
        message:
          'Write your prompts first <strong>(one per line)</strong>, then click "Different for Each" to assign images to each one.',
        hint: "Each line in the prompt box becomes one generation. The mapper lets you assign a unique reference image to each prompt.",
      });
    {
      const e = Object.keys(l.promptStartFrameMap).filter(
        (e) => l.promptStartFrameMap[e],
      ).length;
      t = Array(e).fill("");
    }
  }
  if (((H = !0), l.singlePromptMode)) {
    const e = Object.keys(l.promptStartFrameMap).filter(
        (e) => l.promptStartFrameMap[e],
      ).length,
      a = t[0] || "";
    z = Array(Math.max(e, 1)).fill(a);
  } else z = [...t];
  ("start_frame" === e
    ? ((W = z.map((e, t) => l.promptStartFrameMap[t] || null)),
      (V = []),
      (Q = []))
    : "start_end_frame" === e
      ? ((W = z.map((e, t) => l.promptStartFrameMap[t] || null)),
        (V = z.map((e, t) => l.promptEndFrameMap[t] || null)),
        (Q = []))
      : ((Q = z.map((e, t) =>
          l.promptReferenceMap[t] ? [...l.promptReferenceMap[t]] : [],
        )),
        (W = []),
        (V = [])),
    (r("#mapper-modal-title").textContent =
      "start_frame" === e
        ? "📎 Start Frame Assignments"
        : "start_end_frame" === e
          ? "📎 Start + End Frame Assignments"
          : "📎 Reference Assignments"),
    (r("#reference-mapper-modal").style.display = "flex"));
  const a = /@[a-z0-9_-]+/i,
    n = z.some((e) => a.test(e)),
    o = r("#mapper-strip-row"),
    s = r("#mapper-strip-tags");
  (o &&
    s &&
    ((o.style.display = n ? "block" : "none"),
    (s.checked = !0 === l.stripTagsOnSave)),
    ea());
}
function Vt() {
  ((H = !1),
    (Y = null),
    (r("#reference-mapper-modal").style.display = "none"),
    ya());
}
function zt(e, t) {
  if (e === t) return;
  const a = W[e];
  ((W[e] = W[t]),
    (W[t] = a),
    ea(),
    "function" == typeof le &&
      le("mapper_action", { action: "swap_frame", mode: "start_frame" }));
}
function Yt(e, t) {
  if (e === t) return;
  const a = V[e];
  ((V[e] = V[t]),
    (V[t] = a),
    ea(),
    "function" == typeof le &&
      le("mapper_action", { action: "swap_frame", mode: "end_frame" }));
}
function Kt(e, t) {
  if (e === t) return;
  const a = Q[e] || [];
  ((Q[e] = Q[t] || []),
    (Q[t] = a),
    ea(),
    "function" == typeof le &&
      le("mapper_action", { action: "swap_frame", mode: "reference" }));
}
