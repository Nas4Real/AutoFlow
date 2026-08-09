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
      speedMode: ["fast", "balanced", "slow"].includes(
        source.speedMode || source.speed_mode || source.image_speed_mode,
      )
        ? source.speedMode || source.speed_mode || source.image_speed_mode
        : "fast",
    };
  }

  function promptAssetIds(record) {
    const assetIds = (Array.isArray(record?.references) ? record.references : [])
      .filter(
        (reference) =>
          reference?.asset_id &&
          (!reference.resolution_status || reference.resolution_status === "resolved"),
      )
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

  function primaryAssetFile(asset) {
    const files = Array.isArray(asset?.files) ? asset.files.filter(isObject) : [];
    return (
      files.find((file) => file.asset_file_id === asset?.primary_file_id) ||
      files.find((file) => file.is_primary || file.role === "primary") ||
      files[0] ||
      null
    );
  }

  function dataUrlBase64(dataUrl) {
    const value = String(dataUrl || "");
    const commaIndex = value.indexOf(",");
    return commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
  }

  async function prepareReferenceMedia(input) {
    const source = isObject(input) ? input : {};
    const project = isObject(source.project) ? source.project : {};
    const descriptor = JSON.parse(JSON.stringify(source.descriptor || {}));
    const settings = isObject(descriptor.settings) ? descriptor.settings : {};
    descriptor.settings = settings;
    const assetMap = isObject(settings.perPromptAssetIds) ? settings.perPromptAssetIds : {};
    const assetIds = Array.from(
      new Set(
        Object.values(assetMap)
          .flat()
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );
    const assets = (Array.isArray(project.assets) ? project.assets : []).map((asset) =>
      Object.assign({}, asset),
    );
    if (!assetIds.length) {
      return { assets, descriptor, reference_count: 0, uploaded_count: 0 };
    }
    if (typeof source.uploadImage !== "function") {
      throw new Error("Reference upload service is unavailable.");
    }

    const flowProjectId = String(source.flowProjectId || "").trim();
    const mediaByAssetId = new Map();
    let uploadedCount = 0;
    for (const assetId of assetIds) {
      const assetIndex = assets.findIndex((asset) => asset.asset_id === assetId);
      const asset = assetIndex >= 0 ? assets[assetIndex] : null;
      const file = primaryAssetFile(asset);
      if (!asset || !file?.data_url) {
        throw new Error(`Reference ${asset?.display_name || assetId} has no stored image file.`);
      }

      let mediaId =
        asset.flow_upload_state === "ready" &&
        asset.flow_project_id === flowProjectId &&
        asset.flow_asset_file_id === file.asset_file_id
          ? String(asset.flow_media_id || "")
          : "";
      if (!mediaId) {
        const response = await source.uploadImage({
          assetId,
          base64Data: dataUrlBase64(file.data_url),
          fileName: file.file_name || `${asset.display_name || "reference"}.png`,
          mimeType: file.mime_type || "image/png",
        });
        if (!response?.ok || !response?.mediaId) {
          throw new Error(response?.error || `Could not upload ${asset.display_name || assetId}.`);
        }
        mediaId = String(response.mediaId);
        uploadedCount += 1;
        assets[assetIndex] = Object.assign({}, asset, {
          flow_upload_state: "ready",
          flow_project_id: flowProjectId,
          flow_media_id: mediaId,
          flow_asset_file_id: file.asset_file_id,
          flow_uploaded_at: new Date().toISOString(),
        });
      }
      mediaByAssetId.set(assetId, mediaId);
    }

    const perPromptReferences = {};
    Object.keys(assetMap).forEach((promptIndex) => {
      const mediaIds = (assetMap[promptIndex] || [])
        .map((assetId) => mediaByAssetId.get(String(assetId || "").trim()))
        .filter(Boolean);
      if (mediaIds.length) perPromptReferences[promptIndex] = mediaIds;
    });
    settings.referenceMode = "mapped";
    settings.perPromptReferences = perPromptReferences;
    settings.perPromptThumbnails = {};
    settings.imageReferenceMediaIds = [];
    return {
      assets,
      descriptor,
      reference_count: assetIds.length,
      uploaded_count: uploadedCount,
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
    prepareReferenceMedia,
    promptAssetIds,
    safeFolderName,
  });

  root.TFProjectImageGeneration = api;
  const services = root.TFProjectServices || (root.TFProjectServices = {});
  services.imageGeneration = api;
})(globalThis);
