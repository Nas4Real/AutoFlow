// TurboFlow shard: Control tab event bindings, settings controls, start/stop handlers
// Loaded in numeric order; depends on earlier shards sharing globals.

(Tn.addEventListener("input", Hn),
  Tn.addEventListener("change", Hn),
  o(".tab").forEach((e) => {
    e.addEventListener("click", () => {
      (o(".tab").forEach((e) => e.classList.remove("active")),
        o(".tab-content").forEach((e) => e.classList.remove("active")),
        e.classList.add("active"),
        r(`#tab-${e.dataset.tab}`).classList.add("active"));
    });
  }),
  o("[data-mode]").forEach((e) => {
    e.addEventListener("click", () => {
      (o("[data-mode]").forEach((e) => e.classList.remove("active")),
        e.classList.add("active"),
        (l.mode = e.dataset.mode),
        "video" === e.dataset.mode && (G = !0),
        (r("#image-settings").style.display =
          "image" === l.mode ? "block" : "none"),
        (r("#video-settings").style.display =
          "video" === l.mode ? "block" : "none"),
        J(),
        Ea(),
        er());
    });
  }),
  o("[data-img-ratio]").forEach((e) => {
    e.addEventListener("click", () => {
      (o("[data-img-ratio]").forEach((e) => e.classList.remove("active")),
        e.classList.add("active"),
        (l.settings.imageRatio = e.dataset.imgRatio),
        J());
    });
  }),
  o("[data-img-count]").forEach((e) => {
    e.addEventListener("click", () => {
      (o("[data-img-count]").forEach((e) => e.classList.remove("active")),
        e.classList.add("active"),
        (l.settings.imageCount = parseInt(e.dataset.imgCount)),
        J());
    });
  }),
  r("#setting-image-model").addEventListener("change", (e) => {
    ((l.settings.imageModel = e.target.value),
      r("#setting-autodownload-images").checked &&
        ((r("#setting-image-quality").disabled = !1),
        (r("#setting-image-quality-row").style.opacity = "1")),
      Ue(),
      J());
  }),
  o("[data-vid-ratio]").forEach((e) => {
    e.addEventListener("click", () => {
      (o("[data-vid-ratio]").forEach((e) => e.classList.remove("active")),
        e.classList.add("active"),
        (l.settings.videoRatio = e.dataset.vidRatio),
        J());
    });
  }),
  r("#setting-video-quality").addEventListener("change", (e) => {
    if (
      ((l.settings.videoQuality = e.target.value), "relaxed" === e.target.value)
    ) {
      const t = !0,
        a = pe(F);
      if (!t || !a) {
        e.target.value = l.settings.videoQuality || "lite";
        let n = "Upgrade required";
        return (
          t
            ? a || (n = "Lower Priority mode requires Google AI Ultra plan")
            : (n =
                "Lower Priority mode requires a supported Google account tier"),
          Te("🔒 " + n, "warn"),
          void (l.settings.videoQuality = e.target.value)
        );
      }
    }
    if ("lite_lp" === e.target.value) {
      const t = !0,
        a = pe(F);
      if (!t || !a) {
        e.target.value = l.settings.videoQuality || "lite";
        let n = "Upgrade required";
        return (
          t
            ? a ||
              (n = "Lite Lower Priority mode requires Google AI Ultra plan")
            : (n =
                "Lite Lower Priority mode requires a supported Google account tier"),
          Te("🔒 " + n, "warn"),
          void (l.settings.videoQuality = e.target.value)
        );
      }
    }
    (J(), Qn());
  }),
  o("[data-vid-count]").forEach((e) => {
    e.addEventListener("click", () => {
      (o("[data-vid-count]").forEach((e) => e.classList.remove("active")),
        e.classList.add("active"),
        (l.settings.videoCount = parseInt(e.dataset.vidCount)),
        J());
    });
  }),
  o("[data-vid-duration]").forEach((e) => {
    e.addEventListener("click", () => {
      (o("[data-vid-duration]").forEach((e) => e.classList.remove("active")),
        e.classList.add("active"),
        (l.settings.videoDuration = parseInt(e.dataset.vidDuration)),
        J(),
        Qn(),
        cr());
    });
  }),
  o("[data-vid-mode]").forEach((e) => {
    e.addEventListener("click", () => {
      if (e.classList.contains("locked")) {
        const t = e.dataset.vidMode,
          a = l.settings.videoQuality,
          n = l.settings.videoDuration || 8;
        return void ("omni_flash" === a && "start_end_frame" === t
          ? Te(
              "🔒 Start + end frames are not available for the Omni Flash model yet",
              "warn",
            )
          : "reference" === t && "omni_flash" !== a && 8 !== n
            ? Te(
                "🔒 Reference mode is only available at 8 seconds for Veo models",
                "warn",
              )
            : "reference" === t &&
              "quality" === a &&
              Te(
                "🔒 Reference mode is not available for Veo 3.1 Quality — switch to Fast or Lite",
                "warn",
              ));
      }
      (o("[data-vid-mode]").forEach((e) => e.classList.remove("active")),
        e.classList.add("active"),
        (l.settings.videoMode = e.dataset.vidMode),
        Wn(),
        J(),
        Ea(),
        er());
    });
  }),
  r("#btn-upload-start")?.addEventListener("click", Ut),
  r("#btn-upload-end")?.addEventListener("click", Bt),
  r("#btn-add-img-reference").addEventListener("click", qt),
  r("#btn-add-reference").addEventListener("click", Ot),
  r("#btn-import-txt").addEventListener("click", () => Bn.click()),
  r("#btn-import-json")?.addEventListener("click", () =>
    r("#json-file-input")?.click(),
  ),
  r("#btn-import-json-locked")?.addEventListener("click", () =>
    r("#json-file-input")?.click(),
  ),
  Bn.addEventListener("change", (e) => {
    const t = e.target.files[0];
    if (!t) return;
    const a = new FileReader();
    ((a.onload = (e) => {
      ((Tn.value = e.target.result),
        Hn(),
        Te(`📄 Imported ${t.name}`, "success"));
    }),
      a.readAsText(t),
      (Bn.value = ""));
  }),
  r("#json-file-input")?.addEventListener("change", (e) => {
    const t = e.target.files[0];
    if (!t) return;
    const a = new FileReader();
    ((a.onload = async (e) => {
      try {
        if ("function" == typeof tfHandleGenerateJsonFile)
          await tfHandleGenerateJsonFile(e.target.result, t.name);
        else await tfImportPromptIndexJson(e.target.result, t.name);
      } catch (e) {
        Te(`JSON import failed: ${e.message}`, "error");
      }
    }),
      a.readAsText(t),
      (e.target.value = ""));
  }),
  r("#setting-autodownload-images").addEventListener("change", (e) => {
    ((l.settings.autoDownloadImages = e.target.checked),
      (r("#setting-image-quality-row").style.opacity = e.target.checked
        ? "1"
        : "0.4"),
      (r("#setting-image-quality").disabled = !e.target.checked),
      Ue(),
      J());
  }),
  r("#setting-image-quality").addEventListener("change", (e) => {
    const t = e.target.value;
    if ("4k" === t) {
      const t = !0,
        a = pe(F);
      if (!t || !a) {
        e.target.value = l.settings.imageDownloadQuality || "2k";
        let n = "Upgrade required";
        return (
          t
            ? a || (n = "4K requires Google AI Ultra plan")
            : (n = "4K requires a supported Google account tier"),
          void Te("🔒 " + n, "warn")
        );
      }
    }
    ((l.settings.imageDownloadQuality = t), J());
  }),
  r("#setting-autodownload-videos").addEventListener("change", (e) => {
    ((l.settings.autoDownloadVideos = e.target.checked),
      (r("#setting-video-quality-row").style.opacity = e.target.checked
        ? "1"
        : "0.4"),
      (r("#setting-video-quality-dl").disabled = !e.target.checked),
      Ue(),
      J());
  }),
  r("#setting-video-quality-dl").addEventListener("change", (e) => {
    const t = e.target.value;
    if ("4k" === t) {
      const t = !0,
        a = pe(F);
      if (!t || !a) {
        e.target.value = l.settings.videoDownloadQuality || "standard";
        let n = "Upgrade required";
        return (
          t
            ? a || (n = "4K video requires Google AI Ultra plan")
            : (n = "4K video requires a supported Google account tier"),
          void Te("🔒 " + n, "warn")
        );
      }
    }
    ((l.settings.videoDownloadQuality = t), J());
  }),
  r("#setting-folder").addEventListener("change", (e) => {
    ((l.settings.folder = e.target.value.trim() || "turboflow"), J());
  }),
  r("#setting-video-project-name")?.addEventListener("input", () => {
    tfSyncProjectFolder();
  }),
  r("#setting-naming").addEventListener("change", (e) => {
    l.settings.naming = e.target.value;
    const t = "prefix" === e.target.value;
    ((r("#setting-prefix-row").style.display = t ? "flex" : "none"),
      (r("#setting-separator-row").style.display = t ? "flex" : "none"),
      J());
  }),
  r("#setting-prefix").addEventListener("change", (e) => {
    ((l.settings.namingPrefix = e.target.value.trim()), J());
  }),
  r("#setting-separator").addEventListener("change", (e) => {
    ((l.settings.namingSeparator = e.target.value), J());
  }),
  r("#setting-start-number").addEventListener("change", (e) => {
    let t = parseInt(e.target.value);
    ((isNaN(t) || t < 1) && (t = 1),
      t > 1e5 && (t = 1e5),
      (e.target.value = t),
      (l.settings.startNumber = t),
      J());
  }),
  r("#btn-restart-tour")?.addEventListener("click", st),
  r("#btn-fix-unusual")?.addEventListener("click", () => {
    ((r("#fix-unusual-modal").style.display = "flex"),
      "function" == typeof le &&
        le("fix_unusual_modal_opened", { trigger: "button" }));
  }),
  r("#btn-close-fix-unusual")?.addEventListener("click", () => {
    r("#fix-unusual-modal").style.display = "none";
  }),
  r("#fix-unusual-modal")?.addEventListener("click", (e) => {
    e.target === r("#fix-unusual-modal") &&
      (r("#fix-unusual-modal").style.display = "none");
  }),
  r("#btn-open-clear-data")?.addEventListener("click", () => {
    (chrome.tabs.create({ url: "chrome://settings/clearBrowserData" }),
      (r("#fix-unusual-modal").style.display = "none"),
      "function" == typeof le && le("clear_data_page_opened", {}));
  }),
  r("#btn-add-queue-locked")?.addEventListener("click", () => {
    let e = r("#prompt-input")
      .value.split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    if (((e = jn(e)), e.length)) {
      if (!1) {
        const t = i.promptsRemaining ?? 0;
        if (t <= 0)
          return (
            (r("#limit-message").textContent =
              `You've used all ${i.promptsPerDay || 0} available prompts for today.`),
            void (r("#limit-modal").style.display = "flex")
          );
        if (e.length > t)
          return void Gn({
            icon: "⚠️",
            title: "Not Enough Prompts",
            message: `You entered <strong>${e.length}</strong> prompts but only have <strong>${t}</strong> remaining today.`,
            hint: `Remove ${e.length - t} prompt${e.length - t > 1 ? "s" : ""} to continue, or <strong>reduce this batch size</strong> before running this batch.`,
          });
      }
      if (
        l.singlePromptMode &&
        "mapped" === l.referenceMode &&
        e.length >= 1 &&
        0 ===
          Object.keys(l.promptStartFrameMap).filter(
            (e) => l.promptStartFrameMap[e],
          ).length
      )
        return void Gn({
          icon: "🖼️",
          title: "No Start Frames",
          message:
            "Single prompt mode needs at least one start frame. Open the mapper to add images.",
          hint: 'Click "Different for Each" below the prompt area to assign start frames.',
        });
      if ("video" === l.mode) {
        const e = l.settings.videoMode;
        if (
          !(
            ("start_frame" !== e && "start_end_frame" !== e) ||
            l.startFrameMediaId ||
            ("mapped" === l.referenceMode &&
              Object.keys(l.promptStartFrameMap).length > 0)
          )
        )
          return void Gn({
            icon: "🖼️",
            title: "Start Frame Required",
            message:
              "<strong>Start Frame</strong> mode requires an image for each video to start from, but none are attached.",
            hint: '<strong>Option 1:</strong> Click "Choose Start Frame" to pick one image for all prompts.<br><br><strong>Option 2:</strong> Click "Different for Each" to assign a unique start frame to each prompt.',
          });
        if (
          !(
            "start_end_frame" !== e ||
            l.endFrameMediaId ||
            ("mapped" === l.referenceMode &&
              Object.keys(l.promptEndFrameMap).length > 0)
          )
        )
          return void Gn({
            icon: "🖼️",
            title: "End Frame Required",
            message:
              "<strong>Start + End Frame</strong> mode requires an end frame image, but none is attached.",
            hint: '<strong>Option 1:</strong> Click "Choose End Frame" to pick one image for all prompts.<br><br><strong>Option 2:</strong> Click "Different for Each" to assign a unique end frame to each prompt.',
          });
        if (
          !(
            "reference" !== e ||
            (l.referenceMediaIds && 0 !== l.referenceMediaIds.length) ||
            ("mapped" === l.referenceMode &&
              Object.keys(l.promptReferenceMap).length > 0)
          )
        )
          return void Gn({
            icon: "🎨",
            title: "Reference Images Required",
            message:
              "<strong>Reference</strong> mode requires at least one reference image to guide the video style, but none are attached.",
            hint: '<strong>Option 1:</strong> Click "Add Shared Refs" to pick images for all prompts.<br><br><strong>Option 2:</strong> Click "Different for Each" to assign unique references per prompt.',
          });
      }
      (cn(e, { runNow: !1 }),
        "mapped" === l.referenceMode &&
          ((l.referenceMode = "shared"),
          (l.promptReferenceMap = {}),
          (l.promptStartFrameMap = {}),
          (l.promptEndFrameMap = {}),
          (K = []),
          J(),
          re(),
          Ia(),
          ka(),
          Ea()),
        (r("#prompt-input").value = ""),
        Hn(),
        o(".tab").forEach((e) => e.classList.remove("active")),
        o(".tab-content").forEach((e) => e.classList.remove("active")),
        r('[data-tab="queue"]').classList.add("active"),
        r("#tab-queue").classList.add("active"));
    } else Te("No prompts to queue", "warn");
  }),
  r("#btn-start-locked")?.addEventListener("click", () => {
    Fn.click();
  }),
  Rn.addEventListener("click", () => {
    let e = Tn.value
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    if (((e = jn(e)), e.length)) {
      if (!1) {
        const t = i.promptsRemaining ?? 0;
        if (t <= 0)
          return (
            (r("#limit-message").textContent =
              `You've used all ${i.promptsPerDay || 0} available prompts for today.`),
            void (r("#limit-modal").style.display = "flex")
          );
        if (e.length > t)
          return void Gn({
            icon: "⚠️",
            title: "Not Enough Prompts",
            message: `You entered <strong>${e.length}</strong> prompts but only have <strong>${t}</strong> remaining today.`,
            hint: `Remove ${e.length - t} prompt${e.length - t > 1 ? "s" : ""} to continue, or <strong>reduce this batch size</strong> before running this batch.`,
          });
      }
      if ("video" === l.mode) {
        const e = l.settings.videoMode;
        if (
          !(
            ("start_frame" !== e && "start_end_frame" !== e) ||
            l.startFrameMediaId ||
            ("mapped" === l.referenceMode &&
              Object.keys(l.promptStartFrameMap).length > 0)
          )
        )
          return void Gn({
            icon: "🖼️",
            title: "Start Frame Required",
            message:
              "<strong>Start Frame</strong> mode requires an image for each video to start from, but none are attached.",
            hint: '<strong>Option 1:</strong> Click "Choose Start Frame" to pick one image for all prompts.<br><br><strong>Option 2:</strong> Click "Different for Each" to assign a unique start frame to each prompt.',
          });
        if (
          !(
            "start_end_frame" !== e ||
            l.endFrameMediaId ||
            ("mapped" === l.referenceMode &&
              Object.keys(l.promptEndFrameMap).length > 0)
          )
        )
          return void Gn({
            icon: "🖼️",
            title: "End Frame Required",
            message:
              "<strong>Start + End Frame</strong> mode requires an end frame image, but none is attached.",
            hint: '<strong>Option 1:</strong> Click "Choose End Frame" to pick one image for all prompts.<br><br><strong>Option 2:</strong> Click "Different for Each" to assign a unique end frame to each prompt.',
          });
        if (
          !(
            "reference" !== e ||
            (l.referenceMediaIds && 0 !== l.referenceMediaIds.length) ||
            ("mapped" === l.referenceMode &&
              Object.keys(l.promptReferenceMap).length > 0)
          )
        )
          return void Gn({
            icon: "🎨",
            title: "Reference Images Required",
            message:
              "<strong>Reference</strong> mode requires at least one reference image to guide the video style, but none are attached.",
            hint: '<strong>Option 1:</strong> Click "Add Shared Refs" to pick images for all prompts.<br><br><strong>Option 2:</strong> Click "Different for Each" to assign unique references per prompt.',
          });
      }
      (cn(e, { runNow: !1 }),
        (Tn.value = ""),
        Hn(),
        "mapped" === l.referenceMode &&
          ((l.referenceMode = "shared"),
          (l.promptReferenceMap = {}),
          (l.promptStartFrameMap = {}),
          (l.promptEndFrameMap = {}),
          (K = []),
          J(),
          re(),
          Ia(),
          ka(),
          Ea()),
        o(".tab").forEach((e) => e.classList.remove("active")),
        o(".tab-content").forEach((e) => e.classList.remove("active")),
        r('[data-tab="queue"]').classList.add("active"),
        r("#tab-queue").classList.add("active"));
    } else Te("No prompts to queue", "warn");
  }),
  Fn.addEventListener("click", async () => {
    if ((Te("🔍 Checking connection...", "info"), !(await Oe())))
      return void Te("Not connected to Flow page!", "error");
    Te("✅ Connected", "info");
    let e = Tn.value
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    if (((e = jn(e)), e.length > 0 && !1)) {
      const t = i.promptsRemaining ?? 0;
      if (t <= 0)
        return (
          (r("#limit-message").textContent =
            `You've used all ${i.promptsPerDay || 0} available prompts for today.`),
          void (r("#limit-modal").style.display = "flex")
        );
      if (e.length > t)
        return void Gn({
          icon: "⚠️",
          title: "Not Enough Prompts",
          message: `You entered <strong>${e.length}</strong> prompts but only have <strong>${t}</strong> remaining today.`,
          hint: `Remove ${e.length - t} prompt${e.length - t > 1 ? "s" : ""} to continue, or <strong>reduce this batch size</strong> before running this batch.`,
        });
    }
    if (
      l.singlePromptMode &&
      "mapped" === l.referenceMode &&
      e.length >= 1 &&
      0 ===
        Object.keys(l.promptStartFrameMap).filter(
          (e) => l.promptStartFrameMap[e],
        ).length
    )
      return void Gn({
        icon: "🖼️",
        title: "No Start Frames",
        message:
          "Single prompt mode needs at least one start frame. Open the mapper to add images.",
        hint: 'Click "Different for Each" below the prompt area to assign start frames.',
      });
    if (e.length > 0 && "video" === l.mode) {
      const t = l.settings.videoMode,
        a = "mapped" === l.referenceMode,
        n = a && Object.keys(l.promptStartFrameMap).length > 0,
        r = a && Object.keys(l.promptEndFrameMap).length > 0,
        o = a && Object.keys(l.promptReferenceMap).length > 0,
        s = e.length;
      if (
        !(
          ("start_frame" !== t && "start_end_frame" !== t) ||
          l.startFrameMediaId ||
          n
        )
      )
        return (
          Gn({
            icon: "🖼️",
            title: "Start Frame Required",
            message:
              "<strong>Start Frame</strong> mode requires an image for each video to start from, but none are attached.",
            hint: '<strong>Option 1:</strong> Click "Choose Start Frame" to pick one image for all prompts.<br><br><strong>Option 2:</strong> Click "Different for Each" to assign a unique start frame to each prompt.',
          }),
          void Te("❌ No start frame attached — generation blocked", "error")
        );
      if (
        ("start_frame" === t || "start_end_frame" === t) &&
        n &&
        !l.startFrameMediaId
      ) {
        const e = Object.keys(l.promptStartFrameMap).length;
        if (e < s)
          return (
            Gn({
              icon: "⚠️",
              title: "Some Prompts Missing Start Frames",
              message: `Only <strong>${e}</strong> of <strong>${s}</strong> prompts have a start frame assigned. The unmapped prompts will fail.`,
              hint: 'Open "Different for Each" to assign the missing frames, or switch to a shared start frame for all prompts.',
            }),
            void Te(
              `⚠️ ${s - e} prompts have no start frame — generation blocked`,
              "error",
            )
          );
      }
      if ("start_end_frame" === t) {
        if (a && !l.endFrameMediaId) {
          if (!r)
            return (
              Gn({
                icon: "🖼️",
                title: "End Frames Required",
                message:
                  "<strong>Start + End Frame</strong> mode requires an end frame for each prompt, but none are assigned.",
                hint: 'Open "Different for Each" and set end frames, or attach a shared end frame.',
              }),
              void Te("❌ No end frames attached — generation blocked", "error")
            );
          const e = Object.keys(l.promptEndFrameMap).length;
          if (e < s)
            return (
              Gn({
                icon: "⚠️",
                title: "Some Prompts Missing End Frames",
                message: `Only <strong>${e}</strong> of <strong>${s}</strong> prompts have an end frame assigned. The unmapped prompts will fail.`,
                hint: 'Open "Different for Each" to assign the missing end frames, or switch to a shared end frame for all prompts.',
              }),
              void Te(
                `⚠️ ${s - e} prompts have no end frame — generation blocked`,
                "error",
              )
            );
        }
        if (!a && !l.endFrameMediaId)
          return (
            Gn({
              icon: "🖼️",
              title: "End Frame Required",
              message:
                "<strong>Start + End Frame</strong> mode requires an end frame image, but none is attached.",
              hint: 'Click "Choose End Frame" to select an image from your library, or use "Different for Each" to assign per-prompt end frames.',
            }),
            void Te("❌ No end frame attached — generation blocked", "error")
          );
      }
      if (
        !(
          "reference" !== t ||
          (l.referenceMediaIds && 0 !== l.referenceMediaIds.length) ||
          o
        )
      )
        return (
          Gn({
            icon: "🎨",
            title: "Reference Images Required",
            message:
              "<strong>Reference</strong> mode requires at least one reference image to guide the video style, but none are attached.",
            hint: '<strong>Option 1:</strong> Click "Add Shared Refs" to pick images for all prompts.<br><br><strong>Option 2:</strong> Click "Different for Each" to assign unique references per prompt.',
          }),
          void Te(
            "❌ No reference images attached — generation blocked",
            "error",
          )
        );
      if (
        "reference" === t &&
        o &&
        (!l.referenceMediaIds || 0 === l.referenceMediaIds.length)
      ) {
        const e = Object.keys(l.promptReferenceMap).filter(
          (e) => l.promptReferenceMap[e].length > 0,
        ).length;
        if (e < s)
          return (
            Gn({
              icon: "⚠️",
              title: "Some Prompts Missing References",
              message: `Only <strong>${e}</strong> of <strong>${s}</strong> prompts have reference images assigned. The unmapped prompts will fail.`,
              hint: 'Open "Different for Each" to assign the missing references.',
            }),
            void Te(
              `⚠️ ${s - e} prompts have no references — generation blocked`,
              "error",
            )
          );
      }
    }
    let t = null;
    if (e.length > 0) ((t = cn(e, { runNow: !0 })), (Tn.value = ""), Hn());
    else {
      if (((t = un()), !t))
        return void Te(
          "No prompts to run — type prompts or queue batches first",
          "warn",
        );
      gn(t.id, "running");
    }
    if (!(await tfEnsureJsonAnimationFramesForBatch(t)))
      return void (e.length || gn(t.id, "pending"));
    if (!(await tfEnsureJackReferenceForBatch(t)))
      return void (e.length || gn(t.id, "pending"));
    const a = t.settings;
    if (0 === e.length && "video" === a.mode) {
      const e = a.videoMode,
        n =
          a.perPromptStartFrames &&
          Object.keys(a.perPromptStartFrames).length > 0,
        r =
          a.perPromptReferences &&
          Object.keys(a.perPromptReferences).length > 0;
      if (
        (t.prompts.length,
        !(
          ("start_frame" !== e && "start_end_frame" !== e) ||
          a.startFrameMediaId ||
          n
        ))
      )
        return (
          Gn({
            icon: "🖼️",
            title: "Start Frame Required",
            message:
              "<strong>Start Frame</strong> mode requires an image for each video to start from, but none are attached.",
            hint: '<strong>Option 1:</strong> Click "Choose Start Frame" to pick one image for all prompts.<br><br><strong>Option 2:</strong> Click "Different for Each" to assign a unique start frame to each prompt.',
          }),
          Te("❌ No start frame attached — generation blocked", "error"),
          void gn(t.id, "pending")
        );
      if (
        ("start_frame" === e || "start_end_frame" === e) &&
        n &&
        !a.startFrameMediaId
      ) {
        const e = Object.keys(a.perPromptStartFrames).length,
          n = t.prompts.filter((e) => "pending" === e.status).length;
        if (e < n)
          return (
            Gn({
              icon: "⚠️",
              title: "Some Prompts Missing Start Frames",
              message: `Only <strong>${e}</strong> of <strong>${n}</strong> prompts have a start frame assigned. The unmapped prompts will fail.`,
              hint: 'Open "Different for Each" to assign the missing frames, or switch to a shared start frame for all prompts.',
            }),
            Te(
              `⚠️ ${n - e} prompts have no start frame — generation blocked`,
              "error",
            ),
            void gn(t.id, "pending")
          );
      }
      if (
        "start_end_frame" === e &&
        "mapped" === a.referenceMode &&
        !a.endFrameMediaId
      ) {
        const e =
            a.perPromptEndFrames &&
            Object.keys(a.perPromptEndFrames).length > 0,
          n = t.prompts.filter((e) => "pending" === e.status).length;
        if (!e)
          return (
            Gn({
              icon: "🖼️",
              title: "End Frames Required",
              message:
                "<strong>Start + End Frame</strong> mode requires an end frame for each prompt, but none are assigned.",
              hint: 'Open "Different for Each" and set end frames, or attach a shared end frame.',
            }),
            Te("❌ No end frames attached — generation blocked", "error"),
            void gn(t.id, "pending")
          );
        const r = Object.keys(a.perPromptEndFrames).length;
        if (r < n)
          return (
            Gn({
              icon: "⚠️",
              title: "Some Prompts Missing End Frames",
              message: `Only <strong>${r}</strong> of <strong>${n}</strong> prompts have an end frame assigned. The unmapped prompts will fail.`,
              hint: 'Open "Different for Each" to assign the missing end frames, or switch to a shared end frame for all prompts.',
            }),
            Te(
              `⚠️ ${n - r} prompts have no end frame — generation blocked`,
              "error",
            ),
            void gn(t.id, "pending")
          );
      }
      if (
        "start_end_frame" === e &&
        !a.endFrameMediaId &&
        "mapped" !== a.referenceMode
      )
        return (
          Gn({
            icon: "🖼️",
            title: "End Frame Required",
            message:
              "<strong>Start + End Frame</strong> mode requires an end frame image, but none is attached.",
            hint: 'Click "Choose End Frame" to select an image from your library, or use "Different for Each" to assign per-prompt end frames.',
          }),
          Te("❌ No end frame attached — generation blocked", "error"),
          void gn(t.id, "pending")
        );
      if (
        !(
          "reference" !== e ||
          (a.referenceMediaIds && 0 !== a.referenceMediaIds.length) ||
          r
        )
      )
        return (
          Gn({
            icon: "🎨",
            title: "Reference Images Required",
            message:
              "<strong>Reference</strong> mode requires at least one reference image to guide the video style, but none are attached.",
            hint: '<strong>Option 1:</strong> Click "Add Shared Refs" to pick images for all prompts.<br><br><strong>Option 2:</strong> Click "Different for Each" to assign unique references per prompt.',
          }),
          Te("❌ No reference images attached — generation blocked", "error"),
          void gn(t.id, "pending")
        );
      if (
        "reference" === e &&
        r &&
        (!a.referenceMediaIds || 0 === a.referenceMediaIds.length)
      ) {
        const e = Object.keys(a.perPromptReferences).filter(
            (e) => a.perPromptReferences[e].length > 0,
          ).length,
          n = t.prompts.filter((e) => "pending" === e.status).length;
        if (e < n)
          return (
            Gn({
              icon: "⚠️",
              title: "Some Prompts Missing References",
              message: `Only <strong>${e}</strong> of <strong>${n}</strong> prompts have reference images assigned. The unmapped prompts will fail.`,
              hint: 'Open "Different for Each" to assign the missing references.',
            }),
            Te(
              `⚠️ ${n - e} prompts have no references — generation blocked`,
              "error",
            ),
            void gn(t.id, "pending")
          );
      }
    }
    if ("mapped" === a.referenceMode) {
      let e = 0;
      if (a.perPromptReferences)
        for (const t of Object.keys(a.perPromptReferences)) {
          const n = a.perPromptReferences[t],
            r = n.filter((e) => {
              const t = y.some((t) => t.mediaId === e && !t.uploading),
                a = K.some((t) => t.mediaId === e),
                n = u.has(e);
              return t || a || n;
            });
          r.length !== n.length &&
            ((a.perPromptReferences[t] = r), (e += n.length - r.length));
        }
      if (a.perPromptStartFrames)
        for (const t of Object.keys(a.perPromptStartFrames)) {
          const n = a.perPromptStartFrames[t],
            r = y.some((e) => e.mediaId === n && !e.uploading),
            o = K.some((e) => e.mediaId === n),
            s = u.has(n);
          r || o || s || (delete a.perPromptStartFrames[t], e++);
        }
      if (a.perPromptEndFrames)
        for (const t of Object.keys(a.perPromptEndFrames)) {
          const n = a.perPromptEndFrames[t],
            r = y.some((e) => e.mediaId === n && !e.uploading),
            o = K.some((e) => e.mediaId === n),
            s = u.has(n);
          r || o || s || (delete a.perPromptEndFrames[t], e++);
        }
      e > 0 && Te(`⚠️ Removed ${e} reference(s) that no longer exist`, "warn");
    }
    ((l.activeBatchId = t.id), (l.batchStartTime = Date.now()), zn(!0));
    const n = t.prompts
        .map((e, t) => ({ text: e.text, status: e.status, originalIndex: t }))
        .filter((e) => "pending" === e.status),
      o = n.map((e) => e.text),
      s = n.map((e) => e.originalIndex),
      d = {
        type: "START_BATCH",
        batchId: t.id,
        prompts: o,
        promptIndexMap: s,
        settings: {
          mode: a.mode,
          folder: t.folder,
          imageModel: a.imageModel,
          aspectRatio: a.imageRatio,
          imageCount: a.imageCount,
          videoQuality: a.videoQuality,
          videoRatio: a.videoRatio,
          videoMode: a.videoMode,
          videoCount: a.videoCount || 1,
          videoDuration: a.videoDuration || 8,
          startFrameMediaId: a.startFrameMediaId,
          endFrameMediaId: a.endFrameMediaId,
          referenceMediaIds: a.referenceMediaIds,
          imageReferenceMediaIds: a.imageReferenceMediaIds || [],
          autoDownloadImages: !1,
          autoDownloadVideos: !1,
          imageDownloadQuality: l.settings.imageDownloadQuality || "2k",
          videoDownloadQuality: l.settings.videoDownloadQuality || "standard",
          naming: a.naming || l.settings.naming || "numbered",
          namingPrefix: a.namingPrefix || l.settings.namingPrefix || "",
          namingSeparator:
            void 0 !== a.namingSeparator
              ? a.namingSeparator
              : void 0 !== l.settings.namingSeparator
                ? l.settings.namingSeparator
                : "-",
          startNumber: a.startNumber || l.settings.startNumber || 1,
          perPromptReferences: a.perPromptReferences || null,
          perPromptStartFrames: a.perPromptStartFrames || null,
          perPromptEndFrames: a.perPromptEndFrames || null,
          perPromptFileNames: a.perPromptFileNames || null,
          projectName: t.projectName || a.projectName || t.name,
          projectFolder: t.projectFolder || a.projectFolder || t.folder,
          batchKind: t.batchKind || a.batchKind || a.mode,
          referenceMode: a.referenceMode || "shared",
          singlePromptBatch: !0 === a.singlePromptBatch,
          speedMode: l.speedMode || "fast",
        },
        featureFlags: de(),
        uploadsThisSession: q,
      };
    (Te(
      `📨 Starting batch "${t.name}": mode=${a.mode}, prompts=${o.length}`,
      "info",
    ),
      qa(
        o,
        {
          mode: a.mode,
          imageCount: a.imageCount,
          videoCount: a.videoCount || 1,
          aspectRatio: a.imageRatio,
          videoRatio: a.videoRatio,
        },
        s,
        {
          batchId: t.id,
          batchName: t.name,
          projectName: t.projectName || t.settings?.projectName || t.name,
          projectFolder: t.projectFolder || t.settings?.projectFolder || t.folder,
          batchKind: t.batchKind || t.settings?.batchKind || t.settings?.mode,
        },
      ));
    try {
      const e = await chrome.runtime.sendMessage(d);
      Te(`Background responded: ${JSON.stringify(e)}`, "info", "debug");
    } catch (e) {
      return (
        Te(`❌ Failed to send to background: ${e.message}`, "error"),
        gn(t.id, "failed"),
        zn(!1),
        void (l.activeBatchId = null)
      );
    }
    (Te(`🚀 Batch "${t.name}" started!`, "success"),
      "mapped" === l.referenceMode &&
        ((l.referenceMode = "shared"),
        (l.promptReferenceMap = {}),
        (l.promptStartFrameMap = {}),
        (l.promptEndFrameMap = {}),
        (K = []),
        J(),
        re(),
        Ia(),
        ka(),
        Ea()),
      (p = !0),
      (l._emptyPollCount = 0),
      Yn());
  }),
  Dn.addEventListener("click", async () => {
    if (
      (await chrome.runtime.sendMessage({ type: "STOP_BATCH" }),
      (p = !1),
      l.activeBatchId)
    ) {
      const e = pn(l.activeBatchId);
      if (e) {
        e.prompts.forEach((e) => {
          ("running" !== e.status && "pending" !== e.status) ||
            (e.status = "failed");
        });
        const t = e.prompts.some(
          (e) => "done" === e.status || "submitted" === e.status,
        );
        gn(l.activeBatchId, t ? "partial" : "failed");
      }
      l.activeBatchId = null;
    }
    (m && (clearInterval(m), (m = null)),
      (l.stats = { total: 0, downloaded: 0, failed: 0 }));
    for (const [e, t] of u)
      ("generating" !== t.status && "downloading" !== t.status) ||
        (t.status = "failed");
    ("function" == typeof Ba && Ba(),
      "function" == typeof ee && ee(),
      zn(!1),
      Oa(),
      De("Stopped", "badge badge-disconnected", 5e3),
      Te("⏹ Stopped", "warn"));
  }));
