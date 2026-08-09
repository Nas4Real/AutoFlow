// Shared image-generation request contracts for Project Studio and the legacy side panel.
(function initTFProjectImageGeneration(root) {
  "use strict";

  const DEFAULT_MODEL = "NARWHAL";
  const DEFAULT_RATIO = "IMAGE_ASPECT_RATIO_LANDSCAPE";

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function cleanDownloadPath(value, extension) {
    const parts = String(value || "")
      .replace(/\\/g, "/")
      .replace(/^[a-zA-Z]:/, "")
      .replace(/^\/+/, "")
      .trim()
      .split("/")
      .filter(Boolean)
      .filter((part) => part !== "." && part !== "..")
      .map((part) =>
        part
          .replace(/[<>:"|?*\x00-\x1f]/g, "-")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean);

    if (!parts.length) parts.push("item");
    let fileName = parts.pop();
    if (extension) {
      fileName = fileName.replace(/\.[^/.]+$/, "") + `.${extension}`;
    }
    parts.push(fileName);
    return parts.join("/");
  }

  function safeFolderName(value, fallback) {
    const leaf = String(value || "")
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean)
      .pop();
    return (
      String(leaf || "")
        .replace(/[<>:"|?*\x00-\x1f]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^\.+|\.+$/g, "")
        .substring(0, 80) ||
      String(fallback || "turboflow")
    );
  }

  function prefixDownloadPath(value, folder) {
    const cleanPath = cleanDownloadPath(value || "media/item.png");
    const cleanFolder = safeFolderName(folder, "turboflow");
    return cleanPath.toLowerCase().startsWith(`${cleanFolder.toLowerCase()}/`)
      ? cleanPath
      : `${cleanFolder}/${cleanPath}`;
  }

  function folderFromPath(value) {
    const cleanPath = cleanDownloadPath(value || "media/item.png");
    const separatorIndex = cleanPath.lastIndexOf("/");
    return separatorIndex > 0 ? cleanPath.slice(0, separatorIndex) : "media";
  }

  function normalizeSettings(settings) {
    const source = isObject(settings) ? settings : {};
    const requestedCount = Number(source.imageCount ?? source.image_count ?? 2);
    const imageCount = Number.isFinite(requestedCount)
      ? Math.min(4, Math.max(1, Math.round(requestedCount)))
      : 2;
    return {
      imageModel: String(source.imageModel || source.image_model || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
      imageRatio:
        String(source.imageRatio || source.aspectRatio || source.image_ratio || DEFAULT_RATIO).trim() ||
        DEFAULT_RATIO,
      imageCount,
      speedMode: ["fast", "balanced", "slow"].includes(source.speedMode)
        ? source.speedMode
        : "fast",
    };
  }

  function promptAssetIds(record) {
    const assetIds = (Array.isArray(record?.references) ? record.references : [])
      .filter((reference) => reference?.resolution_status === "resolved")
      .map((reference) => String(reference?.asset_id || "").trim())
      .filter(Boolean);
    return Array.from(new Set(assetIds));
  }

  function buildImageBatchDescriptor(input) {
    const source = isObject(input) ? input : {};
    const records = Array.isArray(source.records) ? source.records.filter(isObject) : [];
    if (!records.length) throw new Error("At least one Ready prompt is required.");

    const projectName = String(source.projectName || "Imported video").trim() || "Imported video";
    const projectFolder = safeFolderName(source.projectFolder || projectName, "turboflow");
    const normalized = normalizeSettings(source.settings);
    const firstFile = cleanDownloadPath(records[0]?.file_name || "media/item.png", "png");
    const mediaFolder = folderFromPath(firstFile);
    const perPromptIds = {};
    const perPromptAssetIds = {};
    const perPromptFileNames = {};

    records.forEach((record, index) => {
      perPromptIds[index] = String(record.prompt_id || "").trim();
      perPromptFileNames[index] = prefixDownloadPath(
        cleanDownloadPath(record.file_name, "png"),
        projectFolder,
      );
      const assetIds = promptAssetIds(record);
      if (assetIds.length) perPromptAssetIds[index] = assetIds;
    });

    return {
      name: `${projectName} - images`,
      folder: `${projectFolder}/${mediaFolder}`,
      projectName,
      projectFolder,
      batchKind: "images",
      prompts: records.map((record) => ({ text: String(record.image_prompt || "").trim() })),
      settings: {
        mode: "image",
        imageModel: normalized.imageModel,
        imageRatio: normalized.imageRatio,
        imageCount: normalized.imageCount,
        speedMode: normalized.speedMode,
        imageReferenceMediaIds: [],
        requiresJackReference: false,
        projectId: String(source.projectId || "").trim(),
        perPromptIds,
        perPromptAssetIds,
        perPromptReferences: null,
        perPromptThumbnails: {},
        naming: "numbered",
        namingPrefix: "",
        namingSeparator: "-",
        startNumber: 1,
        perPromptFileNames,
        referenceMode: Object.keys(perPromptAssetIds).length ? "mapped" : "shared",
        projectName,
        projectFolder,
        batchKind: "images",
        sourceImportName: String(source.sourceImportName || "imported-json").trim() || "imported-json",
      },
    };
  }

  function buildStartBatchMessage(descriptor, batchId, options) {
    const batch = isObject(descriptor) ? descriptor : {};
    const settings = isObject(batch.settings) ? batch.settings : {};
    const runtimeOptions = isObject(options) ? options : {};
    const prompts = Array.isArray(batch.prompts)
      ? batch.prompts.map((prompt) => String(prompt?.text || ""))
      : [];
    return {
      type: "START_BATCH",
      batchId: String(batchId || "").trim(),
      prompts,
      promptIndexMap: prompts.map((_, index) => index),
      settings: {
        mode: "image",
        folder: batch.folder || "turboflow/media",
        imageModel: settings.imageModel || DEFAULT_MODEL,
        aspectRatio: settings.imageRatio || DEFAULT_RATIO,
        imageCount: normalizeSettings(settings).imageCount,
        imageReferenceMediaIds: settings.imageReferenceMediaIds || [],
        autoDownloadImages: false,
        autoDownloadVideos: false,
        imageDownloadQuality: runtimeOptions.imageDownloadQuality || "standard",
        videoDownloadQuality: runtimeOptions.videoDownloadQuality || "standard",
        naming: settings.naming || "numbered",
        namingPrefix: settings.namingPrefix || "",
        namingSeparator: settings.namingSeparator ?? "-",
        startNumber: settings.startNumber || 1,
        perPromptReferences: settings.perPromptReferences || null,
        perPromptFileNames: settings.perPromptFileNames || null,
        projectName: batch.projectName || settings.projectName || batch.name || "Imported video",
        projectFolder: batch.projectFolder || settings.projectFolder || batch.folder,
        batchKind: batch.batchKind || settings.batchKind || "images",
        referenceMode: settings.referenceMode || "shared",
        speedMode: normalizeSettings({ speedMode: runtimeOptions.speedMode || settings.speedMode }).speedMode,
      },
      featureFlags: isObject(runtimeOptions.featureFlags) ? runtimeOptions.featureFlags : {},
      uploadsThisSession: Array.isArray(runtimeOptions.uploadsThisSession)
        ? runtimeOptions.uploadsThisSession
        : [],
    };
  }

  const api = Object.freeze({
    DEFAULT_MODEL,
    DEFAULT_RATIO,
    buildImageBatchDescriptor,
    buildStartBatchMessage,
    cleanDownloadPath,
    normalizeSettings,
    prefixDownloadPath,
    promptAssetIds,
    safeFolderName,
  });

  root.TFProjectImageGeneration = api;
  const services = root.TFProjectServices || (root.TFProjectServices = {});
  services.imageGeneration = api;
})(globalThis);
