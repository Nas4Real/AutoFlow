// TurboFlow side panel shard: Minimal JSON-first Generate surface.
// Loaded after legacy runner shards so it can reuse the existing queue path.

(function initGenerateSurface(root) {
  "use strict";

  const state = {
    fileName: "",
    importResult: null,
    activeProject: null,
    loadingProject: false,
    importing: false,
  };
  let studioGenerationWrite = Promise.resolve();

  function q(selector) {
    return typeof r === "function"
      ? r(selector)
      : root.document.querySelector(selector);
  }

  function qa(selector) {
    return Array.from(root.document.querySelectorAll(selector));
  }

  function activeProjectFromDomainState(domainState) {
    const projects = Array.isArray(domainState?.projects) ? domainState.projects : [];
    if (!projects.length) return null;
    return (
      projects.find((project) => project.project_id === domainState.active_project_id) ||
      projects[0]
    );
  }

  function projectName(project) {
    return project?.display_name || project?.name || "Project";
  }

  function buildFlowContextId(flowProjectId) {
    const key = String(flowProjectId || "").trim();
    return key ? `flow:${key}` : "";
  }

  async function getCurrentFlowContext(project) {
    const flowProjectId =
      typeof tfCurrentFlowProjectId === "function" ? await tfCurrentFlowProjectId() : "";
    const flowContextId = buildFlowContextId(flowProjectId);
    if (flowContextId) {
      return {
        flow_context_id: flowContextId,
        status: "connected",
        project_id: String(flowProjectId || "").trim(),
        updated_at: new Date().toISOString(),
      };
    }
    if (project?.flow_context) return Object.assign({}, project.flow_context);
    if (project?.current_flow_context_id) {
      return {
        flow_context_id: project.current_flow_context_id,
        status: "unknown",
        updated_at: new Date().toISOString(),
      };
    }
    return { flow_context_id: "", status: "disconnected", updated_at: new Date().toISOString() };
  }

  async function refreshActiveProject() {
    state.loadingProject = true;
    try {
      const domain = root.TFProjectDomain;
      if (!domain || typeof domain.load !== "function") {
        state.activeProject = null;
        return null;
      }
      const domainState = await domain.load();
      state.activeProject = activeProjectFromDomainState(domainState);
      return state.activeProject;
    } catch (error) {
      state.activeProject = null;
      return null;
    } finally {
      state.loadingProject = false;
      render();
    }
  }

  function currentRecords() {
    const importId = currentImportId();
    if (!importId) return [];
    const projectRecords = Array.isArray(state.activeProject?.prompt_records)
      ? state.activeProject.prompt_records
      : [];
    const records = projectRecords.filter((record) => recordImportId(record) === importId);
    if (records.length || !Array.isArray(state.importResult?.records)) return records;
    return state.importResult.records.filter((record) => recordImportId(record) === importId);
  }

  function currentImportId() {
    return String(state.importResult?.import_record?.import_id || "").trim();
  }

  function currentImportName() {
    const importRecord = state.importResult?.import_record || {};
    return (
      state.fileName ||
      String(
        importRecord.video_name ||
          importRecord.display_name ||
          importRecord.source_name ||
          "Imported JSON",
      ).trim()
    );
  }

  function recordImportId(record) {
    return String(record?.source?.import_id || record?.import_id || "").trim();
  }

  function recordsForRemoval(project) {
    const importId = currentImportId();
    const records = Array.isArray(project?.prompt_records) ? project.prompt_records : [];
    if (!importId) return [];
    return records.filter((record) => recordImportId(record) === importId);
  }

  function isReady(record) {
    return record?.status === "ready" && !1 !== record?.can_generate_images;
  }

  function isBlocked(record) {
    return (
      record?.status === "blocked" ||
      record?.status === "needs_resolution" ||
      !1 === record?.can_generate_images
    );
  }

  function statsFor(records) {
    const total = records.length,
      ready = records.filter(isReady).length,
      blocked = records.filter(isBlocked).length,
      animation = records.filter((record) =>
        String(record?.animation_prompt || "").trim(),
      ).length;
    return { total, ready, blocked, animation };
  }

  function readyRecords() {
    return currentRecords().filter(isReady);
  }

  async function ensureProjectReferencesForBatch(batch) {
    const settings = batch?.settings || {};
    const assetMap = settings.perPromptAssetIds || {};
    const assetIds = Array.from(
      new Set(Object.values(assetMap).flat().map((value) => String(value || "").trim())),
    ).filter(Boolean);
    if (!assetIds.length || settings.mode !== "image") return true;
    if (typeof Oe === "function" && !(await Oe())) return false;

    const domain = root.TFProjectDomain;
    const domainState = await domain?.load?.();
    const projectId = String(settings.projectId || state.activeProject?.project_id || "");
    const project = domainState?.projects?.find((item) => item.project_id === projectId);
    if (!project) throw new Error("The YouTube Channel for this batch no longer exists.");

    const flowProjectId =
      typeof tfCurrentFlowProjectId === "function" ? await tfCurrentFlowProjectId() : "";
    const imageGeneration = root.TFProjectImageGeneration;
    if (!imageGeneration?.prepareReferenceMedia) {
      throw new Error("Image generation service is unavailable.");
    }
    const prepared = await imageGeneration.prepareReferenceMedia({
      project,
      descriptor: batch,
      flowProjectId,
      uploadImage: async (file) => {
        Te(`Uploading reference "${file.fileName}"...`, "info");
        return chrome.runtime.sendMessage({
          type: "UPLOAD_IMAGE",
          base64Data: file.base64Data,
          fileName: file.fileName,
          mimeType: file.mimeType,
        });
      },
    });
    batch.settings = prepared.descriptor.settings;
    const persisted = await domain.updateProject(projectId, { assets: prepared.assets });
    if (persisted?.ok && state.activeProject?.project_id === projectId) {
      state.activeProject = persisted.project;
    }
    X();
    Sn();
    Te(`${assetIds.length} reference${assetIds.length === 1 ? "" : "s"} attached`, "success");
    return true;
  }

  async function registerStudioImageRun(batch, records, projectInput) {
    const domain = root.TFProjectDomain;
    const project = projectInput || state.activeProject;
    if (!domain?.updateProject || !project) return;
    const timestamp = new Date().toISOString();
    const requestItems = records.map((record, index) => ({
      prompt_id: record.prompt_id,
      source_index: index,
      file_name: record.file_name,
      image_prompt: record.image_prompt,
      references: Array.isArray(record.references) ? record.references : [],
    }));
    const runs = Array.isArray(project.image_generation_runs)
      ? project.image_generation_runs.slice()
      : [];
    if (!runs.some((run) => run.image_run_id === batch.id)) {
      runs.push({
        image_run_id: batch.id,
        status: "queued",
        image_count: Number(batch.settings.imageCount || 2),
        prompt_count: records.length,
        excluded_prompt_count: 0,
        request_items: requestItems,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
    const persisted = await domain.updateProject(project.project_id, {
      image_generation_runs: runs,
    });
    if (persisted?.ok && state.activeProject?.project_id === project.project_id) {
      state.activeProject = persisted.project;
    }
  }

  async function prepareStudioImageBatch(batch) {
    if (!batch || batch.settings?.mode !== "image") return;
    const domain = root.TFProjectDomain;
    const projectId = String(batch.settings?.projectId || "");
    if (!domain?.load || !projectId) return;
    const domainState = await domain.load();
    const project = domainState.projects?.find((item) => item.project_id === projectId);
    if (!project) return;
    const recordsById = new Map(
      (Array.isArray(project.prompt_records) ? project.prompt_records : []).map((record) => [
        record.prompt_id,
        record,
      ]),
    );
    const records = Object.keys(batch.settings?.perPromptIds || {})
      .sort((left, right) => Number(left) - Number(right))
      .map((index) => recordsById.get(batch.settings.perPromptIds[index]))
      .filter(Boolean);
    if (!records.length) return;
    await registerStudioImageRun(batch, records, project);
  }

  async function applyStudioGenerationMessage(message, batch) {
    if (!batch || batch.settings?.mode !== "image") return;
    const domain = root.TFProjectDomain;
    const projectId = String(batch.settings?.projectId || "");
    if (!domain?.load || !projectId) return;
    const domainState = await domain.load();
    const project = domainState.projects?.find((item) => item.project_id === projectId);
    if (!project) return;
    const timestamp = new Date().toISOString();
    const runs = Array.isArray(project.image_generation_runs)
      ? project.image_generation_runs.slice()
      : [];

    if (message.subType === "PREVIEW_READY" && message.mediaType !== "video") {
      const promptIndex = Number(message.promptIndex || 0);
      const promptId = String(batch.settings?.perPromptIds?.[promptIndex] || "");
      if (!promptId || !message.mediaId) return;
      const flowContext = await getCurrentFlowContext(project);
      const variants = Array.isArray(project.image_variants) ? project.image_variants.slice() : [];
      const existingIndex = variants.findIndex(
        (variant) =>
          variant.image_run_id === batch.id && variant.media_id === message.mediaId,
      );
      const promptVariants = variants.filter(
        (variant) => variant.image_run_id === batch.id && variant.prompt_id === promptId,
      );
      const variantIndex =
        existingIndex >= 0
          ? Number(variants[existingIndex].variant_index || 0)
          : promptVariants.reduce(
              (highest, variant) => Math.max(highest, Number(variant.variant_index || 0)),
              -1,
            ) + 1;
      const promptRecord = (project.prompt_records || []).find(
        (record) => record.prompt_id === promptId,
      );
      const variant = Object.assign(existingIndex >= 0 ? variants[existingIndex] : {}, {
        variant_id:
          existingIndex >= 0
            ? variants[existingIndex].variant_id
            : domain.createId("image_variant"),
        project_id: projectId,
        prompt_id: promptId,
        image_run_id: batch.id,
        source_index: promptIndex,
        variant_index: variantIndex,
        variant_number: variantIndex + 1,
        expected_file_name: promptRecord?.file_name || message.fileName || "image.png",
        generated_file_name: message.fileName || promptRecord?.file_name || "image.png",
        media_id: message.mediaId,
        flow_context_id: flowContext.flow_context_id || "",
        thumbnail_url: message.fifeUrl || "",
        fife_url: message.fifeUrl || "",
        file_state: "remote",
        cache_state: existingIndex >= 0 ? variants[existingIndex].cache_state || "pending" : "pending",
        repair_state: "",
        status: "available",
        created_at: existingIndex >= 0 ? variants[existingIndex].created_at : timestamp,
        updated_at: timestamp,
      });
      if (existingIndex >= 0) variants[existingIndex] = variant;
      else variants.push(variant);

      const nextRuns = runs.map((run) =>
        run.image_run_id === batch.id
          ? Object.assign({}, run, {
              status: "generating",
              variant_count: variants.filter((item) => item.image_run_id === batch.id).length,
              updated_at: timestamp,
            })
          : run,
      );
      const promptRecords = (project.prompt_records || []).map((record) =>
        record.prompt_id === promptId
          ? Object.assign({}, record, {
              active_image_run_id: batch.id,
              image_generation_state: "generated",
              image_generation_completed_at: timestamp,
              updated_at: timestamp,
            })
          : record,
      );
      const updates = {
        image_variants: variants,
        image_generation_runs: nextRuns,
        prompt_records: promptRecords,
      };
      if (flowContext.flow_context_id) {
        updates.current_flow_context_id = flowContext.flow_context_id;
        updates.flow_context = flowContext;
      }
      await domain.updateProject(projectId, updates);
      return;
    }

    if (message.subType === "PREVIEW_CACHED" && message.mediaType !== "video") {
      const mediaId = String(message.mediaId || "").trim();
      if (!mediaId) return;
      const variants = Array.isArray(project.image_variants) ? project.image_variants.slice() : [];
      const existingIndex = variants.findIndex(
        (variant) =>
          variant.media_id === mediaId &&
          (!batch.id || variant.image_run_id === batch.id),
      );
      if (existingIndex < 0) return;
      variants[existingIndex] = Object.assign({}, variants[existingIndex], {
        cache_key: message.cacheKey || variants[existingIndex].cache_key || "",
        cached_file_name:
          message.cachedFileName ||
          message.fileName ||
          variants[existingIndex].cached_file_name ||
          variants[existingIndex].generated_file_name ||
          "",
        cache_mime_type: message.mimeType || variants[existingIndex].cache_mime_type || "image/png",
        cache_byte_length: Number(message.byteLength || variants[existingIndex].cache_byte_length || 0),
        cache_state: "available",
        file_state: variants[existingIndex].file_state === "remote" ? "cached" : variants[existingIndex].file_state || "cached",
        updated_at: timestamp,
      });
      await domain.updateProject(projectId, { image_variants: variants });
      return;
    }

    if (message.subType === "BATCH_GENERATION_DONE") {
      const status = message.failedPrompts
        ? message.successfulPrompts
          ? "partial"
          : "failed"
        : "completed";
      await domain.updateProject(projectId, {
        image_generation_runs: runs.map((run) =>
          run.image_run_id === batch.id
            ? Object.assign({}, run, {
                status,
                completed_at: timestamp,
                updated_at: timestamp,
              })
            : run,
        ),
      });
    }
  }

  function handleStudioGenerationMessage(message, batch) {
    studioGenerationWrite = studioGenerationWrite
      .then(() => applyStudioGenerationMessage(message, batch))
      .catch((error) => Te(`Studio preview sync failed: ${error.message}`, "warn"));
    return studioGenerationWrite;
  }

  function readLocalStorage(keys) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) resolve({});
          else resolve(result || {});
        });
      } catch (_error) {
        resolve({});
      }
    });
  }

  async function restoreStoredGalleryPreviews() {
    const domain = root.TFProjectDomain;
    if (!domain?.load) return 0;
    const stored = await readLocalStorage(["flowAutoBatches", "turboflowGallery"]);
    const batches = Array.isArray(stored.flowAutoBatches) ? stored.flowAutoBatches : [];
    const gallery = Array.isArray(stored.turboflowGallery) ? stored.turboflowGallery : [];
    if (!batches.length || !gallery.length) return 0;

    const domainState = await domain.load();
    let restored = 0;
    const processedMediaIds = new Set();
    for (const item of gallery) {
      if (!item?.mediaId || item.type === "video" || item.isPlaceholder || !item.batchId) {
        continue;
      }
      const batch = batches.find((candidate) => candidate.id === item.batchId);
      if (!batch || batch.settings?.mode !== "image") continue;
      const projectName = String(
        item.projectName || batch.projectName || batch.settings?.projectName || "",
      )
        .trim()
        .toLowerCase();
      const projectId = String(batch.settings?.projectId || "");
      const nameMatches = (domainState.projects || []).filter(
        (candidate) =>
          projectName &&
          String(candidate.display_name || candidate.name || "")
            .trim()
            .toLowerCase() === projectName,
      );
      const project =
        domainState.projects?.find((candidate) => candidate.project_id === projectId) ||
        (nameMatches.length === 1 ? nameMatches[0] : null);
      if (!project) continue;
      if (
        (project.image_variants || []).some(
          (variant) => variant.media_id === item.mediaId,
        )
      ) {
        continue;
      }
      if (processedMediaIds.has(item.mediaId)) continue;
      processedMediaIds.add(item.mediaId);
      const promptIndex = Number(item.originalIndex ?? item.promptIndex ?? 0);
      if (!Number.isInteger(promptIndex) || promptIndex < 0) continue;
      const promptId =
        batch.settings?.perPromptIds?.[promptIndex] ||
        project.prompt_records?.[promptIndex]?.prompt_id ||
        "";
      if (!promptId) continue;
      const compatibleBatch = Object.assign({}, batch, {
        settings: Object.assign({}, batch.settings, {
          projectId: project.project_id,
          perPromptIds: Object.assign({}, batch.settings?.perPromptIds, {
            [promptIndex]: promptId,
          }),
        }),
      });
      await applyStudioGenerationMessage(
        {
          subType: "PREVIEW_READY",
          mediaType: "image",
          mediaId: item.mediaId,
          fifeUrl: item.fifeUrl || "",
          promptIndex,
          fileName: item.fileName || "",
        },
        compatibleBatch,
      );
      restored += 1;
    }
    if (restored) Te(`Restored ${restored} image preview${restored === 1 ? "" : "s"} in Studio`, "success");
    return restored;
  }

  function setDisplay(selector, show) {
    const element = q(selector);
    element && (element.style.display = show ? "" : "none");
  }

  function setText(selector, text) {
    const element = q(selector);
    element && (element.textContent = text);
  }

  function syncControls() {
    const model = q("#generate-image-model"),
      hiddenModel = q("#setting-image-model"),
      ratio = q("#ratio-select"),
      value = q("#variants-value"),
      count = Math.min(4, Math.max(1, Number(l.settings.imageCount || 2)));
    l.settings.imageCount = count;
    model && (model.value = l.settings.imageModel || "NARWHAL");
    hiddenModel && (hiddenModel.value = l.settings.imageModel || "NARWHAL");
    ratio &&
      (ratio.value =
        l.settings.imageRatio || "IMAGE_ASPECT_RATIO_LANDSCAPE");
    value && (value.textContent = String(count));
  }

  function setActionsDisabled(disabled) {
    ["#btn-import-json-generate", "#btn-replace-json", "#btn-remove-json", "#btn-add-to-queue", "#btn-generate"].forEach(
      (selector) => {
        const element = q(selector);
        element && (element.disabled = disabled);
      },
    );
    ["#generate-image-model", "#ratio-select", "#variants-minus", "#variants-plus"].forEach(
      (selector) => {
        const element = q(selector);
        element && (element.disabled = disabled);
      },
    );
  }

  function render() {
    syncControls();
    const records = currentRecords(),
      stats = statsFor(records),
      hasProject = !!state.activeProject,
      hasCurrentImport = !!currentImportId(),
      hasRecords = hasCurrentImport && stats.total > 0,
      running = "function" == typeof nr && nr(),
      importDisabled = !hasProject || state.importing || running;

    q("#generate-json-entry")?.setAttribute(
      "aria-disabled",
      importDisabled ? "true" : "false",
    );
    setText(
      "#generate-json-entry-status",
      hasProject
        ? state.importing
          ? "Importing..."
          : hasRecords
            ? "Import another JSON when ready."
            : "Ready for JSON import."
        : "Create or select a Project.",
    );

    setDisplay("#generate-json-entry", !hasRecords);
    setDisplay("#generate-json-summary", hasRecords);
    setDisplay("#generate-form", hasRecords && stats.ready > 0);
    setDisplay("#generate-actions", hasRecords);
    setDisplay("#generate-blocked-row", stats.blocked > 0);

    setText("#generate-json-name", hasCurrentImport ? currentImportName() : "Imported JSON");
    setText(
      "#generate-json-meta",
      `${stats.total} prompt${stats.total === 1 ? "" : "s"}`,
    );
    const statsEl = q("#generate-json-stats");
    if (statsEl) {
      statsEl.innerHTML = [
        `<span class="json-stat ready">${stats.ready} ready</span>`,
        `<span class="json-stat blocked">${stats.blocked} blocked</span>`,
        `<span class="json-stat animation">${stats.animation} animations</span>`,
      ].join("");
    }
    setText(
      "#generate-blocked-text",
      `${stats.blocked} prompt${stats.blocked === 1 ? "" : "s"} need Studio`,
    );

    const addButton = q("#btn-add-to-queue"),
      generateButton = q("#btn-generate");
    if (addButton)
      addButton.innerHTML = `<span class="material-symbols-outlined">playlist_add</span>${stats.ready > 0 ? `Add ${stats.ready} to Queue` : "Add to Queue"}`;
    if (generateButton)
      generateButton.innerHTML = `<span class="material-symbols-outlined">play_arrow</span>${stats.ready > 0 ? `Generate ${stats.ready}` : "Generate"}`;
    const actionDisabled = !hasProject || stats.ready < 1 || state.importing || running;
    addButton && (addButton.disabled = actionDisabled);
    generateButton && (generateButton.disabled = actionDisabled);
    q("#btn-import-json-generate") &&
      (q("#btn-import-json-generate").disabled = importDisabled);
    q("#btn-replace-json") && (q("#btn-replace-json").disabled = importDisabled);
    q("#btn-remove-json") &&
      (q("#btn-remove-json").disabled =
        importDisabled || !hasCurrentImport || !hasRecords || state.importing || running);
  }

  function importJson() {
    q("#json-file-input")?.click();
  }

  async function handleJsonFile(content, fileName) {
    state.importing = true;
    render();
    try {
      const result = await tfImportPromptIndexJson(content, fileName, {
        createLegacyBatches: false,
      });
      state.fileName = fileName || "prompt-index.json";
      state.importResult = result;
      await refreshActiveProject();
      root.TFProjectSidePanelSelector?.refresh?.("prompt-import");
      const stats = statsFor(result.records || []);
      Te(
        `Imported ${stats.total} prompt${stats.total === 1 ? "" : "s"}; ${stats.ready} ready${stats.blocked ? `, ${stats.blocked} blocked` : ""}`,
        stats.ready ? "success" : "warn",
      );
      return result;
    } finally {
      state.importing = false;
      render();
    }
  }

  async function removeCurrentJson(options = {}) {
    const domain = root.TFProjectDomain;
    const project = state.activeProject || (await refreshActiveProject());
    if (!domain?.updateProject || !project) {
      throw new Error("No active Channel JSON to remove.");
    }

    const removableRecords = recordsForRemoval(project).filter(Boolean);
    if (!removableRecords.length) {
      Te("Import or select a JSON package before removing it.", "warn");
      return { removed_count: 0 };
    }

    const promptIds = new Set(
      removableRecords.map((record) => String(record.prompt_id || "").trim()).filter(Boolean),
    );
    const importIds = new Set(
      removableRecords.map(recordImportId).filter(Boolean),
    );
    const importId = currentImportId();
    if (importId) importIds.add(importId);

    const title = currentImportName();
    const confirmText = `Remove "${title}" from this Channel?\n\nThis clears only this JSON package's prompts, queued work, generated image records, and local cache links from AutoFlow.`;
    if (
      !options.skipConfirm &&
      typeof root.confirm === "function" &&
      !root.confirm(confirmText)
    ) {
      return { removed_count: 0, cancelled: true };
    }

    const imageRuns = Array.isArray(project.image_generation_runs)
      ? project.image_generation_runs
      : [];
    const removedRunIds = new Set();
    const nextRuns = imageRuns.filter((run) => {
      const requestItems = Array.isArray(run?.request_items) ? run.request_items : [];
      const belongsToRemovedPrompts = requestItems.some((item) =>
        promptIds.has(String(item?.prompt_id || "").trim()),
      );
      if (belongsToRemovedPrompts) {
        removedRunIds.add(String(run.image_run_id || "").trim());
        return false;
      }
      return true;
    });

    const removedVariantIds = new Set();
    const removedMediaIds = new Set();
    const nextVariants = (Array.isArray(project.image_variants) ? project.image_variants : []).filter(
      (variant) => {
        const remove =
          promptIds.has(String(variant?.prompt_id || "").trim()) ||
          removedRunIds.has(String(variant?.image_run_id || "").trim());
        if (remove) {
          const variantId = String(variant?.variant_id || "").trim();
          const mediaId = String(variant?.media_id || variant?.mediaId || "").trim();
          if (variantId) removedVariantIds.add(variantId);
          if (mediaId) removedMediaIds.add(mediaId);
          return false;
        }
        return true;
      },
    );

    const removedJobIds = new Set();
    const nextJobs = (Array.isArray(project.video_jobs) ? project.video_jobs : []).filter((job) => {
      const remove = promptIds.has(String(job?.prompt_id || "").trim());
      if (remove) {
        const jobId = String(job?.job_id || "").trim();
        const mediaId = String(job?.output_media_id || "").trim();
        if (jobId) removedJobIds.add(jobId);
        if (mediaId) removedMediaIds.add(mediaId);
        return false;
      }
      return true;
    });

    const nextMediaLinks = (Array.isArray(project.media_links) ? project.media_links : []).filter(
      (link) => {
        const ownerId = String(link?.owner_id || "").trim();
        const flowMediaId = String(link?.flow_media_id || link?.media_id || "").trim();
        return (
          !removedVariantIds.has(ownerId) &&
          !removedJobIds.has(ownerId) &&
          !removedMediaIds.has(flowMediaId)
        );
      },
    );

    const nextPromptImports = (Array.isArray(project.prompt_imports) ? project.prompt_imports : []).filter(
      (item) => {
        const itemId = String(item?.import_id || "").trim();
        return itemId && !importIds.has(itemId);
      },
    );
    const nextPromptRecords = (Array.isArray(project.prompt_records) ? project.prompt_records : []).filter(
      (record) => !promptIds.has(String(record?.prompt_id || "").trim()),
    );

    const persisted = await domain.updateProject(project.project_id, {
      prompt_imports: nextPromptImports,
      prompt_records: nextPromptRecords,
      image_generation_runs: nextRuns,
      image_variants: nextVariants,
      video_jobs: nextJobs,
      media_links: nextMediaLinks,
    });
    if (!persisted?.ok) {
      throw new Error(persisted?.error?.message || "Could not remove Channel JSON.");
    }

    state.fileName = "";
    state.importResult = null;
    state.activeProject = persisted.project;
    root.TFProjectSidePanelSelector?.refresh?.("prompt-remove");
    render();
    Te(
      `Removed ${removableRecords.length} prompt${removableRecords.length === 1 ? "" : "s"} from ${projectName(project)}`,
      "success",
    );
    return { removed_count: removableRecords.length, project: persisted.project };
  }

  function queueFolderName() {
    return tfSafeFolderName(projectName(state.activeProject), "turboflow");
  }

  async function createBatchFromReady() {
    const records = readyRecords();
    if (!records.length) return null;
    const imageGeneration = root.TFProjectImageGeneration;
    if (!imageGeneration?.buildImageBatchDescriptor) {
      throw new Error("Image generation service is unavailable.");
    }
    const activeProjectName = projectName(state.activeProject);
    const batch = tfCreatePromptIndexBatch(
      imageGeneration.buildImageBatchDescriptor({
        projectId: state.activeProject.project_id,
        projectName: activeProjectName,
        projectFolder: queueFolderName(),
        sourceImportName: tfBatchNameFromFile(currentImportName() || "imported-json"),
        records,
        settings: {
          imageModel: l.settings.imageModel,
          imageRatio: l.settings.imageRatio,
          imageCount: l.settings.imageCount,
          speedMode: l.speedMode,
        },
      }),
    );
    X();
    Sn();
    return batch;
  }

  function activateQueueTab() {
    qa(".tab").forEach((element) => element.classList.remove("active"));
    qa(".tab-content").forEach((element) => element.classList.remove("active"));
    q('[data-tab="queue"]')?.classList.add("active");
    q("#tab-queue")?.classList.add("active");
  }

  async function addToQueue() {
    if (!readyRecords().length) return;
    const batch = await createBatchFromReady();
    if (!batch) return;
    Te(`Queued ${batch.prompts.length} ready prompt${batch.prompts.length === 1 ? "" : "s"}`, "success");
    activateQueueTab();
  }

  async function generateNow() {
    if (!readyRecords().length) return;
    if ("function" == typeof Oe && !(await Oe())) return;
    const batch = await createBatchFromReady();
    if (!batch) return;
    await Pn("run-batch", batch.id);
    render();
  }

  function changeVariants(delta) {
    const next = Math.min(4, Math.max(1, Number(l.settings.imageCount || 2) + delta));
    l.settings.imageCount = next;
    J();
    render();
  }

  function attach() {
    q("#btn-import-json-generate")?.addEventListener("click", importJson);
    q("#btn-replace-json")?.addEventListener("click", importJson);
    q("#btn-remove-json")?.addEventListener("click", () => {
      removeCurrentJson().catch((error) => Te(error.message || String(error), "error"));
    });
    q("#btn-open-studio-blocked")?.addEventListener("click", () => {
      q("#btn-open-project-studio")?.click();
    });
    q("#btn-add-to-queue")?.addEventListener("click", addToQueue);
    q("#btn-generate")?.addEventListener("click", generateNow);
    q("#generate-image-model")?.addEventListener("change", (event) => {
      l.settings.imageModel = event.target.value;
      const hidden = q("#setting-image-model");
      hidden && (hidden.value = event.target.value);
      J();
      render();
    });
    q("#ratio-select")?.addEventListener("change", (event) => {
      l.settings.imageRatio = event.target.value;
      J();
      render();
    });
    q("#variants-minus")?.addEventListener("click", () => changeVariants(-1));
    q("#variants-plus")?.addEventListener("click", () => changeVariants(1));
    root.addEventListener("TF_PROJECT_CHANGED", (event) => {
      const nextProject = event.detail?.activeProject || null,
        previousId = state.activeProject?.project_id || "",
        nextId = nextProject?.project_id || "";
      state.activeProject = nextProject;
      if (previousId !== nextId) {
        state.importResult = null;
        state.fileName = "";
      }
      render();
    });
    refreshActiveProject().then(restoreStoredGalleryPreviews);
    render();
  }

  root.tfHandleGenerateJsonFile = handleJsonFile;
  root.tfRefreshGenerateSurface = render;
  root.tfEnsureProjectReferencesForBatch = ensureProjectReferencesForBatch;
  root.tfPrepareStudioImageBatch = prepareStudioImageBatch;
  root.tfHandleStudioGenerationMessage = handleStudioGenerationMessage;
  root.tfRestoreStoredGalleryPreviews = restoreStoredGalleryPreviews;
  root.tfRemoveGenerateJson = removeCurrentJson;

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", attach, { once: true });
  } else {
    attach();
  }
})(globalThis);
