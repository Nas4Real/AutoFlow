// TurboFlow shard: Gallery/global button listeners, preview download controls, queue global actions
// Loaded in numeric order; depends on earlier shards sharing globals.

// TurboFlow side panel shard: Queue/global controls, prompt composer, batch start/stop
// Loaded by src/sidepanel/index.html in numeric order.

(r("#btn-select-all").addEventListener("click", Wa),
  r("#btn-clear-gallery").addEventListener("click", async () => {
    const e = u.size;
    0 !== e &&
      (await an({
        icon: "🗑",
        title: "Clear Gallery?",
        message: `This will remove all ${e} items from the gallery. This cannot be undone.`,
        confirmText: "Clear All",
        confirmClass: "btn-flow-danger",
      })) &&
      (u.clear(),
      g.clear(),
      b.clear(),
      v.clear(),
      Ba(),
      ee(),
      Te("🗑 Gallery cleared", "info"));
  }),
  r("#btn-download-selected").addEventListener("click", (e) => {
    e.stopPropagation();
    const t = g,
      a = [...t].some((e) => {
        const t = u.get(e);
        return t && "video" !== t.type;
      }),
      n = [...t].some((e) => {
        const t = u.get(e);
        return t && "video" === t.type;
      }),
      o = r("#dl-image-options"),
      s = r("#dl-video-options");
    (o && (o.style.display = a ? "block" : "none"),
      s && (s.style.display = n ? "block" : "none"),
      en());
  }),
  document.querySelectorAll("[data-quality]").forEach((e) => {
    e.addEventListener("click", (t) => {
      (t.stopPropagation(), e.disabled || tn(e.dataset.quality));
    });
  }),
  document.addEventListener("click", (e) => {
    e.target.closest(".download-btn-wrapper") || Za();
  }),
  r("#btn-animate-selected")?.addEventListener("click", () => {
    const e = [...g].filter((e) => xa(u.get(e)));
    0 !== e.length ? _a(e) : Te("⚠️ No animatable images in selection", "warn");
  }),
  r("#btn-close-preview").addEventListener("click", rn),
  r("#preview-modal").addEventListener("click", (e) => {
    e.target === r("#preview-modal") && rn();
  }),
  r("#btn-preview-prev").addEventListener("click", (e) => {
    (e.stopPropagation(), L > 0 && (L--, on()));
  }),
  r("#btn-preview-next").addEventListener("click", (e) => {
    (e.stopPropagation(), L < $.length - 1 && (L++, on()));
  }),
  document.addEventListener("keydown", (e) => {
    "flex" === r("#preview-modal").style.display &&
      ("Escape" === e.key && rn(),
      "ArrowLeft" === e.key && L > 0 && (L--, on()),
      "ArrowRight" === e.key && L < $.length - 1 && (L++, on()));
  }),
  r("#btn-preview-download").addEventListener("click", (e) => {
    (e.stopPropagation(), x ? ln() : sn());
  }),
  document.querySelectorAll("[data-preview-quality]").forEach((e) => {
    e.addEventListener("click", async (t) => {
      if ((t.stopPropagation(), e.disabled)) return;
      const a = e.dataset.previewQuality,
        n = $[L];
      if (!n) return;
      ln();
      const o = r("#btn-preview-download"),
        s = o.innerHTML;
      ((o.disabled = !0), n.type);
      const i = "video-1080p" === a ? "Upscaling..." : "Saving...";
      o.innerHTML = `<div class="uploading-spinner" style="width:14px;height:14px;border-width:1.5px"></div> ${i}`;
      try {
        const e = r("#setting-folder").value.trim() || "turboflow";
        ("4k" === a
          ? await chrome.runtime.sendMessage({
              type: "DOWNLOAD_MULTIPLE",
              items: [
                {
                  mediaId: n.mediaId,
                  type: "image",
                  promptIndex: n.promptIndex,
                  fileName: n.fileName || null,
                },
              ],
              folder: e,
              quality: "4k",
            })
          : "2k" === a
            ? await chrome.runtime.sendMessage({
                type: "DOWNLOAD_SINGLE",
                mediaId: n.mediaId,
                mediaType: "image",
                promptIndex: n.promptIndex,
                folder: e,
                fileName: n.fileName || null,
              })
            : "video-4k" === a
              ? await chrome.runtime.sendMessage({
                  type: "DOWNLOAD_MULTIPLE",
                  items: [
                    {
                      mediaId: n.mediaId,
                      type: "video",
                      promptIndex: n.promptIndex,
                      workflowId: n.workflowId || null,
                      isPortrait: n.isPortrait || !1,
                      fileName: n.fileName || null,
                    },
                  ],
                  folder: e,
                  quality: "standard",
                  videoQuality: "4k",
                  videoAspectRatio: n.isPortrait ? "portrait" : "landscape",
                })
              : "video-1080p" === a
                ? await chrome.runtime.sendMessage({
                    type: "DOWNLOAD_MULTIPLE",
                    items: [
                      {
                        mediaId: n.mediaId,
                        type: "video",
                        promptIndex: n.promptIndex,
                        workflowId: n.workflowId || null,
                        isPortrait: n.isPortrait || !1,
                        fileName: n.fileName || null,
                      },
                    ],
                    folder: e,
                    quality: "standard",
                    videoQuality: "1080p",
                  })
                : "video-standard" === a
                  ? await chrome.runtime.sendMessage({
                      type: "DOWNLOAD_MULTIPLE",
                      items: [
                        {
                          mediaId: n.mediaId,
                          type: "video",
                          promptIndex: n.promptIndex,
                          workflowId: n.workflowId || null,
                          isPortrait: n.isPortrait || !1,
                          fileName: n.fileName || null,
                        },
                      ],
                      folder: e,
                      quality: "standard",
                      videoQuality: "standard",
                    })
                  : await chrome.runtime.sendMessage({
                      type: "DOWNLOAD_MULTIPLE",
                      items: [
                        {
                          mediaId: n.mediaId,
                          type: n.type || "image",
                          promptIndex: n.promptIndex,
                          fileName: n.fileName || null,
                        },
                      ],
                      folder: e,
                      quality: "standard",
                    }),
          (o.innerHTML =
            '<span class="material-symbols-outlined" style="font-size:16px">check</span> Saved'),
          setTimeout(() => {
            ((o.innerHTML = s), (o.disabled = !1));
          }, 2e3));
      } catch (e) {
        ((o.innerHTML = s), (o.disabled = !1));
      }
    });
  }),
  document.addEventListener("click", (e) => {
    e.target.closest("#preview-download-wrapper") || ln();
  }),
  r("#btn-preview-animate")?.addEventListener("click", () => {
    const e = $[L];
    e && xa(e) && (rn(), _a([e.mediaId]));
  }),
  r("#btn-undo")?.addEventListener("click", () => {
    if (0 === d.length) return;
    const e = d.pop();
    ("delete-batch" === e.type
      ? (l.batches.splice(e.index, 0, e.batch),
        X(),
        Sn(),
        Te(`↩️ Batch "${e.batch.name}" restored`, "success"))
      : "delete-all" === e.type &&
        ((l.batches = e.batches),
        X(),
        Sn(),
        Te(`↩️ All ${e.batches.length} batches restored`, "success")),
      (r("#undo-toast").style.display = "none"),
      c && clearTimeout(c));
  }),
  r("#btn-reset-all")?.addEventListener("click", kn),
  r("#btn-delete-all")?.addEventListener("click", () => {
    if (l.batches.find((e) => "running" === e.status))
      return void Te("⚠️ Stop the running batch first", "warn");
    if (0 === l.batches.length) return;
    d.push({ type: "delete-all", batches: [...l.batches] });
    const e = l.batches.length;
    ((l.batches = []),
      An(`${e} batches deleted`),
      X(),
      Sn(),
      Te(`🗑️ Deleted all ${e} batches`, "info"));
  }),
  r("#btn-export-batches")?.addEventListener("click", Mn),
  r("#btn-import-batches")?.addEventListener("click", () =>
    r("#import-file-input")?.click(),
  ),
  r("#btn-gallery-sync-folder")?.addEventListener("click", async () => {
    (await tfSyncJsonMediaFromDownloadHistory({ silent: !1, force: !0 }),
      Te("Select the downloaded media folder to load previews.", "info"),
      r("#json-frame-file-input")?.click());
  }),
  r("#btn-switch-account")?.addEventListener("click", tfOpenGoogleAccountChooser),
  r("#btn-relink-json-frames")?.addEventListener("click", async () => {
    (await tfSyncJsonMediaFromDownloadHistory({ silent: !1, force: !0 }),
      Te("Select the downloaded media folder to repair Gallery thumbnails.", "info"),
      r("#json-frame-file-input")?.click());
  }),
  r("#json-frame-file-input")?.addEventListener("change", async (e) => {
    const t = e.target.files,
      a = tfPendingAutoRunAfterRelink;
    try {
      await tfSyncJsonMediaFromFiles(t, {
        silent: !1,
      });
      const e = await tfRelinkJsonFramesFromFiles(
        t,
        a ? { batchId: a.batchId } : {},
      );
      a &&
        ((tfPendingAutoRunAfterRelink = null),
        e?.missing > 0
          ? Te(
              "Some start frames are still missing from that folder. Check that you selected the media folder for this video.",
              "warn",
            )
          : await Pn("run-batch", a.batchId, null, {
              keepChain: a.keepChain,
            }));
    } finally {
      e.target.value = "";
    }
  }),
  r("#import-file-input")?.addEventListener("change", (e) => {
    const t = e.target.files[0];
    if (!t) return;
    const a = new FileReader();
    ((a.onload = (e) => $n(e.target.result)),
      a.readAsText(t),
      (e.target.value = ""));
  }),
  r("#batch-search")?.addEventListener("input", () => {
    Sn();
  }),
  r("#btn-run-all")?.addEventListener("click", async () => {
    const e = l.batches.filter((e) => "pending" === e.status);
    if (0 === e.length) return void Te("No pending batches to run", "warn");
    if (!(await Oe())) return void Te("Not connected to Flow page!", "error");
    if (!1) {
      const t = i.promptsRemaining ?? 0,
        a = e.reduce(
          (e, t) => e + t.prompts.filter((e) => "pending" === e.status).length,
          0,
        );
      if (t <= 0)
        return void Gn({
          icon: "⏳",
          title: "Google Limit Reached",
          message: `You've used all <strong>${i.promptsPerDay || 0}</strong> available prompts for today.`,
          hint: "Come back tomorrow for more available prompts, or <strong>reduce this batch size</strong> before running this batch.",
        });
      if (a > t)
        return void Gn({
          icon: "⚠️",
          title: "Not Enough Prompts",
          message: `Your queued batches have <strong>${a}</strong> total prompts but you only have <strong>${t}</strong> remaining today.`,
          hint: "Remove some prompts or batches to fit within your limit, or <strong>reduce this batch size</strong> before running this batch.",
        });
    }
    const t = e[0];
    (Te(`▶️ Starting ${e.length} batches (auto-chain)...`, "success"),
      (p = !0),
      Pn("run-batch", t.id, null, { keepChain: !0 }));
  }));
