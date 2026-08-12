import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Button, Card, Chip, Modal, ProgressBar, Toast, toast } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle,
  CheckCircle2,
  CheckSquare,
  Clapperboard,
  CirclePause,
  Cpu,
  Download,
  FileInput,
  FileJson,
  FolderKanban,
  FolderOpen,
  FolderSync,
  Image as ImageIcon,
  Images,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  ListVideo,
  LoaderCircle,
  MousePointerClick,
  Pencil,
  Play,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  ScrollText,
  Sparkles,
  Square,
  Trash2,
  Trophy,
  Upload,
  UserRound,
  Video,
  VideoOff,
  Wand2,
  X,
  Zap,
} from "lucide-react";

const studioApi = globalThis.TFProjectStudioState;
const domainApi = globalThis.TFProjectDomain;

const NAV_ITEMS = [
  { id: "channels", label: "Dashboard", icon: LayoutDashboard },
  { id: "import", label: "Imports", icon: FileInput },
  { id: "logs", label: "Logs", icon: ScrollText },
];

const PROJECT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "images", label: "Image Review" },
  { id: "video", label: "Video Queue" },
  { id: "media", label: "Media" },
];

const IMPORT_TABS = [
  { id: "history", label: "Import History" },
  { id: "references", label: "Needs References" },
  { id: "library", label: "Assets" },
];

const IMAGE_REVIEW_TABS = [
  { id: "generate", label: "Generate" },
  { id: "select", label: "Select" },
];

const MEDIA_TABS = [
  { id: "all", label: "All" },
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
];

function getViewFromLocationHash() {
  const rawHash = String(globalThis.location?.hash || "").replace(/^#/, "");
  let hash = "";
  try {
    hash = decodeURIComponent(rawHash);
  } catch (error) {
    hash = rawHash;
  }
  return NAV_ITEMS.some((item) => item.id === hash) || PROJECT_TABS.some((item) => item.id === hash) || hash === "assets" || hash === "profile" ? hash : "channels";
}

class StudioErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Studio render failed", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="studio-crash">
        <AlertCircle size={24} />
        <h1>Studio could not open</h1>
        <p>{this.state.error?.message || "An unexpected render error occurred."}</p>
        <button type="button" onClick={() => location.reload()}>Reload Studio</button>
      </div>
    );
  }
}

function captureStudioState() {
  const state = studioApi.getState();
  return {
    activeProject: state.activeProject || null,
    domainState: state.domainState || { projects: [] },
    logs: Array.isArray(state.logs) ? state.logs.slice() : [],
    flowContext: state.flowContext || null,
    lastError: state.lastError || null,
  };
}

function primaryAssetFile(asset) {
  const files = Array.isArray(asset?.files) ? asset.files : [];
  return (
    files.find((file) => file.asset_file_id === asset?.primary_file_id) ||
    files.find((file) => file.is_primary || file.role === "primary") ||
    files[0] ||
    null
  );
}

function previewUrl(value) {
  return (
    value?.data_url ||
    value?.cache_preview_url ||
    value?.preview_url ||
    value?.thumbnail_url ||
    value?.fife_url ||
    value?.video_url ||
    ""
  );
}

function isDataUrl(value) {
  return String(value || "").startsWith("data:");
}

function cachedFrameDataUrl(response) {
  if (!response?.ok || !response.base64) return "";
  const mimeType = response.mimeType || "image/png";
  return `data:${mimeType};base64,${response.base64}`;
}

function cacheLookupFor(value) {
  return {
    cacheKey: String(value?.cache_key || value?.cacheKey || "").trim(),
    fileName: String(
      value?.cached_file_name ||
        value?.cachedFileName ||
        value?.generated_file_name ||
        value?.local_file_name ||
        value?.expected_file_name ||
        value?.file_name ||
        "",
    ).trim(),
    mediaId: String(value?.media_id || value?.mediaId || "").trim(),
  };
}

function sourceUrlForCache(value) {
  return (
    value?.fife_url ||
    value?.thumbnail_url ||
    value?.preview_url ||
    value?.data_url ||
    ""
  );
}

function CachedPreviewImage({ value, alt, placeholderClassName = "preview-placeholder" }) {
  const remoteSource = previewUrl(value);
  const lookup = cacheLookupFor(value);
  const lookupSignature = [
    lookup.cacheKey,
    lookup.fileName,
    lookup.mediaId,
    sourceUrlForCache(value),
  ].join("|");
  const [cachedSource, setCachedSource] = useState("");
  const [failedSource, setFailedSource] = useState("");

  useEffect(() => {
    let cancelled = false;
    setCachedSource("");
    setFailedSource("");

    if (isDataUrl(remoteSource)) return () => {
      cancelled = true;
    };
    if (!lookup.cacheKey && !lookup.fileName && !lookup.mediaId) return () => {
      cancelled = true;
    };

    async function loadCachedFrame() {
      const runtime = globalThis.chrome?.runtime;
      if (!runtime || typeof runtime.sendMessage !== "function") return;
      try {
        const cached = await runtime.sendMessage({
          type: "GET_CACHED_FRAME",
          cacheKey: lookup.cacheKey,
          fileName: lookup.fileName,
          mediaId: lookup.mediaId,
        });
        let dataUrl = cachedFrameDataUrl(cached);
        if (!dataUrl && (lookup.mediaId || sourceUrlForCache(value))) {
          const repaired = await runtime.sendMessage({
            type: "CACHE_IMAGE_PREVIEW",
            cacheKey: lookup.cacheKey,
            fileName: lookup.fileName,
            mediaId: lookup.mediaId,
            fifeUrl: sourceUrlForCache(value),
          });
          dataUrl = cachedFrameDataUrl(repaired);
        }
        if (!cancelled && dataUrl) setCachedSource(dataUrl);
      } catch (_error) {
        // Broken remote thumbnails should not crash Studio; the placeholder covers misses.
      }
    }

    loadCachedFrame();
    return () => {
      cancelled = true;
    };
  }, [lookupSignature, remoteSource]);

  const source = cachedSource || remoteSource;
  if (!source || failedSource === source) {
    return <span className={placeholderClassName}><ImageIcon size={24} /></span>;
  }
  return <img src={source} alt={alt} onError={() => setFailedSource(source)} />;
}

function statusColor(status) {
  if (["complete", "completed", "ready", "submitted"].includes(status)) return "success";
  if (status === "failed" || status === "needs_review") return "danger";
  if (status === "running" || status === "generating") return "accent";
  if (["paused", "partial", "stopped"].includes(status)) return "warning";
  return "default";
}

function EmptyState({ icon: Icon = FolderOpen, title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={24} /></span>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

function PageHeader({ title, description, actions }) {
  return (
    <header className="page-header">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

function StudioModal({ open, onOpenChange, title, children, footer, size = "md" }) {
  return (
    <Modal.Backdrop
      className="studio-modal-backdrop"
      isOpen={open}
      onOpenChange={onOpenChange}
      isDismissable
    >
      <Modal.Container className="studio-modal-container" placement="center" size={size}>
        <Modal.Dialog className="studio-modal-dialog">
          <Modal.Header className="studio-modal-header">
            <Modal.Heading>{title}</Modal.Heading>
            <Modal.CloseTrigger className="modal-close" aria-label="Close dialog">
              <X size={18} />
            </Modal.CloseTrigger>
          </Modal.Header>
          <Modal.Body className="studio-modal-body">{children}</Modal.Body>
          {footer ? <Modal.Footer className="studio-modal-footer">{footer}</Modal.Footer> : null}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function DropZone({ file, onFile, accept, label, hint, preview }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  function choose(files) {
    const next = Array.from(files || [])[0] || null;
    if (next) onFile(next);
  }
  return (
    <div
      className={`drop-zone ${dragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        choose(event.dataTransfer.files);
      }}
    >
      {preview ? <img className="drop-preview" src={preview} alt="Selected upload" /> : <Upload size={24} />}
      <strong>{file?.name || label}</strong>
      <span>{file ? "Ready to save" : hint}</span>
      <Button size="sm" variant="outline" onPress={() => inputRef.current?.click()}>
        Choose file
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => choose(event.target.files)}
      />
    </div>
  );
}

function ChannelDialog({ open, onOpenChange, onSave, busy }) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName("");
  }, [open]);
  return (
    <StudioModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add YouTube channel"
      footer={
        <>
          <Button variant="ghost" onPress={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" isDisabled={!name.trim() || busy} onPress={() => onSave(name.trim())}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}
            Add channel
          </Button>
        </>
      }
    >
      <label className="field-label">
        Channel name
        <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </label>
    </StudioModal>
  );
}

function VideoDialog({ open, mode, video, onOpenChange, onSave, busy }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  useEffect(() => {
    if (!open) return;
    setName(mode === "rename" ? video?.display_name || "" : "");
    setFile(null);
  }, [open, mode, video]);
  const ready = mode === "rename" ? !!name.trim() : !!file;
  return (
    <StudioModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "rename" ? "Rename video" : "Add video"}
      footer={
        <>
          <Button variant="ghost" onPress={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" isDisabled={!ready || busy} onPress={() => onSave({ name: name.trim(), file })}>
            {busy ? <LoaderCircle className="spin" size={17} /> : mode === "rename" ? <Save size={17} /> : <Upload size={17} />}
            {mode === "rename" ? "Save" : "Import video"}
          </Button>
        </>
      }
    >
      <label className="field-label">
        Video name {mode === "add" ? <span className="optional">Optional</span> : null}
        <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </label>
      {mode === "add" ? (
        <DropZone
          file={file}
          onFile={setFile}
          accept=".json,application/json"
          label="Drop the video JSON here"
          hint="file_name and image_prompt are required; animation_prompt is optional"
        />
      ) : null}
    </StudioModal>
  );
}

function AssetDialog({ open, mode, asset, onOpenChange, onSave, busy }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [localPreview, setLocalPreview] = useState("");
  useEffect(() => {
    if (!open) return;
    setName(mode === "edit" ? asset?.display_name || "" : "");
    setFile(null);
    setLocalPreview(primaryAssetFile(asset)?.data_url || "");
  }, [open, mode, asset]);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const ready = !!name.trim() && (mode === "edit" || !!file);
  return (
    <StudioModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit asset" : "Add asset"}
      footer={
        <>
          <Button variant="ghost" onPress={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" isDisabled={!ready || busy} onPress={() => onSave({ name: name.trim(), file })}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
            Save asset
          </Button>
        </>
      }
    >
      <label className="field-label">
        Asset name
        <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      </label>
      <DropZone
        file={file}
        onFile={setFile}
        accept="image/*"
        label={mode === "edit" ? "Drop a replacement image" : "Drop the reference image here"}
        hint={mode === "edit" ? "Leave unchanged or choose a replacement" : "PNG, JPEG, or WebP"}
        preview={localPreview}
      />
    </StudioModal>
  );
}

function ConfirmDialog({ open, title, description, confirmLabel = "Delete", onOpenChange, onConfirm, busy }) {
  return (
    <StudioModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <>
          <Button variant="ghost" onPress={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="danger" isDisabled={busy} onPress={onConfirm}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="confirm-copy">{description}</p>
    </StudioModal>
  );
}

function getProjectPresentation(progress) {
  if (progress.video_failed_count > 0) return { tone: "attention", badge: "Action required", Icon: AlertCircle, detail: `${progress.video_failed_count} video jobs need attention`, action: "Open Video Queue", target: "video" };
  if (progress.phase === "complete") return { tone: "complete", badge: "Complete", Icon: Trophy, detail: `${progress.video_complete_count} of ${progress.prompt_count} videos complete`, action: "View Media", target: "media" };
  if (progress.phase === "video_generation") return { tone: "progress", badge: "In progress", Icon: PlayCircle, detail: `${progress.video_complete_count} of ${progress.prompt_count} videos complete`, action: "Open Video Queue", target: "video" };
  if (progress.phase === "image_selection") return { tone: "attention", badge: "Action required", Icon: MousePointerClick, detail: `${progress.selected_count} of ${progress.prompt_count} scenes selected`, action: "Select Variants", target: "images" };
  if (progress.phase === "image_generation") return { tone: "progress", badge: "In progress", Icon: Cpu, detail: `${progress.generated_count} of ${progress.prompt_count} scenes generated`, action: "Open Image Review", target: "images" };
  return { tone: "ready", badge: "Ready", Icon: FileJson, detail: "Import Phase", action: "Generate Images", target: "images" };
}

function ReferenceEmptyDashboard({ onCreateProject }) {
  return (
    <section className="reference-empty-dashboard" aria-labelledby="empty-dashboard-title">
      <div className="reference-empty-dashboard-illustration" aria-hidden="true">
        <span className="reference-empty-dashboard-glow" />
        <span className="reference-empty-dashboard-video"><VideoOff size={48} /></span>
        <span className="reference-empty-dashboard-underline" />
      </div>
      <div className="reference-empty-dashboard-copy">
        <h2 id="empty-dashboard-title">No video projects yet</h2>
        <p>Start creating high-quality AI videos by importing your first prompt file.</p>
        <button type="button" className="reference-empty-dashboard-cta" onClick={onCreateProject}><Wand2 size={20} />Create First Project</button>
      </div>
      <div className="reference-empty-dashboard-features" aria-label="Project capabilities">
        <span><Zap size={16} />Fast Generation</span>
        <span><Clapperboard size={16} />HD Resolution</span>
        <span><FileInput size={16} />Batch Processing</span>
      </div>
    </section>
  );
}

function ReferenceDashboardView({ project, videos, onAddChannel, onAddVideo, onOpenVideo }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("updated");
  const items = videos.map((video, index) => {
    const progress = studioApi.getVideoProjectProgress(project, video.video_id);
    return { video, progress, presentation: getProjectPresentation(progress), index, importedAt: Date.parse(video.imported_at || "") || 0 };
  });
  const filtered = items.filter(({ progress, presentation }) => {
    if (filter === "all") return true;
    if (filter === "complete") return progress.phase === "complete";
    if (filter === "attention") return presentation.tone === "attention";
    if (filter === "progress") return presentation.tone === "progress";
    return presentation.tone === "ready";
  }).sort((left, right) => {
    if (sort === "attention") return Number(right.presentation.tone === "attention") - Number(left.presentation.tone === "attention");
    if (sort === "completion") return right.progress.percentage - left.progress.percentage;
    return right.importedAt - left.importedAt || left.index - right.index;
  });
  const activeRuns = items.filter(({ progress }) => progress.phase !== "imported" && progress.phase !== "complete").length;
  const completed = items.filter(({ progress }) => progress.phase === "complete").length;

  return (
    <div className="reference-dashboard">
      <header className="reference-dashboard-header">
        <div><h1>Video Projects</h1><p>Track every video from imported prompts to completed media.</p></div>
        <button type="button" className="reference-primary-action" onClick={project ? onAddVideo : onAddChannel}><Plus size={18} />{project ? "Import JSON" : "New Project"}</button>
      </header>
      {project ? (
        <>
          <section className="reference-stats" aria-label="Channel project statistics">
            {[["Total Projects", videos.length, FolderKanban], ["Active Runs", activeRuns, Activity], ["Completed Videos", completed, CheckCircle]].map(([label, value, Icon]) => (
              <div className="reference-stat-card" key={label}><div><span>{label}</span><strong>{value}</strong></div><span className="reference-stat-icon"><Icon size={24} /></span></div>
            ))}
          </section>
          <section className="reference-project-controls" aria-label="Filter and sort video projects">
            <div className="reference-filter-pills">
              {[["all", "All"], ["ready", "Ready"], ["progress", "In Progress"], ["attention", "Attention"], ["complete", "Complete"]].map(([value, label]) => (
                <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
              ))}
            </div>
            <label className="reference-sort"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">Recently Updated</option><option value="attention">Needs Attention</option><option value="completion">Completion %</option></select></label>
          </section>
          {filtered.length ? (
            <section className="reference-project-grid" aria-label="Video projects">
              {filtered.map(({ video, progress, presentation }) => {
                const Icon = presentation.Icon;
                return (
                  <article className={`reference-project-card tone-${presentation.tone}`} key={video.video_id} role="button" tabIndex={0} aria-label={`Open ${video.display_name}`} onClick={() => onOpenVideo(video.video_id, "overview")} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpenVideo(video.video_id, "overview"); } }}>
                    <div className="reference-project-card-heading">
                      <div className="reference-project-title-group"><span className="reference-project-icon"><Icon size={25} /></span><div><h2>{video.display_name}</h2><span><Clapperboard size={13} />{video.prompt_count} scenes</span></div></div>
                      <span className="reference-status-badge">{presentation.badge}</span>
                    </div>
                    <div className="reference-card-progress"><div><strong>{presentation.detail}</strong><span>{progress.percentage}%</span></div><span className="reference-progress-track"><span style={{ width: `${progress.percentage}%` }} /></span></div>
                    <div className="reference-project-card-footer"><span>{progress.phase === "complete" ? "Production complete" : progress.phase === "imported" ? "Imported and ready" : "Updated recently"}</span><button type="button" onClick={(event) => { event.stopPropagation(); onOpenVideo(video.video_id, presentation.target); }}>{presentation.action}</button></div>
                  </article>
                );
              })}
            </section>
          ) : <EmptyState title="No matching projects" description="Choose another production status filter." />}
        </>
      ) : (
        <>
          <section className="reference-stats" aria-label="Channel project statistics">
            {[["Total Projects", 0, Layers], ["Active Runs", 0, PlayCircle], ["Completed Videos", 0, CheckCircle2]].map(([label, value, Icon]) => (
              <div className="reference-stat-card" key={label}><div><span>{label}</span><strong>{value}</strong></div><span className="reference-stat-icon"><Icon size={24} /></span></div>
            ))}
          </section>
          <ReferenceEmptyDashboard onCreateProject={onAddChannel} />
        </>
      )}
    </div>
  );
}

function ReferenceProjectOverviewView({ project, video, onNavigate }) {
  if (!video) return <EmptyState title="Choose a video project" description="Open a project from the Dashboard to review its production progress." />;
  const progress = studioApi.getVideoProjectProgress(project, video.video_id);
  const phases = [["imported", "Imported"], ["image_generation", "Images"], ["image_selection", "Selection"], ["video_generation", "Videos"], ["complete", "Complete"]];
  const activeIndex = Math.max(0, phases.findIndex(([id]) => id === progress.phase));
  const imageComplete = progress.generated_count >= progress.prompt_count && progress.prompt_count > 0;
  const selectionComplete = progress.selected_count >= progress.prompt_count && progress.prompt_count > 0;
  const videoPromptCount = studioApi.getVideoQueueItems(project, video.video_id).filter((item) => !!item.animation_prompt).length;
  const videoComplete = progress.video_complete_count >= videoPromptCount && videoPromptCount > 0;
  const cards = [
    { label: "Image Generation", value: `${progress.generated_count}/${progress.prompt_count}`, description: imageComplete ? "All scene variants generated." : `${Math.max(0, progress.prompt_count - progress.generated_count)} scenes still need images.`, action: "Review", target: "images", Icon: Sparkles, tone: imageComplete ? "complete" : "ready", badge: imageComplete ? "Complete" : "Ready" },
    { label: "Variant Selection", value: `${progress.selected_count}/${progress.prompt_count}`, description: selectionComplete ? "A variant is selected for every scene." : `${Math.max(0, progress.prompt_count - progress.selected_count)} scenes need selection.`, action: selectionComplete ? "Review" : "Select Missing", target: "images", Icon: CheckSquare, tone: selectionComplete ? "complete" : "attention", badge: selectionComplete ? "Complete" : "Attention" },
    { label: "Video Queue", value: `${progress.video_complete_count}/${videoPromptCount}`, description: !videoPromptCount ? "No scenes require animation." : videoComplete ? "All videos are complete." : selectionComplete ? "Prepared for manual launch." : "Select required scenes before launch.", action: "Open Queue", target: "video", Icon: PlayCircle, tone: videoComplete ? "complete" : "ready", badge: videoComplete ? "Complete" : "Ready" },
  ];
  return (
    <div className="reference-project-overview">
      <section className="reference-milestone-section" aria-label="Video project production phases">
        <div className="reference-milestones">
          <div className="reference-milestone-lines" aria-hidden="true">{phases.slice(1).map((phase, index) => <span key={phase[0]} className={index < activeIndex ? "complete" : index === activeIndex ? "current" : ""} />)}</div>
          {phases.map(([id, label], index) => (
            <div key={id} className={`reference-milestone ${index < activeIndex ? "complete" : index === activeIndex ? "current" : "pending"}`}><span className="reference-milestone-dot">{index < activeIndex ? <Check size={17} /> : index === activeIndex ? <i /> : label === "Complete" ? <Trophy size={14} /> : <i />}</span><strong>{label}</strong></div>
          ))}
        </div>
      </section>
      <section className="reference-production-grid" aria-label="Production status">
        {cards.map(({ label, value, description, action, target, Icon, tone, badge }) => (
          <article className={`reference-compact-card tone-${tone}`} key={label}><div><Icon size={19} /><span>{badge}</span></div><strong>{value}</strong><h2>{label}</h2><p>{description}</p><button type="button" onClick={() => onNavigate(target)}>{action}</button></article>
        ))}
      </section>
      <section className="reference-summary-grid">
        <article className="reference-system-summary"><h2>System Summary</h2><div className="reference-pipeline-state"><span>Active Pipeline</span><p><LoaderCircle size={15} />{progress.phase === "complete" ? "Production complete" : "Waiting for user input"}</p></div><div className="reference-summary-metrics"><div><span>Rate</span><strong>{progress.video_failed_count ? "Attention" : "100%"}</strong></div><div><span>Scenes</span><strong>{progress.prompt_count}</strong></div></div></article>
        <article className="reference-activity-card"><div><h2>Activity</h2><button type="button" onClick={() => onNavigate("logs")}>View Logs</button></div><ul><li><span className="activity-icon blue"><MousePointerClick size={13} /></span><div><strong>{progress.selected_count} scene selections confirmed</strong><small>Manual checkpoint</small></div></li><li><span className="activity-icon green"><Sparkles size={13} /></span><div><strong>{progress.generated_count} scene images generated</strong><small>Automated Flow</small></div></li><li><span className="activity-icon muted"><FileInput size={13} /></span><div><strong>Project imported from JSON</strong><small>{video.prompt_count} scenes scoped to this project</small></div></li></ul></article>
      </section>
      <p className="reference-manual-note">Generation starts only after you explicitly confirm in Image Review or Video Queue.</p>
    </div>
  );
}

function AssetsView({ project, onAdd, onEdit, onDelete }) {
  const assets = Array.isArray(project?.assets) ? project.assets : [];
  return (
    <div className="view-stack">
      <PageHeader title="Assets" description="Reusable reference images for this channel." actions={<Button variant="primary" onPress={onAdd}><Plus size={17} />Add asset</Button>} />
      {assets.length ? (
        <div className="asset-grid">
          {assets.map((asset) => {
            const file = primaryAssetFile(asset);
            return (
              <Card key={asset.asset_id} className="asset-card" variant="secondary">
                <Card.Content>
                  <div className="asset-preview">
                    {file?.data_url ? <img src={file.data_url} alt={asset.display_name} /> : <ImageIcon size={26} />}
                  </div>
                  <div className="asset-card-footer">
                    <strong>{asset.display_name}</strong>
                    <div className="row-actions">
                      <Button isIconOnly size="sm" variant="ghost" aria-label={`Edit ${asset.display_name}`} onPress={() => onEdit(asset)}><Pencil size={16} /></Button>
                      <Button isIconOnly size="sm" variant="ghost" aria-label={`Delete ${asset.display_name}`} onPress={() => onDelete(asset)}><Trash2 size={16} /></Button>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={ImageIcon} title="No assets yet" description="Add a name and reference image together." action={<Button variant="primary" onPress={onAdd}><Plus size={17} />Add asset</Button>} />
      )}
    </div>
  );
}

function ImportView({ project, videos, onImport, onResolve, onOpenProject, onAddAsset, onEditAsset, onDeleteAsset, busy }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [mapping, setMapping] = useState({});
  const [tab, setTab] = useState("history");
  const blockedRecords = studioApi.getProjectPromptRecords(project).filter((record) => record.status === "blocked");
  const assets = studioApi.getActiveAssets(project);
  return (
    <div className="view-stack imports-view">
      <PageHeader title="Imports" description="Import prompt JSON, resolve references, and manage reusable assets." actions={<div className="page-action-row"><Button variant="outline" onPress={onAddAsset}>Upload Asset</Button><Button variant="primary" onPress={() => setTab("upload")}>Import JSON</Button></div>} />
      <nav className="studio-subtabs" aria-label="Import workflow sections">
        {IMPORT_TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}>{item.label}{item.id === "references" && blockedRecords.length ? <span>{blockedRecords.length}</span> : null}</button>)}
      </nav>
      {!project ? <EmptyState icon={FileJson} title="Add a channel before importing" description="Imports and assets are stored in the active channel." /> : null}
      {project && tab === "upload" ? (
        <section className="import-upload-panel studio-surface-panel">
          <div className="section-heading"><div><h2>Import JSON</h2><p>Create one video project from a prompt-index JSON file.</p></div><Button variant="ghost" onPress={() => setTab("history")}>Cancel</Button></div>
          <label className="field-label">Video name <span className="optional">Optional</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <DropZone file={file} onFile={setFile} accept=".json,application/json" label="Drop the video JSON here" hint="file_name and image_prompt are required; animation_prompt is optional" />
          <p className="muted-copy">Importing JSON never starts generation. Image Review remains the first manual checkpoint.</p>
          <Button variant="primary" isDisabled={!file || busy} onPress={() => onImport(file, name.trim())}>{busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}Create video project</Button>
        </section>
      ) : null}
      {project && tab === "history" ? (
        <section className="studio-surface-panel import-history-list">
          <div className="section-heading"><div><h2>Import History</h2><p>Every JSON import creates a project-scoped video workspace.</p></div><Chip variant="soft">{videos.length}</Chip></div>
          {videos.length ? <div className="compact-list">{videos.map((video) => <div className="compact-row" key={video.video_id}><FileJson size={17} /><div><strong>{video.display_name}</strong><small>{video.source_name || "Imported JSON"} · {video.prompt_count} scenes</small></div><Button size="sm" variant="secondary" onPress={() => onOpenProject(video.video_id)}>Open Project Overview</Button></div>)}</div> : <EmptyState icon={FileJson} title="No video projects yet" description="Import a JSON file to create the first project." action={<Button variant="primary" onPress={() => setTab("upload")}>Import JSON</Button>} />}
        </section>
      ) : null}
      {project && tab === "references" ? (
        <section className="resolve-section studio-surface-panel">
          <div className="section-heading"><div><h2>Needs References</h2><p>Uploading an asset automatically rechecks unresolved references and matches compatible names.</p></div><Chip color="warning" variant="soft">{blockedRecords.length}</Chip></div>
          {blockedRecords.length ? <div className="resolve-list">{blockedRecords.flatMap((record) => (record.blocked_references || []).map((reference) => {
            const key = `${record.prompt_id}:${reference.reference_index}`;
            return <div className="resolve-row" key={key}><div><strong>{studioApi.sceneTitleFromFileName(record.file_name)}</strong><span>{reference.name || "Unnamed reference"}</span></div><select value={mapping[key] || ""} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))}><option value="">Choose asset</option>{assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.display_name}</option>)}</select><div className="row-actions"><Button size="sm" variant="outline" onPress={onAddAsset}>Upload Asset</Button><Button size="sm" variant="secondary" isDisabled={!mapping[key]} onPress={() => onResolve(record.prompt_id, reference.reference_index, mapping[key])}>Link Asset</Button></div></div>;
          }))}</div> : <EmptyState icon={CheckCircle} title="All references are resolved" description="Uploaded assets are automatically rechecked against imported prompt references." action={<Button variant="secondary" onPress={() => setTab("library")}>Open Assets</Button>} />}
        </section>
      ) : null}
      {project && tab === "library" ? (
        <section className="studio-surface-panel import-library">
          <div className="section-heading"><div><h2>Assets</h2><p>Reusable channel assets used to resolve imported scene references.</p></div><Button variant="primary" onPress={onAddAsset}>Upload Asset</Button></div>
          {assets.length ? <div className="asset-grid">{assets.map((asset) => { const assetFile = primaryAssetFile(asset); return <Card key={asset.asset_id} className="asset-card" variant="secondary"><Card.Content><div className="asset-preview">{assetFile?.data_url ? <img src={assetFile.data_url} alt={asset.display_name} /> : <ImageIcon size={26} />}</div><div className="asset-card-footer"><strong>{asset.display_name}</strong><div className="row-actions"><Button isIconOnly size="sm" variant="ghost" aria-label={`Edit ${asset.display_name}`} onPress={() => onEditAsset(asset)}><Pencil size={16} /></Button><Button isIconOnly size="sm" variant="ghost" aria-label={`Delete ${asset.display_name}`} onPress={() => onDeleteAsset(asset)}><Trash2 size={16} /></Button></div></div></Card.Content></Card>; })}</div> : <EmptyState icon={ImageIcon} title="No assets yet" description="Upload a reusable reference image for imported prompts." action={<Button variant="primary" onPress={onAddAsset}>Upload Asset</Button>} />}
        </section>
      ) : null}
    </div>
  );
}

function getProjectImageSettings(project) {
  const settings = project?.settings || {};
  return {
    imageModel: settings.image_model || settings.imageModel || "NARWHAL",
    imageRatio: settings.image_ratio || settings.imageRatio || "IMAGE_ASPECT_RATIO_LANDSCAPE",
    imageCount: Number(settings.image_count || settings.imageCount || 2),
    speedMode: settings.image_speed_mode || settings.speedMode || "fast",
  };
}



function ImageReviewView({ project, video, flowContext, busy, onRefreshConnection, onGenerate, onStop, onRetry, onSelect }) {
  const [settings, setSettings] = useState(() => getProjectImageSettings(project));
  const [tab, setTab] = useState("generate");
  useEffect(() => setSettings(getProjectImageSettings(project)), [project?.project_id]);
  if (!video) return <EmptyState icon={Images} title="Choose a video" description="Image Review is organized one video at a time." />;
  const records = studioApi.getVideoPromptRecords(project, video.video_id);
  const variants = studioApi.getProjectImageVariants(project);
  const gate = studioApi.getImageGenerationGate(project, video.video_id);
  const runs = studioApi.getProjectImageGenerationRuns(project)
    .filter((run) => run.video_id === video.video_id)
    .sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
  const activeRun = runs.find((run) => run.status === "generating") || null;
  const latestRun = activeRun || runs[0] || null;
  const retryableRun = runs.find((run) => ["failed", "partial", "stopped"].includes(run.status)) || null;
  const expectedVariants = latestRun ? Number(latestRun.prompt_count || 0) * Number(latestRun.image_count || 1) : 0;
  const generatedVariants = latestRun
    ? variants.filter((variant) => variant.image_run_id === latestRun.image_run_id).length
    : 0;
  const progress = expectedVariants ? Math.min(100, Math.round((generatedVariants / expectedVariants) * 100)) : 0;
  const flowStatus = String(flowContext?.status || "disconnected").toLowerCase();
  const connected = flowStatus === "connected";
  const rows = records.map((record) => ({
    record,
    variants: variants.filter((variant) => variant.prompt_id === record.prompt_id).sort((left, right) => Number(left.variant_index || 0) - Number(right.variant_index || 0)),
  })).filter((row) => row.variants.length);
  return (
    <div className="view-stack">
      <PageHeader title="Image Review" description="Review and select one generated image per scene. Selection never starts video generation." actions={
        <div className="flow-connection" aria-live="polite">
          <span className={`connection-dot ${connected ? "connected" : "disconnected"}`} aria-hidden="true" />
          <span><strong>Flow connection</strong>{connected ? "Connected" : "Disconnected"}</span>
          <Button isIconOnly size="sm" variant="ghost" aria-label="Refresh Flow connection" onPress={onRefreshConnection}><RefreshCw size={16} /></Button>
        </div>
      } />
      <nav className="studio-subtabs" aria-label="Image Review sections">{IMAGE_REVIEW_TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
      {tab === "generate" ? <>
      <section className="generation-console" aria-labelledby="image-generation-heading">
        <div className="generation-console-heading">
          <div><span className="eyebrow">Manual checkpoint</span><h3 id="image-generation-heading">Generate image variants</h3><p>Review the settings, then start only this video's ready scenes.</p></div>
          <div className="generation-counts"><Chip size="sm" color="success" variant="soft">{gate.ready_count} ready</Chip>{gate.blocked_count ? <Chip size="sm" color="warning" variant="soft">{gate.blocked_count} blocked</Chip> : null}</div>
        </div>
        <fieldset className="generation-settings" disabled={!!activeRun || !!busy}>
          <legend>Image generation settings</legend>
          <label htmlFor="studio-image-model"><span>Model</span><select id="studio-image-model" value={settings.imageModel} onChange={(event) => setSettings((current) => ({ ...current, imageModel: event.target.value }))}><option value="GEM_PIX_2">Nano Banana Pro</option><option value="NARWHAL">Nano Banana 2</option></select></label>
          <label htmlFor="studio-image-ratio"><span>Aspect ratio</span><select id="studio-image-ratio" value={settings.imageRatio} onChange={(event) => setSettings((current) => ({ ...current, imageRatio: event.target.value }))}><option value="IMAGE_ASPECT_RATIO_LANDSCAPE">16:9</option><option value="IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE">4:3</option><option value="IMAGE_ASPECT_RATIO_SQUARE">1:1</option><option value="IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR">3:4</option><option value="IMAGE_ASPECT_RATIO_PORTRAIT">9:16</option></select></label>
          <label htmlFor="studio-image-count"><span>Images per prompt</span><select id="studio-image-count" value={settings.imageCount} onChange={(event) => setSettings((current) => ({ ...current, imageCount: Number(event.target.value) }))}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
          <label htmlFor="studio-image-speed"><span>Speed</span><select id="studio-image-speed" value={settings.speedMode} onChange={(event) => setSettings((current) => ({ ...current, speedMode: event.target.value }))}><option value="fast">Fast</option><option value="balanced">Balanced</option><option value="slow">Slow</option></select></label>
        </fieldset>
        <div className="generation-actions">
          <div><strong>{connected ? `${gate.ready_count} scenes can start` : "Open Google Flow to connect"}</strong><span>Generation spends Flow credits only after you press Generate images.</span></div>
          <Button variant="primary" isDisabled={!connected || !gate.ready_count || !!activeRun || !!busy} onPress={() => onGenerate(settings)}>{busy === "generate-images" ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}Generate images</Button>
        </div>
        {latestRun ? (
          <div className={`image-run-summary status-${latestRun.status}`}>
            <div className="image-run-title"><div><strong>{activeRun ? "Generation in progress" : `Last run: ${latestRun.status}`}</strong><span>{generatedVariants} of {expectedVariants} variants received</span></div><Chip size="sm" color={statusColor(latestRun.status)} variant="soft">{latestRun.status}</Chip></div>
            <ProgressBar aria-label="Image generation progress" value={progress} color="accent"><ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track></ProgressBar>
            <div className="image-run-actions">{activeRun ? <Button size="sm" variant="danger-soft" isDisabled={!!busy} onPress={() => onStop(activeRun.image_run_id)}><Square size={15} />Stop</Button> : null}{!activeRun && retryableRun ? <Button size="sm" variant="outline" isDisabled={!!busy} onPress={() => onRetry(retryableRun.image_run_id)}><RefreshCw size={15} />Retry failed</Button> : null}</div>
            {latestRun.request_items?.length ? <div className="image-prompt-queue" aria-label="Image prompt queue">{latestRun.request_items.map((item) => { const promptStatus = latestRun.prompt_statuses?.[item.prompt_id]?.status || (latestRun.status === "generating" ? "queued" : latestRun.status); return <div key={item.prompt_id}><span>{studioApi.sceneTitleFromFileName(item.file_name)}</span><Chip size="sm" color={statusColor(promptStatus)} variant="soft">{promptStatus}</Chip></div>; })}</div> : null}
          </div>
        ) : null}
      </section>
      </> : null}
      {tab === "select" && (rows.length ? <div className="review-list">{rows.map(({ record, variants: sceneVariants }) => (
        <section className="scene-review" key={record.prompt_id}>
          <div className="scene-review-heading"><h3>{studioApi.sceneTitleFromFileName(record.file_name)}</h3><span>{sceneVariants.length} options</span></div>
          <div className="variant-grid">{sceneVariants.map((variant) => {
            const selected = record.selected_variant_id === variant.variant_id || variant.is_selected;
            return (
              <button className={`variant-choice ${selected ? "selected" : ""}`} key={variant.variant_id} type="button" aria-pressed={selected} onClick={() => onSelect(record.prompt_id, variant.variant_id)}>
                <span className="variant-media">
                  <CachedPreviewImage
                    value={variant}
                    alt={`${studioApi.sceneTitleFromFileName(record.file_name)} option ${Number(variant.variant_index || 0) + 1}`}
                  />
                </span>
                <span className="variant-label">Option {Number(variant.variant_index || 0) + 1}</span>
                {selected ? <span className="selected-mark"><Check size={16} /></span> : null}
              </button>
            );
          })}</div>
        </section>
      ))}</div> : <EmptyState icon={Images} title="No generated images" description="Generate images for this video, then review them here." />)}
    </div>
  );
}

function VideoQueueView({ project, video, runner, onRunAll, onRunSelected, onPause, onContinue, onQueue, onRun, onStop, onHold, onMove, onRemove, onOpenImages }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPromptIds, setSelectedPromptIds] = useState(() => new Set());

  useEffect(() => {
    setSelectionMode(false);
    setSelectedPromptIds(new Set());
  }, [video?.video_id]);

  if (!video) return <EmptyState icon={ListVideo} title="Choose a video" description="Video Queue is organized one video at a time." />;

  const runnableItems = studioApi.getVideoQueueItems(project, video.video_id).filter((item) => !!item.animation_prompt);
  const completed = runnableItems.filter((item) => item.status === "complete").length;
  const hasRunnableWork = runnableItems.some((item) => {
    return (item.status === "draft" && item.selected_variant_id) || item.can_run || item.can_retry || item.can_queue || item.can_create_draft;
  });
  const activeRunner = runner.videoId === video.video_id;
  const toggleSelected = (promptId) => {
    setSelectedPromptIds((current) => {
      const next = new Set(current);
      if (next.has(promptId)) next.delete(promptId);
      else next.add(promptId);
      return next;
    });
  };
  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedPromptIds(new Set());
  };
  const runSelected = () => {
    const promptIds = [...selectedPromptIds];
    if (!promptIds.length) return;
    cancelSelection();
    onRunSelected(promptIds);
  };
  const runnerControl = activeRunner && runner.status === "running"
    ? <Button variant="outline" onPress={onPause}><CirclePause size={17} />Pause after current</Button>
    : activeRunner && runner.status === "paused"
      ? <Button variant="primary" onPress={onContinue}><Play size={17} />Continue</Button>
      : <Button className="queue-run-all" variant="primary" isDisabled={!hasRunnableWork || (runnableItems.length > 0 && completed === runnableItems.length)} onPress={onRunAll}><Play size={17} />Run all</Button>;
  const selectionControls = selectionMode
    ? <><Button variant="outline" onPress={cancelSelection}>Cancel</Button><Button className="queue-run-selected" variant="primary" isDisabled={!selectedPromptIds.size} onPress={runSelected}><Play size={17} />Run {selectedPromptIds.size}</Button></>
    : <Button className="queue-select-videos" variant="secondary" isDisabled={!hasRunnableWork || (activeRunner && runner.status !== "idle")} onPress={() => setSelectionMode(true)}>Select Videos</Button>;

  return (
    <div className="view-stack">
      <PageHeader title="Video Queue" description="Production queue for the current active project." actions={<>{selectionControls}{runnerControl}</>} />
      {activeRunner && runner.status !== "idle" ? (
        <div className={`runner-banner ${runner.status}`}>
          {runner.status === "running" ? <LoaderCircle className="spin" size={18} /> : <AlertCircle size={18} />}
          <div><strong>{runner.status === "running" ? "Running sequentially" : "Queue paused"}</strong><span>{runner.error || `${completed} of ${runnableItems.length} complete`}</span></div>
        </div>
      ) : null}
      {runnableItems.length ? <div className="queue-list">{runnableItems.map((item) => {
        const canQueue = item.can_queue || item.can_create_draft;
        const isSelectable = !!((item.status === "draft" && item.selected_variant_id) || item.can_run || item.can_retry || canQueue);
        const showReason = item.status === "not_ready" || item.status === "needs_review" || item.status === "failed";
        const detailText = showReason ? item.reason : item.animation_prompt || item.reason;
        return (
          <Card key={item.prompt_id} className={`queue-card status-${item.status} ${selectedPromptIds.has(item.prompt_id) ? "is-selected" : ""}`} variant="secondary">
            <Card.Content className="queue-card-content">
              {selectionMode ? <label className="queue-selection"><input type="checkbox" checked={selectedPromptIds.has(item.prompt_id)} disabled={!isSelectable} onChange={() => toggleSelected(item.prompt_id)} /><span className="sr-only">Select {item.scene_title}</span></label> : null}
              <div className="queue-preview">{item.selected_variant_id ? <CachedPreviewImage value={{ preview_url: item.selected_preview_url, cache_key: item.selected_cache_key, cached_file_name: item.selected_cached_file_name, generated_file_name: item.selected_file_name, media_id: item.selected_media_id, fife_url: item.selected_fife_url }} alt={item.scene_title} /> : <span className="preview-placeholder"><ImageIcon size={24} /></span>}</div>
              <div className="queue-main"><div className="queue-title-row"><h3>{item.scene_title}</h3><Chip size="sm" color="accent" variant="soft">Video</Chip><Chip size="sm" color={statusColor(item.status)} variant="soft">{item.status_label}</Chip></div><p className={showReason ? "queue-error" : ""}>{detailText}</p></div>
              <div className="queue-actions">
                {!item.selected_variant_id ? <Button size="sm" variant="outline" onPress={onOpenImages}>Select image</Button> : null}
                {canQueue ? <Button size="sm" variant="secondary" onPress={() => onQueue(item.prompt_id)}>Add to queue</Button> : null}
                {item.can_run || item.can_retry ? <Button size="sm" variant={item.can_retry ? "outline" : "secondary"} onPress={() => onRun(item.job_id)}>{item.can_retry ? <RefreshCw size={15} /> : <Play size={15} />}{item.can_retry ? "Retry" : "Run"}</Button> : null}
                {item.can_stop ? <Button size="sm" variant="danger-soft" onPress={() => onStop(item.job_id)}><Square size={15} />Stop</Button> : null}
                {item.can_hold ? <Button size="sm" variant="outline" onPress={() => onHold(item.job_id)}><CirclePause size={15} />Hold</Button> : null}
                {item.can_move ? <Button isIconOnly size="sm" variant="ghost" aria-label={`Move ${item.scene_title} up`} onPress={() => onMove(item.job_id, "up")}><ArrowUp size={15} /></Button> : null}
                {item.can_move ? <Button isIconOnly size="sm" variant="ghost" aria-label={`Move ${item.scene_title} down`} onPress={() => onMove(item.job_id, "down")}><ArrowDown size={15} /></Button> : null}
                {item.can_remove ? <Button isIconOnly size="sm" variant="ghost" aria-label={`Remove ${item.scene_title} from queue`} onPress={() => onRemove(item.job_id)}><Trash2 size={15} /></Button> : null}
              </div>
            </Card.Content>
          </Card>
        );
      })}</div> : <EmptyState icon={ListVideo} title="No video-ready scenes" description="Only scenes with an animation prompt appear in Video Queue." action={<Button variant="outline" onPress={onOpenImages}>Open Image Review</Button>} />}
    </div>
  );
}

function MediaView({ project, video, onSync, onDownload, onDownloadAll, busy }) {
  const folderInput = useRef(null);
  const [tab, setTab] = useState("all");
  if (!video) return <EmptyState icon={LayoutGrid} title="Choose a video" description="Media is organized one video at a time." />;

  const promptIds = new Set(video.prompt_ids || []);
  const projectMedia = studioApi.getProjectGalleryItems(project).items.filter((item) => promptIds.has(item.prompt_id));
  const media = projectMedia.filter((item) => item.type === "video" || item.is_selected);
  const visibleMedia = media.filter((item) => tab === "all" || item.type === tab.slice(0, -1));
  const countForTab = (tabId) => tabId === "all"
    ? media.length
    : media.filter((entry) => entry.type === tabId.slice(0, -1)).length;

  return (
    <div className="view-stack">
      <PageHeader title="Media" description="Selected images and completed videos for this project." actions={<><Button variant="outline" isDisabled={busy} onPress={() => folderInput.current?.click()}><FolderSync size={17} />Sync Folder</Button><Button variant="primary" isDisabled={busy || !media.length} onPress={() => onDownloadAll(media)}><Download size={17} />Download All</Button><input ref={folderInput} type="file" hidden multiple webkitdirectory="" onChange={(event) => { onSync(event.target.files); event.target.value = ""; }} /></>} />
      <nav className="studio-subtabs" aria-label="Media sections">{MEDIA_TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}>{item.label}<span>{countForTab(item.id)}</span></button>)}</nav>
      {visibleMedia.length ? <div className="media-grid">{visibleMedia.map((item) => {
        const title = studioApi.sceneTitleFromFileName(item.prompt_file_name || item.output_file_name);
        return <Card key={`${item.type}:${item.id}`} className="media-card" variant="secondary"><Card.Content>{item.type === "video" && item.video_url ? <video controls preload="metadata" src={item.video_url} /> : item.type === "image" ? <CachedPreviewImage value={item} alt={title} placeholderClassName="media-placeholder" /> : <span className="media-placeholder"><ImageIcon size={24} /></span>}<div className="media-card-copy"><strong>{title}</strong><Chip size="sm" color={statusColor(item.is_selected || item.type === "video" ? "complete" : "draft")} variant="soft">{item.status_label}</Chip></div><Button size="sm" variant="outline" isDisabled={busy} onPress={() => onDownload(item)}><Download size={15} />Download</Button></Card.Content></Card>;
      })}</div> : <EmptyState icon={LayoutGrid} title={`No ${tab === "all" ? "media" : tab} yet`} description={tab === "all" ? "Selected images and completed videos appear here." : `This video project has no ${tab} yet.`} />}
    </div>
  );
}

function LogsView({ logs, onClear }) {
  const [query, setQuery] = useState("");
  const filtered = logs.filter((entry) => !query || String(entry.message || "").toLowerCase().includes(query.toLowerCase()));
  const recentErrorCount = logs.filter((entry) => entry.type === "error").length;
  const warningCount = logs.filter((entry) => entry.type === "warn" || entry.type === "warning").length;
  return (
    <div className="view-stack logs-view">
      <PageHeader title="Logs" description="Recent Studio and generation activity." actions={<Button variant="ghost" onPress={onClear}>Clear</Button>} />
      <section className="log-summary" aria-label="Log summary">
        <article className="log-summary-card errors"><AlertCircle size={20} /><div><h2>Recent errors</h2><strong>{recentErrorCount}</strong><p>Errors that may need your attention.</p></div></article>
        <article className="log-summary-card warnings"><AlertCircle size={20} /><div><h2>Warnings</h2><strong>{warningCount}</strong><p>Non-blocking issues worth reviewing.</p></div></article>
      </section>
      <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search logs" /></label>
      {filtered.length ? <div className="log-list">{filtered.slice().reverse().map((entry) => <div className={`log-row log-${entry.type}`} key={entry.id}><span>{entry.time || ""}</span><Chip size="sm" color={statusColor(entry.type === "error" ? "failed" : entry.type === "warn" ? "paused" : "draft")} variant="soft">{entry.type}</Chip><p>{entry.message}</p></div>)}</div> : <EmptyState icon={Activity} title="No matching logs" />}
    </div>
  );
}

function ReferenceSidebar({ project, videos, activeVideo, view, flowContext, recentErrorCount, onNavigate, onOpenVideo, onAddVideo }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const recentProjects = videos.filter((video) => !normalizedQuery || video.display_name.toLowerCase().includes(normalizedQuery)).slice(0, 8);
  const flowStatus = String(flowContext?.status || "disconnected").toLowerCase();
  const flowLabel = flowStatus === "connected" ? "Flow connected" : flowStatus === "reconnect_required" ? "Reconnect required" : "Flow disconnected";
  return (
    <aside className="studio-sidebar">
      <div className="studio-brand"><span className="brand-symbol"><Zap size={20} /></span><strong>AutoFlow</strong></div>
      <nav aria-label="Studio navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return <button key={item.id} type="button" className={`studio-nav-item ${view === item.id ? "active" : ""}`} onClick={() => onNavigate(item.id)} title={item.label}><Icon size={18} /><span>{item.label}</span>{item.id === "logs" && recentErrorCount > 0 ? <em className="sidebar-error-count" aria-label={`${recentErrorCount} recent errors`}>{recentErrorCount}</em> : null}</button>;
        })}
      </nav>
      <section className="sidebar-projects" aria-label="Video projects">
        <div className="sidebar-section-title"><span>Video Projects</span>{project ? <button type="button" aria-label="Import a video project" onClick={onAddVideo}><Plus size={15} /></button> : null}</div>
        {project ? <><label className="sidebar-project-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." aria-label="Search video projects" /></label>
        <div className="sidebar-project-list">
          {recentProjects.map((video) => {
            const progress = studioApi.getVideoProjectProgress(project, video.video_id);
            const presentation = getProjectPresentation(progress);
            const isActive = activeVideo?.video_id === video.video_id && PROJECT_TABS.some((tab) => tab.id === view);
            const projectNumber = videos.findIndex((entry) => entry.video_id === video.video_id) + 1;
            return <button key={video.video_id} type="button" className={`sidebar-project tone-${presentation.tone} ${isActive ? "active" : ""}`} onClick={() => onOpenVideo(video.video_id, "overview")}><span className="project-number" aria-hidden="true">{projectNumber}</span><strong>{video.display_name}</strong></button>;
          })}
        </div></> : <p className="sidebar-projects-empty">No projects created</p>}
      </section>
      <footer className="studio-sidebar-footer">
        <div className={`sidebar-flow-status status-${flowStatus}`} role="status"><span aria-hidden="true" /><strong>{flowLabel}</strong></div>
        <button type="button" className={`studio-nav-item ${view === "profile" ? "active" : ""}`} onClick={() => onNavigate("profile")}><UserRound size={18} /><span>Profile</span></button>
      </footer>
    </aside>
  );
}

function exportVideoProject(project, video) {
  if (!project || !video) return;
  const promptIds = new Set(video.prompt_ids || []);
  const payload = {
    channel: { project_id: project.project_id, display_name: project.display_name },
    video,
    prompts: (project.prompt_records || []).filter((record) => promptIds.has(record.prompt_id)),
    image_variants: (project.image_variants || []).filter((variant) => promptIds.has(variant.prompt_id)),
    video_jobs: (project.video_jobs || []).filter((job) => promptIds.has(job.prompt_id)),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${video.display_name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "video-project"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ProfileView({ project, videos, flowContext }) {
  const flowConnected = String(flowContext?.status || "disconnected").toLowerCase() === "connected";
  const channelName = project?.display_name || "Local Studio";
  const initials = channelName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "AF";
  return (
    <div className="profile-view">
      <PageHeader title="Profile" description="Local workspace identity and browser-session details." />
      <div className="profile-grid">
        <section className="profile-card profile-identity"><span className="profile-avatar">{initials}</span><h2>{channelName}</h2><p>Chrome extension profile</p><dl><div><dt>Workspace</dt><dd>Local Studio</dd></div><div><dt>Projects</dt><dd>{videos.length}</dd></div><div><dt>Last active</dt><dd>Now</dd></div></dl></section>
        <section className="profile-card profile-details"><h2>Local identity</h2><p>AutoFlow keeps project data, media references, and workflow state on this device.</p><dl><div><dt>Active channel</dt><dd>{channelName}</dd></div><div><dt>Storage</dt><dd>Chrome local storage</dd></div><div><dt>Account model</dt><dd>Single-user workspace</dd></div></dl></section>
        <section className="profile-card profile-flow"><span className={`connection-dot ${flowConnected ? "connected" : "disconnected"}`} /><div><h2>Flow session</h2><p>{flowConnected ? "Connected to Google Flow" : "Open Google Flow to reconnect"}</p></div></section>
      </div>
    </div>
  );
}

function ProjectStatusCards({ project, video, onNavigate }) {
  if (!video) return null;
  const progress = studioApi.getVideoProjectProgress(project, video.video_id);
  const eligibleVideos = studioApi.getVideoQueueItems(project, video.video_id).filter((item) => !!item.animation_prompt);
  const completedVideos = eligibleVideos.filter((item) => item.status === "complete").length;
  const imageComplete = progress.prompt_count > 0 && progress.generated_count >= progress.prompt_count;
  const selectionComplete = progress.prompt_count > 0 && progress.selected_count >= progress.prompt_count;
  const videoComplete = eligibleVideos.length > 0 && completedVideos >= eligibleVideos.length;
  const cards = [
    { label: "Image Generation", value: `${progress.generated_count}/${progress.prompt_count}`, detail: imageComplete ? "All scene variants generated." : `${Math.max(0, progress.prompt_count - progress.generated_count)} scenes still need images.`, tone: imageComplete ? "complete" : "ready", badge: imageComplete ? "Complete" : "Ready", target: "images", Icon: Sparkles },
    { label: "Variant Selection", value: `${progress.selected_count}/${progress.prompt_count}`, detail: selectionComplete ? "A variant is selected for every scene." : `${Math.max(0, progress.prompt_count - progress.selected_count)} scenes need selection.`, tone: selectionComplete ? "complete" : "attention", badge: selectionComplete ? "Complete" : "Attention", target: "images", Icon: CheckSquare },
    { label: "Video Queue", value: String(eligibleVideos.length), detail: videoComplete ? "All eligible videos are complete." : `${completedVideos}/${eligibleVideos.length} eligible videos complete.`, tone: videoComplete ? "complete" : "ready", badge: videoComplete ? "Complete" : "Ready", target: "video", Icon: PlayCircle },
  ];
  return <section className="project-status-cards" aria-label="Project production status">{cards.map(({ label, value, detail, tone, badge, target, Icon }) => <article key={label} className={`project-status-card tone-${tone}`}><div><Icon size={19} /><span>{badge}</span></div><strong>{value}</strong><h2>{label}</h2><p>{detail}</p><button type="button" onClick={() => onNavigate(target)}>{target === "video" ? "Open Queue" : "Review"}</button></article>)}</section>;
}

function ProjectWorkspaceHeader({ project, video, view, onNavigate }) {
  if (!video) return null;
  const progress = studioApi.getVideoProjectProgress(project, video.video_id);
  const phaseLabel = ({ imported: "Imported", image_generation: "Image Generation", image_selection: "Image Selection", video_generation: "Video Generation", complete: "Complete" })[progress.phase] || "Imported";
  const manageTarget = progress.phase === "video_generation" ? "video" : progress.phase === "complete" ? "media" : "images";
  return (
    <header className="reference-project-header">
      <div className="reference-project-header-inner">
        <div className="reference-project-heading-row">
          <div className="reference-project-heading">
            <div><h1>{video.display_name}</h1><p><span>{video.prompt_count} scenes</span><i /><strong>{phaseLabel}</strong><i /><span>Updated recently</span></p></div>
          </div>
          <div className="reference-project-actions"><button type="button" onClick={() => exportVideoProject(project, video)}>Export Data</button><button type="button" onClick={() => onNavigate(manageTarget)}>Manage Project</button></div>
        </div>
        <ProjectStatusCards project={project} video={video} onNavigate={onNavigate} />
        <nav className="reference-project-tabs" aria-label="Video project sections">
          {PROJECT_TABS.map((tab) => <button type="button" key={tab.id} className={view === tab.id ? "active" : ""} aria-current={view === tab.id ? "page" : undefined} onClick={() => onNavigate(tab.id)}>{tab.label}</button>)}
        </nav>
      </div>
    </header>
  );
}

function StudioApp() {
  const [snapshot, setSnapshot] = useState(() => captureStudioState());
  const [view, setView] = useState(() => getViewFromLocationHash());
  const [activeVideoId, setActiveVideoId] = useState("");
  const [busy, setBusy] = useState("");
  const [dialog, setDialog] = useState(null);
  const [runner, setRunner] = useState({ status: "idle", videoId: "", currentJobId: "", error: "", promptIds: null });
  const runnerRef = useRef(runner);
  const runNextRef = useRef(null);

  const capture = useCallback(() => setSnapshot(captureStudioState()), []);
  const refresh = useCallback(async () => {
    await studioApi.loadProjectState();
    await studioApi.refreshFlowContext({ persist: false });
    capture();
  }, [capture]);

  useEffect(() => {
    refresh().catch((error) => toast.danger(error.message));
    const storageListener = (changes, areaName) => {
      if (areaName === "local" && (changes[domainApi.STORAGE_KEY] || changes.flowAutoLogs)) {
        refresh().catch(() => {});
      }
    };
    chrome.storage?.onChanged?.addListener(storageListener);
    return () => chrome.storage?.onChanged?.removeListener(storageListener);
  }, [refresh]);

  const project = snapshot.activeProject;
  const projects = snapshot.domainState?.projects || [];
  const videos = useMemo(() => (project ? studioApi.getProjectVideos(project) : []), [project]);
  const activeVideo = videos.find((video) => video.video_id === activeVideoId) || videos[0] || null;
  const recentErrorCount = (snapshot.logs || []).filter((entry) => entry.type === "error").slice(-99).length;

  useEffect(() => {
    if (!activeVideoId || !videos.some((video) => video.video_id === activeVideoId)) {
      setActiveVideoId(videos[0]?.video_id || "");
    }
  }, [videos, activeVideoId]);

  useEffect(() => {
    const syncViewFromHash = () => setView(getViewFromLocationHash());
    globalThis.addEventListener?.("hashchange", syncViewFromHash);
    return () => globalThis.removeEventListener?.("hashchange", syncViewFromHash);
  }, []);

  const setRunnerState = useCallback((next) => {
    const value = typeof next === "function" ? next(runnerRef.current) : next;
    runnerRef.current = value;
    setRunner(value);
  }, []);

  const pauseRunner = useCallback(async (error) => {
    const message = String(error?.message || error || "Video generation failed.");
    setRunnerState((current) => ({ ...current, status: "paused", currentJobId: "", error: message }));
    await studioApi.appendStudioLog(`Video queue paused: ${message}`, "error");
    capture();
    toast.danger("Video queue paused", { description: message });
  }, [capture, setRunnerState]);

  const runNext = useCallback(async (videoId, promptIds = null) => {
    try {
      await studioApi.loadProjectState();
      let currentProject = studioApi.getState().activeProject;
      const selectedIds = promptIds?.length ? new Set(promptIds) : null;
      const eligibleItems = (items) => items.filter((item) => {
        return !!item.animation_prompt && (!selectedIds || selectedIds.has(item.prompt_id));
      });
      let items = eligibleItems(studioApi.getVideoQueueItems(currentProject, videoId));
      for (const item of items) {
        if ((item.status === "draft" && item.selected_variant_id) || item.can_create_draft) {
          await studioApi.queuePromptVideo(item.prompt_id);
        }
      }
      await studioApi.loadProjectState();
      currentProject = studioApi.getState().activeProject;
      items = eligibleItems(studioApi.getVideoQueueItems(currentProject, videoId));
      const next = items.find((item) => item.status === "ready");
      if (!next) {
        setRunnerState({ status: "idle", videoId, currentJobId: "", error: "", promptIds: null });
        capture();
        toast.success("Video queue complete");
        return;
      }
      const job = await studioApi.runVideoJob(next.job_id);
      setRunnerState({ status: "running", videoId, currentJobId: job.job_id, error: "", promptIds });
      capture();
    } catch (error) {
      await pauseRunner(error);
    }
  }, [capture, pauseRunner, setRunnerState]);
  runNextRef.current = runNext;

  useEffect(() => {
    const runtimeListener = (message) => {
      if (message?.type !== "FROM_BACKGROUND") return;
      studioApi.handleVideoRuntimeMessage(message).then(async (updated) => {
        if (updated) capture();
        const current = runnerRef.current;
        if (!current.currentJobId || message.uiBatchId !== current.currentJobId) return;
        if (message.subType === "PROMPT_STATUS" && message.status === "failed") {
          await pauseRunner(message.error || "Video generation failed.");
          return;
        }
        const complete =
          (message.subType === "PREVIEW_READY" && message.mediaType === "video") ||
          (message.subType === "PROMPT_STATUS" && message.status === "submitted");
        if (!complete) return;
        const shouldContinue = current.status === "running";
        setRunnerState((value) => ({ ...value, currentJobId: "" }));
        if (shouldContinue) await runNextRef.current?.(current.videoId, current.promptIds);
      }).catch((error) => toast.danger(error.message));
    };
    chrome.runtime?.onMessage?.addListener(runtimeListener);
    return () => chrome.runtime?.onMessage?.removeListener(runtimeListener);
  }, [capture, pauseRunner, setRunnerState]);

  async function action(key, task, successMessage) {
    setBusy(key);
    try {
      const result = await task();
      capture();
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (error) {
      toast.danger(error.message || String(error));
      throw error;
    } finally {
      setBusy("");
    }
  }

  async function stopVideo(jobId) {
    const result = await action("stop", () => studioApi.stopVideoJob(jobId), "Video stopped");
    const current = runnerRef.current;
    if (current.currentJobId === jobId) {
      setRunnerState({
        ...current,
        status: "paused",
        currentJobId: "",
        error: "Stopped by user.",
      });
    }
    return result;
  }

  async function selectProject(projectId) {
    await action("project", () => studioApi.setActiveProject(projectId));
    setActiveVideoId("");
  }

  async function addChannel(name) {
    const result = await action("channel-add", () => domainApi.createProject({ display_name: name }), "Channel added");
    await studioApi.setActiveProject(result.project.project_id);
    capture();
    setDialog(null);
  }

  async function importVideo(file, name) {
    const content = await studioApi.readTextFile(file);
    const result = await action("video-import", () => studioApi.importProjectPromptJson(content, file.name, name), "Video imported");
    setActiveVideoId(result.import_record.import_id);
    setView("overview");
    setDialog(null);
    return result;
  }

  const modal = dialog?.type;
  const currentVideo = dialog?.video || null;
  const currentAsset = dialog?.asset || null;

  let content = null;
  if (view === "channels") {
    content = <ReferenceDashboardView project={project} videos={videos} onAddChannel={() => setDialog({ type: "channel-add" })} onAddVideo={() => setDialog({ type: "video-add" })} onOpenVideo={(videoId, target = "overview") => { setActiveVideoId(videoId); setView(target); }} />;
  } else if (view === "overview") {
    content = <div className="view-stack"><PageHeader title="Overview" description="Monitor production progress and continue from the next manual checkpoint." /><ReferenceProjectOverviewView project={project} video={activeVideo} onNavigate={setView} /></div>;
  } else if (view === "assets") {
    content = <AssetsView project={project} onAdd={() => setDialog({ type: "asset-add" })} onEdit={(asset) => setDialog({ type: "asset-edit", asset })} onDelete={(asset) => setDialog({ type: "asset-delete", asset })} />;
  } else if (view === "import") {
    content = <ImportView project={project} videos={videos} busy={!!busy} onImport={importVideo} onResolve={(promptId, referenceIndex, assetId) => action("resolve", () => studioApi.mapPromptReferenceToAsset(promptId, referenceIndex, assetId), "Reference resolved")} onOpenProject={(videoId) => { setActiveVideoId(videoId); setView("overview"); }} onAddAsset={() => setDialog({ type: "asset-add" })} onEditAsset={(asset) => setDialog({ type: "asset-edit", asset })} onDeleteAsset={(asset) => setDialog({ type: "asset-delete", asset })} />;
  } else if (view === "images") {
    content = <ImageReviewView project={project} video={activeVideo} flowContext={snapshot.flowContext} busy={busy} onRefreshConnection={() => action("flow-refresh", () => studioApi.refreshFlowContext(), "Flow connection refreshed")} onGenerate={(settings) => action("generate-images", () => studioApi.startImageGenerationRun(activeVideo.video_id, settings), "Image generation started")} onStop={(runId) => action("stop-images", () => studioApi.stopImageGenerationRun(runId), "Image generation stopped")} onRetry={(runId) => action("retry-images", () => studioApi.retryImageGenerationRun(runId), "Retry started")} onSelect={(promptId, variantId) => action("select-image", () => studioApi.selectImageVariant(promptId, variantId), "Image selected")} />;
  } else if (view === "video") {
    content = <VideoQueueView project={project} video={activeVideo} runner={runner} onRunAll={() => { const next = { status: "running", videoId: activeVideo.video_id, currentJobId: "", error: "", promptIds: null }; setRunnerState(next); runNext(activeVideo.video_id); }} onRunSelected={(selectedPromptIds) => { const next = { status: "running", videoId: activeVideo.video_id, currentJobId: "", error: "", promptIds: selectedPromptIds }; setRunnerState(next); runNext(activeVideo.video_id, selectedPromptIds); }} onPause={() => setRunnerState((current) => ({ ...current, status: "paused", error: "Paused after the current job." }))} onContinue={() => { setRunnerState((current) => ({ ...current, status: "running", error: "" })); runNext(activeVideo.video_id, runner.promptIds); }} onQueue={(promptId) => action("queue", () => studioApi.queuePromptVideo(promptId), "Added to queue")} onRun={(jobId) => action("run", () => studioApi.runVideoJob(jobId), "Video started")} onStop={stopVideo} onHold={(jobId) => action("hold", () => studioApi.holdVideoJob(jobId), "Video held")} onMove={(jobId, direction) => action(`move-${direction}`, () => studioApi.moveVideoJob(jobId, direction))} onRemove={(jobId) => action("remove", () => studioApi.removeVideoJob(jobId), "Removed from queue")} onOpenImages={() => setView("images")} />;
  } else if (view === "media") {
    content = <MediaView project={project} video={activeVideo} busy={!!busy} onSync={(files) => action("sync", () => studioApi.syncProjectMediaFromFiles(files), "Folder synced")} onDownload={(item) => action("download-media", () => studioApi.downloadMediaItem(item, { projectName: project.display_name, videoName: activeVideo.display_name }), "Download started")} onDownloadAll={(items) => action("download-all-media", () => studioApi.downloadMediaItems(items, { projectName: project.display_name, videoName: activeVideo.display_name }), "Downloads started")} />;
  } else if (view === "profile") {
    content = <ProfileView project={project} videos={videos} flowContext={snapshot.flowContext} />;
  } else {
    content = <LogsView logs={snapshot.logs} onClear={() => action("clear-logs", () => studioApi.clearStudioLogs(), "Logs cleared")} />;
  }

  const isProjectView = PROJECT_TABS.some((tab) => tab.id === view) && !!activeVideo;
  if (isProjectView) {
    content = <div className="reference-project-workspace"><ProjectWorkspaceHeader project={project} video={activeVideo} view={view} onNavigate={setView} /><div className={`reference-project-body ${view === "overview" ? "overview" : ""}`}>{content}</div></div>;
  }

  return (
    <>
      <div className="studio-shell">
        <ReferenceSidebar project={project} videos={videos} activeVideo={activeVideo} view={view} flowContext={snapshot.flowContext} recentErrorCount={recentErrorCount} onNavigate={setView} onOpenVideo={(videoId, target = "overview") => { setActiveVideoId(videoId); setView(target); }} onAddVideo={() => setDialog({ type: "video-add" })} />
        <div className="studio-main">
          <main className={`studio-content ${view === "channels" ? "reference-surface" : ""} ${isProjectView ? "reference-project-surface" : ""}`}>{snapshot.lastError ? <div className="fatal-banner"><AlertCircle size={18} />{snapshot.lastError.message}</div> : content}</main>
        </div>
      </div>

      <ChannelDialog open={modal === "channel-add"} onOpenChange={(open) => !open && setDialog(null)} busy={busy === "channel-add"} onSave={addChannel} />
      <VideoDialog open={modal === "video-add" || modal === "video-rename"} mode={modal === "video-rename" ? "rename" : "add"} video={currentVideo} onOpenChange={(open) => !open && setDialog(null)} busy={busy === "video-import" || busy === "video-rename"} onSave={({ name, file }) => modal === "video-rename" ? action("video-rename", () => studioApi.renameProjectVideo(currentVideo.video_id, name), "Video renamed").then(() => setDialog(null)) : importVideo(file, name)} />
      <AssetDialog open={modal === "asset-add" || modal === "asset-edit"} mode={modal === "asset-edit" ? "edit" : "add"} asset={currentAsset} onOpenChange={(open) => !open && setDialog(null)} busy={busy === "asset-save"} onSave={({ name, file }) => action("asset-save", async () => { if (modal === "asset-add") return studioApi.createAssetWithFile({ display_name: name }, [file]); await studioApi.updateAsset(currentAsset.asset_id, { display_name: name }); if (file) await studioApi.replaceAssetFile(currentAsset.asset_id, [file]); }, "Asset saved").then(() => setDialog(null))} />
      <ConfirmDialog open={modal === "asset-delete"} title="Delete asset?" description={`Delete ${currentAsset?.display_name || "this asset"}? Scenes using it will return to Needs Reference.`} onOpenChange={(open) => !open && setDialog(null)} busy={busy === "asset-delete"} onConfirm={() => action("asset-delete", () => studioApi.deleteAsset(currentAsset.asset_id), "Asset deleted").then(() => setDialog(null))} />
      <ConfirmDialog open={modal === "video-delete"} title="Delete video?" description={`Delete ${currentVideo?.display_name || "this video"} and its scenes, generated images, and video jobs?`} onOpenChange={(open) => !open && setDialog(null)} busy={busy === "video-delete"} onConfirm={() => action("video-delete", () => studioApi.deleteProjectVideo(currentVideo.video_id), "Video deleted").then(() => { setActiveVideoId(""); setDialog(null); })} />
      <Toast.Provider placement="top-end" />
    </>
  );
}

const container = document.getElementById("studio-root");
if (!container) throw new Error("Studio root is missing.");
globalThis.__TF_STUDIO_BUNDLE_LOADED = true;
const root = createRoot(container);
globalThis.__TF_STUDIO_RENDER_REQUESTED = true;
flushSync(() => {
  root.render(<StudioErrorBoundary><StudioApp /></StudioErrorBoundary>);
});
globalThis.__TF_STUDIO_MOUNT_COMMITTED = true;
