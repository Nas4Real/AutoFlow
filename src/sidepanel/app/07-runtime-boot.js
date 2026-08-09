// TurboFlow side panel shard: Single prompt mode, speed mode, background messages, boot/recovery
// Loaded by src/sidepanel/index.html in numeric order.

const Kn = r("#single-prompt-toggle"),
  Jn = r("#single-prompt-toggle-wrapper");
function Xn() {
  return "video" === l.mode && "start_frame" === l.settings.videoMode;
}
function Zn() {
  return Dn.disabled
    ? Xn()
      ? { allowed: !0 }
      : { allowed: !1, reason: "Only available in Video mode with Start Frame" }
    : { allowed: !1, reason: "Cannot change while generating" };
}
function er() {
  if (!Xn())
    return (
      (Jn.style.display = "none"),
      void (
        l.singlePromptMode &&
        ((l.singlePromptMode = !1), (Kn.checked = !1), tr(), J())
      )
    );
  Jn.style.display = "inline-flex";
  const e = Zn();
  e.allowed || l.singlePromptMode
    ? (Jn.classList.remove("disabled"),
      (Kn.disabled = !1),
      (Jn.title = "Use one prompt for many start frames"))
    : (Jn.classList.add("disabled"), (Kn.disabled = !0), (Jn.title = e.reason));
}
function tr() {
  const e = r("#prompt-input"),
    t = r("#prompt-hint"),
    a = r("#btn-open-mapper-video");
  if (l.singlePromptMode) {
    (e.classList.add("single-prompt-locked"),
      e.setAttribute("rows", "3"),
      (e.placeholder =
        "Describe the motion or action for all your start frames..."),
      t &&
        (t.innerHTML =
          '<span class="single-prompt-active-hint"><span class="material-symbols-outlined">link</span>applies to all start frames</span>'));
    const n = e.value.split("\n").filter((e) => e.trim());
    if (((e.value = n[0] || ""), Hn(), a)) {
      a.innerHTML =
        '<span class="material-symbols-outlined">photo_library</span> Assign Start Frames';
      const e = a.nextElementSibling;
      e &&
        e.classList.contains("hint") &&
        (e.textContent = "Pick the start frames for your videos");
    }
  } else if (
    (e.classList.remove("single-prompt-locked"),
    e.setAttribute("rows", "6"),
    (e.placeholder =
      "What do you want to create?\n\nEnter each prompt on a new line..."),
    t && (t.textContent = "(one per line)"),
    a)
  ) {
    a.innerHTML =
      '<span class="material-symbols-outlined">account_tree</span> Different for Each';
    const e = a.nextElementSibling;
    e &&
      e.classList.contains("hint") &&
      (e.textContent = "Assign a unique start frame to each prompt");
  }
  const n = r("#start-frame-area");
  n && (n.style.display = l.singlePromptMode ? "none" : "");
  const o = r("#start-frame-section .hint");
  o && (o.style.display = l.singlePromptMode ? "none" : "");
}
(Kn?.addEventListener("change", async (e) => {
  if (!e.target.checked)
    return (
      (l.singlePromptMode = !1),
      tr(),
      J(),
      void (
        "function" == typeof le && le("single_prompt_toggled", { enabled: !1 })
      )
    );
  const t = r("#prompt-input")
    .value.split("\n")
    .filter((e) => e.trim());
  t.length > 1 &&
  !(await an({
    icon: "⚠️",
    title: "Switch to Single Prompt Mode?",
    message: `This will keep only your first prompt and discard ${t.length - 1} other${t.length > 2 ? "s" : ""}.`,
    confirmText: "Continue",
    confirmClass: "btn-flow-primary",
  }))
    ? (e.target.checked = !1)
    : ((l.singlePromptMode = !0),
      tr(),
      J(),
      "function" == typeof le && le("single_prompt_toggled", { enabled: !0 }));
}),
  r("#prompt-input").addEventListener("input", (e) => {
    if (l.singlePromptMode && e.target.value.includes("\n")) {
      const t = e.target.selectionStart;
      ((e.target.value = e.target.value.replace(/\n/g, " ")),
        e.target.setSelectionRange(t, t));
    }
  }),
  r("#prompt-input").addEventListener("paste", (e) => {
    if (!l.singlePromptMode) return;
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData)
      .getData("text")
      .replace(/\s+/g, " ")
      .trim();
    document.execCommand("insertText", !1, t);
  }));
const ar = r("#speed-pill-group"),
  hr = r("#speed-select");
function nr() {
  if (l.activeBatchId) return !0;
  if (l.batches.some((e) => "running" === e.status)) return !0;
  const e = l.stats || {};
  if (e.total > 0 && e.downloaded + e.failed < e.total) return !0;
  for (const [e, t] of u)
    if ("generating" === t.status || "downloading" === t.status) return !0;
  return !1;
}
function rr() {
  const e = nr();
  hr && (hr.disabled = e);
  if (!ar) return;
  ar.querySelectorAll("[data-speed]").forEach((t) => {
    e
      ? (t.classList.add("locked"), (t.disabled = !0))
      : (t.classList.remove("locked"), (t.disabled = !1));
  });
}
function or() {
  hr && hr.value !== l.speedMode && (hr.value = l.speedMode);
  const e = r("#speed-mode-badge"),
    t = r("#speed-mode-badge-icon"),
    a = r("#speed-mode-badge-text");
  e &&
    t &&
    a &&
    (e.classList.remove("speed-fast", "speed-balanced", "speed-slow"),
    (e.style.display = "inline-flex"),
    "fast" === l.speedMode
      ? (e.classList.add("speed-fast"),
        (e.title = "Fast Mode — full speed, max concurrency"),
        (t.textContent = "bolt"),
        (a.textContent = "Fast"))
      : "balanced" === l.speedMode
        ? (e.classList.add("speed-balanced"),
          (e.title =
            "Balanced Mode — moderate concurrency for fewer rate limits"),
          (t.textContent = "balance"),
          (a.textContent = "Balanced"))
        : "slow" === l.speedMode &&
          (e.classList.add("speed-slow"),
          (e.title = "Slow Mode — running 1 generation at a time"),
          (t.textContent = "hourglass_top"),
          (a.textContent = "Slow")));
}
function sr() {
  hr && (hr.value = l.speedMode);
  ar &&
    ar.querySelectorAll("[data-speed]").forEach((e) => {
      e.classList.toggle("active", e.dataset.speed === l.speedMode);
    });
}
async function ir() {
  try {
    if (
      !(await chrome.storage.local.get("turboflowSpeedNewSeen"))
        .turboflowSpeedNewSeen
    ) {
      const e = r("#speed-new-badge"),
        t = r("#speed-section");
      (e && (e.style.display = "inline-flex"),
        t && t.classList.add("has-new-badge"));
    }
  } catch (e) {}
}
async function lr() {
  try {
    if (
      (await chrome.storage.local.get("turboflowSpeedNewSeen"))
        .turboflowSpeedNewSeen
    )
      return;
    await chrome.storage.local.set({ turboflowSpeedNewSeen: !0 });
    const e = r("#speed-new-badge"),
      t = r("#speed-section");
    (e && (e.style.display = "none"), t && t.classList.remove("has-new-badge"));
  } catch (e) {}
}
async function dr() {
  try {
    if (
      !(await chrome.storage.local.get("turboflowDurationNewSeen"))
        .turboflowDurationNewSeen
    ) {
      const e = r("#duration-new-badge"),
        t = r("#duration-section");
      (e && (e.style.display = "inline-flex"),
        t && t.classList.add("has-new-badge"));
    }
  } catch (e) {}
}
async function cr() {
  try {
    if (
      (await chrome.storage.local.get("turboflowDurationNewSeen"))
        .turboflowDurationNewSeen
    )
      return;
    await chrome.storage.local.set({ turboflowDurationNewSeen: !0 });
    const e = r("#duration-new-badge"),
      t = r("#duration-section");
    (e && (e.style.display = "none"), t && t.classList.remove("has-new-badge"));
  } catch (e) {}
}
(hr?.addEventListener("change", () => {
  if (nr()) {
    hr.value = l.speedMode;
    return void Te("Cannot change speed while generating", "warn");
  }
  const e = hr.value;
  e !== l.speedMode &&
    ((l.speedMode = e),
    J(),
    sr(),
    or(),
    lr(),
    Te(
      {
        fast: "Fast mode",
        balanced: "Balanced mode",
        slow: "Slow mode",
      }[e] || e,
      "info",
    ));
}),
ar?.querySelectorAll("[data-speed]").forEach((e) => {
  e.addEventListener("click", () => {
    if (nr()) return void Te("⚠️ Cannot change speed while generating", "warn");
    const t = e.dataset.speed;
    t !== l.speedMode &&
      ((l.speedMode = t),
      J(),
      sr(),
      or(),
      lr(),
      Te(
        {
          fast: "⚡ Fast Mode — full speed",
          balanced: "⚖️ Balanced Mode — moderate concurrency",
          slow: "🐢 Slow Mode — one at a time",
        }[t] || t,
        "info",
      ));
  });
}),
  ir(),
  dr(),
  setTimeout(() => {
    (sr(), rr(), or());
  }, 100),
  chrome.runtime.onMessage.addListener((e) => {
    if (
      ("CONNECTION_STATE" === e.type && Ne(e.state),
      "AUTH_STATE_CHANGED" === e.type &&
        (e.user ? ((s = e.user), (i = e.plan), We()) : Qe()),
      "PLAN_UPDATE" === e.type)
    ) {
      if (((i = e.plan), e.plan?.banned)) return void Xe(e.plan.bannedReason);
      "block" === r("#plan-activating").style.display || (Ve(), Ye(), Ue());
    }
    if ("PRO_ACTIVATED" === e.type) {
      ((i = e.plan),
        (r("#plan-activating").style.display = "none"),
        Ve(),
        Ye(),
        Ue());
      const t = r("#plan-banner");
      (t.classList.add("celebrating"),
        setTimeout(() => t.classList.remove("celebrating"), 5e3),
        le("local_account_removed", {
          time_to_convert_ms: Ke ? Date.now() - Ke : null,
          was_trial: i?.trial || !1,
        }),
        (Ke = null));
    }
    if (
      ("ACTIVATION_TIMEOUT" === e.type &&
        ((r("#plan-activating").style.display = "none"),
        (r("#plan-free").style.display = "block"),
        Ve()),
      "ACTIVATION_CANCELLED" === e.type &&
        ((r("#plan-activating").style.display = "none"),
        (r("#plan-free").style.display = "block"),
        Ve(),
        Ye(),
        le("local_account_removed", {
          time_on_removed_account_page_ms: Ke ? Date.now() - Ke : null,
          reason: e.reason || "tab_closed",
        }),
        (Ke = null)),
      "FROM_BACKGROUND" === e.type)
    ) {
      if (
        ("LOG" === e.subType &&
          Te(e.message, e.logType || "info", e.logLevel || "user"),
        "SHOW_FIX_UNUSUAL" === e.subType)
      ) {
        const e = document.getElementById("fix-unusual-modal");
        e &&
          "flex" !== e.style.display &&
          ((e.style.display = "flex"),
          "function" == typeof le &&
            le("fix_unusual_modal_opened", {
              trigger: "auto_recovery_failed",
            }));
      }
      if ("BATCH_GENERATION_DONE" === e.subType) {
        const {
          totalPrompts: t,
          successfulPrompts: a,
          failedPrompts: n,
          totalImages: r,
        } = e;
        if (!l.activeBatchId) return;
        const studioBatch = e.uiBatchId ? pn(e.uiBatchId) : pn(l.activeBatchId);
        globalThis.tfHandleStudioGenerationMessage?.(e, studioBatch);
        if (
          (Oa(),
          Te(
            `📊 Generation complete: ${a}/${t} prompts succeeded, ${r} images queued`,
            n > 0 ? "warn" : "success",
          ),
          tfScheduleDownloadHistorySync(2500),
          0 === r)
        ) {
          if (
            (Te("❌ No images generated — batch failed", "error"),
            l.activeBatchId)
          ) {
            const e = pn(l.activeBatchId);
            (e &&
              (e.prompts.forEach((e) => {
                ("pending" !== e.status && "running" !== e.status) ||
                  (e.status = "failed");
              }),
              gn(l.activeBatchId, "failed"),
              Te(`↩️ Batch "${e.name}" marked as failed`, "error")),
              (l.activeBatchId = null));
          }
          (m && (clearInterval(m), (m = null)),
            zn(!1),
            De("Failed", "badge badge-disconnected", 5e3),
            Ba(),
            ze());
        }
      }
      if (
        ("IMAGE_READY" === e.subType &&
          (Te(e.message, "success"), e.stats && (l.stats = e.stats)),
        "PREVIEW_READY" === e.subType)
      ) {
        const t = e.uiBatchId
          ? pn(e.uiBatchId)
          : l.activeBatchId
            ? pn(l.activeBatchId)
            : null;
        Da({
          mediaId: e.mediaId,
          fifeUrl: e.fifeUrl,
          promptIndex: e.promptIndex,
          prompt: e.prompt,
          type: e.mediaType || "image",
          videoUrl: e.videoUrl || null,
          workflowId: e.workflowId || null,
          batchId: e.uiBatchId || t?.id || null,
          batchName: t?.name || null,
          projectName: t?.projectName || t?.settings?.projectName || null,
          projectFolder: t?.projectFolder || t?.settings?.projectFolder || null,
          batchKind: t?.batchKind || t?.settings?.batchKind || null,
          fileName: e.fileName || null,
        });
        globalThis.tfHandleStudioGenerationMessage?.(e, t);
      }
      if ("PREVIEW_CACHED" === e.subType) {
        const t = e.uiBatchId
          ? pn(e.uiBatchId)
          : l.activeBatchId
            ? pn(l.activeBatchId)
            : null;
        globalThis.tfHandleStudioGenerationMessage?.(e, t);
        e.mediaId && e.fileName && tfQueueGalleryCacheRepair(e.mediaId, e.fileName);
      }
      if (
        ("DOWNLOAD_COMPLETE" === e.subType &&
          (Te(e.message, "success"),
          e.stats && (l.stats = e.stats),
          e.mediaId &&
            (Na(e.mediaId, "done"),
            tfQueueGalleryCacheRepair(
              e.mediaId,
              e.fileName || u.get(e.mediaId)?.fileName,
            ))),
        "DOWNLOAD_STARTED" === e.subType &&
          e.mediaId &&
          Na(e.mediaId, "downloading"),
        "DOWNLOAD_FAILED" === e.subType && e.mediaId && Na(e.mediaId, "failed"),
        "STATS_UPDATE" === e.subType &&
          e.stats &&
          ((l.stats = e.stats),
          l.activeBatchId && hn(l.activeBatchId, e.stats),
          "function" == typeof Ya && Ya(),
          "function" == typeof Fa && Fa()),
        "PROMPT_STATUS" === e.subType)
      ) {
        const t = l.queue[e.promptIndex];
        (t &&
          ((t.status = e.status),
          e.error ? (t.lastError = e.error) : delete t.lastError),
          l.activeBatchId &&
            fn(l.activeBatchId, e.promptIndex, e.status, e.error || null));
      }
      if ("BANNED" === e.subType) return (Xe(e.message), zn(!1), void Oa());
      if ("LIMIT_REACHED" === e.subType) {
        if (
          (Te(`🚫 ${e.message || "Daily limit reached."}`, "error"),
          le("limit_reached", {
            remaining: e.remaining,
            plan: i?.plan || "free",
          }),
          void 0 !== e.remaining &&
            Te(`📊 ${e.remaining} prompts remaining today.`, "warn"),
          (r("#limit-message").textContent =
            e.message ||
            "Daily limit reached. Reduce the batch size for unlimited."),
          (r("#limit-modal").style.display = "flex"),
          l.activeBatchId)
        ) {
          const e = pn(l.activeBatchId);
          (e &&
            (e.prompts.forEach((e) => {
              ("running" !== e.status && "submitted" !== e.status) ||
                (e.status = "pending");
            }),
            gn(l.activeBatchId, "pending")),
            (l.activeBatchId = null));
        }
        (m && (clearInterval(m), (m = null)),
          zn(!1),
          De("Limit Reached", "badge badge-disconnected", 5e3),
          Oa(),
          ze());
      }
      if ("STALE_REFERENCES" === e.subType) {
        if (
          (zn(!1),
          De("Stale References", "badge badge-disconnected", 8e3),
          Te(`🔄 ${e.message}`, "warn"),
          l.activeBatchId)
        ) {
          const e = pn(l.activeBatchId);
          if (e) {
            e.prompts.forEach((e) => {
              ("pending" !== e.status && "running" !== e.status) ||
                (e.status = "failed");
            });
            const t = e.prompts.some(
              (e) => "done" === e.status || "submitted" === e.status,
            );
            gn(l.activeBatchId, t ? "partial" : "failed");
          }
          l.activeBatchId = null;
        }
        (m && (clearInterval(m), (m = null)), Oa());
        const t = r("#stale-refs-modal");
        t &&
          "flex" !== t.style.display &&
          ((t.style.display = "flex"),
          "function" == typeof le && le("stale_references_modal_opened", {}));
      }
      if ("QUOTA_EXHAUSTED" === e.subType) {
        if (
          (zn(!1),
          De("Quota Reached", "badge badge-disconnected", 8e3),
          Te(`🚫 ${e.message}`, "error"),
          l.activeBatchId)
        ) {
          const e = pn(l.activeBatchId);
          if (e) {
            e.prompts.forEach((e) => {
              ("pending" !== e.status && "running" !== e.status) ||
                (e.status = "failed");
            });
            const t = e.prompts.some(
              (e) => "done" === e.status || "submitted" === e.status,
            );
            gn(l.activeBatchId, t ? "partial" : "failed");
          }
          l.activeBatchId = null;
        }
        (l.queue.forEach((e) => {
          ("pending" !== e.status &&
            "running" !== e.status &&
            "submitted" !== e.status) ||
            (e.status = "failed");
        }),
          Gn({
            icon: "🚫",
            title:
              "video" === e.type
                ? "Google Flow Video Limit Reached"
                : "Google Flow Limit Reached",
            message:
              "video" === e.type
                ? "Google Flow rejected the <strong>video/animation</strong> request for this account. Image generation can still work separately."
                : "Google Flow rejected this generation request for this account. This is a Google Flow response, not TurboFlow.",
            hint:
              "video" === e.type
                ? "Switch account, wait for credits to refresh, or retry failed clips later. Your generated images and failed clip prompts stay in the queue."
                : "If manual generation still works, switch Speed to Slow and retry the failed prompts.",
          }),
          ze(),
          Oa());
      }
      if ("STALE_REFERENCES" === e.subType) {
        if (
          (zn(!1),
          De("Stale References", "badge badge-disconnected", 8e3),
          Te(`🔄 ${e.message}`, "warn"),
          l.activeBatchId)
        ) {
          const e = pn(l.activeBatchId);
          if (e) {
            e.prompts.forEach((e) => {
              ("pending" !== e.status && "running" !== e.status) ||
                (e.status = "failed");
            });
            const t = e.prompts.some(
              (e) => "done" === e.status || "submitted" === e.status,
            );
            gn(l.activeBatchId, t ? "partial" : "failed");
          }
          l.activeBatchId = null;
        }
        (m && (clearInterval(m), (m = null)), Oa());
        const t = r("#validation-modal");
        t &&
          "flex" !== t.style.display &&
          Gn({
            icon: "🔄",
            title: "Reference Frames Need Local Files",
            message:
              "TurboFlow tried to reconnect the start frames for this Google Flow project, but some local files were missing.",
            hint: 'Open Flow with the account you want, then click <strong>Retry Failed</strong>. If a folder picker appears, select the downloaded <strong>media</strong> folder once and TurboFlow will continue automatically.<br><br>\n                           <em>Your queue and failed prompts are kept locally.</em>',
          });
      }
      if ("SERVER_DOWN" === e.subType) {
        if (
          (Te(`⚠️ ${e.message || "Could not reach server."}`, "error"),
          Te("💡 Check your internet connection and try again.", "warn"),
          l.activeBatchId)
        ) {
          const e = pn(l.activeBatchId);
          (e &&
            (e.prompts.forEach((e) => {
              ("running" !== e.status && "submitted" !== e.status) ||
                (e.status = "pending");
            }),
            gn(l.activeBatchId, "pending")),
            (l.activeBatchId = null));
        }
        (m && (clearInterval(m), (m = null)), zn(!1), Oa());
      }
    }
  }),
  Se(),
  He(),
  Z(),
  ne(),
  te(),
  oe(),
  Hn(),
  Te("TurboFlow v" + xe() + " ready 🚀", "info"));
try {
  const e = me();
  chrome.runtime
    .sendMessage({ type: "SET_FINGERPRINT", fingerprint: e })
    .catch(() => {});
} catch (e) {}
function pr(e = 0) {
  s?.token ? ke() : e < 3 ? setTimeout(() => pr(e + 1), 2e3) : ke();
}
async function mr() {
  try {
    const e = await chrome.runtime.sendMessage({ type: "GET_FULL_STATE" });
    if (!e) return;
    let t = l.batches.find((e) => "running" === e.status);
    if (
      (t ||
        (t = [...l.batches]
          .filter(
            (e) =>
              e.startedAt && ("pending" === e.status || "partial" === e.status),
          )
          .sort((e, t) => (t.startedAt || 0) - (e.startedAt || 0))[0]),
      !t && 0 === e.items.length)
    )
      return;
    let a = 0,
      n = 0;
    if (t)
      for (const r of e.items) {
        if (u.has(r.mediaId)) continue;
        let o = null;
        for (const [e, a] of u)
          if (
            a.isPlaceholder &&
            a.batchId === t.id &&
            a.originalIndex === r.promptIndex
          ) {
            o = e;
            break;
          }
        if (o) {
          const a = u.get(o),
            s = a.promptIndex,
            i = a.suffix,
            l = a.isPortrait,
            d = a.refThumbs || [];
          u.delete(o);
          let c = r.fifeUrl;
          ("video" !== r.type &&
            (c = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${r.mediaId}`),
            u.set(r.mediaId, {
              mediaId: r.mediaId,
              promptIndex: s,
              prompt: r.prompt || "",
              fifeUrl: c,
              videoUrl: r.videoUrl || null,
              status: e.running ? "ready" : "done",
              type: r.type || "image",
              isPlaceholder: !1,
              suffix: i || r.suffix || "",
              isPortrait: l,
              originalIndex: r.promptIndex,
              workflowId: r.workflowId || null,
              refThumbs: d,
              batchId: t.id,
              batchName: t.name,
              fileName: r.fileName || null,
            }),
            n++);
        } else {
          let n = -1;
          for (const [e, t] of u) t.promptIndex > n && (n = t.promptIndex);
          const o = n + 1;
          let s = r.fifeUrl;
          ("video" !== r.type &&
            (s = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${r.mediaId}`),
            u.set(r.mediaId, {
              mediaId: r.mediaId,
              promptIndex: o,
              prompt: r.prompt || "",
              fifeUrl: s,
              videoUrl: r.videoUrl || null,
              status: e.running ? "ready" : "done",
              type: r.type || "image",
              isPlaceholder: !1,
              suffix: r.suffix || "",
              isPortrait: !1,
              originalIndex: r.promptIndex,
              workflowId: r.workflowId || null,
              refThumbs: [],
              batchId: t.id,
              batchName: t.name,
              fileName: r.fileName || null,
            }),
            a++);
        }
      }
    if (!e.running) {
      let e = 0;
      for (const [t, a] of u)
        a.isPlaceholder &&
          "generating" === a.status &&
          ((a.status = "failed"), e++);
      e > 0 &&
        Te(
          `🧹 Cleaned ${e} stale placeholder${e > 1 ? "s" : ""} from previous session`,
          "info",
        );
    }
    let r = -1;
    for (const [e, t] of u) t.promptIndex > r && (r = t.promptIndex);
    if (((h = r + 1), t)) {
      const r = new Set();
      for (const t of e.items) r.add(t.promptIndex);
      let o = 0;
      if (
        (t.prompts.forEach((e, t) => {
          ("running" !== e.status && "pending" !== e.status) ||
            !r.has(t) ||
            ((e.status = "submitted"), o++);
        }),
        e.running ||
          t.prompts.forEach((e) => {
            ("running" !== e.status && "pending" !== e.status) ||
              ((e.status = "failed"), o++);
          }),
        o > 0 && X(),
        e.running)
      )
        ((l.activeBatchId = t.id),
          (l.stats = e.stats),
          gn(t.id, "running"),
          zn(!0),
          Yn(),
          Te(
            `🔄 Reconnected to running batch "${t.name}" — ${e.stats.downloaded}/${e.stats.total}`,
            "success",
          ));
      else if (
        "running" === t.status ||
        ("pending" === t.status && t.startedAt)
      ) {
        const e = t.prompts.filter((e) => "failed" === e.status).length,
          r = t.prompts.filter(
            (e) => "done" === e.status || "submitted" === e.status,
          ).length;
        let o;
        ((o =
          0 === r && e > 0
            ? "failed"
            : e > 0
              ? "partial"
              : r > 0 || a + n > 0
                ? "done"
                : "failed"),
          gn(t.id, o),
          (t.collapsed = !0),
          X(),
          Sn());
      } else Sn();
    }
    const o = a + n;
    o > 0 &&
      (Ba(),
      ee(),
      Te(
        n > 0
          ? `✅ Recovered ${o} item${o > 1 ? "s" : ""} (${n} matched, ${a} new)`
          : `✅ Recovered ${o} item${o > 1 ? "s" : ""} generated while panel was closed`,
        "success",
      ));
  } catch (e) {}
}
(setTimeout(() => {
  le("session_start", { plan: i?.plan || "free" });
}, 4e3),
  setTimeout(() => pr(), 5e3),
  setTimeout(mr, 800),
  setTimeout(() => tfScheduleDownloadHistorySync(0), 1800));
