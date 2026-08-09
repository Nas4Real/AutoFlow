// TurboFlow shard: Prompt composer helpers, validation modal, progress polling, auto-chain runner
// Loaded in numeric order; depends on earlier shards sharing globals.

const Tn = r("#prompt-input"),
  Cn = r("#prompt-count"),
  Rn = r("#btn-add-queue"),
  Fn = r("#btn-start"),
  Dn = r("#btn-stop"),
  Nn = r("#stop-section"),
  qn = r("#progress-section"),
  On = r("#progress-fill"),
  Un = r("#progress-text"),
  Bn = r("#file-input");
function jn(e) {
  if (!l.singlePromptMode) return e;
  if ("video" !== l.mode) return e;
  if ("start_frame" !== l.settings.videoMode) return e;
  if ("mapped" !== l.referenceMode) return e;
  if (1 !== e.length) return e;
  const t = Object.keys(l.promptStartFrameMap)
    .map(Number)
    .sort((e, t) => e - t)
    .map((e) => l.promptStartFrameMap[e])
    .filter(Boolean);
  return t.length <= 1
    ? e
    : ((l.promptStartFrameMap = {}),
      t.forEach((e, t) => {
        l.promptStartFrameMap[t] = e;
      }),
      J(),
      Te(`📝 Single prompt expanded to ${t.length} videos`, "info"),
      Array(t.length).fill(e[0]));
}
function Gn({ icon: e, title: t, message: a, hint: n }) {
  const repair = (value) =>
    globalThis.TFProjectDomain?.repairTextEncoding?.(value) || String(value || "");
  e = repair(e);
  t = repair(t);
  a = repair(a);
  n = repair(n);
  const o = r("#validation-modal"),
    s = r("#validation-icon"),
    i = r("#validation-title"),
    l = r("#validation-message"),
    d = r("#validation-hint"),
    c = r("#btn-validation-ok");
  function p() {
    ((o.style.display = "none"),
      c.removeEventListener("click", p),
      o.removeEventListener("click", m));
  }
  function m(e) {
    e.target === o && p();
  }
  ((s.textContent = e || "Warning"),
    (i.textContent = t || "Can't Generate Yet"),
    (l.innerHTML = a || ""),
    n
      ? ((d.innerHTML = n), (d.style.display = "block"))
      : (d.style.display = "none"),
    (o.style.display = "flex"),
    c.addEventListener("click", p),
    o.addEventListener("click", m));
}
function Hn() {
  const e = Tn.value.split("\n").filter((e) => e.trim().length > 0).length;
  Cn.textContent =
    0 === e ? "0 prompts" : 1 === e ? "1 prompt" : `${e} prompts`;
}
function Qn() {
  const e = l.settings.videoQuality || "lite",
    t = l.settings.videoDuration || 8,
    a = "omni_flash" === e,
    s = r('[data-vid-duration="4"]'),
    i = r('[data-vid-duration="6"]'),
    d = r('[data-vid-duration="8"]'),
    c = r('[data-vid-duration="10"]');
  (s?.classList.remove("locked"),
    i?.classList.remove("locked"),
    d?.classList.remove("locked"),
    c?.classList.remove("locked"));
  const m = t,
    u = r('[data-vid-mode="start_frame"]'),
    g = r('[data-vid-mode="start_end_frame"]'),
    f = r('[data-vid-mode="reference"]'),
    h = l.settings.videoMode || "text";
  (a
    ? (u?.classList.remove("locked"),
      g?.classList.add("locked"),
      f?.classList.remove("locked"),
      "start_end_frame" === h &&
        ((l.settings.videoMode = "text"),
        o("[data-vid-mode]").forEach((e) =>
          e.classList.toggle("active", "text" === e.dataset.vidMode),
        ),
        Wn(),
        J(),
        Te(
          "⚠️ Omni Flash does not support start + end frames — switched to Text mode",
          "warn",
        )))
    : (u?.classList.remove("locked"),
      g?.classList.remove("locked"),
      8 !== m
        ? (f?.classList.add("locked"),
          "reference" === h &&
            ((l.settings.videoMode = "text"),
            o("[data-vid-mode]").forEach((e) =>
              e.classList.toggle("active", "text" === e.dataset.vidMode),
            ),
            Wn(),
            J(),
            Te(
              "⚠️ Reference mode is only available at 8 seconds for Veo models — switched to Text",
              "warn",
            )))
        : "quality" === e
          ? f?.classList.add("locked")
          : f?.classList.remove("locked")),
    Ea());
}
function Wn() {
  const e = l.settings.videoMode;
  ((r("#start-frame-section").style.display =
    "start_frame" === e || "start_end_frame" === e ? "block" : "none"),
    (r("#end-frame-section").style.display =
      "start_end_frame" === e ? "block" : "none"),
    (r("#reference-section").style.display =
      "reference" === e ? "block" : "none"));
}
function Vn(e) {
  return new Promise((t, a) => {
    const n = new FileReader();
    ((n.onload = () => {
      const e = n.result.split(",")[1];
      t(e);
    }),
      (n.onerror = a),
      n.readAsDataURL(e));
  });
}
function zn(e) {
  ((Fn.disabled = e),
    (Dn.disabled = !e),
    (Nn.style.display = e ? "block" : "none"),
    (qn.style.display = e ? "block" : "none"));
  const t = r("#btn-start-locked"),
    a = r("#btn-add-queue-locked");
  (t && (t.disabled = e),
    a && (a.disabled = e),
    e
      ? ((Fe.textContent = "Running"), (Fe.className = "badge badge-running"))
      : T && Ne(T),
    "function" == typeof er && er(),
    "function" == typeof rr && rr(),
    "function" == typeof Ya && Ya(),
    "function" == typeof Ba && Ba());
}
function Yn() {
  (m && clearInterval(m),
    (m = setInterval(async () => {
      try {
        const e = await chrome.runtime.sendMessage({ type: "GET_STATS" });
        if (e?.stats) {
          l.stats = e.stats;
          const t = e.stats;
          Un.textContent = `Downloaded: ${t.downloaded} / ${t.total}${t.failed > 0 ? ` · Failed: ${t.failed}` : ""}`;
          const a =
            t.total > 0 ? Math.round((t.downloaded / t.total) * 100) : 0;
          if (
            ((On.style.width = `${a}%`),
            l.activeBatchId && hn(l.activeBatchId, t),
            0 === t.total && e.isRunning)
          )
            return;
          if (0 === t.total && !e.isRunning) {
            if (
              (l._emptyPollCount || (l._emptyPollCount = 0),
              l._emptyPollCount++,
              l._emptyPollCount < 10)
            )
              return;
            if (
              ((l._emptyPollCount = 0),
              clearInterval(m),
              (m = null),
              l.activeBatchId)
            ) {
              const e = pn(l.activeBatchId);
              (e && "running" === e.status && gn(l.activeBatchId, "failed"),
                (l.activeBatchId = null));
            }
            return (
              zn(!1),
              De("Failed", "badge badge-disconnected", 5e3),
              Oa(),
              void ze()
            );
          }
          t.total > 0 && (l._emptyPollCount = 0);
          let n = 0;
          if (l.activeBatchId)
            for (const [e, t] of u)
              t.batchId === l.activeBatchId &&
                t.isPlaceholder &&
                "generating" === t.status &&
                n++;
          const o =
            t.total > 0 &&
            t.downloaded + t.failed >= t.total &&
            !e.downloading &&
            !e.isRunning &&
            0 === n;
          if (!e.isRunning && n > 0)
            return (
              Te(
                `🧹 Cleaning ${n} stuck placeholder${n > 1 ? "s" : ""}...`,
                "warn",
              ),
              void Oa()
            );
          if (!o) return;
          if (
            (clearInterval(m),
            (m = null),
            ze(),
            Oa(),
            l.batchStartTime &&
              t.downloaded > 0 &&
              ((l.avgTimePerImage =
                (Date.now() - l.batchStartTime) / t.downloaded),
              X()),
            l.activeBatchId)
          ) {
            const e = pn(l.activeBatchId);
            if (e) {
              let a = 0;
              (e.prompts.forEach((e) => {
                ("running" !== e.status && "pending" !== e.status) ||
                  ((e.status = "failed"), a++);
              }),
                a > 0 &&
                  Te(
                    `⚠️ ${a} prompt${a > 1 ? "s" : ""} stuck without status — marked as failed. Click "Retry Failed" to redo them.`,
                    "warn",
                  ));
              const n = e.prompts.filter((e) => "failed" === e.status).length;
              let r;
              ((r =
                0 ===
                  e.prompts.filter(
                    (e) => "done" === e.status || "submitted" === e.status,
                  ).length && n > 0
                  ? "failed"
                  : n > 0 || t.failed > 0
                    ? "partial"
                    : "done"),
                gn(l.activeBatchId, r),
                (e.collapsed = !0),
                X(),
                Sn());
            }
            l.activeBatchId = null;
          }
          (zn(!1),
            De("Done", "badge badge-connected", 5e3),
          (qn.style.display = "block"));
          const s = p ? un() : null;
          if (s) {
            if (!(await tfEnsureJsonAnimationFramesForBatch(s, { keepChain: !0 })))
              return void ((p = !1), (U = !1));
            if (!(await tfEnsureJackReferenceForBatch(s)))
              return void ((p = !1), (U = !1));
            (Te(`⛓️ Auto-chaining → "${s.name}"`, "success"),
              (U = !0),
              await ie(2e3),
              gn(s.id, "running"),
              (l.activeBatchId = s.id),
              (l.batchStartTime = Date.now()));
            const e = s.prompts
                .map((e, t) => ({
                  text: e.text,
                  status: e.status,
                  originalIndex: t,
                }))
                .filter((e) => "pending" === e.status),
              t = e.map((e) => e.text),
              a = e.map((e) => e.originalIndex),
              n = s.settings;
            (zn(!0),
              qa(
                t,
                {
                  mode: n.mode,
                  imageCount: n.imageCount,
                  videoCount: n.videoCount || 1,
                  aspectRatio: n.imageRatio,
                  videoRatio: n.videoRatio,
                },
                a,
                {
                  batchId: s.id,
                  batchName: s.name,
                  projectName: s.projectName || s.settings?.projectName || s.name,
                  projectFolder: s.projectFolder || s.settings?.projectFolder || s.folder,
                  batchKind: s.batchKind || s.settings?.batchKind || s.settings?.mode,
                },
              ));
            try {
              (await chrome.runtime.sendMessage({
                type: "START_BATCH",
                batchId: s.id,
                prompts: t,
                promptIndexMap: a,
                settings: {
                  mode: n.mode,
                  folder: s.folder,
                  imageModel: n.imageModel,
                  aspectRatio: n.imageRatio,
                  imageCount: n.imageCount,
                  videoQuality: n.videoQuality,
                  videoRatio: n.videoRatio,
                  videoMode: n.videoMode,
                  videoCount: n.videoCount || 1,
                  videoDuration: n.videoDuration || 8,
                  startFrameMediaId: n.startFrameMediaId,
                  endFrameMediaId: n.endFrameMediaId,
                  referenceMediaIds: n.referenceMediaIds,
                  imageReferenceMediaIds: n.imageReferenceMediaIds || [],
                  autoDownloadImages: !1,
                  autoDownloadVideos: !1,
                  imageDownloadQuality: l.settings.imageDownloadQuality || "2k",
                  videoDownloadQuality:
                    l.settings.videoDownloadQuality || "standard",
                  naming: n.naming || l.settings.naming || "numbered",
                  namingPrefix: n.namingPrefix || l.settings.namingPrefix || "",
                  namingSeparator:
                    void 0 !== n.namingSeparator
                      ? n.namingSeparator
                      : void 0 !== l.settings.namingSeparator
                        ? l.settings.namingSeparator
                        : "-",
                  startNumber: n.startNumber || l.settings.startNumber || 1,
                  perPromptReferences: n.perPromptReferences || null,
                  perPromptStartFrames: n.perPromptStartFrames || null,
                  perPromptEndFrames: n.perPromptEndFrames || null,
                  perPromptFileNames: n.perPromptFileNames || null,
                  projectName: s.projectName || n.projectName || s.name,
                  projectFolder: s.projectFolder || n.projectFolder || s.folder,
                  batchKind: s.batchKind || n.batchKind || n.mode,
                  referenceMode: n.referenceMode || "shared",
                  singlePromptBatch: !0 === n.singlePromptBatch,
                  speedMode: l.speedMode || "fast",
                  _autoChained: !0,
                },
                featureFlags: de(),
                uploadsThisSession: q,
              }),
                Yn());
            } catch (e) {
              (Te(`❌ Auto-chain failed: ${e.message}`, "error"),
                gn(s.id, "failed"),
                (l.activeBatchId = null),
                zn(!1),
                Oa());
            }
          }
        }
      } catch (e) {}
    }, 2e3)));
}
