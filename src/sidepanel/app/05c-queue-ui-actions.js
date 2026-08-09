// TurboFlow shard: Queue stats, queue rendering, row actions, batch action dispatcher, undo toast
// Loaded in numeric order; depends on earlier shards sharing globals.

function Ln() {
  const e = r("#queue-stats-bar");
  if (!e) return;
  if (0 === l.batches.length) return void (e.style.display = "none");
  e.style.display = "flex";
  const t = l.batches.filter((e) => "pending" === e.status).length,
    a = l.batches.filter((e) => "running" === e.status).length,
    n = l.batches.filter((e) => "done" === e.status).length,
    o = l.batches.filter(
      (e) => "failed" === e.status || "partial" === e.status,
    ).length;
  ((r("#qs-pending").textContent = `⏳ ${t} queued`),
    (r("#qs-running").textContent = `⚡ ${a} generating`),
    (r("#qs-done").textContent = `✅ ${n} complete`),
    (r("#qs-failed").textContent = `❌ ${o} failed`));
}
function tfQueueKeepsPrompt(e) {
  return "done" !== e?.status && "submitted" !== e?.status;
}
function tfBatchExpectedMediaCount(e) {
  return "video" === e?.settings?.mode
    ? e.settings?.videoCount || 1
    : e?.settings?.imageCount || 1;
}
function tfBatchPromptGalleryCount(e, t) {
  if (!e?.id) return 0;
  let a = 0;
  for (const [, n] of u)
    n.batchId === e.id &&
      n.originalIndex === t &&
      !n.isPlaceholder &&
      n.mediaId &&
      !String(n.mediaId).startsWith("placeholder-") &&
      "failed" !== n.status &&
      a++;
  return a;
}
function tfBatchPromptHasExpectedMedia(e, t) {
  const a = e?.prompts?.[t]?.localSavedCount || 0;
  return (
    Math.max(tfBatchPromptGalleryCount(e, t), a) >= tfBatchExpectedMediaCount(e)
  );
}
function tfQueuePromptIsMissingMedia(e, t, a) {
  return (
    ("done" === t?.status || "submitted" === t?.status) &&
    !tfBatchPromptHasExpectedMedia(e, a)
  );
}
function tfReconcileBatchGalleryStatus(e) {
  let t = !1;
  e?.prompts?.forEach((a, n) => {
    if (tfQueuePromptIsMissingMedia(e, a, n)) {
      ((a.status = "failed"),
        (a.lastError =
          a.lastError || "Generated media missing from Gallery"),
        (t = !0));
    }
  });
  return t;
}
function tfQueueKeepsBatchPrompt(e, t, a) {
  return tfQueueKeepsPrompt(t) || tfQueuePromptIsMissingMedia(e, t, a);
}
function tfQueuePromptEntries(e) {
  return (e?.prompts || [])
    .map((e, t) => ({ prompt: e, index: t }))
    .filter(({ prompt: t, index: a }) => tfQueueKeepsBatchPrompt(e, t, a));
}
function tfRepairQueueMarkup(value) {
  return globalThis.TFProjectDomain?.repairTextEncoding?.(value) || String(value || "");
}
function tfRemovePromptMapIndex(map, removedIndex) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return map;
  const next = {};
  Object.keys(map).forEach((key) => {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0) {
      next[key] = map[key];
    } else if (index < removedIndex) {
      next[index] = map[key];
    } else if (index > removedIndex) {
      next[index - 1] = map[key];
    }
  });
  return next;
}
function tfRemoveBatchPromptAt(batch, promptIndex) {
  batch.prompts.splice(promptIndex, 1);
  [
    "perPromptAssetIds",
    "perPromptIds",
    "perPromptReferences",
    "perPromptStartFrames",
    "perPromptEndFrames",
    "perPromptFileNames",
  ].forEach((field) => {
    if (batch.settings?.[field]) {
      batch.settings[field] = tfRemovePromptMapIndex(batch.settings[field], promptIndex);
    }
  });
}
function tfQueueBatchHasVisibleItems(e) {
  return tfQueuePromptEntries(e).length > 0;
}
function tfPromptFailureReason(e) {
  return String(e?.lastError || "")
    .replace(/\s+/g, " ")
    .trim();
}
function tfShortPromptFailure(e) {
  const t = tfPromptFailureReason(e);
  return t.length > 44 ? t.substring(0, 41) + "..." : t;
}
function tfQueueEmptyMarkup() {
  const e = l.batches.length
    ? "Queue is clear - generated media is in Gallery"
    : "No batches yet - add prompts and queue or start them";
  return `\n            <div class="empty-state">\n                <span class="material-symbols-outlined">inventory_2</span>\n                ${e}\n            </div>\n        `;
}
function xn(e, t) {
  const a = e.prompts[0]?.text || "",
    n = tfQueuePromptEntries(e);
  return (
    `\n        <div class="bp-row" style="background:rgba(168,199,250,0.04);border-bottom:1px solid rgba(168,199,250,0.1)">\n            <span class="bp-num">📝</span>\n            <span class="bp-text ${t ? "bp-editable" : ""}" data-bid="${e.id}" data-pi="0"\n                  title="${se(a)}"\n                  style="font-style:italic;color:#a8c7fa">${se(a)}</span>\n            <span class="bp-status" style="background:rgba(168,199,250,0.1);color:#a8c7fa">applies to all</span>\n        </div>\n    ` +
    n
      .map(({ prompt: t, index: a }) => {
        let n = "submitted" === t.status ? "bps-done" : `bps-${t.status}`;
        let r =
            {
              pending: "⏳ Waiting",
              running: "⚡ Generating",
              submitted: "✅ Generated",
              failed: "❌ Failed",
            }[t.status] || t.status;
        const i = tfPromptFailureReason(t),
          c = tfShortPromptFailure(t);
        "failed" === t.status && c && (r = `Failed: ${c}`);
        tfQueuePromptIsMissingMedia(e, t, a) &&
          ((n = "bps-failed"), (r = "Missing media"));
        let o = "";
        if (
          e.settings.perPromptThumbnails &&
          e.settings.perPromptStartFrames?.[a]
        ) {
          const t = e.settings.perPromptStartFrames[a],
            n = e.settings.perPromptThumbnails[t];
          n && (o = `<img class="bp-ref-thumb" src="${TFHtmlSafety.safeMediaUrl(n)}" alt="frame">`);
        }
        return `\n            <div class="bp-row" data-bid="${e.id}" data-pi="${a}">\n                <span class="bp-num">${a + 1}.</span>\n                ${o ? `<span class="bp-refs">${o}</span>` : ""}\n                <span class="bp-text" style="color:#9aa0a6">Frame ${a + 1}</span>\n                <span class="bp-status ${n}" title="${se(i)}">${se(r)}</span>\n                <div class="bp-actions">\n                    ${"failed" === t.status ? `\n                        <button class="bpa-btn" data-act="retry-prompt" data-bid="${e.id}" data-pi="${a}" title="Retry">\n                            <span class="material-symbols-outlined">refresh</span>\n                        </button>` : ""}\n                </div>\n            </div>\n        `;
      })
      .join("")
  );
}
function Sn() {
  const e = r("#batch-list");
  if (!e) return;
  l.batches.some((e) => tfReconcileBatchGalleryStatus(e)) && X();
  const t = (r("#batch-search")?.value || "").toLowerCase().trim(),
    a = [...l.batches].reverse().filter(tfQueueBatchHasVisibleItems);
  (Ln(),
    0 !== a.length
      ? ((e.innerHTML = tfRepairQueueMarkup(
          a
          .map((e) => {
            const a =
                !t ||
                e.name.toLowerCase().includes(t) ||
                e.folder.toLowerCase().includes(t) ||
                e.prompts.some((e) => e.text.toLowerCase().includes(t))
                  ? ""
                  : "bc-hidden",
              n = e.prompts.length,
              r = e.prompts.filter((t, a) =>
                tfBatchPromptHasExpectedMedia(e, a),
              ).length,
              o = e.prompts.filter((e) => "failed" === e.status).length,
              s = n > 0 ? Math.round(((r + o) / n) * 100) : 0,
              i = `bs-${e.status}`,
              l =
                {
                  pending: "QUEUED",
                  running: "GENERATING",
                  done: "COMPLETE",
                  failed: "FAILED",
                  partial: "INCOMPLETE",
                }[e.status] || e.status.toUpperCase(),
              d =
                "done" === e.status
                  ? "pf-done"
                  : "running" === e.status
                    ? "pf-running"
                    : "failed" === e.status || "partial" === e.status
                      ? "pf-failed"
                      : "",
              c = [];
            if ("image" === e.settings.mode) {
              const t = { GEM_PIX_2: "Banana Pro", NARWHAL: "Banana 2" };
              c.push(t[e.settings.imageModel] || e.settings.imageModel);
              const a = {
                IMAGE_ASPECT_RATIO_LANDSCAPE: "16:9",
                IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE: "4:3",
                IMAGE_ASPECT_RATIO_SQUARE: "1:1",
                IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR: "3:4",
                IMAGE_ASPECT_RATIO_PORTRAIT: "9:16",
              };
              (c.push(a[e.settings.imageRatio] || "16:9"),
                e.settings.imageCount > 1 &&
                  c.push(`x${e.settings.imageCount}`),
                e.settings.imageReferenceMediaIds?.length > 0 &&
                  c.push(`${e.settings.imageReferenceMediaIds.length} ref`));
            } else {
              c.push("Video");
              const t = {
                lite: "Veo 3.1 Lite",
                lite_lp: "Veo 3.1 Lite LP",
                fast: "Fast",
                relaxed: "Fast (LP)",
                quality: "Quality",
                omni_flash: "Omni Flash",
              };
              (c.push(t[e.settings.videoQuality] || e.settings.videoQuality),
                c.push("portrait" === e.settings.videoRatio ? "9:16" : "16:9"),
                c.push(`${e.settings.videoDuration || 8}s`),
                e.settings.videoCount > 1 &&
                  c.push(`x${e.settings.videoCount}`));
            }
            ("mapped" === e.settings.referenceMode && c.push("mapped refs"),
              "prompt" === e.settings.naming && c.push("prompt name"),
              "prefix" === e.settings.naming &&
                e.settings.namingPrefix &&
                c.push(`${e.settings.namingPrefix}-`));
            const p =
                e.prompts.length > 1 &&
                e.prompts.every((t) => t.text === e.prompts[0].text),
              m =
                !0 === e.settings.singlePromptBatch ||
                (p && "mapped" === e.settings.referenceMode);
            m && c.push(`1 prompt x ${e.prompts.length} videos`);
            const u = "running" === e.status ? In(e) : null,
              g = "pending" === e.status,
              f = "pending" === e.status,
              h = e.prompts.some(
                (prompt, promptIndex) =>
                  "failed" === prompt.status ||
                  tfQueuePromptIsMissingMedia(e, prompt, promptIndex),
              ),
              b =
                "running" !== e.status &&
                "pending" !== e.status &&
                e.prompts.some(
                  (e) => "pending" === e.status || "running" === e.status,
                ),
              v = ["running", "done", "partial", "failed"].includes(e.status),
              y = m
                ? xn(e, g)
                : tfQueuePromptEntries(e)
                    .map(({ prompt: t, index: a }) => {
                      let n =
                        "submitted" === t.status
                          ? "bps-done"
                          : `bps-${t.status}`;
                      let r =
                          {
                            pending: "Waiting",
                            running: "Generating",
                            submitted: "Generated",
                            failed: "Failed",
                          }[t.status] || t.status;
                      const i = tfPromptFailureReason(t),
                        c = tfShortPromptFailure(t),
                        o = g ? "bp-editable" : "";
                      "failed" === t.status && c && (r = `Failed: ${c}`);
                      const missingMedia = tfQueuePromptIsMissingMedia(e, t, a);
                      const retryable = "failed" === t.status || missingMedia;
                      missingMedia &&
                        ((n = "bps-failed"), (r = "Missing media"));
                      let s = "";
                      if ("mapped" === e.settings.referenceMode)
                        if ("start_end_frame" === e.settings.videoMode) {
                          const t = e.settings.perPromptStartFrames?.[a],
                            n = e.settings.perPromptEndFrames?.[a],
                            r = t ? e.settings.perPromptThumbnails?.[t] : null,
                            o = n ? e.settings.perPromptThumbnails?.[n] : null;
                          s = `${r ? `<img class="bp-ref-thumb" src="${TFHtmlSafety.safeMediaUrl(r)}" alt="start">` : t ? '<span class="bp-ref-icon">🖼</span>' : ""}${o ? `<img class="bp-ref-thumb" src="${TFHtmlSafety.safeMediaUrl(o)}" alt="end">` : n ? '<span class="bp-ref-icon">🖼</span>' : ""}`;
                        } else if (e.settings.perPromptStartFrames?.[a]) {
                          const t = e.settings.perPromptStartFrames[a],
                            n = e.settings.perPromptThumbnails?.[t];
                          s = n
                            ? `<img class="bp-ref-thumb" src="${TFHtmlSafety.safeMediaUrl(n)}" alt="frame">`
                            : '<span class="bp-ref-icon">🖼</span>';
                        } else
                          e.settings.perPromptReferences?.[a] &&
                            (s = e.settings.perPromptReferences[a]
                              .map((t) => {
                                const a = e.settings.perPromptThumbnails?.[t];
                                return a
                                  ? `<img class="bp-ref-thumb" src="${TFHtmlSafety.safeMediaUrl(a)}" alt="ref">`
                                  : '<span class="bp-ref-icon">🖼</span>';
                              })
                              .join(""));
                      return `\n                <div class="bp-row" data-bid="${e.id}" data-pi="${a}">\n                    <span class="bp-num">${a + 1}.</span>\n                    ${s ? `<span class="bp-refs">${s}</span>` : ""}\n                    <span class="bp-text ${o}" data-bid="${e.id}" data-pi="${a}"\n                          title="${se(t.text)}">${se(t.text)}</span>\n                    <span class="bp-status ${n}" title="${se(i)}">${se(r)}</span>\n                    <div class="bp-actions">\n                        ${retryable ? `\n                            <button class="bpa-btn" data-act="retry-prompt" data-bid="${e.id}" data-pi="${a}" title="Retry now">\n                                <span class="material-symbols-outlined">refresh</span>\n                            </button>` : ""}\n                        ${"running" !== e.status ? `\n                            <button class="bpa-btn bpa-danger" data-act="delete-prompt" data-bid="${e.id}" data-pi="${a}" title="Remove">\n                                <span class="material-symbols-outlined">close</span>\n                            </button>` : ""}\n                    </div>\n                </div>\n            `;
                    })
                    .join("");
            return `\n            <div class="batch-card ${e.collapsed ? "" : "expanded"} bc-${e.status} ${a}" data-bid="${e.id}">\n                <div class="batch-hdr" data-bid="${e.id}">\n                    <span class="material-symbols-outlined batch-chevron">chevron_right</span>\n                    <div class="batch-hdr-info">\n                        <div class="batch-hdr-top">\n                            <span class="batch-name-edit" contenteditable="${g}" spellcheck="false"\n                                  data-bid="${e.id}">${se(e.name)}</span>\n                            <span class="batch-count">${r}/${n}</span>\n                            <span class="bs-badge ${i}">${l}</span>\n                            ${u ? `<span class="batch-eta">${u}</span>` : ""}\n                        </div>\n                        <div class="batch-hdr-meta">\n                            ${c.map((e) => `<span class="batch-tag">${e}</span>`).join("")}\n                            <span class="batch-tag">📁 ${se(e.folder)}</span>\n                        </div>\n                    </div>\n                    <div class="batch-hdr-actions">\n                        ${"running" === e.status ? `\n                            <button class="ba-btn ba-danger" data-act="stop-batch" data-bid="${e.id}" title="Stop">\n                                <span class="material-symbols-outlined">stop_circle</span>\n                            </button>` : ""}\n                        ${f ? `\n                            <button class="ba-btn" data-act="run-batch" data-bid="${e.id}" title="Run now">\n                                <span class="material-symbols-outlined">play_arrow</span>\n                            </button>` : ""}\n                        <button class="ba-btn" data-act="duplicate-batch" data-bid="${e.id}" title="Duplicate">\n                            <span class="material-symbols-outlined">content_copy</span>\n                        </button>\n                        <button class="ba-btn ba-danger" data-act="delete-batch" data-bid="${e.id}" title="Delete">\n                            <span class="material-symbols-outlined">delete</span>\n                        </button>\n                    </div>\n                </div>\n\n                ${v ? `\n                    <div class="batch-progress">\n                        <div class="batch-pbar">\n                            <div class="batch-pfill ${d}" style="width:${s}%"></div>\n                        </div>\n                    </div>` : ""}\n\n                <div class="batch-body">\n                    <div class="bp-list">${y}</div>\n                    <div class="batch-footer">\n                        <div style="display:flex;gap:2px">\n                            ${h ? `\n                                <button class="bf-btn bf-primary" data-act="retry-failed" data-bid="${e.id}">\n                                    <span class="material-symbols-outlined">refresh</span>\n                                    Retry Failed\n                                </button>` : ""}\n                            ${b ? `\n                                <button class="bf-btn bf-primary" data-act="sweep-stuck" data-bid="${e.id}" title="Some items are stuck — mark them as failed so you can retry">\n                                    <span class="material-symbols-outlined">cleaning_services</span>\n                                    Sweep Stuck\n                                </button>` : ""}\n                        </div>\n                        <div style="display:flex;gap:2px">\n                            <button class="bf-btn" data-act="duplicate-batch" data-bid="${e.id}">\n                                <span class="material-symbols-outlined">content_copy</span>\n                                Clone\n                            </button>\n                            <button class="bf-btn bf-danger" data-act="delete-batch" data-bid="${e.id}">\n                                <span class="material-symbols-outlined">delete</span>\n                                Delete\n                            </button>\n                        </div>\n                    </div>\n                </div>\n            </div>\n        `;
          })
          .join(""),
        )),
        _n())
      : (e.innerHTML = tfQueueEmptyMarkup()));
}
function _n() {
  (document.querySelectorAll(".batch-hdr").forEach((e) => {
    e.addEventListener("click", (t) => {
      if (
        t.target.closest(".batch-name-edit") ||
        t.target.closest(".batch-hdr-actions") ||
        t.target.closest("button")
      )
        return;
      const a = pn(e.dataset.bid);
      a && ((a.collapsed = !a.collapsed), Sn());
    });
  }),
    document
      .querySelectorAll('.batch-name-edit[contenteditable="true"]')
      .forEach((e) => {
        (e.addEventListener("click", (e) => e.stopPropagation()),
          e.addEventListener("blur", () => {
            const t = e.textContent.trim();
            t && yn(e.dataset.bid, t);
          }),
          e.addEventListener("keydown", (t) => {
            ("Enter" === t.key && (t.preventDefault(), e.blur()),
              "Escape" === t.key && e.blur());
          }));
      }),
    document.querySelectorAll(".bp-text.bp-editable").forEach((e) => {
      (e.addEventListener("dblclick", (t) => {
        (t.stopPropagation(),
          (e.contentEditable = "true"),
          e.classList.add("bp-editing"),
          e.focus());
        const a = document.createRange();
        a.selectNodeContents(e);
        const n = window.getSelection();
        (n.removeAllRanges(), n.addRange(a));
      }),
        e.addEventListener("blur", () => {
          ((e.contentEditable = "false"), e.classList.remove("bp-editing"));
          const t = pn(e.dataset.bid),
            a = parseInt(e.dataset.pi);
          if (t && t.prompts[a]) {
            const n = e.textContent.trim();
            if (n && n !== t.prompts[a].text) {
              const e =
                t.prompts.length > 1 &&
                t.prompts.every((e) => e.text === t.prompts[0].text);
              (!0 === t.settings.singlePromptBatch ||
              (e && "mapped" === t.settings.referenceMode)
                ? (t.prompts.forEach((e) => (e.text = n)),
                  Te(
                    `✏️ Single prompt updated for all ${t.prompts.length} videos in "${t.name}"`,
                    "info",
                  ))
                : ((t.prompts[a].text = n),
                  Te(`✏️ Prompt ${a + 1} updated in "${t.name}"`, "info")),
                X());
            }
          }
        }),
        e.addEventListener("keydown", (t) => {
          ("Enter" !== t.key || t.shiftKey || (t.preventDefault(), e.blur()),
            "Escape" === t.key && e.blur());
        }));
    }),
    document.querySelectorAll("[data-act]").forEach((e) => {
      e.addEventListener("click", (t) => {
        (t.stopPropagation(),
          Pn(
            e.dataset.act,
            e.dataset.bid,
            void 0 !== e.dataset.pi ? parseInt(e.dataset.pi) : null,
          ));
      });
    }));
}
async function Pn(e, t, a, n = {}) {
  const o = pn(t);
  if (o)
    switch (e) {
      case "stop-batch": {
        (chrome.runtime.sendMessage({ type: "STOP_BATCH" }),
          (p = !1),
          o.prompts.forEach((e) => {
            ("running" !== e.status && "pending" !== e.status) ||
              (e.status = "failed");
          }));
        const e = o.prompts.some(
          (e) => "done" === e.status || "submitted" === e.status,
        );
        (gn(t, e ? "partial" : "failed"),
          (l.activeBatchId = null),
          m && (clearInterval(m), (m = null)),
          (l.stats = { total: 0, downloaded: 0, failed: 0 }));
        for (const [e, t] of u)
          ("generating" !== t.status && "downloading" !== t.status) ||
            (t.status = "failed");
        ("function" == typeof Ba && Ba(),
          "function" == typeof ee && ee(),
          zn(!1),
          Oa(),
          De("Stopped", "badge badge-disconnected", 5e3),
          Te(`⏹ Batch "${o.name}" stopped`, "warn"));
        break;
      }
      case "run-batch": {
        n.keepChain || (p = !1);
        if (!(await tfEnsureJsonAnimationFramesForBatch(o, { keepChain: n.keepChain })))
          return void (n.keepChain && (p = !1));
        try {
          await globalThis.tfPrepareStudioImageBatch?.(o);
        } catch (error) {
          Te(`Studio run tracking could not start: ${error.message}`, "warn");
        }
        try {
          if (
            typeof globalThis.tfEnsureProjectReferencesForBatch === "function" &&
            !(await globalThis.tfEnsureProjectReferencesForBatch(o))
          ) {
            return void (n.keepChain && (p = !1));
          }
        } catch (error) {
          Gn({
            icon: "!",
            title: "Reference Upload Failed",
            message: se(error.message || "The prompt reference could not be uploaded."),
            hint: "Check that Flow is open, then retry the batch.",
          });
          Te(`Reference upload failed: ${error.message}`, "error");
          return void (n.keepChain && (p = !1));
        }
        if (!(await tfEnsureJackReferenceForBatch(o)))
          return void (n.keepChain && (p = !1));
        const e = o.settings;
        if ("video" === e.mode) {
          const t = e.videoMode,
            a =
              e.perPromptStartFrames &&
              Object.keys(e.perPromptStartFrames).length > 0,
            n =
              e.perPromptReferences &&
              Object.keys(e.perPromptReferences).length > 0,
            r = o.prompts.filter((e) => "pending" === e.status).length;
          if (
            !(
              ("start_frame" !== t && "start_end_frame" !== t) ||
              e.startFrameMediaId ||
              a
            )
          )
            return (
              Gn({
                icon: "🖼️",
                title: "Start Frame Required",
                message: `Batch "<strong>${se(o.name)}</strong>" uses Start Frame mode but no frames are attached.`,
                hint: "Duplicate this batch, then set up start frames before running.",
              }),
              void Te(
                `❌ Batch "${o.name}" has no start frames — blocked`,
                "error",
              )
            );
          if (
            ("start_frame" === t || "start_end_frame" === t) &&
            a &&
            !e.startFrameMediaId
          ) {
            const t = Object.keys(e.perPromptStartFrames).length;
            if (t < r)
              return (
                Gn({
                  icon: "⚠️",
                  title: "Some Prompts Missing Start Frames",
                  message: `Batch "<strong>${se(o.name)}</strong>" has ${t}/${r} prompts with start frames. Unmapped prompts will fail.`,
                  hint: "Duplicate this batch and fix the mapping before running.",
                }),
                void Te(
                  `⚠️ Batch "${o.name}" has incomplete start frame mapping — blocked`,
                  "error",
                )
              );
          }
          if ("start_end_frame" === t) {
            const t =
              e.perPromptEndFrames &&
              Object.keys(e.perPromptEndFrames).length > 0;
            if (!e.endFrameMediaId && !t)
              return (
                Gn({
                  icon: "🖼️",
                  title: "End Frame Required",
                  message: `Batch "<strong>${se(o.name)}</strong>" uses Start + End Frame mode but no end frame is attached.`,
                  hint: "Duplicate this batch and add an end frame before running.",
                }),
                void Te(
                  `❌ Batch "${o.name}" has no end frame — blocked`,
                  "error",
                )
              );
            if ("mapped" === e.referenceMode && !e.endFrameMediaId && t) {
              const t = Object.keys(e.perPromptEndFrames).length;
              if (t < r)
                return (
                  Gn({
                    icon: "⚠️",
                    title: "Some Prompts Missing End Frames",
                    message: `Batch "<strong>${se(o.name)}</strong>" has ${t}/${r} prompts with end frames. Unmapped prompts will fail.`,
                    hint: "Duplicate this batch and fix the mapping before running.",
                  }),
                  void Te(
                    `⚠️ Batch "${o.name}" has incomplete end frame mapping — blocked`,
                    "error",
                  )
                );
            }
          }
          if (
            !(
              "reference" !== t ||
              (e.referenceMediaIds && 0 !== e.referenceMediaIds.length) ||
              n
            )
          )
            return (
              Gn({
                icon: "🎨",
                title: "Reference Images Required",
                message: `Batch "<strong>${se(o.name)}</strong>" uses Reference mode but no images are attached.`,
                hint: "Duplicate this batch and add reference images before running.",
              }),
              void Te(
                `❌ Batch "${o.name}" has no references — blocked`,
                "error",
              )
            );
          if (
            "reference" === t &&
            n &&
            (!e.referenceMediaIds || 0 === e.referenceMediaIds.length)
          ) {
            const t = Object.keys(e.perPromptReferences).filter(
              (t) => e.perPromptReferences[t].length > 0,
            ).length;
            if (t < r)
              return (
                Gn({
                  icon: "⚠️",
                  title: "Some Prompts Missing References",
                  message: `Batch "<strong>${se(o.name)}</strong>" has ${t}/${r} prompts with references. Unmapped prompts will fail.`,
                  hint: "Duplicate this batch and fix the mapping before running.",
                }),
                void Te(
                  `⚠️ Batch "${o.name}" has incomplete reference mapping — blocked`,
                  "error",
                )
              );
          }
        }
        if (!1) {
          const e = i.promptsRemaining ?? 0,
            t = o.prompts.filter((e) => "pending" === e.status).length;
          if (e <= 0)
            return void Gn({
              icon: "⏳",
              title: "Google Limit Reached",
              message: `You've used all <strong>${i.promptsPerDay || 0}</strong> available prompts for today.`,
              hint: "Come back tomorrow for more available prompts, or <strong>reduce this batch size</strong> before running this batch.",
            });
          if (t > e)
            return void Gn({
              icon: "⚠️",
              title: "Not Enough Prompts",
              message: `Batch "<strong>${se(o.name)}</strong>" has <strong>${t}</strong> pending prompts but you only have <strong>${e}</strong> remaining today.`,
              hint: `Remove ${t - e} prompt${t - e > 1 ? "s" : ""} from this batch, or <strong>reduce this batch size</strong> before running this batch.`,
            });
        }
        (gn(t, "running"),
          (l.activeBatchId = t),
          (l.batchStartTime = Date.now()),
          zn(!0));
        const a = o.prompts
            .map((e, t) => ({
              text: e.text,
              status: e.status,
              originalIndex: t,
            }))
            .filter((e) => "pending" === e.status),
          s = a.map((e) => e.text),
          d = a.map((e) => e.originalIndex),
          c = o.settings;
        (qa(
          s,
          {
            mode: c.mode,
            imageCount: c.imageCount,
            videoCount: c.videoCount || 1,
            aspectRatio: c.imageRatio,
            videoRatio: c.videoRatio,
          },
          d,
          {
            batchId: t,
            batchName: o.name,
            projectName: o.projectName || o.settings?.projectName || o.name,
            projectFolder: o.projectFolder || o.settings?.projectFolder || o.folder,
            batchKind: o.batchKind || o.settings?.batchKind || o.settings?.mode,
          },
        ),
          chrome.runtime
            .sendMessage({
              type: "START_BATCH",
              batchId: t,
              prompts: s,
              promptIndexMap: d,
              settings: {
                mode: c.mode,
                folder: o.folder,
                imageModel: c.imageModel,
                aspectRatio: c.imageRatio,
                imageCount: c.imageCount,
                videoQuality: c.videoQuality,
                videoRatio: c.videoRatio,
                videoMode: c.videoMode,
                videoCount: c.videoCount || 1,
                videoDuration: c.videoDuration || 8,
                startFrameMediaId: c.startFrameMediaId,
                endFrameMediaId: c.endFrameMediaId,
                referenceMediaIds: c.referenceMediaIds,
                imageReferenceMediaIds: c.imageReferenceMediaIds || [],
                autoDownloadImages: !1,
                autoDownloadVideos: !1,
                imageDownloadQuality: l.settings.imageDownloadQuality || "2k",
                videoDownloadQuality:
                  l.settings.videoDownloadQuality || "standard",
                naming: c.naming || l.settings.naming || "numbered",
                namingPrefix: c.namingPrefix || l.settings.namingPrefix || "",
                namingSeparator:
                  void 0 !== c.namingSeparator
                    ? c.namingSeparator
                    : void 0 !== l.settings.namingSeparator
                      ? l.settings.namingSeparator
                      : "-",
                startNumber: c.startNumber || l.settings.startNumber || 1,
                perPromptReferences: c.perPromptReferences || null,
                perPromptStartFrames: c.perPromptStartFrames || null,
                perPromptEndFrames: c.perPromptEndFrames || null,
                perPromptFileNames: c.perPromptFileNames || null,
                projectName: o.projectName || c.projectName || o.name,
                projectFolder: o.projectFolder || c.projectFolder || o.folder,
                batchKind: o.batchKind || c.batchKind || c.mode,
                referenceMode: c.referenceMode || "shared",
                singlePromptBatch: !0 === c.singlePromptBatch,
                speedMode: l.speedMode || "fast",
                _autoChained: n.keepChain || !1,
              },
            })
            .then(() => {
              (Te(`🚀 Batch "${o.name}" started!`, "success"), Yn());
            })
            .catch((e) => {
              (Te(`❌ Failed: ${e.message}`, "error"),
                gn(t, "failed"),
                (l.activeBatchId = null),
                zn(!1));
            }));
        break;
      }
      case "delete-batch": {
        if ("running" === o.status)
          return void Te(
            "⚠️ Can't delete a running batch — stop it first",
            "warn",
          );
        const e = l.batches.indexOf(o),
          t = l.batches.splice(e, 1)[0];
        (d.push({ type: "delete-batch", batch: t, index: e }),
          An(`Batch "${t.name}" deleted`),
          X(),
          Sn(),
          Te(`🗑️ Batch "${t.name}" deleted`, "info"));
        break;
      }
      case "duplicate-batch":
        vn(t);
        break;
      case "retry-failed":
        (wn(t), l.activeBatchId || Pn("run-batch", t, null, { keepChain: p }));
        break;
      case "retry-prompt":
        if (null !== a && o.prompts[a]) {
          o.prompts[a].status = "pending";
          delete o.prompts[a].lastError;
          delete o.prompts[a].localSavedCount;
          delete o.prompts[a].localExpectedCount;
          delete o.prompts[a].localSavedKeys;
          if (["done", "partial", "failed"].includes(o.status)) {
            o.status = "pending";
            o.completedAt = null;
          }
          X();
          Sn();
          Te(`Prompt ${a + 1} in "${o.name}" queued for retry`, "info");
          if (!l.activeBatchId) await Pn("run-batch", t);
        }
        break;
      case "sweep-stuck": {
        let e = 0;
        o.prompts.forEach((t) => {
          ("running" !== t.status && "pending" !== t.status) ||
            ((t.status = "failed"), e++);
        });
        let a = 0;
        for (const [e, n] of u)
          n.batchId === t &&
            n.isPlaceholder &&
            "generating" === n.status &&
            ((n.status = "failed"), a++);
        if (0 === e && 0 === a) {
          Te(`✓ No stuck items in "${o.name}"`, "info");
          break;
        }
        const n = o.prompts.filter(
          (e) => "done" === e.status || "submitted" === e.status,
        ).length;
        (gn(t, n > 0 ? "partial" : "failed"),
          X(),
          Sn(),
          "function" == typeof Ba && Ba(),
          "function" == typeof ee && ee(),
          Te(
            `🔧 Swept ${e} stuck prompt${1 !== e ? "s" : ""} and ${a} stuck image${1 !== a ? "s" : ""} in "${o.name}" — click "Retry Failed" to redo them`,
            "success",
          ));
        break;
      }
      case "delete-prompt":
        null !== a &&
          (tfRemoveBatchPromptAt(o, a),
          0 === o.prompts.length
            ? Pn("delete-batch", t, null)
            : (X(), Sn(), Te(`🗑️ Prompt removed from "${o.name}"`, "info")));
    }
}
function An(e) {
  const t = r("#undo-toast"),
    a = r("#undo-toast-msg");
  t &&
    a &&
    ((a.textContent = e),
    (t.style.display = "flex"),
    c && clearTimeout(c),
    (c = setTimeout(() => {
      ((t.style.display = "none"), (d = []));
    }, 6e3)));
}
