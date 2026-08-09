// TurboFlow shard: Mapper save flow, row rendering, and assignment UI
// Loaded in numeric order; depends on earlier shards sharing globals.

function Jt() {
  if (l.singlePromptMode) {
    if (!(z[0] || "").trim()) {
      const e = document.getElementById("mapper-shared-prompt-text");
      return (
        e &&
          (e.focus(),
          e.classList.add("mapper-shared-prompt-error"),
          setTimeout(() => {
            e.classList.remove("mapper-shared-prompt-error");
          }, 2e3)),
        void Gn({
          icon: "✍️",
          title: "Prompt Required",
          message:
            "You must write a prompt before saving. The prompt describes what motion or action you want for all your start frames.",
          hint: "Type a single prompt at the top of the mapper — it will apply to all your start frames.",
        })
      );
    }
  } else if (!z.some((e) => (e || "").trim().length > 0))
    return void Gn({
      icon: "✍️",
      title: "Prompts Required",
      message: "You must write at least one prompt before saving.",
      hint: "Click the edit icon next to each row to add prompts.",
    });
  const e = ue();
  let t = !1;
  "start_frame" === e
    ? ((l.promptStartFrameMap = {}),
      (l.promptEndFrameMap = {}),
      W.forEach((e, a) => {
        e && ((l.promptStartFrameMap[a] = e), (t = !0));
      }))
    : "start_end_frame" === e
      ? ((l.promptStartFrameMap = {}),
        (l.promptEndFrameMap = {}),
        W.forEach((e, a) => {
          e && ((l.promptStartFrameMap[a] = e), (t = !0));
        }),
        V.forEach((e, a) => {
          e && ((l.promptEndFrameMap[a] = e), (t = !0));
        }))
      : ((l.promptReferenceMap = {}),
        Q.forEach((e, a) => {
          e && e.length > 0 && ((l.promptReferenceMap[a] = [...e]), (t = !0));
        }));
  let a = z;
  (l.stripTagsOnSave &&
    (a = z.map((e) =>
      e
        .replace(/@[a-z0-9_-]+/gi, "")
        .replace(/\s+/g, " ")
        .replace(/\s+([,.!?;:])/g, "$1")
        .trim(),
    )),
    l.singlePromptMode
      ? (r("#prompt-input").value = a[0] || "")
      : (r("#prompt-input").value = a.join("\n")),
    Hn(),
    (l.referenceMode = t ? "mapped" : "shared"),
    J(),
    re(),
    Ia(),
    ka(),
    Ea(),
    t && (O = !0),
    Vt());
  let n = 0;
  (t &&
    (n =
      "start_frame" === e
        ? Object.keys(l.promptStartFrameMap).length
        : "start_end_frame" === e
          ? new Set([
              ...Object.keys(l.promptStartFrameMap),
              ...Object.keys(l.promptEndFrameMap),
            ]).size
          : Object.keys(l.promptReferenceMap).length),
    Te(`📎 Saved — ${n}/${z.length} prompts have images assigned`, "success"));
}
function Xt() {
  const e = !0 === l.singlePromptMode,
    t = r("#btn-mapper-all"),
    a = r("#btn-mapper-autotag"),
    n = r("#btn-mapper-clear"),
    o = r("#btn-mapper-1to1");
  (t && (t.style.display = e ? "none" : ""),
    a && (a.style.display = e ? "none" : ""),
    n && (n.style.display = e ? "none" : ""),
    o &&
      (e
        ? ((o.innerHTML =
            '<span class="material-symbols-outlined">upload_file</span> Upload Start Frames'),
          (o.title = "Upload images as start frames"))
        : ((o.innerHTML =
            '<span class="material-symbols-outlined">link</span> Auto 1:1'),
          (o.title = "Select images from PC → map 1:1 by order"))));
  const s = r("#btn-mapper-add-prompt");
  s && (s.style.display = e ? "none" : "");
  const i = document.querySelector(".mapper-add-prompt-row");
  i && (i.style.display = e ? "none" : "");
}
function Zt() {
  const e = document.getElementById("mapper-shared-prompt-text");
  e &&
    (e.addEventListener("blur", () => {
      const t = e.textContent.trim();
      t !== z[0] && z.fill(t);
    }),
    e.addEventListener("keydown", (t) => {
      ("Enter" !== t.key || t.shiftKey || (t.preventDefault(), e.blur()),
        "Escape" === t.key && ((e.textContent = z[0] || ""), e.blur()));
    }));
}
function ea() {
  const e = r("#mapper-prompt-list"),
    t = r("#mapper-prompt-count");
  if (!e) return;
  const a = ue(),
    n = "start_frame" === a,
    o = "start_end_frame" === a;
  let s = 0,
    i = [];
  for (let e = 0; e < z.length; e++)
    if (n) W[e] ? s++ : i.push(e);
    else if (o) {
      const t = !!W[e],
        a = !!V[e];
      t && a ? s++ : i.push(e);
    } else Q[e] && Q[e].length > 0 ? s++ : i.push(e);
  const d = i.length,
    c = d > 0 && s > 0;
  t.innerHTML = c
    ? `${z.length} prompts • ${s} mapped • <span class="mapper-unmapped-count">${d} unmapped</span>`
    : `${z.length} prompts • ${s} mapped`;
  const p = r("#mapper-jump-unmapped");
  if ((p && p.remove(), c)) {
    const e = r(".mapper-count-row");
    if (e) {
      const t = document.createElement("button");
      ((t.id = "mapper-jump-unmapped"),
        (t.className = "mapper-jump-btn"),
        (t.innerHTML = `<span class="material-symbols-outlined">keyboard_double_arrow_down</span> Jump to unmapped (${d})`),
        t.addEventListener("click", ha),
        e.appendChild(t));
    }
  }
  let m = "";
  l.singlePromptMode &&
    (m = `\n            <div class="mapper-shared-prompt-row">\n                <span class="mapper-shared-prompt-label">📝 Prompt:</span>\n                <span class="mapper-shared-prompt-text" id="mapper-shared-prompt-text"\n                      contenteditable="true" spellcheck="false"\n                      placeholder="Type a prompt that applies to all frames...">${se(z[0] || "")}</span>\n            </div>\n        `);
  const u = z
    .map((e, t) => {
      const a = String(t + 1).padStart(3, "0"),
        r = e.length > 60 ? e.substring(0, 57) + "..." : e;
      let i = !1;
      i = n ? !!W[t] : o ? !!W[t] && !!V[t] : Q[t] && Q[t].length > 0;
      const d = !i && s > 0 ? "mapper-row-unmapped" : "";
      let c = "";
      if (n) {
        const e = W[t];
        if (e) {
          const a = ve(e),
            n = ta(e);
          c = `\n                    <div class="mapper-prompt-refs" data-drop-start="${t}">\n                        <span class="mapper-ref-drag-handle" data-drag-start="${t}" title="Drag to swap with another prompt">\n                            <span class="material-symbols-outlined">drag_indicator</span>\n                        </span>\n                        <div class="mapper-ref-item">\n                            ${a ? `<img class="mapper-ref-thumb" src="${TFHtmlSafety.safeMediaUrl(a)}" alt="frame">` : '<div class="mapper-ref-thumb" style="display:flex;align-items:center;justify-content:center;font-size:14px">🖼</div>'}\n                            <span class="mapper-ref-label">${se(n)}</span>\n                        </div>\n                        <div class="mapper-frame-actions">\n                            <button class="mapper-frame-btn" data-mapper-change="${t}">Change</button>\n                            <button class="mapper-frame-btn remove" data-mapper-remove-frame="${t}">✕</button>\n                        </div>\n                    </div>\n                `;
        } else
          c = `\n                    <div class="mapper-prompt-refs mapper-refs-empty" data-drop-start="${t}">\n                        <span class="mapper-no-refs">\n                            ${s > 0 ? '<span class="material-symbols-outlined mapper-warning-icon">warning</span>' : ""}\n                            no start frame\n                        </span>\n                        <button class="mapper-add-btn" data-mapper-add="${t}">\n                            <span class="material-symbols-outlined">add</span>\n                            Set Frame\n                        </button>\n                    </div>\n                `;
      } else if (o) {
        const e = W[t],
          a = V[t];
        let n = "";
        if (e) {
          const a = ve(e),
            r = ta(e);
          n = `\n                    <div class="mapper-frame-row" data-drop-start="${t}">\n                        <span class="mapper-frame-label">Start:</span>\n                        <span class="mapper-ref-drag-handle" data-drag-start="${t}" title="Drag to swap with another prompt's start frame">\n                            <span class="material-symbols-outlined">drag_indicator</span>\n                        </span>\n                        <div class="mapper-ref-item">\n                            ${a ? `<img class="mapper-ref-thumb" src="${TFHtmlSafety.safeMediaUrl(a)}" alt="start">` : '<div class="mapper-ref-thumb" style="display:flex;align-items:center;justify-content:center;font-size:14px">🖼</div>'}\n                            <span class="mapper-ref-label">${se(r)}</span>\n                        </div>\n                        <div class="mapper-frame-actions">\n                            <button class="mapper-frame-btn" data-mapper-change-start="${t}">Change</button>\n                            <button class="mapper-frame-btn remove" data-mapper-remove-start="${t}">✕</button>\n                        </div>\n                    </div>\n                `;
        } else
          n = `\n                    <div class="mapper-frame-row mapper-frame-row-empty" data-drop-start="${t}">\n                        <span class="mapper-frame-label">Start:</span>\n                        <button class="mapper-add-btn" data-mapper-add-start="${t}">\n                            <span class="material-symbols-outlined">add</span>\n                            Set Start Frame\n                        </button>\n                    </div>\n                `;
        let r = "";
        if (a) {
          const e = ve(a),
            n = ta(a);
          r = `\n                    <div class="mapper-frame-row" data-drop-end="${t}">\n                        <span class="mapper-frame-label">End:</span>\n                        <span class="mapper-ref-drag-handle" data-drag-end="${t}" title="Drag to swap with another prompt's end frame">\n                            <span class="material-symbols-outlined">drag_indicator</span>\n                        </span>\n                        <div class="mapper-ref-item">\n                            ${e ? `<img class="mapper-ref-thumb" src="${TFHtmlSafety.safeMediaUrl(e)}" alt="end">` : '<div class="mapper-ref-thumb" style="display:flex;align-items:center;justify-content:center;font-size:14px">🖼</div>'}\n                            <span class="mapper-ref-label">${se(n)}</span>\n                        </div>\n                        <div class="mapper-frame-actions">\n                            <button class="mapper-frame-btn" data-mapper-change-end="${t}">Change</button>\n                            <button class="mapper-frame-btn remove" data-mapper-remove-end="${t}">✕</button>\n                        </div>\n                    </div>\n                `;
        } else
          r = `\n                    <div class="mapper-frame-row mapper-frame-row-empty" data-drop-end="${t}">\n                        <span class="mapper-frame-label">End:</span>\n                        <button class="mapper-add-btn" data-mapper-add-end="${t}">\n                            <span class="material-symbols-outlined">add</span>\n                            Set End Frame\n                        </button>\n                    </div>\n                `;
        c = `<div class="mapper-frames-stack">${n}${r}</div>`;
      } else {
        const e = Q[t] || [],
          a = e
            .map((e, a) => {
              const n = ve(e);
              return `\n                    <div class="mapper-ref-item">\n                        ${n ? `<img class="mapper-ref-thumb" src="${TFHtmlSafety.safeMediaUrl(n)}" alt="ref">` : '<div class="mapper-ref-thumb" style="display:flex;align-items:center;justify-content:center;font-size:14px">🖼</div>'}\n                        <span class="mapper-ref-label">${se(ta(e))}</span>\n                        <button class="mapper-ref-remove" data-mapper-remove-ref="${t}-${a}" title="Remove">✕</button>\n                    </div>\n                `;
            })
            .join(""),
          n =
            0 === e.length
              ? `<span class="mapper-no-refs">\n                    ${s > 0 ? '<span class="material-symbols-outlined mapper-warning-icon">warning</span>' : ""}\n                    no reference\n                  </span>`
              : "",
          r =
            e.length > 0
              ? `<span class="mapper-ref-drag-handle" data-drag-ref="${t}" title="Drag to swap with another prompt's references">\n                       <span class="material-symbols-outlined">drag_indicator</span>\n                   </span>`
              : "";
        c = `\n                <div class="mapper-prompt-refs ${0 === e.length ? "mapper-refs-empty" : ""}" data-drop-ref="${t}">\n                    ${r}\n                    ${a}\n                    ${n}\n                    <button class="mapper-add-btn" data-mapper-add="${t}">\n                        <span class="material-symbols-outlined">add</span>\n                    </button>\n                </div>\n            `;
      }
      return l.singlePromptMode
        ? `\n                <div class="mapper-prompt-row mapper-prompt-row-compact ${d}" data-mapper-row="${t}">\n                    <div class="mapper-prompt-header mapper-prompt-header-compact">\n                        <span class="mapper-prompt-num">Frame ${t + 1}</span>\n                        <div class="mapper-prompt-actions">\n                            <button class="mapper-prompt-action-btn danger" data-mapper-delete="${t}" title="Remove frame">\n                                <span class="material-symbols-outlined">delete</span>\n                            </button>\n                        </div>\n                    </div>\n                    ${c}\n                </div>\n            `
        : `\n            <div class="mapper-prompt-row ${d}" data-mapper-row="${t}">\n                <div class="mapper-prompt-header">\n                    <span class="mapper-prompt-num">#${a}</span>\n                    <span class="mapper-prompt-text" data-mapper-text="${t}"\n                          title="${se(e)}">${se(r)}</span>\n                    <div class="mapper-prompt-actions">\n                        <button class="mapper-prompt-action-btn" data-mapper-edit="${t}" title="Edit prompt">\n                            <span class="material-symbols-outlined">edit</span>\n                        </button>\n                        <button class="mapper-prompt-action-btn danger" data-mapper-delete="${t}" title="Delete prompt">\n                            <span class="material-symbols-outlined">delete</span>\n                        </button>\n                    </div>\n                </div>\n                ${c}\n            </div>\n        `;
    })
    .join("");
  let g = "";
  (l.singlePromptMode &&
    (g =
      '\n            <div class="mapper-single-banner">\n                <span class="material-symbols-outlined">link</span>\n                Single prompt mode — all start frames share the same prompt.\n            </div>\n        '),
    (e.innerHTML = g + m + u),
    aa(),
    Xt(),
    Zt());
}
function ta(e) {
  const t = K.find((t) => t.mediaId === e);
  if (t)
    return t.fileName.length > 6
      ? t.fileName.substring(0, 5) + "…"
      : t.fileName;
  const a = y.find((t) => t.mediaId === e);
  if (a) {
    const e = a.tag ? "@" + a.tag : a.fileName;
    return e.length > 6 ? e.substring(0, 5) + "…" : e;
  }
  return e.substring(0, 5) + "…";
}
function aa() {
  (document.querySelectorAll("[data-mapper-add]").forEach((e) => {
    e.addEventListener("click", (t) => {
      (t.stopPropagation(), sa(parseInt(e.dataset.mapperAdd), e));
    });
  }),
    document.querySelectorAll("[data-mapper-change]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(), sa(parseInt(e.dataset.mapperChange), e));
      });
    }),
    document.querySelectorAll("[data-mapper-remove-frame]").forEach((e) => {
      e.addEventListener("click", (t) => {
        t.stopPropagation();
        const a = parseInt(e.dataset.mapperRemoveFrame);
        ((W[a] = null), ea());
      });
    }),
    document.querySelectorAll("[data-mapper-remove-ref]").forEach((e) => {
      e.addEventListener("click", (t) => {
        t.stopPropagation();
        const a = e.dataset.mapperRemoveRef.split("-"),
          n = parseInt(a[0]),
          r = parseInt(a[1]);
        (Q[n] && Q[n].splice(r, 1), ea());
      });
    }),
    document.querySelectorAll("[data-mapper-edit]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(), na(parseInt(e.dataset.mapperEdit)));
      });
    }),
    document.querySelectorAll("[data-mapper-delete]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(), ra(parseInt(e.dataset.mapperDelete)));
      });
    }),
    document.querySelectorAll("[data-mapper-add-start]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(),
          sa(parseInt(e.dataset.mapperAddStart), e, "start"));
      });
    }),
    document.querySelectorAll("[data-mapper-change-start]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(),
          sa(parseInt(e.dataset.mapperChangeStart), e, "start"));
      });
    }),
    document.querySelectorAll("[data-mapper-remove-start]").forEach((e) => {
      e.addEventListener("click", (t) => {
        t.stopPropagation();
        const a = parseInt(e.dataset.mapperRemoveStart);
        ((W[a] = null), ea());
      });
    }),
    document.querySelectorAll("[data-mapper-add-end]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(), sa(parseInt(e.dataset.mapperAddEnd), e, "end"));
      });
    }),
    document.querySelectorAll("[data-mapper-change-end]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(),
          sa(parseInt(e.dataset.mapperChangeEnd), e, "end"));
      });
    }),
    document.querySelectorAll("[data-mapper-remove-end]").forEach((e) => {
      e.addEventListener("click", (t) => {
        t.stopPropagation();
        const a = parseInt(e.dataset.mapperRemoveEnd);
        ((V[a] = null), ea());
      });
    }));
  let e = null,
    t = null,
    a = null,
    n = 0;
  function r() {
    (a && (clearInterval(a), (a = null)), (n = 0));
  }
  function o(e) {
    const t = document.getElementById("mapper-prompt-list");
    if (!t) return;
    const o = t.getBoundingClientRect();
    let s = 0;
    if (e < o.top + 60) {
      const t = e - o.top,
        a = Math.max(0, 1 - t / 60);
      s = -Math.ceil(14 * a);
    } else if (e > o.bottom - 60) {
      const t = o.bottom - e,
        a = Math.max(0, 1 - t / 60);
      s = Math.ceil(14 * a);
    }
    0 !== s
      ? ((n = s),
        a ||
          (a = setInterval(() => {
            t.scrollTop += n;
          }, 16)))
      : r();
  }
  function s() {
    document.querySelectorAll(".mapper-drop-target-active").forEach((e) => {
      e.classList.remove("mapper-drop-target-active");
    });
  }
  function i(a, n, o) {
    const i =
      a.closest(".mapper-prompt-refs") || a.closest(".mapper-frame-row");
    i &&
      (a.addEventListener("mousedown", () => {
        (function () {
          if ($t) return !0;
          const e = document.getElementById("mapper-upload-progress");
          return (
            !(!e || "flex" !== e.style.display) ||
            !!document.querySelector(".mapper-prompt-text.editing") ||
            !!document.querySelector(".mapper-shared-prompt-text:focus")
          );
        })() || (i.draggable = !0);
      }),
      a.addEventListener("mouseup", () => {
        i.draggable = !1;
      }),
      i.addEventListener("dragstart", (a) => {
        i.draggable
          ? ((e = n),
            (t = o),
            (window._mapperIsDragging = !0),
            i.classList.add("mapper-is-dragging"),
            (a.dataTransfer.effectAllowed = "move"),
            a.dataTransfer.setData("text/plain", `${n}:${o}`))
          : a.preventDefault();
      }),
      i.addEventListener("dragend", () => {
        ((i.draggable = !1),
          i.classList.remove("mapper-is-dragging"),
          s(),
          r(),
          (e = null),
          (t = null),
          (window._mapperIsDragging = !1));
      }));
  }
  function l(a, n, i) {
    (a.addEventListener("dragover", (r) => {
      null !== e &&
        (o(r.clientY),
        e === n &&
          t !== i &&
          (r.preventDefault(),
          (r.dataTransfer.dropEffect = "move"),
          s(),
          a.classList.add("mapper-drop-target-active")));
    }),
      a.addEventListener("dragleave", (e) => {
        a.contains(e.relatedTarget) ||
          a.classList.remove("mapper-drop-target-active");
      }),
      a.addEventListener("drop", (a) => {
        (a.preventDefault(),
          r(),
          null !== e &&
            e === n &&
            t !== i &&
            (s(),
            "start" === n
              ? zt(t, i)
              : "end" === n
                ? Yt(t, i)
                : "ref" === n && Kt(t, i)));
      }));
  }
  (document.querySelectorAll("[data-drag-start]").forEach((e) => {
    i(e, "start", parseInt(e.dataset.dragStart));
  }),
    document.querySelectorAll("[data-drag-end]").forEach((e) => {
      i(e, "end", parseInt(e.dataset.dragEnd));
    }),
    document.querySelectorAll("[data-drag-ref]").forEach((e) => {
      i(e, "ref", parseInt(e.dataset.dragRef));
    }),
    document.querySelectorAll("[data-drop-start]").forEach((e) => {
      l(e, "start", parseInt(e.dataset.dropStart));
    }),
    document.querySelectorAll("[data-drop-end]").forEach((e) => {
      l(e, "end", parseInt(e.dataset.dropEnd));
    }),
    document.querySelectorAll("[data-drop-ref]").forEach((e) => {
      l(e, "ref", parseInt(e.dataset.dropRef));
    }));
  const d = document.getElementById("mapper-prompt-list");
  (d &&
    !d._dragScrollBound &&
    ((d._dragScrollBound = !0),
    d.addEventListener("dragover", (t) => {
      null !== e && (t.preventDefault(), o(t.clientY));
    }),
    d.addEventListener("dragleave", (e) => {
      d.contains(e.relatedTarget) || r();
    })),
    window._mapperDragWheelBound ||
      ((window._mapperDragWheelBound = !0),
      document.addEventListener(
        "wheel",
        (e) => {
          if (!window._mapperIsDragging) return;
          const t = document.getElementById("mapper-prompt-list");
          if (!t) return;
          const a = document.getElementById("reference-mapper-modal");
          a &&
            "none" !== a.style.display &&
            (e.preventDefault(), (t.scrollTop += e.deltaY));
        },
        { passive: !1 },
      )));
}
function na(e) {
  const t = document.querySelector(`[data-mapper-text="${e}"]`);
  if (!t) return;
  ((t.textContent = z[e]),
    (t.contentEditable = "true"),
    t.classList.add("editing"),
    t.focus());
  const a = document.createRange();
  a.selectNodeContents(t);
  const n = window.getSelection();
  (n.removeAllRanges(),
    n.addRange(a),
    t.addEventListener(
      "blur",
      () => {
        ((t.contentEditable = "false"), t.classList.remove("editing"));
        const a = t.textContent.trim();
        (a && a !== z[e] && (l.singlePromptMode ? z.fill(a) : (z[e] = a)),
          ea());
      },
      { once: !0 },
    ),
    t.addEventListener("keydown", (a) => {
      ("Enter" !== a.key || a.shiftKey || (a.preventDefault(), t.blur()),
        "Escape" === a.key && ((t.textContent = z[e]), t.blur()));
    }));
}
function ra(e) {
  if (z.length <= 1) return void Te("⚠️ Can't delete the last prompt", "warn");
  z.splice(e, 1);
  const t = ue();
  ("start_frame" === t
    ? W.splice(e, 1)
    : "start_end_frame" === t
      ? (W.splice(e, 1), V.splice(e, 1))
      : Q.splice(e, 1),
    ea());
}
function oa() {
  z.push("");
  const e = ue();
  ("start_frame" === e
    ? W.push(null)
    : "start_end_frame" === e
      ? (W.push(null), V.push(null))
      : Q.push([]),
    ea());
  const t = z.length - 1;
  setTimeout(() => na(t), 100);
}
function sa(e, t, a = null) {
  (la(), (Y = { promptIndex: e, slotType: a }));
  const n = ue();
  let r;
  r =
    "start" === a
      ? "Set Start Frame"
      : "end" === a
        ? "Set End Frame"
        : "start_frame" === n
          ? "Set Start Frame"
          : "Add Reference Image";
  const o = document.createElement("div");
  ((o.className = "mapper-choice-popup"),
    (o.id = "mapper-choice-popup-el"),
    (o.innerHTML =
      '\n        <button class="mapper-choice-option" id="mapper-choice-upload">\n            <span class="material-symbols-outlined">upload_file</span>\n            Upload from PC\n        </button>\n        <button class="mapper-choice-option" id="mapper-choice-library">\n            <span class="material-symbols-outlined">photo_library</span>\n            Pick from Library\n        </button>\n    '));
  const s =
    t.closest(".mapper-prompt-row") ||
    t.closest(".mapper-prompt-refs") ||
    t.closest(".mapper-frame-row");
  (s
    ? ((s.style.position = "relative"), s.appendChild(o))
    : ((t.parentElement.style.position = "relative"),
      t.parentElement.appendChild(o)),
    o.querySelector("#mapper-choice-upload").addEventListener("click", (t) => {
      (t.stopPropagation(), la(), da(e, a));
    }),
    o.querySelector("#mapper-choice-library").addEventListener("click", (t) => {
      (t.stopPropagation(), la(), ca(e, a));
    }),
    setTimeout(() => {
      document.addEventListener("click", ia);
    }, 50));
}
function ia(e) {
  const t = document.getElementById("mapper-choice-popup-el");
  t && !t.contains(e.target) && la();
}
function la() {
  Y = null;
  const e = document.getElementById("mapper-choice-popup-el");
  (e && e.remove(), document.removeEventListener("click", ia));
}
function da(e, t = null) {
  const a = r("#mapper-file-input");
  a.value = "";
  const n = async (r) => {
    a.removeEventListener("change", n);
    const o = r.target.files[0];
    if (o)
      if (o.type.startsWith("image/")) {
        if (await St("upload images")) {
          ba("Uploading 1 image...");
          try {
            const a = await _e(o);
            (pa(e, a.mediaId, t),
              ea(),
              Te(`📤 Uploaded "${o.name}" → prompt #${e + 1}`, "success"));
          } catch (e) {
            Te(`❌ Upload failed: ${e.message}`, "error");
          }
          ya();
        }
      } else Te("⚠️ Not an image file", "warn");
  };
  (a.addEventListener("change", n), a.click());
}
function ca(e, t = null) {
  const a = ue();
  let n;
  ((n =
    "start" === t || ("start_frame" === a && !t)
      ? "start_frame"
      : "end" === t
        ? "end_frame"
        : "image_reference"),
    Ct({
      mode: "single",
      role: n,
      maxSelect: 1,
      currentSelection: [],
      onDone: (a) => {
        a.length > 0 && (pa(e, a[0], t), ea());
      },
    }));
}
function pa(e, t, a = null) {
  const n = ue();
  "start_frame" === n
    ? (W[e] = t)
    : "start_end_frame" === n
      ? "end" === a
        ? (V[e] = t)
        : (W[e] = t)
      : (Q[e] || (Q[e] = []),
        Q[e].includes(t)
          ? Te("⚠️ Image already assigned to this prompt", "warn")
          : Q[e].push(t));
}
