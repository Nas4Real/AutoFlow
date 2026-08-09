// AutoFlow Project Studio shard: state helpers backed by TFProjectDomain.
// Loaded by src/project-studio/index.html before shell rendering.
(function initTFProjectStudioState(root) {
  "use strict";

  const VIEWS = [
    {
      id: "project",
      label: "Channel",
      icon: "tune",
      title: "Channel Settings",
      subtitle: "YouTube channel identity and storage",
    },
    {
      id: "assets",
      label: "Assets",
      icon: "folder_managed",
      title: "Assets",
      subtitle: "Stored reference files",
    },
    {
      id: "import",
      label: "Import / Resolve",
      icon: "rule_folder",
      title: "Import / Resolve",
      subtitle: "Prompt JSON and blocked prompt checks",
    },
    {
      id: "images",
      label: "Image Review",
      icon: "photo_library",
      title: "Image Review",
      subtitle: "Generated variants and selected finals",
    },
    {
      id: "video",
      label: "Video Queue",
      icon: "queue_play_next",
      title: "Video Queue",
      subtitle: "Queued video jobs and reference readiness",
    },
    {
      id: "gallery",
      label: "Gallery",
      icon: "download_done",
      title: "Gallery",
      subtitle: "Outputs and downloads",
    },
    {
      id: "logs",
      label: "Logs",
      icon: "receipt_long",
      title: "Logs",
      subtitle: "Recent activity and errors",
    },
  ];

  const LOG_STORAGE_KEY = "flowAutoLogs";
  const LOG_LIMIT = 500;

  const ASSET_TYPES = Object.freeze([
    { id: "reference", label: "Reference", icon: "image" },
  ]);

  const studioState = {
    activeProject: null,
    assetFilter: "all",
    activeView: (() => {
      const hash = String(root.location?.hash || "").replace(/^#/, "");
      let viewId = "";
      try {
        viewId = decodeURIComponent(hash);
      } catch (error) {
        viewId = hash;
      }
      return VIEWS.some((view) => view.id === viewId) ? viewId : "project";
    })(),
    domainState: null,
    flowContext: null,
    isLoading: false,
    lastError: null,
    logs: [],
  };

  function $(selector) {
    return root.document.querySelector(selector);
  }

  function $all(selector) {
    return Array.prototype.slice.call(root.document.querySelectorAll(selector));
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function getDomain() {
    return root.TFProjectDomain || null;
  }

  function getStorageLocal() {
    return root.chrome?.storage?.local || null;
  }

  function getViewDefinition(viewId) {
    return VIEWS.find((view) => view.id === viewId) || VIEWS[0];
  }

  function getAssetTypeDefinition(type) {
    return ASSET_TYPES.find((item) => item.id === type) || ASSET_TYPES[0];
  }

  function resolveActiveProject(domainState) {
    const projects = Array.isArray(domainState?.projects) ? domainState.projects : [];
    if (!projects.length) return null;
    return (
      projects.find((project) => project.project_id === domainState.active_project_id) ||
      projects[0]
    );
  }

  function countCollection(value) {
    if (Array.isArray(value)) return value.length;
    if (!isObject(value)) return 0;
    return Object.keys(value).reduce((total, key) => {
      const nested = value[key];
      if (Array.isArray(nested)) return total + nested.length;
      if (isObject(nested)) return total + Object.keys(nested).length;
      return total + 1;
    }, 0);
  }

  function countProjectItems(project, keys) {
    if (!isObject(project)) return 0;
    return keys.reduce((total, key) => total + countCollection(project[key]), 0);
  }

  function getProjectAssets(project) {
    return Array.isArray(project?.assets) ? project.assets.filter(isObject) : [];
  }

  function getFilteredAssets() {
    const filter = studioState.assetFilter;
    const assets = getProjectAssets(studioState.activeProject);
    if (!filter || filter === "all") return assets;
    return assets.filter((asset) => asset.type === filter);
  }

  function safeAssetType(type) {
    const id = String(type || "").trim().toLowerCase();
    return ASSET_TYPES.some((item) => item.id === id) ? id : "reference";
  }

  function safeAssetName(value) {
    const name = String(value || "").trim();
    return name || "Untitled Asset";
  }

  function createAssetId() {
    const domain = getDomain();
    if (domain && typeof domain.createId === "function") {
      return domain.createId("asset");
    }
    return `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function createAssetFileId() {
    const domain = getDomain();
    if (domain && typeof domain.createId === "function") {
      return domain.createId("asset_file");
    }
    return `asset_file_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result || ""));
      reader.addEventListener("error", () => reject(reader.error || new Error("File read failed.")));
      reader.readAsDataURL(file);
    });
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")));
      reader.addEventListener("error", () => reject(reader.error || new Error("File read failed.")));
      reader.readAsText(file);
    });
  }

  function getProjectPromptRecords(project) {
    return Array.isArray(project?.prompt_records)
      ? project.prompt_records.filter(isObject)
      : [];
  }

  function getProjectPromptImports(project) {
    return Array.isArray(project?.prompt_imports)
      ? project.prompt_imports.filter(isObject)
      : [];
  }

  function sceneTitleFromFileName(value) {
    const fileName = String(value || "")
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      .trim();
    return fileName.replace(/\.[^.]+$/, "") || "Untitled scene";
  }

  function videoNameFromSource(value) {
    const sourceName = String(value || "")
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      .trim();
    return sourceName.replace(/\.json$/i, "").trim() || "Untitled video";
  }

  function getProjectVideos(project) {
    const imports = getProjectPromptImports(project);
    const promptRecords = getProjectPromptRecords(project);
    const knownImportIds = new Set(imports.map((item) => String(item.import_id || "")));
    const videos = imports.map((item, index) => {
      const videoId = String(item.import_id || `import-${index}`);
      const records = promptRecords.filter(
        (record) => String(record?.source?.import_id || "") === videoId,
      );
      return {
        video_id: videoId,
        display_name:
          String(item.video_name || item.display_name || "").trim() ||
          videoNameFromSource(item.source_name),
        source_name: String(item.source_name || ""),
        prompt_count: records.length,
        selected_count: records.filter((record) => !!record.selected_variant_id).length,
        animation_count: records.filter((record) => !!getPromptAnimationPrompt(record)).length,
        imported_at: item.imported_at || "",
        prompt_ids: records.map((record) => record.prompt_id).filter(Boolean),
        is_legacy: false,
      };
    });
    const legacyRecords = promptRecords.filter((record) => {
      const importId = String(record?.source?.import_id || "");
      return !importId || !knownImportIds.has(importId);
    });
    if (legacyRecords.length) {
      videos.push({
        video_id: "legacy",
        display_name:
          String(project?.settings?.legacy_video_name || "").trim() || "Imported video",
        source_name: "",
        prompt_count: legacyRecords.length,
        selected_count: legacyRecords.filter((record) => !!record.selected_variant_id).length,
        animation_count: legacyRecords.filter((record) => !!getPromptAnimationPrompt(record)).length,
        imported_at: "",
        prompt_ids: legacyRecords.map((record) => record.prompt_id).filter(Boolean),
        is_legacy: true,
      });
    }
    return videos;
  }

  function getVideoPromptRecords(project, videoId) {
    const key = String(videoId || "").trim();
    if (!key) return [];
    if (key === "legacy") {
      const knownImportIds = new Set(
        getProjectPromptImports(project).map((item) => String(item.import_id || "")),
      );
      return getProjectPromptRecords(project).filter((record) => {
        const importId = String(record?.source?.import_id || "");
        return !importId || !knownImportIds.has(importId);
      });
    }
    return getProjectPromptRecords(project).filter(
      (record) => String(record?.source?.import_id || "") === key,
    );
  }

  function createPromptId() {
    const domain = getDomain();
    if (domain && typeof domain.createId === "function") {
      return domain.createId("prompt");
    }
    return `prompt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function createPromptImportId() {
    const domain = getDomain();
    if (domain && typeof domain.createId === "function") {
      return domain.createId("prompt_import");
    }
    return `prompt_import_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function createImageRunId() {
    const domain = getDomain();
    if (domain && typeof domain.createId === "function") {
      return domain.createId("image_run");
    }
    return `image_run_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function createVariantId() {
    const domain = getDomain();
    if (domain && typeof domain.createId === "function") {
      return domain.createId("variant");
    }
    return `variant_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function createVideoJobId() {
    const domain = getDomain();
    if (domain && typeof domain.createId === "function") {
      return domain.createId("video_job");
    }
    return `video_job_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function getContract() {
    return root.TFProjectJsonContract || null;
  }

  function getPromptImport() {
    return root.TFProjectPromptImport || null;
  }

  function getRawReferenceNames(record) {
    const contract = getContract();
    const fields = contract?.ACCEPTED_REFERENCE_FIELDS || [
      "references",
      "refs",
      "reference_names",
      "referenceNames",
    ];
    const rawRecord = isObject(record?.raw) ? record.raw : {};
    const field = fields.find((key) => Object.prototype.hasOwnProperty.call(rawRecord, key));
    const rawValue = field ? rawRecord[field] : [];
    const rawItems = Array.isArray(rawValue) ? rawValue : rawValue ? [rawValue] : [];
    const names = rawItems
      .map((reference) => {
        if (typeof reference === "string") return reference.trim();
        if (!isObject(reference)) return "";
        return String(reference.name || reference.alias || reference.ref || "").trim();
      })
      .filter(Boolean);

    if (names.length) return names;
    return Array.isArray(record?.references)
      ? record.references.map((reference) => String(reference.name || "").trim()).filter(Boolean)
      : [];
  }

  function normalizeLookupValue(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getLogCategory(entry) {
    const category = String(entry?.category || "").trim().toLowerCase();
    if (category === "error" || category === "activity") return category;
    const type = String(entry?.type || "").trim().toLowerCase();
    return type === "error" || type === "warn" ? "error" : "activity";
  }

  function normalizeLogEntry(entry, index) {
    const createdAt = String(entry?.created_at || entry?.createdAt || "").trim();
    const rawMessage = String(entry?.message || "");
    const message = getDomain()?.repairTextEncoding?.(rawMessage) || rawMessage;
    return {
      id:
        String(entry?.id || "").trim() ||
        `${createdAt || "log"}_${index}_${message.slice(0, 12)}`,
      message,
      type: String(entry?.type || "info").trim().toLowerCase() || "info",
      level: String(entry?.level || "user").trim().toLowerCase() || "user",
      category: getLogCategory(entry),
      time: String(entry?.time || "").trim(),
      created_at: createdAt,
    };
  }

  function readStoredLogs() {
    const storage = getStorageLocal();
    if (!storage || typeof storage.get !== "function") {
      return Promise.resolve([]);
    }

    return new Promise((resolve) => {
      try {
        storage.get([LOG_STORAGE_KEY], (result) => {
          if (root.chrome?.runtime?.lastError) {
            resolve([]);
            return;
          }
          const logs = Array.isArray(result?.[LOG_STORAGE_KEY]) ? result[LOG_STORAGE_KEY] : [];
          resolve(logs.filter(isObject).map(normalizeLogEntry).slice(-LOG_LIMIT));
        });
      } catch (error) {
        resolve([]);
      }
    });
  }

  function writeStoredLogs(logs) {
    const storage = getStorageLocal();
    if (!storage || typeof storage.set !== "function") {
      return Promise.resolve();
    }

    const safeLogs = Array.isArray(logs) ? logs.filter(isObject).slice(-LOG_LIMIT) : [];
    return new Promise((resolve) => {
      try {
        storage.set({ [LOG_STORAGE_KEY]: safeLogs }, () => resolve());
      } catch (error) {
        resolve();
      }
    });
  }

  async function refreshStudioLogs() {
    studioState.logs = await readStoredLogs();
    return studioState.logs;
  }

  async function clearStudioLogs() {
    studioState.logs = [];
    await writeStoredLogs([]);
    return studioState.logs;
  }

  async function appendStudioLog(message, type) {
    const timestamp = new Date().toISOString();
    const entry = normalizeLogEntry(
      {
        id: `studio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        message: String(message || ""),
        type: type || "info",
        level: "user",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        created_at: timestamp,
      },
      studioState.logs.length,
    );
    const logs = (await readStoredLogs()).concat(entry).slice(-LOG_LIMIT);
    studioState.logs = logs;
    await writeStoredLogs(logs);
    return entry;
  }

  function getLookupValues(value) {
    const clean = String(value || "").trim().toLowerCase();
    const slug = normalizeLookupValue(value);
    return [clean, slug].filter(Boolean);
  }

  function getAssetLookupValues(asset) {
    const values = getLookupValues(asset?.display_name || asset?.displayName || asset?.name);
    return Array.from(new Set(values));
  }

  function isAssetActive(asset) {
    return isObject(asset) && !asset.disabled && asset.lifecycle_status !== "disabled";
  }

  function getAssetById(assets, assetId) {
    const id = String(assetId || "").trim();
    if (!id) return null;
    return assets.find((asset) => asset.asset_id === id) || null;
  }

  function findReferenceCandidates(reference, assets) {
    const name = String(reference?.name || "").trim();
    const lookupValues = getLookupValues(name);

    if (!lookupValues.length) return [];

    return assets.filter((asset) => {
      if (!isAssetActive(asset)) return false;
      const assetValues = getAssetLookupValues(asset);
      return lookupValues.some((lookup) => assetValues.indexOf(lookup) >= 0);
    });
  }

  function resolvePromptReference(reference, assets) {
    const api = getPromptImport();
    if (!api || typeof api.resolvePromptReference !== "function") {
      throw new Error("Channel prompt import API unavailable.");
    }
    return api.resolvePromptReference(reference, assets);
  }

  function getBlockedReferences(references) {
    return references.reduce((blocked, reference, referenceIndex) => {
      if (
        reference.required === false ||
        (reference.resolution_status !== "missing" &&
          reference.resolution_status !== "ambiguous")
      ) {
        return blocked;
      }

      blocked.push({
        name: reference.name || "",
        type: reference.type || "",
        reference_index: referenceIndex,
        reason: reference.resolution_error || reference.resolution_status,
        candidate_asset_ids: Array.isArray(reference.candidate_asset_ids)
          ? reference.candidate_asset_ids.slice()
          : [],
      });
      return blocked;
    }, []);
  }

  function getPromptResolutionSignature(record) {
    const references = Array.isArray(record?.references) ? record.references : [];
    const blockedReferences = Array.isArray(record?.blocked_references)
      ? record.blocked_references
      : [];
    return JSON.stringify({
      status: record?.status || "",
      can_generate_images: record?.can_generate_images !== false,
      references: references.map((reference) => {
        return {
          name: reference?.name || "",
          type: reference?.type || "",
          required: reference?.required !== false,
          manual_asset_id: reference?.manual_asset_id || "",
          asset_id: reference?.asset_id || "",
          resolution_status: reference?.resolution_status || "",
          resolution_source: reference?.resolution_source || "",
          resolution_error: reference?.resolution_error || "",
        };
      }),
      blocked_references: blockedReferences.map((reference) => {
        return {
          name: reference?.name || "",
          type: reference?.type || "",
          reference_index: reference?.reference_index,
          reason: reference?.reason || "",
          candidate_asset_ids: Array.isArray(reference?.candidate_asset_ids)
            ? reference.candidate_asset_ids.slice()
            : [],
        };
      }),
    });
  }

  function resolvePromptRecord(record, assets, timestamp) {
    const api = getPromptImport();
    if (!api || typeof api.resolvePromptRecord !== "function") {
      throw new Error("Channel prompt import API unavailable.");
    }
    return api.resolvePromptRecord(record, assets, timestamp);
  }

  function resolvePromptRecordsForProject(project, records) {
    const api = getPromptImport();
    if (!api || typeof api.resolvePromptRecordsForProject !== "function") {
      throw new Error("Channel prompt import API unavailable.");
    }
    return api.resolvePromptRecordsForProject(project, records);
  }

  function summarizePromptResolution(records) {
    const api = getPromptImport();
    if (!api || typeof api.summarizePromptResolution !== "function") {
      throw new Error("Channel prompt import API unavailable.");
    }
    return api.summarizePromptResolution(records);
  }

  function getPromptDisabledReason(record) {
    const blocked = Array.isArray(record?.blocked_references) ? record.blocked_references : [];
    if (blocked.length) {
      return blocked
        .map((reference) => {
          const reason = reference.reason === "ambiguous" ? "Ambiguous" : "Missing";
          return `${reason}: ${reference.name || "unnamed"}`;
        })
        .join("; ");
    }
    if (record?.status !== "ready") return "Prompt is not Ready.";
    if (record?.can_generate_images === false) return "Prompt is marked generation-disabled.";
    return "";
  }

  function buildReferenceRequest(reference, assets) {
    if (!reference || reference.resolution_status !== "resolved" || !reference.asset_id) {
      return {
        ok: false,
        reason: `Reference ${reference?.name || "unnamed"} is not resolved.`,
      };
    }

    const asset = getAssetById(assets, reference.asset_id);
    if (!asset || !isAssetActive(asset)) {
      return {
        ok: false,
        reason: `Reference ${reference.name || "unnamed"} Asset is unavailable.`,
      };
    }

    const primaryFile = getPrimaryAssetFile(asset);
    if (!primaryFile) {
      return {
        ok: false,
        reason: `Reference ${
          reference.name || safeAssetName(asset.display_name || asset.displayName || asset.name)
        } has no Asset File.`,
      };
    }

    return {
      ok: true,
      reference: {
        name: reference.name || "",
        type: reference.type || asset.type || "",
        asset_id: asset.asset_id,
        asset_name: safeAssetName(asset.display_name || asset.displayName || asset.name),
        asset_file_id: primaryFile.asset_file_id,
        file_name: primaryFile.file_name || "reference-file",
        mime_type: primaryFile.mime_type || "application/octet-stream",
        size_bytes: Number(primaryFile.size_bytes || 0),
        role: primaryFile.role || "primary",
        resolution_source: reference.resolution_source || "auto",
      },
    };
  }

  function buildImageGateItem(record, assets) {
    const disabledReason = getPromptDisabledReason(record);
    if (disabledReason) {
      return {
        prompt_id: record.prompt_id,
        file_name: record.file_name,
        image_prompt: record.image_prompt,
        state: record.image_generation_state === "generating" ? "generating" : "blocked",
        can_generate: false,
        disabled_reason: disabledReason,
        references: [],
      };
    }

    const references = Array.isArray(record.references) ? record.references.filter(isObject) : [];
    const requestReferences = new Array();
    const referenceErrors = new Array();
    references
      .filter((reference) => reference.resolution_status === "resolved" && reference.asset_id)
      .forEach((reference) => {
        const result = buildReferenceRequest(reference, assets);
        if (result.ok && result.reference) {
          requestReferences.push(result.reference);
        } else {
          referenceErrors.push(String(result.reason || "Reference could not be prepared."));
        }
      });

    if (referenceErrors.length) {
      return {
        prompt_id: record.prompt_id,
        file_name: record.file_name,
        image_prompt: record.image_prompt,
        state: "blocked",
        can_generate: false,
        disabled_reason: referenceErrors.join("; "),
        references: requestReferences,
      };
    }

    return {
      prompt_id: record.prompt_id,
      file_name: record.file_name,
      image_prompt: record.image_prompt,
      animation_prompt: record.animation_prompt || "",
      state: record.image_generation_state === "generating" ? "generating" : "ready",
      can_generate: record.image_generation_state !== "generating",
      disabled_reason:
        record.image_generation_state === "generating" ? "Image generation is in progress." : "",
      references: requestReferences,
    };
  }

  function getImageGenerationGate(project, videoId) {
    const sourceProject = project || studioState.activeProject;
    const videoKey = String(videoId || "").trim();
    const promptRecords = videoKey
      ? getVideoPromptRecords(sourceProject, videoKey)
      : getProjectPromptRecords(sourceProject);
    const assets = getProjectAssets(sourceProject);
    const items = promptRecords.map((record) => buildImageGateItem(record, assets));
    const included = items.filter((item) => item.can_generate && item.state === "ready");
    const blocked = items.filter((item) => !item.can_generate && item.state !== "generating");
    const generating = items.filter((item) => item.state === "generating");

    return {
      items,
      included,
      blocked,
      generating,
      ready_count: included.length,
      blocked_count: blocked.length,
      generating_count: generating.length,
      prompt_count: items.length,
    };
  }

  function getAssetFiles(asset) {
    return Array.isArray(asset?.files) ? asset.files.filter(isObject) : [];
  }

  function getProjectImageGenerationRuns(project) {
    return Array.isArray(project?.image_generation_runs)
      ? project.image_generation_runs.filter(isObject)
      : [];
  }

  function getPrimaryAssetFile(asset) {
    const files = getAssetFiles(asset);
    if (!files.length) return null;
    const primaryFileId = asset?.primary_file_id || "";
    return (
      files.find((file) => file.asset_file_id === primaryFileId) ||
      files.find((file) => file.is_primary || file.role === "primary") ||
      files[0]
    );
  }

  function getProjectImageVariants(project) {
    return Array.isArray(project?.image_variants)
      ? project.image_variants.filter(isObject)
      : [];
  }

  function getProjectVideoJobs(project) {
    return Array.isArray(project?.video_jobs) ? project.video_jobs.filter(isObject) : [];
  }

  function getProjectMediaLinks(project) {
    return Array.isArray(project?.media_links) ? project.media_links.filter(isObject) : [];
  }

  function getPromptAnimationPrompt(record) {
    return String(record?.animation_prompt || record?.animationPrompt || "").trim();
  }

  function normalizeVideoJobStatus(job) {
    const status = String(job?.status || "").trim().toLowerCase();
    if (status === "queued") return "ready";
    if (status === "completed") return "complete";
    return status || "draft";
  }

  function getVideoStatusView(status) {
    if (status === "not_ready") return { label: "Not Ready", tone: "warning" };
    if (status === "draft") return { label: "Draft", tone: "info" };
    if (status === "ready") return { label: "Ready", tone: "success" };
    if (status === "needs_review") return { label: "Needs Review", tone: "warning" };
    if (status === "running") return { label: "Running", tone: "info" };
    if (status === "failed") return { label: "Failed", tone: "danger" };
    if (status === "complete") return { label: "Complete", tone: "success" };
    return { label: status || "Draft", tone: "info" };
  }

  function buildVideoOutputFileName(fileName) {
    const clean = String(fileName || "").trim() || "video";
    const withoutExtension = clean.replace(/\.[a-z0-9]{2,5}$/i, "") || "video";
    return `${withoutExtension}.mp4`;
  }

  function safeFolderName(value) {
    return (
      String(value || "AutoFlow Channel")
        .replace(/[<>:"|?*\x00-\x1f]/g, "-")
        .replace(/[\\/]+/g, "-")
        .trim() || "AutoFlow Channel"
    );
  }

  function getVariantSourceFileName(variant) {
    return (
      variant?.generated_file_name ||
      variant?.local_file_name ||
      variant?.expected_file_name ||
      ""
    );
  }

  function getVariantDownloadUrl(variant) {
    return (
      variant?.data_url ||
      variant?.preview_url ||
      variant?.thumbnail_url ||
      variant?.fife_url ||
      ""
    );
  }

  function getVariantMediaId(variant) {
    return String(variant?.media_id || variant?.mediaId || "").trim();
  }

  function getVariantFlowContextId(variant) {
    return String(
      variant?.flow_context_id ||
        variant?.flowContextId ||
        variant?.media_flow_context_id ||
        variant?.mediaFlowContextId ||
        "",
    ).trim();
  }

  function getActiveFlowContextId(project) {
    return String(
      studioState.flowContext?.flow_context_id ||
        project?.current_flow_context_id ||
        project?.flow_context?.flow_context_id ||
      "",
    ).trim();
  }

  function getStoredFlowContext(project) {
    if (project?.flow_context) {
      return Object.assign({}, project.flow_context);
    }
    if (project?.current_flow_context_id) {
      return {
        flow_context_id: project.current_flow_context_id,
        status: "unknown",
      };
    }
    return { flow_context_id: "", status: "disconnected" };
  }

  function getMediaLinkContracts() {
    return root.TFMediaLinkContracts || null;
  }

  function createMediaLinkId() {
    const domain = getDomain();
    if (domain && typeof domain.createId === "function") {
      return domain.createId("media_link");
    }
    return `media_link_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function normalizeMediaCacheKey(value) {
    const api = getMediaLinkContracts();
    if (api && typeof api.normalizeCacheKey === "function") {
      return api.normalizeCacheKey(value);
    }
    return String(value || "").trim().toLowerCase();
  }

  function buildMediaLinkFromVariant(project, variant, timestamp, existingLink) {
    if (!project || !variant?.variant_id) return null;
    const mediaId = getVariantMediaId(variant);
    const cacheKey = normalizeMediaCacheKey(variant.cache_key || variant.cacheKey || "");
    const fileName = String(
      variant.cached_file_name ||
        variant.cachedFileName ||
        variant.local_file_name ||
        variant.localFileName ||
        variant.generated_file_name ||
        variant.generatedFileName ||
        variant.expected_file_name ||
        variant.expectedFileName ||
        "",
    ).trim();
    const downloadId = String(variant.download_id || variant.downloadId || "").trim();
    if (!mediaId && !cacheKey && !fileName && !downloadId) return null;

    const rawLink = Object.assign({}, existingLink || {}, {
      media_link_id: existingLink?.media_link_id || createMediaLinkId(),
      project_id: project.project_id,
      owner_type: "image_variant",
      owner_id: variant.variant_id,
      local_media_id:
        existingLink?.local_media_id ||
        variant.local_media_id ||
        variant.localMediaId ||
        variant.variant_id,
      cache_key: cacheKey || existingLink?.cache_key || "",
      flow_media_id: mediaId || existingLink?.flow_media_id || "",
      flow_context_id: getVariantFlowContextId(variant) || existingLink?.flow_context_id || "",
      download_id: downloadId || existingLink?.download_id || "",
      local_path: variant.local_path || variant.localPath || existingLink?.local_path || "",
      file_name: fileName || existingLink?.file_name || "",
      mime_type: variant.mime_type || variant.mimeType || existingLink?.mime_type || "image/png",
      size_bytes: Number(variant.byte_length || variant.byteLength || existingLink?.size_bytes || 0) || 0,
      created_at: existingLink?.created_at || timestamp,
      updated_at: timestamp,
    });

    const api = getMediaLinkContracts();
    return api && typeof api.normalizeMediaLink === "function"
      ? api.normalizeMediaLink(rawLink)
      : rawLink;
  }

  function findMediaLinkIndex(links, link) {
    if (!link) return -1;
    return links.findIndex((item) => {
      if (link.media_link_id && item.media_link_id === link.media_link_id) return true;
      if (item.owner_type === link.owner_type && item.owner_id === link.owner_id) return true;
      if (link.cache_key && item.cache_key === link.cache_key) return true;
      if (link.flow_media_id && item.flow_media_id === link.flow_media_id) return true;
      return false;
    });
  }

  function upsertMediaLink(links, link) {
    if (!link) return;
    const index = findMediaLinkIndex(links, link);
    if (index >= 0) {
      links[index] = Object.assign({}, links[index], link);
      return;
    }
    links.push(link);
  }

  function syncVariantMediaLink(links, project, variant, timestamp) {
    const existingIndex = links.findIndex((item) => {
      return item.owner_type === "image_variant" && item.owner_id === variant?.variant_id;
    });
    const existing = existingIndex >= 0 ? links[existingIndex] : null;
    upsertMediaLink(links, buildMediaLinkFromVariant(project, variant, timestamp, existing));
  }

  function buildFlowContextId(connectionState) {
    const status = String(connectionState?.status || "").toLowerCase();
    const projectId = String(connectionState?.projectId || connectionState?.project_id || "").trim();
    if (status !== "connected" || !projectId) return "";
    return `flow:${projectId}`;
  }

  function buildFlowContextFromConnection(connectionState) {
    const status = String(connectionState?.status || "disconnected").toLowerCase();
    const projectId = String(connectionState?.projectId || connectionState?.project_id || "").trim();
    const flowContextId = buildFlowContextId(connectionState);
    return {
      flow_context_id: flowContextId,
      status: flowContextId ? "connected" : status || "disconnected",
      project_id: projectId,
      url: connectionState?.url || "",
      last_error: connectionState?.lastError || connectionState?.last_error || "",
    };
  }

  function getFlowMediaReviewReason(project, variant) {
    if (!variant) return "";
    const mediaId = getVariantMediaId(variant);
    if (!mediaId) return "Needs Reference Upload: selected image has no Flow media ID.";

    const currentContextId = getActiveFlowContextId(project);
    if (!currentContextId) {
      return "Disconnected: current Flow context is unavailable for this media ID.";
    }

    const mediaContextId = getVariantFlowContextId(variant);
    if (!mediaContextId) {
      return "Needs Reference Upload: selected image media has no Flow context cache.";
    }
    if (mediaContextId !== currentContextId) {
      return "Stale Context: selected image media belongs to a different Flow project.";
    }

    return "";
  }

  function getSelectedVariantForPrompt(project, promptRecord) {
    const selectedVariantId = String(
      promptRecord?.selected_variant_id || promptRecord?.selectedVariantId || "",
    ).trim();
    if (!selectedVariantId) return null;
    return (
      getProjectImageVariants(project).find((variant) => {
        return (
          variant.variant_id === selectedVariantId &&
          variant.prompt_id === promptRecord?.prompt_id
        );
      }) || null
    );
  }

  function isVariantMissingLocalFile(variant) {
    return (
      variant?.file_state === "missing" ||
      variant?.status === "missing" ||
      variant?.repair_state === "missing_local_file"
    );
  }

  function getLatestVideoJobForPrompt(videoJobs, promptId) {
    const promptKey = String(promptId || "").trim();
    return (
      videoJobs
        .filter((job) => String(job.prompt_id || "").trim() === promptKey)
        .slice()
        .sort((left, right) => {
          const leftTime = Date.parse(left.updated_at || left.created_at || "") || 0;
          const rightTime = Date.parse(right.updated_at || right.created_at || "") || 0;
          return rightTime - leftTime;
        })[0] || null
    );
  }

  function getNextVideoQueueOrder(videoJobs) {
    return (
      videoJobs.reduce((maxOrder, job) => {
        const order = Number(job.queue_order || job.queueOrder || 0);
        return Number.isFinite(order) && order > maxOrder ? order : maxOrder;
      }, 0) + 1
    );
  }

  function sortVideoQueueItems(items) {
    const statusRank = {
      ready: 0,
      needs_review: 1,
      draft: 2,
      not_ready: 3,
      failed: 4,
      running: 5,
      complete: 6,
    };
    return items.slice().sort((left, right) => {
      const leftRank = statusRank[left.status] ?? 9;
      const rightRank = statusRank[right.status] ?? 9;
      if (leftRank !== rightRank) return leftRank - rightRank;
      if (left.status === "ready" && right.status === "ready") {
        return Number(left.queue_order || 0) - Number(right.queue_order || 0);
      }
      return Number(left.source_index || 0) - Number(right.source_index || 0);
    });
  }

  function buildVideoJobRecord(project, promptRecord, selectedVariant, existingJob, timestamp, status) {
    const animationPrompt = getPromptAnimationPrompt(promptRecord);
    const promptFileName =
      String(promptRecord?.file_name || selectedVariant?.expected_file_name || "").trim() ||
      "video.png";
    const sourceFileName = getVariantSourceFileName(selectedVariant);

    return Object.assign({}, existingJob || {}, {
      job_id: existingJob?.job_id || createVideoJobId(),
      job_type: "video",
      project_id: project.project_id,
      prompt_id: promptRecord.prompt_id,
      status: status || "draft",
      selected_variant_id: selectedVariant.variant_id,
      start_variant_id: selectedVariant.variant_id,
      start_image_file_name: sourceFileName,
      selected_variant_generated_file_name: selectedVariant.generated_file_name || "",
      flow_context_id:
        getVariantInputValue(selectedVariant, "flow_context_id", "flowContextId") ||
        getActiveFlowContextId(project),
      start_frame_flow_context_id: getVariantFlowContextId(selectedVariant),
      animation_prompt: animationPrompt,
      expected_output_file_name:
        existingJob?.expected_output_file_name || buildVideoOutputFileName(promptFileName),
      source_prompt_file_name: promptFileName,
      needs_review_reason: "",
      pending_selected_variant_id: "",
      pending_selected_generated_file_name: "",
      created_at: existingJob?.created_at || timestamp,
      updated_at: timestamp,
    });
  }

  function getVideoJobReviewReason(project, job, promptRecord, selectedVariant) {
    if (!promptRecord) return "Prompt Record is missing.";
    if (!getPromptAnimationPrompt(promptRecord)) return "Animation prompt is missing.";
    if (!selectedVariant) return "Select an image variant before queueing video.";
    if (isVariantMissingLocalFile(selectedVariant)) {
      return "Selected image needs local file repair before video work.";
    }
    const flowReason = getFlowMediaReviewReason(project, selectedVariant);
    if (flowReason) return flowReason;
    if (job.selected_variant_id !== selectedVariant.variant_id) {
      return "Selected image changed after this draft was prepared.";
    }
    return "";
  }

  function reconcileVideoJobsForSelectionChange(videoJobs, promptId, selectedVariant, timestamp) {
    return videoJobs.map((job) => {
      if (String(job.prompt_id || "").trim() !== promptId) return job;
      const status = normalizeVideoJobStatus(job);
      if (status === "running" || status === "complete") return job;

      if (status === "ready") {
        return Object.assign({}, job, {
          status: "needs_review",
          needs_review_reason: "Selected image changed after this job was marked Ready.",
          pending_selected_variant_id: selectedVariant.variant_id,
          pending_selected_generated_file_name: selectedVariant.generated_file_name || "",
          updated_at: timestamp,
        });
      }

      return Object.assign({}, job, {
        status: "draft",
        selected_variant_id: selectedVariant.variant_id,
        start_variant_id: selectedVariant.variant_id,
        start_image_file_name: getVariantSourceFileName(selectedVariant),
        selected_variant_generated_file_name: selectedVariant.generated_file_name || "",
        needs_review_reason: "",
        pending_selected_variant_id: "",
        pending_selected_generated_file_name: "",
        updated_at: timestamp,
      });
    });
  }

  function getVideoQueueItems(project, videoId) {
    const promptRecords = videoId
      ? getVideoPromptRecords(project, videoId)
      : getProjectPromptRecords(project);
    const videoJobs = getProjectVideoJobs(project);

    const items = promptRecords.map((record, sourceIndex) => {
      const animationPrompt = getPromptAnimationPrompt(record);
      const selectedVariant = getSelectedVariantForPrompt(project, record);
      const job = getLatestVideoJobForPrompt(videoJobs, record.prompt_id);
      const status = job ? normalizeVideoJobStatus(job) : selectedVariant ? "draftable" : "not_ready";
      const terminalJob = job && (status === "running" || status === "complete");
      const selectedFileName = selectedVariant ? getVariantSourceFileName(selectedVariant) : "";
      const selectedMissing = selectedVariant && isVariantMissingLocalFile(selectedVariant);
      const reviewReason = job
        ? getVideoJobReviewReason(project, job, record, selectedVariant)
        : "";
      let itemStatus = status === "draftable" ? "draft" : status;
      let reason = "";
      let canCreateDraft = false;
      let canQueue = false;

      if (!animationPrompt && !selectedVariant) {
        itemStatus = "not_ready";
        reason = "Add an animation prompt and select an image variant.";
      } else if (!animationPrompt) {
        itemStatus = "not_ready";
        reason = "Animation prompt is missing.";
      } else if (!selectedVariant) {
        itemStatus = "not_ready";
        reason = "Select an image variant first.";
      } else if (selectedMissing) {
        itemStatus = "not_ready";
        reason = "Selected image needs local file repair.";
      } else if (!job) {
        itemStatus = "draft";
        reason = "Ready to add to the video queue.";
        canCreateDraft = true;
      } else if (terminalJob) {
        reason =
          job.selected_variant_id === selectedVariant.variant_id
            ? "Existing job is protected after run starts."
            : "Existing job is protected; add the new selection to the queue.";
        canCreateDraft = true;
      } else if (status === "needs_review" || reviewReason) {
        itemStatus = "needs_review";
        reason = job.needs_review_reason || reviewReason;
        canCreateDraft = true;
      } else if (status === "draft") {
        reason = "Ready to add to queue.";
        canCreateDraft = true;
        canQueue = true;
      } else if (status === "ready") {
        reason = "Queued and ready to run.";
      } else if (status === "running") {
        reason = "Video generation is running.";
      } else if (status === "complete") {
        reason = job.video_url || job.output_media_id ? "Video output recorded." : "Video complete.";
      } else if (status === "failed") {
        reason = job.error_message || "Video job failed.";
        canCreateDraft = true;
      }

      const statusView = getVideoStatusView(itemStatus);
      return {
        prompt_id: record.prompt_id,
        file_name: record.file_name || "",
        scene_title: sceneTitleFromFileName(record.file_name),
        video_id: String(record?.source?.import_id || "legacy"),
        animation_prompt: animationPrompt,
        selected_variant_id: selectedVariant?.variant_id || "",
        selected_file_name: selectedFileName,
        selected_preview_url:
          selectedVariant?.data_url ||
          selectedVariant?.preview_url ||
          selectedVariant?.thumbnail_url ||
          selectedVariant?.fife_url ||
          "",
        selected_cache_key: selectedVariant?.cache_key || "",
        selected_cached_file_name: selectedVariant?.cached_file_name || "",
        selected_media_id: selectedVariant?.media_id || selectedVariant?.mediaId || "",
        selected_fife_url: selectedVariant?.fife_url || selectedVariant?.thumbnail_url || "",
        job,
        job_id: job?.job_id || "",
        status: itemStatus,
        status_label: statusView.label,
        tone: statusView.tone,
        reason,
        source_index: Number(record.source_index || sourceIndex || 0),
        queue_order: Number(job?.queue_order || job?.queueOrder || 0),
        can_create_draft: canCreateDraft,
        can_queue: canQueue,
        can_hold: !!job && status === "ready",
        can_remove: !!job && !terminalJob,
        can_move: !!job && status === "ready",
        can_run: !!job && status === "ready",
        can_retry: !!job && status === "failed",
        can_stop: !!job && status === "running",
        can_repair_start_frame:
          !!job &&
          !!reason &&
          /(Needs Reference Upload|Stale Context|Disconnected)/.test(reason) &&
          status !== "running" &&
          status !== "complete",
      };
    });

    return sortVideoQueueItems(items);
  }

  function getProjectGalleryItems(project) {
    if (!project) {
      return {
        image_items: [],
        video_items: [],
        items: [],
        selected_image_count: 0,
        video_output_count: 0,
      };
    }

    const promptRecords = getProjectPromptRecords(project);
    const promptById = new Map(promptRecords.map((record) => [record.prompt_id, record]));
    const imageItems = getProjectImageVariants(project)
      .filter((variant) => !variant.project_id || variant.project_id === project.project_id)
      .map((variant, sourceIndex) => {
        const promptRecord = promptById.get(variant.prompt_id) || {};
        const selectedVariantId = String(
          promptRecord.selected_variant_id || promptRecord.selectedVariantId || "",
        ).trim();
        const isSelected =
          (!!selectedVariantId && selectedVariantId === variant.variant_id) ||
          variant.is_selected === true;
        const missingLocal = isVariantMissingLocalFile(variant);
        const statusView = isSelected
          ? missingLocal
            ? { label: "Selected - repair needed", tone: "warning" }
            : { label: "Selected", tone: "success" }
          : missingLocal
            ? { label: "Missing local file", tone: "warning" }
            : variant.status === "failed" || variant.file_state === "failed"
              ? { label: "Failed", tone: "danger" }
              : { label: "Variant", tone: "info" };

        return {
          id: variant.variant_id || `variant-${sourceIndex}`,
          type: "image",
          prompt_id: variant.prompt_id || "",
          prompt_file_name:
            promptRecord.file_name || variant.expected_file_name || variant.generated_file_name || "",
          prompt_text: promptRecord.image_prompt || "",
          expected_file_name: variant.expected_file_name || promptRecord.file_name || "",
          generated_file_name:
            variant.generated_file_name ||
            variant.local_file_name ||
            getVariantSourceFileName(variant) ||
            "",
          finalized_download_path:
            variant.finalized_download_path || promptRecord.selected_final_download_path || "",
          finalized_as_file_name:
            variant.finalized_as_file_name || promptRecord.selected_final_file_name || "",
          local_file_name: variant.local_file_name || "",
          local_path: variant.local_path || "",
          download_id: variant.download_id || "",
          preview_url: variant.data_url || variant.preview_url || variant.thumbnail_url || variant.fife_url || "",
          media_id: variant.media_id || variant.mediaId || "",
          cache_key: variant.cache_key || "",
          cached_file_name: variant.cached_file_name || "",
          fife_url: variant.fife_url || variant.thumbnail_url || "",
          status_label: statusView.label,
          tone: statusView.tone,
          is_selected: isSelected,
          updated_at: variant.updated_at || variant.created_at || "",
          source_index: Number(variant.source_index || sourceIndex || 0),
        };
      });

    const videoItems = getProjectVideoJobs(project)
      .filter((job) => {
        return (
          (!job.project_id || job.project_id === project.project_id) &&
          normalizeVideoJobStatus(job) === "complete"
        );
      })
      .map((job, sourceIndex) => {
        const promptRecord = promptById.get(job.prompt_id) || {};
        const promptFileName = promptRecord.file_name || job.source_prompt_file_name || "";
        const outputFileName =
          job.output_file_name ||
          job.expected_output_file_name ||
          buildVideoOutputFileName(promptFileName);

        return {
          id: job.job_id || `video-${sourceIndex}`,
          type: "video",
          job_id: job.job_id || "",
          prompt_id: job.prompt_id || "",
          prompt_file_name: promptFileName,
          prompt_text: promptRecord.image_prompt || "",
          expected_file_name: job.expected_output_file_name || outputFileName,
          output_file_name: outputFileName,
          video_url: job.video_url || "",
          output_media_id: job.output_media_id || "",
          selected_variant_id: job.selected_variant_id || job.start_variant_id || "",
          start_image_file_name: job.start_image_file_name || "",
          status_label: "Complete",
          tone: "success",
          updated_at: job.completed_at || job.updated_at || job.created_at || "",
          source_index: Number(promptRecord.source_index || sourceIndex || 0),
        };
      });

    const items = imageItems
      .concat(videoItems)
      .sort((left, right) => {
        if (left.source_index !== right.source_index) return left.source_index - right.source_index;
        if (left.type !== right.type) return left.type === "image" ? -1 : 1;
        return String(left.id).localeCompare(String(right.id));
      });

    return {
      image_items: imageItems,
      video_items: videoItems,
      items,
      selected_image_count: imageItems.filter((item) => item.is_selected).length,
      video_output_count: videoItems.length,
    };
  }

  function buildCanonicalImageFileName(fileName) {
    const parts = normalizeRelativeFileName(fileName || "image.png");
    const leaf = parts.pop() || "image.png";
    const hasExtension = /\.[^/.]+$/i.test(leaf);
    parts.push(hasExtension ? leaf : `${leaf}.png`);
    return parts.join("/");
  }

  function getSelectedImageFinalizationItems(project) {
    if (!project) return [];

    const variants = getProjectImageVariants(project);
    return getProjectPromptRecords(project).map((record, sourceIndex) => {
      const selectedVariant = getSelectedVariantForPrompt(project, record);
      const canonicalFileName = buildCanonicalImageFileName(
        record.file_name || selectedVariant?.expected_file_name || "",
      );
      const sourceFileName = selectedVariant ? getVariantSourceFileName(selectedVariant) : "";
      const sourceUrl = selectedVariant ? getVariantDownloadUrl(selectedVariant) : "";
      const selectedMissing = selectedVariant && isVariantMissingLocalFile(selectedVariant);
      const variantExists =
        selectedVariant &&
        variants.some((variant) => variant.variant_id === selectedVariant.variant_id);
      let reason = "";

      if (!selectedVariant || !variantExists) {
        reason = "Select an Image Variant before finalizing.";
      } else if (selectedMissing) {
        reason = "Selected image needs local file repair before finalizing.";
      } else if (!sourceUrl) {
        reason = "Selected image has no browser-accessible source URL.";
      }

      return {
        prompt_id: record.prompt_id || "",
        variant_id: selectedVariant?.variant_id || "",
        canonical_file_name: canonicalFileName,
        source_file_name: sourceFileName,
        source_url: sourceUrl,
        prompt_file_name: record.file_name || "",
        prompt_text: record.image_prompt || "",
        can_finalize: !reason,
        reason,
        source_index: Number(record.source_index || sourceIndex || 0),
      };
    });
  }

  function downloadFile(url, filename) {
    const downloads = root.chrome?.downloads;
    if (!downloads || typeof downloads.download !== "function") {
      return Promise.reject(new Error("Chrome downloads API unavailable."));
    }

    return new Promise((resolve, reject) => {
      try {
        downloads.download({ url, filename, saveAs: false }, (downloadId) => {
          const lastError = root.chrome?.runtime?.lastError;
          if (lastError) {
            reject(new Error(lastError.message || "Download failed."));
            return;
          }
          resolve(downloadId || null);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function finalizeSelectedImages() {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const items = getSelectedImageFinalizationItems(project);
    const readyItems = items.filter((item) => item.can_finalize);
    const blockedItems = items.filter((item) => !item.can_finalize && item.variant_id);
    const missingSelectionCount = items.filter((item) => !item.variant_id).length;

    if (!readyItems.length) {
      throw new Error(
        missingSelectionCount
          ? "Select variants in Image Review before finalizing selected images."
          : blockedItems[0]?.reason || "No selected images can be finalized.",
      );
    }

    const timestamp = new Date().toISOString();
    const folder = safeFolderName(project.display_name || project.name || "AutoFlow Channel");
    const downloaded = [];
    const failed = [];

    for (const item of readyItems) {
      const downloadPath = ["AutoFlow", folder, "selected-images", item.canonical_file_name]
        .filter(Boolean)
        .join("/");
      try {
        const downloadId = await downloadFile(item.source_url, downloadPath);
        downloaded.push(Object.assign({}, item, { download_id: downloadId, download_path: downloadPath }));
      } catch (error) {
        failed.push(
          Object.assign({}, item, {
            error_message: error.message || "Download failed.",
            download_path: downloadPath,
          }),
        );
      }
    }

    if (downloaded.length) {
      const downloadedByPrompt = new Map(downloaded.map((item) => [item.prompt_id, item]));
      const downloadedByVariant = new Map(downloaded.map((item) => [item.variant_id, item]));
      const nextPromptRecords = getProjectPromptRecords(project).map((record) => {
        const item = downloadedByPrompt.get(record.prompt_id);
        if (!item) return record;
        return Object.assign({}, record, {
          selected_final_file_name: item.canonical_file_name,
          selected_final_source_file_name: item.source_file_name,
          selected_final_download_path: item.download_path,
          selected_final_download_id: item.download_id,
          selected_finalized_at: timestamp,
          updated_at: timestamp,
        });
      });
      const nextVariants = getProjectImageVariants(project).map((variant) => {
        const item = downloadedByVariant.get(variant.variant_id);
        if (!item) return variant;
        return Object.assign({}, variant, {
          finalized_as_file_name: item.canonical_file_name,
          finalized_download_path: item.download_path,
          finalized_download_id: item.download_id,
          finalized_at: timestamp,
          updated_at: timestamp,
        });
      });

      await updateActiveProject({
        prompt_records: nextPromptRecords,
        image_variants: nextVariants,
      });
    }

    return {
      downloaded,
      blocked: blockedItems,
      failed,
      missing_selection_count: missingSelectionCount,
    };
  }

  function normalizeMediaLookupKey(value) {
    const normalized = normalizeRelativeFileName(value || "")
      .join("/")
      .toLowerCase();
    return normalized.replace(/\s+\(\d+\)(?=\.[^/.]+$)/, "");
  }

  function mediaLookupKeysFor(value) {
    const key = normalizeMediaLookupKey(value);
    if (!key) return [];
    const leaf = key.split("/").filter(Boolean).pop() || "";
    return Array.from(new Set([key, leaf].filter(Boolean)));
  }

  function buildMediaFileIndex(files) {
    const index = new Map();
    Array.prototype.slice.call(files || []).forEach((file) => {
      const path = file.webkitRelativePath || file.name || "";
      const keys = mediaLookupKeysFor(path).concat(mediaLookupKeysFor(file.name || ""));
      keys.forEach((key) => {
        if (key && !index.has(key)) index.set(key, file);
      });
    });
    return index;
  }

  function findMediaFileMatch(index, names) {
    for (const name of names) {
      for (const key of mediaLookupKeysFor(name)) {
        if (index.has(key)) return index.get(key);
      }
    }
    return null;
  }

  async function syncProjectMediaFromFiles(files) {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const fileIndex = buildMediaFileIndex(files);
    if (!fileIndex.size) {
      throw new Error("Select a media folder or files to sync.");
    }

    const timestamp = new Date().toISOString();
    const promptRecords = getProjectPromptRecords(project);
    const promptById = new Map(promptRecords.map((record) => [record.prompt_id, record]));
    let variantMatches = 0;
    let selectedMatches = 0;
    let videoMatches = 0;

    const nextVariants = getProjectImageVariants(project).map((variant) => {
      const promptRecord = promptById.get(variant.prompt_id) || {};
      const isSelected =
        promptRecord.selected_variant_id === variant.variant_id || variant.is_selected === true;
      const names = [
        variant.generated_file_name,
        variant.local_file_name,
        isSelected ? variant.expected_file_name : "",
        isSelected ? promptRecord.selected_final_file_name : "",
        isSelected ? promptRecord.selected_variant_generated_file_name : "",
      ];
      const match = findMediaFileMatch(fileIndex, names);
      if (!match) return variant;
      const matchPath = match.webkitRelativePath || match.name || "";
      variantMatches += 1;
      if (isSelected) selectedMatches += 1;
      return Object.assign({}, variant, {
        local_file_name: match.name || variant.local_file_name || variant.generated_file_name || "",
        local_path: matchPath,
        file_state: "available",
        repair_state: "",
        status: "available",
        synced_at: timestamp,
        updated_at: timestamp,
      });
    });

    const nextPromptRecords = promptRecords.map((record) => {
      const selectedVariant = nextVariants.find(
        (variant) =>
          variant.prompt_id === record.prompt_id &&
          variant.variant_id === record.selected_variant_id &&
          variant.local_path,
      );
      if (!selectedVariant) return record;
      return Object.assign({}, record, {
        selected_variant_generated_file_name:
          selectedVariant.generated_file_name || record.selected_variant_generated_file_name || "",
        selected_variant_local_path: selectedVariant.local_path || "",
        selected_media_synced_at: timestamp,
        updated_at: timestamp,
      });
    });

    const nextVideoJobs = getProjectVideoJobs(project).map((job) => {
      const names = [job.output_file_name, job.expected_output_file_name, job.local_file_name];
      const match = findMediaFileMatch(fileIndex, names);
      if (!match) return job;
      videoMatches += 1;
      return Object.assign({}, job, {
        local_file_name: match.name || job.output_file_name || job.expected_output_file_name || "",
        local_path: match.webkitRelativePath || match.name || "",
        output_file_state: "available",
        synced_at: timestamp,
        updated_at: timestamp,
      });
    });

    await updateActiveProject({
      image_variants: nextVariants,
      prompt_records: nextPromptRecords,
      video_jobs: nextVideoJobs,
    });

    return {
      variant_matches: variantMatches,
      selected_matches: selectedMatches,
      video_matches: videoMatches,
      unresolved_variants: nextVariants.filter(isVariantMissingLocalFile).length,
    };
  }

  function normalizeRelativeFileName(value) {
    const parts = String(value || "image.png")
      .replace(/\\/g, "/")
      .replace(/^[a-zA-Z]:/, "")
      .replace(/^\/+/, "")
      .split("/")
      .filter(Boolean)
      .filter((part) => part !== "." && part !== "..")
      .map((part) => part.replace(/[<>:"|?*\x00-\x1f]/g, "-").trim())
      .filter(Boolean);
    if (!parts.length) return ["image.png"];
    return parts;
  }

  function buildImageVariantFileName(expectedFileName, variantIndex) {
    const parts = normalizeRelativeFileName(expectedFileName);
    const leaf = parts.pop() || "image.png";
    const extensionMatch = leaf.match(/\.[^/.]+$/);
    const extension = extensionMatch ? extensionMatch[0] : ".png";
    const baseName = extensionMatch ? leaf.slice(0, -extension.length) : leaf;
    const safeBaseName = baseName || "image";
    const number = Number.isInteger(variantIndex) && variantIndex >= 0 ? variantIndex + 1 : 1;
    parts.push(`${safeBaseName}__${number}${extension}`);
    return parts.join("/");
  }

  function normalizeVariantIndex(input, fallbackIndex) {
    const explicitIndex = Number(input?.variant_index ?? input?.variantIndex);
    if (Number.isInteger(explicitIndex) && explicitIndex >= 0) return explicitIndex;
    const explicitNumber = Number(input?.variant_number ?? input?.variantNumber);
    if (Number.isInteger(explicitNumber) && explicitNumber > 0) return explicitNumber - 1;
    return fallbackIndex;
  }

  function getVariantInputValue(input, snakeName, camelName) {
    if (!isObject(input)) return "";
    const value = Object.prototype.hasOwnProperty.call(input, snakeName)
      ? input[snakeName]
      : input[camelName];
    return String(value || "").trim();
  }

  function getVariantFileState(input) {
    const explicit = getVariantInputValue(input, "file_state", "fileState");
    if (explicit) return explicit;
    const status = getVariantInputValue(input, "status", "status");
    if (status === "failed" || status === "missing" || status === "available") return status;
    const hasLocalFile =
      !!getVariantInputValue(input, "local_path", "localPath") ||
      !!getVariantInputValue(input, "local_file_name", "localFileName") ||
      !!getVariantInputValue(input, "download_id", "downloadId") ||
      input?.downloaded === true;
    return hasLocalFile ? "available" : "missing";
  }

  function getVariantRecordKey(imageRunId, promptId, variantIndex) {
    return [imageRunId || "", promptId || "", String(variantIndex)].join("::");
  }

  function findImageGenerationRun(project, imageRunId) {
    const key = String(imageRunId || "").trim();
    return getProjectImageGenerationRuns(project).find((run) => run.image_run_id === key) || null;
  }

  function findCompletionForPrompt(completions, promptId) {
    return completions.find((item) => String(item.prompt_id || item.promptId || "") === promptId) || {};
  }

  function upsertImageVariant(nextVariants, variant) {
    const key = getVariantRecordKey(
      variant.image_run_id,
      variant.prompt_id,
      variant.variant_index,
    );
    const existingIndex = nextVariants.findIndex((item) => {
      return getVariantRecordKey(item.image_run_id, item.prompt_id, item.variant_index) === key;
    });
    if (existingIndex >= 0) {
      nextVariants[existingIndex] = variant;
      return;
    }
    nextVariants.push(variant);
  }

  function buildImageVariantRecord(project, runRecord, requestItem, variantInput, fallbackIndex, existingVariant, timestamp) {
    const variantIndex = normalizeVariantIndex(variantInput, fallbackIndex);
    const variantNumber = variantIndex + 1;
    const expectedFileName = String(requestItem.file_name || requestItem.fileName || "").trim();
    const explicitGeneratedFileName =
      getVariantInputValue(variantInput, "generated_file_name", "generatedFileName") ||
      getVariantInputValue(variantInput, "file_name", "fileName");
    const generatedFileName =
      explicitGeneratedFileName || buildImageVariantFileName(expectedFileName, variantIndex);
    const fileState = getVariantFileState(variantInput);
    const localFileName =
      getVariantInputValue(variantInput, "local_file_name", "localFileName") ||
      (fileState === "available" ? generatedFileName : "");

    return Object.assign({}, existingVariant || {}, {
      variant_id: existingVariant?.variant_id || createVariantId(),
      project_id: project.project_id,
      prompt_id: requestItem.prompt_id,
      image_run_id: runRecord.image_run_id,
      source_index: Number(requestItem.source_index || 0),
      variant_index: variantIndex,
      variant_number: variantNumber,
      expected_file_name: expectedFileName,
      generated_file_name: generatedFileName,
      local_file_name: localFileName,
      local_path: getVariantInputValue(variantInput, "local_path", "localPath"),
      media_id:
        getVariantInputValue(variantInput, "media_id", "mediaId") ||
        existingVariant?.media_id ||
        existingVariant?.mediaId ||
        "",
      flow_context_id: getActiveFlowContextId(project),
      download_id: getVariantInputValue(variantInput, "download_id", "downloadId"),
      cache_key:
        normalizeMediaCacheKey(getVariantInputValue(variantInput, "cache_key", "cacheKey")) ||
        existingVariant?.cache_key ||
        "",
      cached_file_name:
        getVariantInputValue(variantInput, "cached_file_name", "cachedFileName") ||
        existingVariant?.cached_file_name ||
        "",
      thumbnail_url: getVariantInputValue(variantInput, "thumbnail_url", "thumbnailUrl"),
      fife_url: getVariantInputValue(variantInput, "fife_url", "fifeUrl"),
      file_state: fileState,
      repair_state: fileState === "missing" ? "missing_local_file" : "",
      status: fileState === "available" ? "available" : fileState,
      created_at: existingVariant?.created_at || timestamp,
      updated_at: timestamp,
    });
  }

  function findAsset(assetId) {
    const id = String(assetId || "").trim();
    const assets = getProjectAssets(studioState.activeProject);
    return assets.find((asset) => asset.asset_id === id) || null;
  }

  function buildAssetFile(file, isPrimary) {
    const timestamp = new Date().toISOString();
    return readFileAsDataUrl(file).then((dataUrl) => {
      return {
        asset_file_id: createAssetFileId(),
        file_name: file.name || "reference-file",
        mime_type: file.type || "application/octet-stream",
        size_bytes: Number(file.size || 0),
        last_modified: file.lastModified || null,
        data_url: dataUrl,
        source: "manual_upload",
        role: isPrimary ? "primary" : "reference",
        is_primary: !!isPrimary,
        created_at: timestamp,
        updated_at: timestamp,
      };
    });
  }

  function getCounts() {
    const project = studioState.activeProject || {};
    const projects = Array.isArray(studioState.domainState?.projects)
      ? studioState.domainState.projects.length
      : 0;
    const promptRecords = getProjectPromptRecords(project);
    const blockedPromptRecords = promptRecords.filter(
      (record) => record.status === "needs_resolution" || record.status === "blocked",
    );

    return {
      projects,
      assets: countProjectItems(project, [
        "assets",
        "characters",
        "places",
        "reference_files",
        "referenceFiles",
      ]),
      blocked:
        countProjectItems(project, ["blocked_prompts", "blockedPrompts"]) +
        blockedPromptRecords.length,
      gallery: getProjectGalleryItems(project).items.length,
      images: countProjectItems(project, ["image_variants", "imageVariants", "images"]),
      prompts:
        countProjectItems(project, ["prompts", "prompt_index", "promptIndex"]) +
        promptRecords.length,
      videoJobs: getProjectVideoJobs(project).length,
      logs: Array.isArray(studioState.logs) ? studioState.logs.length : 0,
      logErrors: Array.isArray(studioState.logs)
        ? studioState.logs.filter((entry) => getLogCategory(entry) === "error").length
        : 0,
    };
  }

  function formatDate(value) {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function setActiveView(viewId) {
    studioState.activeView = getViewDefinition(viewId).id;
  }

  function setAssetFilter(type) {
    studioState.assetFilter =
      type === "all" || ASSET_TYPES.some((item) => item.id === type) ? type : "all";
  }

  async function loadProjectState() {
    studioState.isLoading = true;
    try {
      await refreshStudioLogs();
      const domain = getDomain();
      if (!domain || typeof domain.load !== "function") {
        throw new Error("Channel storage API unavailable.");
      }

      const domainState = await domain.load();
      studioState.domainState = domainState;
      studioState.activeProject = resolveActiveProject(domainState);
      studioState.flowContext = getStoredFlowContext(studioState.activeProject);
      studioState.lastError = null;
      return studioState;
    } catch (error) {
      studioState.lastError = error;
      throw error;
    } finally {
      studioState.isLoading = false;
    }
  }

  async function setActiveProject(projectId) {
    const domain = getDomain();
    if (!domain || typeof domain.setActiveProject !== "function") {
      throw new Error("Channel storage API unavailable.");
    }

    const result = await domain.setActiveProject(projectId);
    if (!result || !result.ok) {
      const message = result?.error?.message || "Channel switch failed.";
      throw new Error(message);
    }

    studioState.domainState = result.state;
    studioState.activeProject = resolveActiveProject(result.state);
    await refreshFlowContext();
    studioState.lastError = null;
    return studioState;
  }

  async function updateActiveProject(updates) {
    const projectId = studioState.activeProject?.project_id;
    const domain = getDomain();

    if (!projectId) {
      throw new Error("No active YouTube Channel selected.");
    }
    if (!domain || typeof domain.updateProject !== "function") {
      throw new Error("Channel storage API unavailable.");
    }

    const result = await domain.updateProject(projectId, updates);
    if (!result || !result.ok) {
      const message = result?.error?.message || "Channel update failed.";
      throw new Error(message);
    }

    studioState.domainState = result.state;
    studioState.activeProject = resolveActiveProject(result.state);
    studioState.lastError = null;
    return studioState;
  }

  async function updateProjectById(projectId, updates) {
    const domain = getDomain();
    const key = String(projectId || "").trim();
    if (!key) {
      throw new Error("No YouTube Channel selected.");
    }
    if (!domain || typeof domain.updateProject !== "function") {
      throw new Error("Channel storage API unavailable.");
    }

    const result = await domain.updateProject(key, updates);
    if (!result || !result.ok) {
      const message = result?.error?.message || "Channel update failed.";
      throw new Error(message);
    }

    studioState.domainState = result.state;
    studioState.activeProject = resolveActiveProject(result.state);
    studioState.flowContext = getStoredFlowContext(studioState.activeProject);
    studioState.lastError = null;
    return result;
  }

  function findVideoJobByBatchId(domainState, batchId) {
    const key = String(batchId || "").trim();
    if (!key) return null;
    const projects = Array.isArray(domainState?.projects) ? domainState.projects : [];
    for (const project of projects) {
      const job = getProjectVideoJobs(project).find((item) => {
        return item.job_id === key || item.run_batch_id === key;
      });
      if (job) return { project, job };
    }
    return null;
  }

  function findProjectByImageRunId(domainState, imageRunId) {
    const key = String(imageRunId || "").trim();
    if (!key) return null;
    const projects = Array.isArray(domainState?.projects) ? domainState.projects : [];
    for (const project of projects) {
      const run = getProjectImageGenerationRuns(project).find((item) => item.image_run_id === key);
      if (run) return { project, run };
    }
    return null;
  }

  function variantMatchesCachedPreview(variant, message) {
    const mediaId = String(message.mediaId || message.media_id || "").trim();
    const cacheKey = normalizeMediaCacheKey(message.cacheKey || message.cache_key || "");
    const fileName = String(
      message.cachedFileName ||
        message.cached_file_name ||
        message.fileName ||
        message.file_name ||
        "",
    ).trim();
    const names = [
      variant.cached_file_name,
      variant.cachedFileName,
      variant.generated_file_name,
      variant.generatedFileName,
      variant.local_file_name,
      variant.localFileName,
      variant.expected_file_name,
      variant.expectedFileName,
    ].map((value) => String(value || "").trim()).filter(Boolean);

    return (
      (!!mediaId && getVariantMediaId(variant) === mediaId) ||
      (!!cacheKey && normalizeMediaCacheKey(variant.cache_key || variant.cacheKey || "") === cacheKey) ||
      (!!fileName && names.includes(fileName))
    );
  }

  async function recordImagePreviewFromRuntimeMessage(message) {
    if (
      !message ||
      message.type !== "FROM_BACKGROUND" ||
      message.subType !== "PREVIEW_READY" ||
      message.mediaType === "video" ||
      !message.uiBatchId ||
      !message.mediaId
    ) {
      return false;
    }

    const domain = getDomain();
    let domainState = studioState.domainState;
    if (domain && typeof domain.load === "function") {
      domainState = await domain.load();
      studioState.domainState = domainState;
      studioState.activeProject = resolveActiveProject(domainState);
      studioState.flowContext = getStoredFlowContext(studioState.activeProject);
    }

    const runMatch = findProjectByImageRunId(domainState, message.uiBatchId);
    const project = runMatch?.project;
    const runRecord = runMatch?.run;
    if (!project || !runRecord || String(runRecord.status || "") !== "generating") return false;

    const promptIndex = Number(message.promptIndex || 0);
    const requestItems = Array.isArray(runRecord.request_items)
      ? runRecord.request_items.filter(isObject)
      : [];
    const requestItem =
      requestItems.find((item) => Number(item.source_index || 0) === promptIndex) ||
      requestItems[promptIndex];
    if (!requestItem?.prompt_id) return false;

    const timestamp = new Date().toISOString();
    const variants = getProjectImageVariants(project).slice();
    const existingVariant =
      variants.find(
        (variant) =>
          variant.image_run_id === runRecord.image_run_id &&
          getVariantMediaId(variant) === String(message.mediaId),
      ) || null;
    const promptVariants = variants.filter(
      (variant) =>
        variant.image_run_id === runRecord.image_run_id &&
        variant.prompt_id === requestItem.prompt_id,
    );
    const fallbackIndex = existingVariant
      ? Number(existingVariant.variant_index || 0)
      : promptVariants.reduce(
          (highest, variant) => Math.max(highest, Number(variant.variant_index || 0)),
          -1,
        ) + 1;
    const variant = Object.assign(
      buildImageVariantRecord(
        project,
        runRecord,
        requestItem,
        {
          media_id: message.mediaId,
          file_name: message.fileName,
          thumbnail_url: message.fifeUrl,
          fife_url: message.fifeUrl,
          file_state: "remote",
        },
        fallbackIndex,
        existingVariant,
        timestamp,
      ),
      {
        cache_state: existingVariant?.cache_state || "pending",
        file_state: existingVariant?.file_state === "available" ? "available" : "remote",
        repair_state: "",
        status: "available",
      },
    );
    upsertImageVariant(variants, variant);

    const mediaLinks = getProjectMediaLinks(project).slice();
    syncVariantMediaLink(mediaLinks, project, variant, timestamp);
    await updateProjectById(project.project_id, {
      image_variants: variants,
      media_links: mediaLinks,
      image_generation_runs: getProjectImageGenerationRuns(project).map((run) =>
        run.image_run_id === runRecord.image_run_id
          ? Object.assign({}, run, {
              status: "generating",
              variant_count: variants.filter(
                (item) => item.image_run_id === runRecord.image_run_id,
              ).length,
              updated_at: timestamp,
            })
          : run,
      ),
      prompt_records: getProjectPromptRecords(project).map((record) =>
        record.prompt_id === requestItem.prompt_id
          ? Object.assign({}, record, {
              active_image_run_id: runRecord.image_run_id,
              image_generation_state: "generated",
              image_generation_completed_at: timestamp,
              updated_at: timestamp,
            })
          : record,
      ),
    });
    return true;
  }

  async function recordCachedPreviewFromRuntimeMessage(message) {
    if (!message || message.type !== "FROM_BACKGROUND" || message.subType !== "PREVIEW_CACHED") {
      return false;
    }

    const domain = getDomain();
    let domainState = studioState.domainState;
    if (domain && typeof domain.load === "function") {
      domainState = await domain.load();
      studioState.domainState = domainState;
      studioState.activeProject = resolveActiveProject(domainState);
      studioState.flowContext = getStoredFlowContext(studioState.activeProject);
    }

    const runMatch = findProjectByImageRunId(domainState, message.uiBatchId);
    const project = runMatch?.project || studioState.activeProject;
    if (!project) return false;

    const cacheKey = normalizeMediaCacheKey(message.cacheKey || message.cache_key || "");
    const cachedFileName = String(
      message.cachedFileName ||
        message.cached_file_name ||
        message.fileName ||
        message.file_name ||
        "",
    ).trim();
    const mediaId = String(message.mediaId || message.media_id || "").trim();
    if (!cacheKey && !cachedFileName && !mediaId) return false;

    const timestamp = new Date().toISOString();
    let changed = false;
    const nextVariants = getProjectImageVariants(project).map((variant) => {
      if (!variantMatchesCachedPreview(variant, message)) return variant;
      changed = true;
      return Object.assign({}, variant, {
        cache_key: cacheKey || variant.cache_key || "",
        cached_file_name: cachedFileName || variant.cached_file_name || "",
        media_id: mediaId || getVariantMediaId(variant),
        local_file_name: variant.local_file_name || cachedFileName || variant.generated_file_name || "",
        file_state: "available",
        repair_state: "",
        status: variant.status === "failed" ? variant.status : "available",
        cached_at: message.cachedAt || message.cached_at || timestamp,
        updated_at: timestamp,
      });
    });
    if (!changed) return false;

    const nextMediaLinks = getProjectMediaLinks(project).slice();
    nextVariants.forEach((variant) => {
      if (variantMatchesCachedPreview(variant, message)) {
        syncVariantMediaLink(nextMediaLinks, project, variant, timestamp);
      }
    });

    await updateProjectById(project.project_id, {
      image_variants: nextVariants,
      media_links: nextMediaLinks,
    });
    return true;
  }

  async function recordImageRunStatusFromRuntimeMessage(message) {
    if (
      !message ||
      message.type !== "FROM_BACKGROUND" ||
      !message.uiBatchId ||
      (message.subType !== "PROMPT_STATUS" && message.subType !== "BATCH_GENERATION_DONE")
    ) {
      return false;
    }

    const domain = getDomain();
    let domainState = studioState.domainState;
    if (domain && typeof domain.load === "function") {
      domainState = await domain.load();
      studioState.domainState = domainState;
      studioState.activeProject = resolveActiveProject(domainState);
      studioState.flowContext = getStoredFlowContext(studioState.activeProject);
    }
    const runMatch = findProjectByImageRunId(domainState, message.uiBatchId);
    const project = runMatch?.project;
    const runRecord = runMatch?.run;
    if (!project || !runRecord) return false;

    const timestamp = new Date().toISOString();
    const requestItems = Array.isArray(runRecord.request_items)
      ? runRecord.request_items.filter(isObject)
      : [];
    const promptIds = new Set(requestItems.map((item) => item.prompt_id).filter(Boolean));
    const promptStatuses = Object.assign({}, runRecord.prompt_statuses || {});
    let nextRun = runRecord;
    let nextPromptRecords = getProjectPromptRecords(project);

    if (message.subType === "PROMPT_STATUS") {
      const promptIndex = Number(message.promptIndex || 0);
      const requestItem =
        requestItems.find((item) => Number(item.source_index || 0) === promptIndex) ||
        requestItems[promptIndex];
      if (!requestItem?.prompt_id) return false;
      const status = String(message.status || "").toLowerCase();
      if (!["running", "submitted", "failed"].includes(status)) return false;
      promptStatuses[requestItem.prompt_id] = {
        status,
        error: status === "failed" ? String(message.error || "Image generation failed.") : "",
        updated_at: timestamp,
      };
      const failedCount = Object.values(promptStatuses).filter(
        (item) => item?.status === "failed",
      ).length;
      nextRun = Object.assign({}, runRecord, {
        status: "generating",
        prompt_statuses: promptStatuses,
        failed_prompt_count: failedCount,
        updated_at: timestamp,
      });
      nextPromptRecords = nextPromptRecords.map((record) => {
        if (record.prompt_id !== requestItem.prompt_id) return record;
        return Object.assign({}, record, {
          active_image_run_id: runRecord.image_run_id,
          image_generation_state:
            status === "failed" ? "failed" : status === "submitted" ? "generated" : "generating",
          image_generation_error:
            status === "failed" ? String(message.error || "Image generation failed.") : "",
          updated_at: timestamp,
        });
      });
    } else {
      const successfulPrompts = Math.max(0, Number(message.successfulPrompts || 0));
      const failedPrompts = Math.max(0, Number(message.failedPrompts || 0));
      const status = failedPrompts ? (successfulPrompts ? "partial" : "failed") : "completed";
      nextRun = Object.assign({}, runRecord, {
        status,
        successful_prompt_count: successfulPrompts,
        failed_prompt_count: failedPrompts,
        total_image_count: Math.max(0, Number(message.totalImages || 0)),
        completed_at: timestamp,
        updated_at: timestamp,
      });
      const variants = getProjectImageVariants(project);
      nextPromptRecords = nextPromptRecords.map((record) => {
        if (!promptIds.has(record.prompt_id)) return record;
        const promptStatus = promptStatuses[record.prompt_id];
        const hasVariant = variants.some(
          (variant) =>
            variant.image_run_id === runRecord.image_run_id &&
            variant.prompt_id === record.prompt_id,
        );
        const failed = promptStatus?.status === "failed" || (status === "failed" && !hasVariant);
        return Object.assign({}, record, {
          image_generation_state: failed ? "failed" : "generated",
          image_generation_error: failed
            ? promptStatus?.error || record.image_generation_error || "Image generation failed."
            : "",
          image_generation_completed_at: failed ? record.image_generation_completed_at : timestamp,
          updated_at: timestamp,
        });
      });
    }

    await updateProjectById(project.project_id, {
      image_generation_runs: getProjectImageGenerationRuns(project).map((run) =>
        run.image_run_id === runRecord.image_run_id ? nextRun : run,
      ),
      prompt_records: nextPromptRecords,
    });
    return true;
  }

  function hasFlowContextChanged(project, context) {
    const previous = project?.flow_context || {};
    return (
      String(project?.current_flow_context_id || "") !== String(context.flow_context_id || "") ||
      String(previous.flow_context_id || "") !== String(context.flow_context_id || "") ||
      String(previous.status || "") !== String(context.status || "") ||
      String(previous.project_id || "") !== String(context.project_id || "") ||
      String(previous.url || "") !== String(context.url || "")
    );
  }

  async function refreshFlowContext(options) {
    const shouldPersist = !options || options.persist !== false;
    const project = studioState.activeProject;
    const projectId = project?.project_id || "";
    const runtime = root.chrome?.runtime;
    if (!runtime || typeof runtime.sendMessage !== "function") {
      studioState.flowContext = getStoredFlowContext(project);
      return studioState.flowContext;
    }

    let response = null;
    try {
      response = await runtime.sendMessage({ type: "GET_CONNECTION_STATE" });
    } catch (error) {
      response = {
        state: {
          status: "disconnected",
          lastError: error.message || "Connection check failed.",
        },
      };
    }

    const connectionState = response?.state || response;
    const hasExplicitConnectionState =
      Object.prototype.hasOwnProperty.call(Object(connectionState), "status") ||
      Object.prototype.hasOwnProperty.call(Object(connectionState), "projectId") ||
      Object.prototype.hasOwnProperty.call(Object(connectionState), "project_id");
    const contextBase = hasExplicitConnectionState
      ? buildFlowContextFromConnection(connectionState)
      : getStoredFlowContext(project);
    const context = Object.assign(contextBase, {
      updated_at: new Date().toISOString(),
    });
    if (String(studioState.activeProject?.project_id || "") !== projectId) {
      return context;
    }

    studioState.flowContext = context;

    if (shouldPersist && project && hasFlowContextChanged(project, context)) {
      await updateActiveProject({
        current_flow_context_id: context.flow_context_id,
        flow_context: context,
      });
    }

    return context;
  }

  async function createAsset(input) {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const timestamp = new Date().toISOString();
    const asset = {
      asset_id: createAssetId(),
      type: safeAssetType(input?.type),
      display_name: safeAssetName(input?.display_name || input?.name),
      aliases: [],
      files: [],
      usage_count: 0,
      flow_upload_state: "none",
      created_at: timestamp,
      updated_at: timestamp,
    };

    const assets = getProjectAssets(project).concat(asset);
    await updateActiveProject({ assets });
    return asset;
  }

  async function createAssetWithFile(input, fileList) {
    const project = studioState.activeProject;
    if (!project) throw new Error("No active YouTube Channel selected.");
    const displayName = String(input?.display_name || input?.name || "").trim();
    if (!displayName) throw new Error("Asset name is required.");
    const files = Array.prototype.slice.call(fileList || []).filter(Boolean);
    if (!files.length) throw new Error("Choose one reference image.");
    const file = files[0];
    if (!String(file.type || "").toLowerCase().startsWith("image/")) {
      throw new Error("Reference file must be an image.");
    }
    const timestamp = new Date().toISOString();
    const storedFile = await buildAssetFile(file, true);
    const asset = {
      asset_id: createAssetId(),
      type: "reference",
      display_name: displayName,
      aliases: [],
      files: [storedFile],
      primary_file_id: storedFile.asset_file_id,
      usage_count: 0,
      flow_upload_state: "none",
      created_at: timestamp,
      updated_at: timestamp,
    };
    await updateActiveProject({ assets: getProjectAssets(project).concat(asset) });
    return asset;
  }

  async function replaceAssetFile(assetId, fileList) {
    const project = studioState.activeProject;
    const asset = findAsset(assetId);
    if (!project) throw new Error("No active YouTube Channel selected.");
    if (!asset) throw new Error("Asset not found.");
    const files = Array.prototype.slice.call(fileList || []).filter(Boolean);
    if (!files.length) throw new Error("Choose one reference image.");
    const file = files[0];
    if (!String(file.type || "").toLowerCase().startsWith("image/")) {
      throw new Error("Reference file must be an image.");
    }
    const storedFile = await buildAssetFile(file, true);
    const timestamp = new Date().toISOString();
    await updateActiveProject({
      assets: getProjectAssets(project).map((item) =>
        item.asset_id === asset.asset_id
          ? Object.assign({}, item, {
              files: [storedFile],
              primary_file_id: storedFile.asset_file_id,
              flow_upload_state: "none",
              flow_media_id: "",
              flow_asset_file_id: "",
              updated_at: timestamp,
            })
          : item,
      ),
    });
    return findAsset(asset.asset_id);
  }

  async function addAssetFiles(assetId, fileList) {
    const project = studioState.activeProject;
    const asset = findAsset(assetId);
    const incomingFiles = Array.prototype.slice.call(fileList || []).filter(Boolean);

    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }
    if (!asset) {
      throw new Error("Asset not found.");
    }
    if (!incomingFiles.length) {
      throw new Error("Choose at least one file.");
    }
    const unsupportedFile = incomingFiles.find(
      (file) => !String(file?.type || "").toLowerCase().startsWith("image/"),
    );
    if (unsupportedFile) {
      throw new Error(
        `Reference files must be images: ${unsupportedFile.name || "unsupported file"}.`,
      );
    }

    const existingFiles = getAssetFiles(asset);
    const hasPrimary = existingFiles.some((file) => file.is_primary || file.role === "primary");
    const newFiles = await Promise.all(
      incomingFiles.map((file, index) => buildAssetFile(file, !hasPrimary && index === 0)),
    );
    const allFiles = existingFiles.concat(newFiles);
    const primaryFile =
      allFiles.find((file) => file.is_primary || file.role === "primary") || allFiles[0] || null;
    const timestamp = new Date().toISOString();

    const assets = getProjectAssets(project).map((item) => {
      if (item.asset_id !== asset.asset_id) return item;
      return Object.assign({}, item, {
        files: allFiles.map((file) => {
          const isPrimary = primaryFile && file.asset_file_id === primaryFile.asset_file_id;
          return Object.assign({}, file, {
            role: isPrimary ? "primary" : "reference",
            is_primary: !!isPrimary,
          });
        }),
        primary_file_id: primaryFile ? primaryFile.asset_file_id : null,
        flow_upload_state: "none",
        updated_at: timestamp,
      });
    });

    await updateActiveProject({ assets });
    return { asset_id: asset.asset_id, files: newFiles };
  }

  async function setPrimaryAssetFile(assetId, assetFileId) {
    const project = studioState.activeProject;
    const asset = findAsset(assetId);
    const fileId = String(assetFileId || "").trim();

    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }
    if (!asset) {
      throw new Error("Asset not found.");
    }

    const files = getAssetFiles(asset);
    if (!files.some((file) => file.asset_file_id === fileId)) {
      throw new Error("Asset file not found.");
    }

    const timestamp = new Date().toISOString();
    const assets = getProjectAssets(project).map((item) => {
      if (item.asset_id !== asset.asset_id) return item;
      return Object.assign({}, item, {
        files: files.map((file) => {
          const isPrimary = file.asset_file_id === fileId;
          return Object.assign({}, file, {
            role: isPrimary ? "primary" : "reference",
            is_primary: isPrimary,
            updated_at: isPrimary ? timestamp : file.updated_at,
          });
        }),
        primary_file_id: fileId,
        updated_at: timestamp,
      });
    });

    await updateActiveProject({ assets });
    return { asset_id: asset.asset_id, asset_file_id: fileId };
  }

  async function updateAsset(assetId, updates) {
    const project = studioState.activeProject;
    const asset = findAsset(assetId);

    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }
    if (!asset) {
      throw new Error("Asset not found.");
    }

    const patch = isObject(updates) ? updates : {};
    const timestamp = new Date().toISOString();
    const assets = getProjectAssets(project).map((item) => {
      if (item.asset_id !== asset.asset_id) return item;
      return Object.assign({}, item, {
        type: Object.prototype.hasOwnProperty.call(patch, "type")
          ? safeAssetType(patch.type)
          : item.type,
        display_name: Object.prototype.hasOwnProperty.call(patch, "display_name")
          ? safeAssetName(patch.display_name)
          : item.display_name,
        aliases: [],
        updated_at: timestamp,
      });
    });

    await updateActiveProject({ assets });
    return { asset_id: asset.asset_id };
  }

  async function setAssetDisabled(assetId, disabled) {
    const project = studioState.activeProject;
    const asset = findAsset(assetId);

    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }
    if (!asset) {
      throw new Error("Asset not found.");
    }

    const timestamp = new Date().toISOString();
    const assets = getProjectAssets(project).map((item) => {
      if (item.asset_id !== asset.asset_id) return item;
      return Object.assign({}, item, {
        disabled: !!disabled,
        disabled_at: disabled ? timestamp : null,
        lifecycle_status: disabled ? "disabled" : "active",
        updated_at: timestamp,
      });
    });

    await updateActiveProject({ assets });
    return { asset_id: asset.asset_id, disabled: !!disabled };
  }

  function getAssetUsage(project, assetId) {
    const id = String(assetId || "").trim();
    if (!id) return { jobs: 0, prompts: 0 };

    const promptRecords = getProjectPromptRecords(project);
    const prompts = promptRecords.reduce((count, record) => {
      const references = Array.isArray(record?.references) ? record.references : [];
      const usesAsset = references.some((reference) => {
        return reference?.asset_id === id || reference?.manual_asset_id === id;
      });
      return count + (usesAsset ? 1 : 0);
    }, 0);

    const videoJobs = getProjectVideoJobs(project);
    const jobs = videoJobs.reduce((count, job) => {
      const references = Array.isArray(job?.references) ? job.references : [];
      const usesAsset = references.some((reference) => {
        return reference?.asset_id === id || reference?.manual_asset_id === id;
      });
      return count + (usesAsset ? 1 : 0);
    }, 0);

    return { jobs, prompts };
  }

  async function deleteAsset(assetId) {
    const project = studioState.activeProject;
    const asset = findAsset(assetId);

    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }
    if (!asset) {
      throw new Error("Asset not found.");
    }

    const assets = getProjectAssets(project).filter((item) => item.asset_id !== asset.asset_id);
    const promptRecords = resolvePromptRecordsForProject(
      Object.assign({}, project, { assets }),
      getProjectPromptRecords(project),
    );
    await updateActiveProject({ assets, prompt_records: promptRecords });
    return { asset_id: asset.asset_id, deleted: true };
  }

  async function importProjectPromptJson(input, sourceName, videoName) {
    const project = studioState.activeProject;
    const api = getPromptImport();

    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }
    if (!api || typeof api.importPromptJson !== "function") {
      throw new Error("Channel prompt import API unavailable.");
    }

    const result = await api.importPromptJson(input, {
      projectId: project.project_id,
      sourceName,
    });
    studioState.domainState = result.state;
    studioState.activeProject = resolveActiveProject(result.state) || result.project;
    const cleanVideoName = String(videoName || "").trim();
    if (cleanVideoName) {
      const promptImports = getProjectPromptImports(studioState.activeProject).map((item) =>
        item.import_id === result.import_record.import_id
          ? Object.assign({}, item, { video_name: cleanVideoName })
          : item,
      );
      await updateActiveProject({ prompt_imports: promptImports });
      result.project = studioState.activeProject;
      result.state = studioState.domainState;
    }
    studioState.lastError = null;
    return result;
  }

  async function renameProjectVideo(videoId, displayName) {
    const project = studioState.activeProject;
    if (!project) throw new Error("No active YouTube Channel selected.");
    const key = String(videoId || "").trim();
    const name = String(displayName || "").trim();
    if (!key || !name) throw new Error("Video name is required.");
    if (key === "legacy") {
      await updateActiveProject({
        settings: Object.assign({}, project.settings || {}, { legacy_video_name: name }),
      });
      return getProjectVideos(studioState.activeProject).find((video) => video.video_id === key);
    }
    const promptImports = getProjectPromptImports(project);
    if (!promptImports.some((item) => item.import_id === key)) {
      throw new Error("Video not found.");
    }
    await updateActiveProject({
      prompt_imports: promptImports.map((item) =>
        item.import_id === key ? Object.assign({}, item, { video_name: name }) : item,
      ),
    });
    return getProjectVideos(studioState.activeProject).find((video) => video.video_id === key);
  }

  async function deleteProjectVideo(videoId) {
    const project = studioState.activeProject;
    if (!project) throw new Error("No active YouTube Channel selected.");
    const key = String(videoId || "").trim();
    const promptRecords = getVideoPromptRecords(project, key);
    if (!key || !promptRecords.length) throw new Error("Video not found.");
    const promptIds = new Set(promptRecords.map((record) => record.prompt_id));
    await updateActiveProject({
      prompt_imports:
        key === "legacy"
          ? getProjectPromptImports(project)
          : getProjectPromptImports(project).filter((item) => item.import_id !== key),
      prompt_records: getProjectPromptRecords(project).filter(
        (record) => !promptIds.has(record.prompt_id),
      ),
      image_variants: getProjectImageVariants(project).filter(
        (variant) => !promptIds.has(variant.prompt_id),
      ),
      image_generation_runs: getProjectImageGenerationRuns(project).filter((run) => {
        const requestItems = Array.isArray(run.request_items) ? run.request_items : [];
        return !requestItems.some((item) => promptIds.has(item.prompt_id));
      }),
      video_jobs: getProjectVideoJobs(project).filter((job) => !promptIds.has(job.prompt_id)),
    });
    return { video_id: key, deleted: true };
  }

  async function resolveActiveProjectPromptReferences() {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const promptRecords = getProjectPromptRecords(project);
    if (!promptRecords.length) {
      throw new Error("No Prompt Records to resolve.");
    }

    const resolvedRecords = resolvePromptRecordsForProject(project, promptRecords);
    await updateActiveProject({ prompt_records: resolvedRecords });
    return {
      records: resolvedRecords,
      summary: summarizePromptResolution(resolvedRecords),
    };
  }

  async function mapPromptReferenceToAsset(promptId, referenceIndex, assetId) {
    const project = studioState.activeProject;
    const promptKey = String(promptId || "").trim();
    const index = Number(referenceIndex);
    const assets = getProjectAssets(project);
    const asset = getAssetById(assets, assetId);

    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }
    if (!promptKey) {
      throw new Error("Prompt Record is missing.");
    }
    if (!Number.isInteger(index) || index < 0) {
      throw new Error("Reference selection is invalid.");
    }
    if (!asset || !isAssetActive(asset)) {
      throw new Error("Choose an active Asset.");
    }

    const promptRecords = getProjectPromptRecords(project);
    const prompt = promptRecords.find((record) => record.prompt_id === promptKey);
    if (!prompt) {
      throw new Error("Prompt Record not found.");
    }

    const references = Array.isArray(prompt.references) ? prompt.references.filter(isObject) : [];
    const reference = references[index];
    if (!reference) {
      throw new Error("Reference not found on Prompt Record.");
    }

    const timestamp = new Date().toISOString();
    const nextRecords = promptRecords.map((record) => {
      if (record.prompt_id !== promptKey) return record;

      const mappedReferences = references.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return Object.assign({}, item, {
          manual_asset_id: asset.asset_id,
          asset_id: asset.asset_id,
          asset_type: asset.type || "",
          asset_name: safeAssetName(asset.display_name || asset.displayName || asset.name),
          resolution_status: "resolved",
          resolution_source: "manual",
          resolution_error: "",
        });
      });

      return resolvePromptRecord(
        Object.assign({}, record, {
          references: mappedReferences,
          updated_at: timestamp,
        }),
        assets,
        timestamp,
      );
    });

    await updateActiveProject({ prompt_records: nextRecords });

    return {
      prompt_id: promptKey,
      asset_id: asset.asset_id,
      records: nextRecords,
      summary: summarizePromptResolution(nextRecords),
    };
  }

  async function startImageGenerationRun(videoId, requestedSettings, options) {
    /** @type {any} */
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const videoKey = String(videoId || "").trim();
    const gate = getImageGenerationGate(project, videoKey);
    const requestedPromptIds = new Set(
      (Array.isArray(options?.promptIds) ? options.promptIds : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    );
    const included = requestedPromptIds.size
      ? gate.included.filter((item) => requestedPromptIds.has(item.prompt_id))
      : gate.included;
    if (!included.length) {
      throw new Error("No Ready prompts are eligible for image generation.");
    }
    const effectiveGate = Object.assign({}, gate, {
      included,
      ready_count: included.length,
    });

    const activeImageRun = getProjectImageGenerationRuns(project).find(
      (run) => String(run.status || "").toLowerCase() === "generating",
    );
    const activeVideoJob = getProjectVideoJobs(project).find(
      (job) => normalizeVideoJobStatus(job) === "running",
    );
    if (activeImageRun || activeVideoJob) {
      throw new Error("Another image or video generation run is already active.");
    }

    const imageGeneration = root.TFProjectImageGeneration;
    if (!imageGeneration?.buildImageBatchDescriptor || !imageGeneration?.buildStartBatchMessage) {
      throw new Error("Image generation service is unavailable.");
    }

    const timestamp = new Date().toISOString();
    const imageRunId = createImageRunId();
    const projectSettings = Object(project).settings;
    const settings = isObject(projectSettings) ? projectSettings : {};
    const generationSettings = imageGeneration.normalizeSettings(
      Object.assign(
        {
          imageModel: settings.image_model || settings.imageModel,
          imageRatio: settings.image_ratio || settings.imageRatio,
          imageCount: settings.image_count || settings.imageCount,
          speedMode: settings.image_speed_mode || settings.speedMode,
        },
        isObject(requestedSettings) ? requestedSettings : {},
      ),
    );
    const requestItems = included.map((item, index) => {
      return {
        prompt_id: item.prompt_id,
        source_index: index,
        file_name: item.file_name,
        image_prompt: item.image_prompt,
        references: item.references.map((reference) => Object.assign({}, reference)),
      };
    });
    const video = getProjectVideos(project).find((item) => item.video_id === videoKey) || null;
    const projectName = String(project.display_name || "Imported video").trim() || "Imported video";
    const descriptor = imageGeneration.buildImageBatchDescriptor({
      projectId: project.project_id,
      projectName,
      projectFolder: imageGeneration.safeFolderName(projectName, "turboflow"),
      sourceImportName: video?.source_name || video?.display_name || "imported-json",
      records: requestItems,
      settings: generationSettings,
    });
    const runRecord = {
      image_run_id: imageRunId,
      video_id: videoKey,
      retry_of_image_run_id: String(options?.retryOfRunId || "").trim(),
      status: "generating",
      image_model: generationSettings.imageModel,
      image_ratio: generationSettings.imageRatio,
      image_count: generationSettings.imageCount,
      speed_mode: generationSettings.speedMode,
      output_folder: descriptor.folder,
      prompt_count: requestItems.length,
      excluded_prompt_count: gate.prompt_count - requestItems.length,
      request_items: requestItems,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const includedPromptIds = new Set(requestItems.map((item) => item.prompt_id));
    const promptRecords = getProjectPromptRecords(project).map((record) => {
      if (!includedPromptIds.has(record.prompt_id)) return record;
      return Object.assign({}, record, {
        active_image_run_id: imageRunId,
        image_generation_state: "generating",
        image_generation_started_at: timestamp,
        updated_at: timestamp,
      });
    });

    await updateActiveProject({
      settings: Object.assign({}, settings, {
        image_model: generationSettings.imageModel,
        image_ratio: generationSettings.imageRatio,
        image_count: generationSettings.imageCount,
        image_speed_mode: generationSettings.speedMode,
      }),
      prompt_records: promptRecords,
      image_generation_runs: getProjectImageGenerationRuns(project).concat(runRecord),
    });

    const startMessage = imageGeneration.buildStartBatchMessage(descriptor, imageRunId, {
      speedMode: generationSettings.speedMode,
    });
    try {
      const response = await root.chrome?.runtime?.sendMessage?.(startMessage);
      if (!response?.ok) {
        throw new Error(response?.error || "Flow did not accept the image generation run.");
      }
    } catch (error) {
      const failedAt = new Date().toISOString();
      const failedProject = studioState.activeProject || project;
      await updateActiveProject({
        image_generation_runs: getProjectImageGenerationRuns(failedProject).map((run) =>
          run.image_run_id === imageRunId
            ? Object.assign({}, run, {
                status: "failed",
                error_message: error?.message || String(error),
                failed_at: failedAt,
                updated_at: failedAt,
              })
            : run,
        ),
        prompt_records: getProjectPromptRecords(failedProject).map((record) =>
          includedPromptIds.has(record.prompt_id)
            ? Object.assign({}, record, {
                image_generation_state: "failed",
                image_generation_error: error?.message || String(error),
                updated_at: failedAt,
              })
            : record,
        ),
      });
      throw error;
    }

    return {
      run: runRecord,
      gate: effectiveGate,
      message: startMessage,
    };
  }

  async function stopImageGenerationRun(imageRunId) {
    const project = studioState.activeProject;
    if (!project) throw new Error("No active YouTube Channel selected.");
    const runKey = String(imageRunId || "").trim();
    const runRecord = findImageGenerationRun(project, runKey);
    if (!runRecord) throw new Error(`Image generation run not found: ${runKey}.`);
    if (String(runRecord.status || "").toLowerCase() !== "generating") {
      throw new Error("Only a generating image run can be stopped.");
    }

    const response = await root.chrome?.runtime?.sendMessage?.({ type: "STOP_BATCH" });
    if (response && response.ok === false) {
      throw new Error(response.error || "Flow did not stop the image generation run.");
    }
    const timestamp = new Date().toISOString();
    const promptIds = new Set(
      (Array.isArray(runRecord.request_items) ? runRecord.request_items : [])
        .map((item) => String(item?.prompt_id || "").trim())
        .filter(Boolean),
    );
    const stoppedRun = Object.assign({}, runRecord, {
      status: "stopped",
      error_message: "Stopped by user.",
      stopped_at: timestamp,
      completed_at: timestamp,
      updated_at: timestamp,
    });
    await updateActiveProject({
      image_generation_runs: getProjectImageGenerationRuns(project).map((run) =>
        run.image_run_id === runKey ? stoppedRun : run,
      ),
      prompt_records: getProjectPromptRecords(project).map((record) =>
        promptIds.has(record.prompt_id) && record.active_image_run_id === runKey
          ? Object.assign({}, record, {
              image_generation_state: "failed",
              image_generation_error: "Stopped by user.",
              updated_at: timestamp,
            })
          : record,
      ),
    });
    return stoppedRun;
  }

  async function retryImageGenerationRun(imageRunId) {
    const project = studioState.activeProject;
    if (!project) throw new Error("No active YouTube Channel selected.");
    const runKey = String(imageRunId || "").trim();
    const runRecord = findImageGenerationRun(project, runKey);
    if (!runRecord) throw new Error(`Image generation run not found: ${runKey}.`);
    if (!["failed", "partial", "stopped"].includes(String(runRecord.status || "").toLowerCase())) {
      throw new Error("Only failed, partial, or stopped image runs can be retried.");
    }

    const promptRecords = new Map(
      getProjectPromptRecords(project).map((record) => [record.prompt_id, record]),
    );
    const variants = getProjectImageVariants(project);
    const promptStatuses = isObject(runRecord.prompt_statuses) ? runRecord.prompt_statuses : {};
    const promptIds = (Array.isArray(runRecord.request_items) ? runRecord.request_items : [])
      .map((item) => String(item?.prompt_id || "").trim())
      .filter((promptId) => {
        if (!promptId) return false;
        if (promptStatuses[promptId]?.status === "failed") return true;
        if (promptRecords.get(promptId)?.image_generation_state === "failed") return true;
        return !variants.some(
          (variant) => variant.image_run_id === runKey && variant.prompt_id === promptId,
        );
      });
    if (!promptIds.length) throw new Error("This image run has no failed prompts to retry.");

    return startImageGenerationRun(
      runRecord.video_id,
      {
        imageModel: runRecord.image_model,
        imageRatio: runRecord.image_ratio,
        imageCount: runRecord.image_count,
        speedMode: runRecord.speed_mode,
      },
      { promptIds, retryOfRunId: runKey },
    );
  }

  async function recordImageGenerationRunVariants(imageRunId, completionItems) {
    const activeProject = studioState.activeProject;
    if (!activeProject) {
      throw new Error("No active YouTube Channel selected.");
    }

    const project = Object(activeProject);
    const runKey = String(imageRunId || "").trim();
    const runRecord = findImageGenerationRun(project, runKey);
    if (!runRecord) {
      throw new Error(`Image generation run not found: ${runKey || "(empty id)"}.`);
    }

    const requestItems = Array.isArray(runRecord.request_items)
      ? runRecord.request_items.filter(isObject)
      : [];
    if (!requestItems.length) {
      throw new Error("Image generation run has no request items to record.");
    }

    const timestamp = new Date().toISOString();
    const completions = Array.isArray(completionItems) ? completionItems.filter(isObject) : [];
    const existingVariants = getProjectImageVariants(project);
    const nextVariants = existingVariants.slice();
    const nextMediaLinks = getProjectMediaLinks(project).slice();
    const recordedVariants = new Array();
    const completedPromptIds = new Set();
    const defaultImageCount = Number(runRecord.image_count || 2);
    const imageCount = defaultImageCount > 0 ? defaultImageCount : 2;

    requestItems.forEach((requestItem) => {
      const promptId = String(requestItem.prompt_id || "").trim();
      if (!promptId) return;

      const completion = findCompletionForPrompt(completions, promptId);
      const providedVariants = Array.isArray(completion.variants)
        ? completion.variants.filter(isObject)
        : [];
      const variantCount = Math.max(imageCount, providedVariants.length || 0);
      completedPromptIds.add(promptId);

      for (let index = 0; index < variantCount; index += 1) {
        const variantInput = providedVariants[index] || {};
        const variantIndex = normalizeVariantIndex(variantInput, index);
        const existingVariant =
          existingVariants.find((item) => {
            return (
              item.image_run_id === runRecord.image_run_id &&
              item.prompt_id === promptId &&
              Number(item.variant_index) === variantIndex
            );
          }) || null;
        const variant = buildImageVariantRecord(
          project,
          runRecord,
          requestItem,
          variantInput,
          index,
          existingVariant,
          timestamp,
        );
        upsertImageVariant(nextVariants, variant);
        syncVariantMediaLink(nextMediaLinks, project, variant, timestamp);
        recordedVariants.push(variant);
      }
    });

    const nextRuns = getProjectImageGenerationRuns(project).map((run) => {
      if (run.image_run_id !== runRecord.image_run_id) return run;
      return Object.assign({}, run, {
        status: "completed",
        variant_count: recordedVariants.length,
        completed_at: run.completed_at || timestamp,
        updated_at: timestamp,
      });
    });
    const promptRecords = getProjectPromptRecords(project).map((record) => {
      if (!completedPromptIds.has(record.prompt_id)) return record;
      return Object.assign({}, record, {
        image_generation_state: "generated",
        image_generation_completed_at: timestamp,
        updated_at: timestamp,
      });
    });

    await updateActiveProject({
      image_generation_runs: nextRuns,
      image_variants: nextVariants,
      media_links: nextMediaLinks,
      prompt_records: promptRecords,
    });

    return {
      image_run_id: runRecord.image_run_id,
      variant_count: recordedVariants.length,
      variants: recordedVariants,
    };
  }

  async function createOrUpdateVideoDraft(promptId) {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const promptKey = String(promptId || "").trim();
    const promptRecords = getProjectPromptRecords(project);
    const promptRecord = promptRecords.find((record) => record.prompt_id === promptKey);
    if (!promptRecord) {
      throw new Error(`Prompt Record not found: ${promptKey}.`);
    }
    if (!getPromptAnimationPrompt(promptRecord)) {
      throw new Error("Animation prompt is required for a Video Draft.");
    }

    const selectedVariant = getSelectedVariantForPrompt(project, promptRecord);
    if (!selectedVariant) {
      throw new Error("Select an Image Variant before creating a Video Draft.");
    }
    if (isVariantMissingLocalFile(selectedVariant)) {
      throw new Error("Repair the selected image file before creating a Video Draft.");
    }

    const timestamp = new Date().toISOString();
    const videoJobs = getProjectVideoJobs(project);
    const existingJob =
      videoJobs.find((job) => {
        if (String(job.prompt_id || "").trim() !== promptKey) return false;
        const status = normalizeVideoJobStatus(job);
        return status === "draft" || status === "ready" || status === "needs_review";
      }) || null;
    const nextJob = buildVideoJobRecord(
      project,
      promptRecord,
      selectedVariant,
      existingJob,
      timestamp,
      "draft",
    );
    const nextVideoJobs = existingJob
      ? videoJobs.map((job) => (job.job_id === existingJob.job_id ? nextJob : job))
      : videoJobs.concat(nextJob);

    await updateActiveProject({ video_jobs: nextVideoJobs });
    return nextJob;
  }

  async function addVideoDraftToQueue(jobId) {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    await refreshFlowContext();
    const currentProject = studioState.activeProject || project;
    const jobKey = String(jobId || "").trim();
    const videoJobs = getProjectVideoJobs(currentProject);
    const targetJob = videoJobs.find((job) => job.job_id === jobKey);
    if (!targetJob) {
      throw new Error(`Video Draft not found: ${jobKey}.`);
    }

    const status = normalizeVideoJobStatus(targetJob);
    if (status === "running" || status === "complete") {
      throw new Error("Running or complete video jobs are protected.");
    }

    const promptRecord = getProjectPromptRecords(currentProject).find(
      (record) => record.prompt_id === targetJob.prompt_id,
    );
    const selectedVariant = getSelectedVariantForPrompt(currentProject, promptRecord);
      const reviewReason = getVideoJobReviewReason(currentProject, targetJob, promptRecord, selectedVariant);
    const timestamp = new Date().toISOString();

    if (reviewReason) {
      const reviewedJobs = videoJobs.map((job) => {
        if (job.job_id !== targetJob.job_id) return job;
        return Object.assign({}, job, {
          status: "needs_review",
          needs_review_reason: reviewReason,
          pending_selected_variant_id: selectedVariant?.variant_id || "",
          pending_selected_generated_file_name: selectedVariant?.generated_file_name || "",
          updated_at: timestamp,
        });
      });
      await updateActiveProject({ video_jobs: reviewedJobs });
      throw new Error(reviewReason);
    }

    const queuedJobs = videoJobs.map((job) => {
      if (job.job_id !== targetJob.job_id) return job;
      return Object.assign({}, job, {
        status: "ready",
        queue_order: job.queue_order || getNextVideoQueueOrder(videoJobs),
        queued_at: timestamp,
        needs_review_reason: "",
        updated_at: timestamp,
      });
    });

    await updateActiveProject({ video_jobs: queuedJobs });
    return queuedJobs.find((job) => job.job_id === jobKey);
  }

  async function queuePromptVideo(promptId) {
    const project = studioState.activeProject;
    if (!project) throw new Error("No active YouTube Channel selected.");
    const key = String(promptId || "").trim();
    const currentItem = getVideoQueueItems(project).find((item) => item.prompt_id === key);
    if (!currentItem) throw new Error("Scene not found.");
    if (currentItem.status === "ready" && !currentItem.can_create_draft) return currentItem.job;
    if (
      (currentItem.status === "running" || currentItem.status === "complete") &&
      !currentItem.can_create_draft
    ) {
      return currentItem.job;
    }
    const draft = await createOrUpdateVideoDraft(key);
    return addVideoDraftToQueue(draft.job_id);
  }

  async function holdVideoJob(jobId) {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const jobKey = String(jobId || "").trim();
    const videoJobs = getProjectVideoJobs(project);
    const targetJob = videoJobs.find((job) => job.job_id === jobKey);
    if (!targetJob) {
      throw new Error(`Video job not found: ${jobKey}.`);
    }

    const status = normalizeVideoJobStatus(targetJob);
    if (status === "running" || status === "complete") {
      throw new Error("Running or complete video jobs are protected.");
    }

    const timestamp = new Date().toISOString();
    const nextJobs = videoJobs.map((job) => {
      if (job.job_id !== jobKey) return job;
      return Object.assign({}, job, {
        status: "draft",
        queue_order: 0,
        queued_at: "",
        hold_reason: "Held before run.",
        updated_at: timestamp,
      });
    });

    await updateActiveProject({ video_jobs: nextJobs });
    return nextJobs.find((job) => job.job_id === jobKey);
  }

  async function removeVideoJob(jobId) {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const jobKey = String(jobId || "").trim();
    const videoJobs = getProjectVideoJobs(project);
    const targetJob = videoJobs.find((job) => job.job_id === jobKey);
    if (!targetJob) {
      throw new Error(`Video job not found: ${jobKey}.`);
    }

    const status = normalizeVideoJobStatus(targetJob);
    if (status === "running" || status === "complete") {
      throw new Error("Running or complete video jobs are protected.");
    }

    await updateActiveProject({
      video_jobs: videoJobs.filter((job) => job.job_id !== jobKey),
    });
    return { job_id: jobKey };
  }

  async function moveVideoJob(jobId, direction) {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const jobKey = String(jobId || "").trim();
    const step = direction === "down" ? 1 : -1;
    const videoJobs = getProjectVideoJobs(project);
    const promptRecords = getProjectPromptRecords(project);
    const targetJob = videoJobs.find((job) => job.job_id === jobKey);
    const targetRecord = promptRecords.find((record) => record.prompt_id === targetJob?.prompt_id);
    if (!targetRecord) {
      throw new Error(`Ready video job not found: ${jobKey}.`);
    }
    const knownImportIds = new Set(
      getProjectPromptImports(project).map((item) => String(item.import_id || "")),
    );
    const importId = String(targetRecord?.source?.import_id || "");
    const targetVideoId = importId && knownImportIds.has(importId) ? importId : "legacy";
    const promptIdsInVideo = new Set(
      getVideoPromptRecords(project, targetVideoId).map((record) => record.prompt_id),
    );
    const sourceIndexByPromptId = new Map(
      promptRecords.map((record, index) => [
        record.prompt_id,
        Number(record.source_index || index || 0),
      ]),
    );
    const readyJobs = videoJobs
      .filter((job) => {
        return (
          normalizeVideoJobStatus(job) === "ready" &&
          promptIdsInVideo.has(String(job.prompt_id || "").trim())
        );
      })
      .slice()
      .sort((left, right) => {
        const leftOrder = Number(left.queue_order || left.queueOrder || 0);
        const rightOrder = Number(right.queue_order || right.queueOrder || 0);
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return (
          Number(sourceIndexByPromptId.get(left.prompt_id) || 0) -
          Number(sourceIndexByPromptId.get(right.prompt_id) || 0)
        );
      });
    const index = readyJobs.findIndex((job) => job.job_id === jobKey);
    if (index < 0) {
      throw new Error(`Ready video job not found: ${jobKey}.`);
    }

    const nextIndex = index + step;
    if (nextIndex < 0 || nextIndex >= readyJobs.length) {
      return readyJobs[index];
    }

    const moved = readyJobs.slice();
    const currentJob = moved[index];
    moved[index] = moved[nextIndex];
    moved[nextIndex] = currentJob;

    const timestamp = new Date().toISOString();
    const orderByJobId = new Map(
      moved.map((job, orderIndex) => [job.job_id, orderIndex + 1]),
    );
    const nextJobs = videoJobs.map((job) => {
      if (!orderByJobId.has(job.job_id)) return job;
      return Object.assign({}, job, {
        queue_order: orderByJobId.get(job.job_id),
        updated_at: timestamp,
      });
    });

    await updateActiveProject({ video_jobs: nextJobs });
    return nextJobs.find((job) => job.job_id === jobKey);
  }

  async function runVideoJob(jobId) {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    await refreshFlowContext();
    const currentProject = studioState.activeProject || project;
    const jobKey = String(jobId || "").trim();
    const videoJobs = getProjectVideoJobs(currentProject);
    const targetJob = videoJobs.find((job) => job.job_id === jobKey);
    if (!targetJob) {
      throw new Error(`Video job not found: ${jobKey}.`);
    }

    const status = normalizeVideoJobStatus(targetJob);
    if (status !== "ready" && status !== "failed") {
      throw new Error("Only Ready or Failed video jobs can run.");
    }

    const promptRecord = getProjectPromptRecords(currentProject).find(
      (record) => record.prompt_id === targetJob.prompt_id,
    );
    const selectedVariant = getSelectedVariantForPrompt(currentProject, promptRecord);
    const reviewReason = getVideoJobReviewReason(currentProject, targetJob, promptRecord, selectedVariant);
    if (reviewReason) {
      await updateActiveProject({
        video_jobs: videoJobs.map((job) =>
          job.job_id === jobKey
            ? Object.assign({}, job, {
                status: "needs_review",
                needs_review_reason: reviewReason,
                updated_at: new Date().toISOString(),
              })
            : job,
        ),
      });
      throw new Error(reviewReason);
    }

    const mediaId = getVariantMediaId(selectedVariant);
    if (!mediaId) {
      const message = "Selected image has no Flow media ID for start-frame video.";
      await updateActiveProject({
        video_jobs: videoJobs.map((job) =>
          job.job_id === jobKey
            ? Object.assign({}, job, {
                status: "needs_review",
                needs_review_reason: message,
                updated_at: new Date().toISOString(),
              })
            : job,
        ),
      });
      throw new Error(message);
    }

    const runtime = root.chrome?.runtime;
    if (!runtime || typeof runtime.sendMessage !== "function") {
      throw new Error("Chrome runtime messaging unavailable.");
    }

    const timestamp = new Date().toISOString();
    const videoId = String(promptRecord?.source?.import_id || "legacy");
    const video = getProjectVideos(currentProject).find((item) => item.video_id === videoId);
    const channelFolder = safeFolderName(
      currentProject.display_name || currentProject.name || "autoflow-channel",
    );
    const videoFolder = safeFolderName(video?.display_name || "imported-video");
    const folder = `${channelFolder}/${videoFolder}`;
    const settings = Object.assign({}, currentProject.settings || {}, {
      mode: "video",
      folder,
      videoMode: "start_frame",
      referenceMode: "mapped",
      perPromptStartFrames: { 0: mediaId },
      videoCount: 1,
      videoQuality: currentProject.settings?.videoQuality || "lite",
      videoRatio: currentProject.settings?.videoRatio || "landscape",
      videoDuration: currentProject.settings?.videoDuration || 8,
      autoDownloadImages: false,
      autoDownloadVideos: false,
      videoDownloadQuality: currentProject.settings?.videoDownloadQuality || "standard",
      projectName: currentProject.display_name || currentProject.name || "AutoFlow Channel",
      projectFolder: channelFolder,
      videoId,
      videoName: video?.display_name || "Imported video",
      batchKind: "project_video_job",
      speedMode: currentProject.settings?.speedMode || "fast",
    });

    const response = await runtime.sendMessage({
      type: "START_BATCH",
      batchId: targetJob.job_id,
      prompts: [targetJob.animation_prompt || getPromptAnimationPrompt(promptRecord)],
      promptIndexMap: [0],
      settings,
      featureFlags: {},
      uploadsThisSession: [],
    });

    if (response && response.ok === false) {
      throw new Error(response.error || "Video generation did not start.");
    }

    const nextJobs = videoJobs.map((job) => {
      if (job.job_id !== jobKey) return job;
      return Object.assign({}, job, {
        status: "running",
        run_batch_id: targetJob.job_id,
        run_prompt_index: 0,
        run_started_at: timestamp,
        flow_context_id: getActiveFlowContextId(currentProject),
        start_frame_flow_context_id: getVariantFlowContextId(selectedVariant),
        error_message: "",
        updated_at: timestamp,
      });
    });

    await updateActiveProject({ video_jobs: nextJobs });
    return nextJobs.find((job) => job.job_id === jobKey);
  }

  async function repairVideoJobStartFrame(jobId) {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const currentContextId = getActiveFlowContextId(project);
    if (!currentContextId) {
      throw new Error("Connect to the current Flow project before repairing the start frame.");
    }

    const jobKey = String(jobId || "").trim();
    const videoJobs = getProjectVideoJobs(project);
    const targetJob = videoJobs.find((job) => job.job_id === jobKey);
    if (!targetJob) {
      throw new Error(`Video job not found: ${jobKey}.`);
    }

    const promptRecord = getProjectPromptRecords(project).find(
      (record) => record.prompt_id === targetJob.prompt_id,
    );
    const selectedVariant = getSelectedVariantForPrompt(project, promptRecord);
    if (!selectedVariant) {
      throw new Error("Select an Image Variant before repairing the start frame.");
    }

    const frameFileName =
      selectedVariant.local_file_name ||
      selectedVariant.generated_file_name ||
      promptRecord?.selected_variant_generated_file_name ||
      selectedVariant.expected_file_name ||
      "";
    if (!frameFileName) {
      throw new Error("Selected image has no local filename to upload.");
    }

    const runtime = root.chrome?.runtime;
    if (!runtime || typeof runtime.sendMessage !== "function") {
      throw new Error("Chrome runtime messaging unavailable.");
    }

    const timestamp = new Date().toISOString();
    let uploadResponse = null;
    try {
      uploadResponse = await runtime.sendMessage({
        type: "UPLOAD_CACHED_FRAME",
        fileName: frameFileName,
      });
    } catch (error) {
      uploadResponse = { ok: false, error: error.message || "Start frame upload failed." };
    }

    if (!uploadResponse || uploadResponse.ok === false || !uploadResponse.mediaId) {
      const message = uploadResponse?.error || "Start frame upload failed.";
      await updateActiveProject({
        video_jobs: videoJobs.map((job) =>
          job.job_id === jobKey
            ? Object.assign({}, job, {
                status: "needs_review",
                needs_review_reason: `Needs Reference Upload: ${message}`,
                updated_at: timestamp,
              })
            : job,
        ),
      });
      throw new Error(`Needs Reference Upload: ${message}`);
    }

    const nextVariants = getProjectImageVariants(project).map((variant) => {
      if (variant.variant_id !== selectedVariant.variant_id) return variant;
      return Object.assign({}, variant, {
        media_id: uploadResponse.mediaId,
        flow_context_id: currentContextId,
        media_uploaded_at: timestamp,
        updated_at: timestamp,
      });
    });
    const nextJobs = videoJobs.map((job) => {
      if (job.job_id !== jobKey) return job;
      const previousStatus = normalizeVideoJobStatus(job);
      return Object.assign({}, job, {
        status: previousStatus === "failed" || previousStatus === "needs_review" ? "ready" : previousStatus,
        selected_variant_id: selectedVariant.variant_id,
        start_variant_id: selectedVariant.variant_id,
        start_image_file_name: getVariantSourceFileName(selectedVariant),
        selected_variant_generated_file_name: selectedVariant.generated_file_name || "",
        flow_context_id: currentContextId,
        start_frame_flow_context_id: currentContextId,
        repaired_at: timestamp,
        needs_review_reason: "",
        error_message: "",
        updated_at: timestamp,
      });
    });

    await updateActiveProject({
      image_variants: nextVariants,
      video_jobs: nextJobs,
    });

    return nextJobs.find((job) => job.job_id === jobKey);
  }

  async function stopVideoJob(jobId) {
    const project = studioState.activeProject;
    if (!project) {
      throw new Error("No active YouTube Channel selected.");
    }

    const jobKey = String(jobId || "").trim();
    const videoJobs = getProjectVideoJobs(project);
    const targetJob = videoJobs.find((job) => job.job_id === jobKey);
    if (!targetJob) {
      throw new Error(`Video job not found: ${jobKey}.`);
    }
    if (normalizeVideoJobStatus(targetJob) !== "running") {
      throw new Error("Only Running video jobs can be stopped.");
    }

    await root.chrome?.runtime?.sendMessage?.({ type: "STOP_BATCH" });
    const timestamp = new Date().toISOString();
    const nextJobs = videoJobs.map((job) => {
      if (job.job_id !== jobKey) return job;
      return Object.assign({}, job, {
        status: "failed",
        error_message: "Stopped by user.",
        stopped_at: timestamp,
        updated_at: timestamp,
      });
    });
    await updateActiveProject({ video_jobs: nextJobs });
    return nextJobs.find((job) => job.job_id === jobKey);
  }

  async function handleVideoRuntimeMessage(message) {
    const imagePreviewRecorded = await recordImagePreviewFromRuntimeMessage(message);
    if (imagePreviewRecorded) {
      return true;
    }

    const cachedPreviewRecorded = await recordCachedPreviewFromRuntimeMessage(message);
    if (cachedPreviewRecorded) {
      return true;
    }

    const imageStatusRecorded = await recordImageRunStatusFromRuntimeMessage(message);
    if (imageStatusRecorded) {
      return true;
    }

    if (!message || message.type !== "FROM_BACKGROUND" || !message.uiBatchId) {
      return false;
    }

    const batchId = String(message.uiBatchId || "").trim();
    const domain = getDomain();
    let domainState = studioState.domainState;
    if (domain && typeof domain.load === "function") {
      domainState = await domain.load();
      studioState.domainState = domainState;
      studioState.activeProject = resolveActiveProject(domainState);
      studioState.flowContext = getStoredFlowContext(studioState.activeProject);
    }
    const match = findVideoJobByBatchId(domainState, batchId);
    if (!match) return false;

    const project = match.project;
    const videoJobs = getProjectVideoJobs(project);
    const targetJob = match.job;
    if (!targetJob) return false;

    const targetStatus = normalizeVideoJobStatus(targetJob);
    const stoppedJob = targetStatus === "failed" && !!targetJob.stopped_at;
    if (
      stoppedJob &&
      (message.subType === "PREVIEW_READY" ||
        (message.subType === "PROMPT_STATUS" && message.status !== "failed"))
    ) {
      return false;
    }

    const timestamp = new Date().toISOString();
    let nextJob = null;
    if (message.subType === "PREVIEW_READY" && message.mediaType === "video") {
      nextJob = Object.assign({}, targetJob, {
        status: "complete",
        output_media_id: message.mediaId || "",
        video_url: message.videoUrl || "",
        workflow_id: message.workflowId || targetJob.workflow_id || "",
        output_file_name: message.fileName || targetJob.expected_output_file_name || "",
        completed_at: timestamp,
        error_message: "",
        updated_at: timestamp,
      });
    } else if (message.subType === "PROMPT_STATUS") {
      if (message.status === "running") {
        nextJob = Object.assign({}, targetJob, {
          status: "running",
          error_message: "",
          updated_at: timestamp,
        });
      } else if (message.status === "failed") {
        nextJob = Object.assign({}, targetJob, {
          status: "failed",
          error_message: message.error || "Video generation failed.",
          updated_at: timestamp,
        });
      } else if (message.status === "submitted") {
        nextJob = Object.assign({}, targetJob, {
          status: "complete",
          completed_at: targetJob.completed_at || timestamp,
          updated_at: timestamp,
        });
      }
    }

    if (!nextJob) return false;
    await updateProjectById(project.project_id, {
      video_jobs: videoJobs.map((job) => (job.job_id === targetJob.job_id ? nextJob : job)),
    });
    return true;
  }

  async function selectImageVariant(promptId, variantId) {
    const activeProject = studioState.activeProject;
    if (!activeProject) {
      throw new Error("No active YouTube Channel selected.");
    }

    const project = Object(activeProject);
    const promptKey = String(promptId || "").trim();
    const variantKey = String(variantId || "").trim();
    if (!promptKey || !variantKey) {
      throw new Error("Prompt and variant are required for selection.");
    }

    const variants = getProjectImageVariants(project);
    const selectedVariant = variants.find((variant) => variant.variant_id === variantKey);
    if (!selectedVariant) {
      throw new Error(`Image Variant not found: ${variantKey}.`);
    }
    if (selectedVariant.prompt_id !== promptKey) {
      throw new Error("Image Variant belongs to a different Prompt Record.");
    }

    const promptRecords = getProjectPromptRecords(project);
    const promptExists = promptRecords.some((record) => record.prompt_id === promptKey);
    if (!promptExists) {
      throw new Error(`Prompt Record not found: ${promptKey}.`);
    }

    const timestamp = new Date().toISOString();
    const nextPromptRecords = promptRecords.map((record) => {
      if (record.prompt_id !== promptKey) return record;
      return Object.assign({}, record, {
        selected_variant_id: selectedVariant.variant_id,
        selected_variant_file_name: selectedVariant.expected_file_name || record.file_name || "",
        selected_variant_generated_file_name: selectedVariant.generated_file_name || "",
        selected_variant_selected_at: timestamp,
        updated_at: timestamp,
      });
    });
    const nextVariants = variants.map((variant) => {
      if (variant.prompt_id !== promptKey) return variant;
      const isSelected = variant.variant_id === variantKey;
      return Object.assign({}, variant, {
        is_selected: isSelected,
        selected_at: isSelected ? timestamp : null,
        updated_at: timestamp,
      });
    });
    const nextVideoJobs = reconcileVideoJobsForSelectionChange(
      getProjectVideoJobs(project),
      promptKey,
      selectedVariant,
      timestamp,
    );

    await updateActiveProject({
      prompt_records: nextPromptRecords,
      image_variants: nextVariants,
      video_jobs: nextVideoJobs,
    });

    return {
      prompt_id: promptKey,
      variant_id: variantKey,
      generated_file_name: selectedVariant.generated_file_name || "",
    };
  }

  root.TFProjectStudioState = Object.freeze({
    $,
    $all,
    ASSET_TYPES,
    VIEWS,
    addAssetFiles,
    addVideoDraftToQueue,
    appendStudioLog,
    clearStudioLogs,
    createOrUpdateVideoDraft,
    createAsset,
    createAssetWithFile,
    deleteAsset,
    deleteProjectVideo,
    formatDate,
    finalizeSelectedImages,
    getAssetTypeDefinition,
    getCounts,
    getFilteredAssets,
    getImageGenerationGate,
    getProjectImageGenerationRuns,
    getProjectImageVariants,
    getProjectGalleryItems,
    getProjectPromptImports,
    getProjectPromptRecords,
    getProjectMediaLinks,
    getProjectVideoJobs,
    getProjectVideos,
    getSelectedImageFinalizationItems,
    getVideoQueueItems,
    getVideoPromptRecords,
    getActiveAssets(project) {
      return getProjectAssets(project).filter(isAssetActive);
    },
    getReadyPromptRecords(project) {
      return getProjectPromptRecords(project).filter((record) => {
        return record.status === "ready" && record.can_generate_images !== false;
      });
    },
    getState() {
      return studioState;
    },
    getViewDefinition,
    handleVideoRuntimeMessage,
    importProjectPromptJson,
    loadProjectState,
    mapPromptReferenceToAsset,
    holdVideoJob,
    moveVideoJob,
    queuePromptVideo,
    removeVideoJob,
    recordImageGenerationRunVariants,
    readTextFile,
    refreshFlowContext,
    refreshStudioLogs,
    repairVideoJobStartFrame,
    renameProjectVideo,
    replaceAssetFile,
    resolveActiveProjectPromptReferences,
    buildImageVariantFileName,
    selectImageVariant,
    sceneTitleFromFileName,
    startImageGenerationRun,
    stopImageGenerationRun,
    retryImageGenerationRun,
    runVideoJob,
    syncProjectMediaFromFiles,
    stopVideoJob,
    setActiveProject,
    setAssetDisabled,
    setAssetFilter,
    setActiveView,
    setPrimaryAssetFile,
    updateAsset,
    updateActiveProject,
  });
})(globalThis);
