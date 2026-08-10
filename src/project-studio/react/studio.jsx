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
  CirclePause,
  FileJson,
  FolderOpen,
  FolderSync,
  Image as ImageIcon,
  Images,
  LayoutGrid,
  ListVideo,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Square,
  Trash2,
  Upload,
  Video,
  Tv,
  X,
} from "lucide-react";

const studioApi = globalThis.TFProjectStudioState;
const domainApi = globalThis.TFProjectDomain;

const NAV_ITEMS = [
  { id: "channels", label: "Dashboard", icon: Tv },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "import", label: "Import", icon: Upload },
  { id: "images", label: "Image Review", icon: Images },
  { id: "video", label: "Video Queue", icon: ListVideo },
  { id: "media", label: "Media", icon: LayoutGrid },
  { id: "logs", label: "Logs", icon: Activity },
];

function getViewFromLocationHash() {
  const rawHash = String(globalThis.location?.hash || "").replace(/^#/, "");
  let hash = "";
  try {
    hash = decodeURIComponent(rawHash);
  } catch (error) {
    hash = rawHash;
  }
  return NAV_ITEMS.some((item) => item.id === hash) || hash === "overview" ? hash : "channels";
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

function ChannelsView({ project, videos, onAddChannel, onRenameChannel, onAddVideo, onOpenVideo, onRenameVideo, onDeleteVideo, busy }) {
  const [channelName, setChannelName] = useState(project?.display_name || "");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  useEffect(() => setChannelName(project?.display_name || ""), [project?.project_id, project?.display_name]);
  const projects = videos.map((video) => ({ video, progress: studioApi.getVideoProjectProgress(project, video.video_id) }))
    .filter(({ video, progress }) => {
      if (query.trim() && !video.display_name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      if (filter === "all") return true;
      if (filter === "complete") return progress.phase === "complete";
      if (filter === "progress") return progress.phase !== "imported" && progress.phase !== "complete";
      if (filter === "attention") return progress.video_failed_count > 0;
      return progress.phase === "imported" || progress.phase === "image_generation";
    });
  const phaseLabel = (phase) => ({ imported: "Imported", image_generation: "Image generation", image_selection: "Image selection", video_generation: "Video generation", complete: "Complete" }[phase] || "Imported");
  return (
    <div className="view-stack">
      <PageHeader
        title="Video Projects"
        description={project ? `${videos.length} projects in ${project.display_name}` : "Import a prompt JSON file to begin."}
        actions={<Button variant="primary" onPress={onAddVideo} isDisabled={!project}><Upload size={17} />Import JSON</Button>}
      />
      {project ? (
        <section className="dashboard-controls">
          <div>
            <span className="eyebrow">Channel workspace</span>
            <label className="inline-edit-field">
              <input value={channelName} onChange={(event) => setChannelName(event.target.value)} />
              <Button isIconOnly size="sm" variant="secondary" aria-label="Save channel name" isDisabled={!channelName.trim() || channelName.trim() === project.display_name || busy} onPress={() => onRenameChannel(channelName.trim())}>
                <Save size={16} />
              </Button>
            </label>
          </div>
          <label className="dashboard-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" aria-label="Search video projects" /></label>
        </section>
      ) : null}
      {!project ? (
        <EmptyState title="Add your first channel" description="A channel keeps its videos, assets, images, and queue together." action={<Button variant="primary" onPress={onAddChannel}><Plus size={17} />Add channel</Button>} />
      ) : videos.length ? (
        <><div className="dashboard-filters">{[["all", "All"], ["ready", "Ready for action"], ["progress", "In progress"], ["attention", "Needs attention"], ["complete", "Complete"]].map(([value, label]) => <Button key={value} size="sm" variant={filter === value ? "secondary" : "ghost"} onPress={() => setFilter(value)}>{label}</Button>)}</div>
        <div className="video-list project-list">
          {projects.map(({ video, progress }) => {
            return (
              <Card key={video.video_id} className="video-card" variant="secondary">
                <Card.Content className="video-card-content">
                  <div className="video-icon"><Video size={20} /></div>
                  <div className="video-card-main">
                    <h3>{video.display_name}</h3>
                    <span>{video.prompt_count} scenes · {phaseLabel(progress.phase)}</span>
                    <div className="project-milestones" aria-label={`Project phase: ${phaseLabel(progress.phase)}`}>{["Imported", "Images", "Selection", "Videos", "Complete"].map((label, index) => <span key={label} className={index <= ["imported", "image_generation", "image_selection", "video_generation", "complete"].indexOf(progress.phase) ? "active" : ""}>{label}</span>)}</div>
                    <ProgressBar aria-label="Project completion progress" value={progress.percentage} color="accent">
                      <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
                    </ProgressBar>
                  </div>
                  <div className="row-actions">
                    <Button size="sm" variant="secondary" onPress={() => onOpenVideo(video.video_id)}>Open project</Button>
                    <Button isIconOnly size="sm" variant="ghost" aria-label={`Rename ${video.display_name}`} onPress={() => onRenameVideo(video)}><Pencil size={16} /></Button>
                    <Button isIconOnly size="sm" variant="ghost" aria-label={`Delete ${video.display_name}`} onPress={() => onDeleteVideo(video)}><Trash2 size={16} /></Button>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div></>
      ) : (
        <EmptyState icon={FileJson} title="No videos yet" description="Import one JSON file to create a video." action={<Button variant="primary" onPress={onAddVideo}><Upload size={17} />Import video JSON</Button>} />
      )}
    </div>
  );
}

function ProjectOverviewView({ project, video, onBack, onNavigate }) {
  if (!video) return <EmptyState title="Choose a video project" description="Open a project from the Dashboard to review its production progress." action={<Button variant="primary" onPress={onBack}>All video projects</Button>} />;
  const progress = studioApi.getVideoProjectProgress(project, video.video_id);
  const phases = [["imported", "Imported"], ["image_generation", "Images"], ["image_selection", "Selection"], ["video_generation", "Videos"], ["complete", "Complete"]];
  const activeIndex = phases.findIndex(([id]) => id === progress.phase);
  const cards = [["Image generation", `${progress.generated_count}/${progress.prompt_count}`, "images"], ["Variant selection", `${progress.selected_count}/${progress.prompt_count}`, "images"], ["Video generation", `${progress.video_complete_count}/${progress.prompt_count}`, "video"]];
  return <div className="view-stack project-overview">
    <header className="project-header"><Button size="sm" variant="ghost" onPress={onBack}>All video projects</Button><div><h2>{video.display_name}</h2><p>{video.prompt_count} scenes · {phases[activeIndex]?.[1] || "Imported"}</p></div><div className="project-tabs" role="tablist"><Button size="sm" variant="secondary" aria-selected>Overview</Button><Button size="sm" variant="ghost" onPress={() => onNavigate("images")}>Image Review</Button><Button size="sm" variant="ghost" onPress={() => onNavigate("video")}>Video Queue</Button><Button size="sm" variant="ghost" onPress={() => onNavigate("media")}>Media</Button></div></header>
    <section className="overview-milestones" aria-label="Video project production phases">{phases.map(([id, label], index) => <div key={id} className={index < activeIndex ? "complete" : index === activeIndex ? "current" : "pending"}><span>{index < activeIndex ? <Check size={15} /> : index + 1}</span><strong>{label}</strong></div>)}</section>
    <div className="overview-status-grid">{cards.map(([label, value, target]) => <Card key={label} variant="secondary"><Card.Content><span className="eyebrow">{label}</span><strong className="overview-metric">{value}</strong><p>{label === "Variant selection" ? "Choose one image for each scene before video generation." : "Project-scoped production progress."}</p><Button size="sm" variant="secondary" onPress={() => onNavigate(target)}>Open {label}</Button></Card.Content></Card>)}</div>
    <section className="overview-activity"><PageHeader title="Production activity" description={progress.video_failed_count ? `${progress.video_failed_count} video jobs need attention.` : "No active generation is running."} actions={<Button size="sm" variant="ghost" onPress={() => onNavigate("logs")}>View logs</Button>} /><ProgressBar aria-label="Overall video project completion" value={progress.percentage} color="accent"><ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track></ProgressBar><p>{progress.percentage}% complete · Generation starts only after you explicitly confirm in Image Review or Video Queue.</p></section>
  </div>;
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

function ImportView({ project, videos, onImport, onResolve, busy }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [mapping, setMapping] = useState({});
  const blockedRecords = studioApi.getProjectPromptRecords(project).filter((record) => record.status === "blocked");
  const assets = studioApi.getActiveAssets(project);
  return (
    <div className="view-stack">
      <PageHeader title="Import" description="One JSON file creates one video." />
      <section className="import-layout">
        <div className="import-form">
          <label className="field-label">Video name <span className="optional">Optional</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <DropZone file={file} onFile={setFile} accept=".json,application/json" label="Drop the video JSON here" hint="file_name and image_prompt are required; animation_prompt is optional" />
          <Button variant="primary" isDisabled={!file || busy} onPress={() => onImport(file, name.trim())}>{busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}Import video</Button>
        </div>
        <div className="import-history">
          <span className="eyebrow">Videos</span>
          {videos.length ? videos.map((video) => <div className="compact-row" key={video.video_id}><FileJson size={16} /><span>{video.display_name}</span><small>{video.prompt_count} scenes</small></div>) : <p className="muted-copy">No video JSON imported yet.</p>}
        </div>
      </section>
      {blockedRecords.length ? (
        <section className="resolve-section">
          <div className="section-heading"><div><h3>Needs a reference</h3><p>Map missing names to a channel asset.</p></div><Chip color="warning" variant="soft">{blockedRecords.length}</Chip></div>
          <div className="resolve-list">
            {blockedRecords.flatMap((record) => (record.blocked_references || []).map((reference) => {
              const key = `${record.prompt_id}:${reference.reference_index}`;
              return (
                <div className="resolve-row" key={key}>
                  <div><strong>{studioApi.sceneTitleFromFileName(record.file_name)}</strong><span>{reference.name || "Unnamed reference"}</span></div>
                  <select value={mapping[key] || ""} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))}>
                    <option value="">Choose asset</option>
                    {assets.map((asset) => <option key={asset.asset_id} value={asset.asset_id}>{asset.display_name}</option>)}
                  </select>
                  <Button size="sm" variant="secondary" isDisabled={!mapping[key]} onPress={() => onResolve(record.prompt_id, reference.reference_index, mapping[key])}>Use asset</Button>
                </div>
              );
            }))}
          </div>
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
      <PageHeader title="Image Review" description={video.display_name} actions={
        <div className="flow-connection" aria-live="polite">
          <span className={`connection-dot ${connected ? "connected" : "disconnected"}`} aria-hidden="true" />
          <span><strong>Flow connection</strong>{connected ? "Connected" : "Disconnected"}</span>
          <Button isIconOnly size="sm" variant="ghost" aria-label="Refresh Flow connection" onPress={onRefreshConnection}><RefreshCw size={16} /></Button>
        </div>
      } />
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
      {rows.length ? <div className="review-list">{rows.map(({ record, variants: sceneVariants }) => (
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
      ))}</div> : <EmptyState icon={Images} title="No generated images" description="Generate images for this video, then review them here." />}
    </div>
  );
}

function VideoQueueView({ project, video, runner, onRunAll, onPause, onContinue, onQueue, onRun, onStop, onHold, onMove, onRemove, onOpenImages }) {
  if (!video) return <EmptyState icon={ListVideo} title="Choose a video" description="Video Queue is organized one video at a time." />;
  const items = studioApi.getVideoQueueItems(project, video.video_id);
  const runnableItems = items.filter((item) => !!item.animation_prompt);
  const completed = runnableItems.filter((item) => item.status === "complete").length;
  const hasRunnableWork = runnableItems.some((item) => {
    return (item.status === "draft" && item.selected_variant_id) || item.can_run;
  });
  const activeRunner = runner.videoId === video.video_id;
  const runnerAction = activeRunner && runner.status === "running"
    ? <Button variant="outline" onPress={onPause}><CirclePause size={17} />Pause after current</Button>
    : activeRunner && runner.status === "paused"
      ? <Button variant="primary" onPress={onContinue}><Play size={17} />Continue</Button>
      : <Button variant="primary" isDisabled={!hasRunnableWork || (runnableItems.length > 0 && completed === runnableItems.length)} onPress={onRunAll}><Play size={17} />Run all</Button>;
  return (
    <div className="view-stack">
      <PageHeader title="Video Queue" description={video.display_name} actions={runnerAction} />
      {activeRunner && runner.status !== "idle" ? (
        <div className={`runner-banner ${runner.status}`}>
          {runner.status === "running" ? <LoaderCircle className="spin" size={18} /> : <AlertCircle size={18} />}
          <div><strong>{runner.status === "running" ? "Running sequentially" : "Queue paused"}</strong><span>{runner.error || `${completed} of ${items.length} complete`}</span></div>
        </div>
      ) : null}
      {items.length ? <div className="queue-list">{items.map((item) => {
        const canQueue = item.can_queue || item.can_create_draft;
        const showReason = item.status === "not_ready" || item.status === "needs_review" || item.status === "failed";
        const detailText = showReason ? item.reason : item.animation_prompt || item.reason;
        return (
          <Card key={item.prompt_id} className={`queue-card status-${item.status}`} variant="secondary">
            <Card.Content className="queue-card-content">
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
      })}</div> : <EmptyState icon={ListVideo} title="No video-ready scenes" description="Scenes need an optional animation_prompt and a selected image before they can run." action={<Button variant="outline" onPress={onOpenImages}>Open Image Review</Button>} />}
    </div>
  );
}

function MediaView({ project, video, onFinalize, onSync, busy }) {
  if (!video) return <EmptyState icon={LayoutGrid} title="Choose a video" description="Media is organized one video at a time." />;
  const promptIds = new Set(video.prompt_ids || []);
  const media = studioApi.getProjectGalleryItems(project).items.filter((item) => promptIds.has(item.prompt_id));
  const folderInput = useRef(null);
  return (
    <div className="view-stack">
      <PageHeader title="Media" description={video.display_name} actions={<><Button variant="outline" isDisabled={busy} onPress={() => folderInput.current?.click()}><FolderSync size={17} />Sync folder</Button><Button variant="primary" isDisabled={busy} onPress={onFinalize}>Finalize selected</Button><input ref={folderInput} type="file" hidden multiple webkitdirectory="" onChange={(event) => onSync(event.target.files)} /></>} />
      {media.length ? <div className="media-grid">{media.map((item) => <Card key={`${item.type}:${item.id}`} className="media-card" variant="secondary"><Card.Content>{item.type === "video" && item.video_url ? <video controls preload="metadata" src={item.video_url} /> : item.type === "image" ? <CachedPreviewImage value={item} alt={studioApi.sceneTitleFromFileName(item.prompt_file_name)} placeholderClassName="media-placeholder" /> : <span className="media-placeholder"><ImageIcon size={24} /></span>}<strong>{studioApi.sceneTitleFromFileName(item.prompt_file_name || item.output_file_name)}</strong><Chip size="sm" color={statusColor(item.is_selected ? "complete" : "draft")} variant="soft">{item.status_label}</Chip></Card.Content></Card>)}</div> : <EmptyState icon={LayoutGrid} title="No media yet" description="Selected images and completed videos appear here." />}
    </div>
  );
}

function LogsView({ logs, onClear }) {
  const [query, setQuery] = useState("");
  const filtered = logs.filter((entry) => !query || String(entry.message || "").toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="view-stack">
      <PageHeader title="Logs" description="Recent Studio and generation activity." actions={<Button variant="ghost" onPress={onClear}>Clear</Button>} />
      <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search logs" /></label>
      {filtered.length ? <div className="log-list">{filtered.slice().reverse().map((entry) => <div className={`log-row log-${entry.type}`} key={entry.id}><span>{entry.time || ""}</span><Chip size="sm" color={statusColor(entry.type === "error" ? "failed" : entry.type === "warn" ? "paused" : "draft")} variant="soft">{entry.type}</Chip><p>{entry.message}</p></div>)}</div> : <EmptyState icon={Activity} title="No matching logs" />}
    </div>
  );
}

function StudioApp() {
  const [snapshot, setSnapshot] = useState(() => captureStudioState());
  const [view, setView] = useState(() => getViewFromLocationHash());
  const [activeVideoId, setActiveVideoId] = useState("");
  const [busy, setBusy] = useState("");
  const [dialog, setDialog] = useState(null);
  const [runner, setRunner] = useState({ status: "idle", videoId: "", currentJobId: "", error: "" });
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

  const runNext = useCallback(async (videoId) => {
    try {
      await studioApi.loadProjectState();
      let currentProject = studioApi.getState().activeProject;
      let items = studioApi.getVideoQueueItems(currentProject, videoId).filter((item) => !!item.animation_prompt);
      for (const item of items) {
        if ((item.status === "draft" && item.selected_variant_id) || item.can_create_draft) {
          await studioApi.queuePromptVideo(item.prompt_id);
        }
      }
      await studioApi.loadProjectState();
      currentProject = studioApi.getState().activeProject;
      items = studioApi.getVideoQueueItems(currentProject, videoId).filter((item) => !!item.animation_prompt);
      const next = items.find((item) => item.status === "ready");
      if (!next) {
        setRunnerState({ status: "idle", videoId, currentJobId: "", error: "" });
        capture();
        toast.success("Video queue complete");
        return;
      }
      const job = await studioApi.runVideoJob(next.job_id);
      setRunnerState({ status: "running", videoId, currentJobId: job.job_id, error: "" });
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
        if (shouldContinue) await runNextRef.current?.(current.videoId);
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
    content = <ChannelsView project={project} videos={videos} busy={!!busy} onAddChannel={() => setDialog({ type: "channel-add" })} onRenameChannel={(name) => action("channel-rename", () => studioApi.updateActiveProject({ display_name: name }), "Channel renamed")} onAddVideo={() => setDialog({ type: "video-add" })} onOpenVideo={(videoId) => { setActiveVideoId(videoId); setView("overview"); }} onRenameVideo={(video) => setDialog({ type: "video-rename", video })} onDeleteVideo={(video) => setDialog({ type: "video-delete", video })} />;
  } else if (view === "overview") {
    content = <ProjectOverviewView project={project} video={activeVideo} onBack={() => setView("channels")} onNavigate={setView} />;
  } else if (view === "assets") {
    content = <AssetsView project={project} onAdd={() => setDialog({ type: "asset-add" })} onEdit={(asset) => setDialog({ type: "asset-edit", asset })} onDelete={(asset) => setDialog({ type: "asset-delete", asset })} />;
  } else if (view === "import") {
    content = <ImportView project={project} videos={videos} busy={!!busy} onImport={importVideo} onResolve={(promptId, referenceIndex, assetId) => action("resolve", () => studioApi.mapPromptReferenceToAsset(promptId, referenceIndex, assetId), "Reference resolved")} />;
  } else if (view === "images") {
    content = <ImageReviewView project={project} video={activeVideo} flowContext={snapshot.flowContext} busy={busy} onRefreshConnection={() => action("flow-refresh", () => studioApi.refreshFlowContext(), "Flow connection refreshed")} onGenerate={(settings) => action("generate-images", () => studioApi.startImageGenerationRun(activeVideo.video_id, settings), "Image generation started")} onStop={(runId) => action("stop-images", () => studioApi.stopImageGenerationRun(runId), "Image generation stopped")} onRetry={(runId) => action("retry-images", () => studioApi.retryImageGenerationRun(runId), "Retry started")} onSelect={(promptId, variantId) => action("select-image", () => studioApi.selectImageVariant(promptId, variantId), "Image selected")} />;
  } else if (view === "video") {
    content = <VideoQueueView project={project} video={activeVideo} runner={runner} onRunAll={() => { const next = { status: "running", videoId: activeVideo.video_id, currentJobId: "", error: "" }; setRunnerState(next); runNext(activeVideo.video_id); }} onPause={() => setRunnerState((current) => ({ ...current, status: "paused", error: "Paused after the current job." }))} onContinue={() => { setRunnerState((current) => ({ ...current, status: "running", error: "" })); runNext(activeVideo.video_id); }} onQueue={(promptId) => action("queue", () => studioApi.queuePromptVideo(promptId), "Added to queue")} onRun={(jobId) => action("run", () => studioApi.runVideoJob(jobId), "Video started")} onStop={stopVideo} onHold={(jobId) => action("hold", () => studioApi.holdVideoJob(jobId), "Video held")} onMove={(jobId, direction) => action(`move-${direction}`, () => studioApi.moveVideoJob(jobId, direction))} onRemove={(jobId) => action("remove", () => studioApi.removeVideoJob(jobId), "Removed from queue")} onOpenImages={() => setView("images")} />;
  } else if (view === "media") {
    content = <MediaView project={project} video={activeVideo} busy={!!busy} onFinalize={() => action("finalize", () => studioApi.finalizeSelectedImages(), "Selected images finalized")} onSync={(files) => action("sync", () => studioApi.syncProjectMediaFromFiles(files), "Folder synced")} />;
  } else {
    content = <LogsView logs={snapshot.logs} onClear={() => action("clear-logs", () => studioApi.clearStudioLogs(), "Logs cleared")} />;
  }

  return (
    <>
      <div className="studio-shell">
        <aside className="studio-sidebar">
          <div className="studio-brand"><span className="brand-symbol"><Video size={20} /></span><div><strong>AutoFlow</strong><span>Studio</span></div></div>
          <nav>{NAV_ITEMS.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={`studio-nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)} title={item.label}><Icon size={18} /><span>{item.label}</span></button>; })}</nav>
        </aside>
        <div className="studio-main">
          <header className="studio-toolbar">
            <div className="toolbar-selectors">
              <label><span>YouTube channel</span><select value={project?.project_id || ""} onChange={(event) => selectProject(event.target.value)} disabled={!projects.length}>{projects.length ? projects.map((item) => <option key={item.project_id} value={item.project_id}>{item.display_name}</option>) : <option value="">No channels</option>}</select></label>
              <label><span>Video</span><select value={activeVideo?.video_id || ""} onChange={(event) => setActiveVideoId(event.target.value)} disabled={!videos.length}>{videos.length ? videos.map((item) => <option key={item.video_id} value={item.video_id}>{item.display_name}</option>) : <option value="">No videos</option>}</select></label>
            </div>
            <Button isIconOnly size="sm" variant="ghost" aria-label="Refresh Studio" onPress={() => refresh()}><RefreshCw size={17} /></Button>
          </header>
          <main className="studio-content">{snapshot.lastError ? <div className="fatal-banner"><AlertCircle size={18} />{snapshot.lastError.message}</div> : content}</main>
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
