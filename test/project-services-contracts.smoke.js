"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadScript(context, relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  vm.runInContext(source, context, { filename: relativePath });
}

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createContext() {
  const context = vm.createContext({
    console,
    Date,
    Error,
    JSON,
    Math,
    Number,
    Object,
    RegExp,
    String,
    Array,
  });
  context.globalThis = context;
  return context;
}

function loadProjectServices(context) {
  [
    "src/shared/project-domain/00-project-domain.js",
    "src/shared/project-services/project-schema.js",
    "src/shared/project-services/command-result.js",
    "src/shared/project-services/read-model-contracts.js",
    "src/shared/project-services/media-link-contracts.js",
    "src/shared/project-services/image-generation-contracts.js",
    "src/shared/project-services/migration-shims.js",
    "src/shared/project-services/legacy-project-normalizer.js",
  ].forEach((relativePath) => loadScript(context, relativePath));
}

function run() {
  const context = createContext();
  loadProjectServices(context);

  assert.ok(context.TFProjectServices);
  assert.equal(context.TFProjectSchema.STORAGE_KEY, "autoflowProjectStateV1");
  assert.equal(context.TFProjectServices.projectSchema, context.TFProjectSchema);
  assert.equal(context.TFProjectServices.commandResult, context.TFCommandResult);
  assert.equal(context.TFProjectServices.imageGeneration, context.TFProjectImageGeneration);

  const imageDescriptor = context.TFProjectImageGeneration.buildImageBatchDescriptor({
    projectId: "project_1",
    projectName: "Finance Channel",
    projectFolder: "Finance Channel",
    sourceImportName: "budget-basics",
    records: [
      {
        prompt_id: "prompt_1",
        file_name: "../scenes/first?.jpg",
        image_prompt: "First scene",
        references: [
          { asset_id: "asset_1", resolution_status: "resolved" },
          { asset_id: "asset_1", resolution_status: "resolved" },
        ],
      },
      {
        prompt_id: "prompt_2",
        file_name: "scenes/second.png",
        image_prompt: "Second scene",
        references: [],
      },
    ],
    settings: {
      imageModel: "GEM_PIX_2",
      imageRatio: "IMAGE_ASPECT_RATIO_SQUARE",
      imageCount: 9,
    },
  });
  assert.equal(imageDescriptor.folder, "Finance Channel/scenes");
  assert.deepEqual(toPlain(imageDescriptor.prompts), [
    { text: "First scene" },
    { text: "Second scene" },
  ]);
  assert.equal(imageDescriptor.settings.imageCount, 4);
  assert.equal(imageDescriptor.settings.imageRatio, "IMAGE_ASPECT_RATIO_SQUARE");
  assert.deepEqual(toPlain(imageDescriptor.settings.perPromptIds), {
    0: "prompt_1",
    1: "prompt_2",
  });
  assert.deepEqual(toPlain(imageDescriptor.settings.perPromptAssetIds), { 0: ["asset_1"] });
  assert.deepEqual(toPlain(imageDescriptor.settings.perPromptFileNames), {
    0: "Finance Channel/scenes/first-.png",
    1: "Finance Channel/scenes/second.png",
  });

  const startImageMessage = context.TFProjectImageGeneration.buildStartBatchMessage(
    imageDescriptor,
    "image_run_1",
    { speedMode: "balanced" },
  );
  assert.equal(startImageMessage.type, "START_BATCH");
  assert.equal(startImageMessage.batchId, "image_run_1");
  assert.deepEqual(toPlain(startImageMessage.prompts), ["First scene", "Second scene"]);
  assert.deepEqual(toPlain(startImageMessage.promptIndexMap), [0, 1]);
  assert.equal(startImageMessage.settings.aspectRatio, "IMAGE_ASPECT_RATIO_SQUARE");
  assert.equal(startImageMessage.settings.imageCount, 4);
  assert.equal(startImageMessage.settings.speedMode, "balanced");

  const envelope = context.TFProjectSchema.normalizeEnvelope({
    schema_version: 1,
    revision: 7,
    projects: [
      {
        project_id: "project_1",
        display_name: "Channel",
        image_variants: [{ variant_id: "variant_1", selectedVariantId: "variant_1" }],
      },
    ],
  });
  assert.equal(envelope.revision, 7);
  assert.equal(envelope.meta.revision, 7);
  assert.deepEqual(envelope.projects[0].video_jobs, []);

  const nextEnvelope = context.TFProjectSchema.nextRevisionEnvelope(envelope);
  assert.equal(nextEnvelope.revision, 8);
  assert.equal(nextEnvelope.meta.revision, 8);

  const success = context.TFCommandResult.success({
    ids: { project_id: "project_1" },
    changed: ["imageReviewRows", "cockpitSummary"],
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.TFCommandResult.validate(success))),
    { ok: true, errors: [] },
  );

  const failure = context.TFCommandResult.failure("project_revision_conflict", "Refresh first.", {
    repair: { action: "REFRESH_PROJECT", label: "Refresh" },
  });
  assert.equal(failure.code, "PROJECT_REVISION_CONFLICT");
  assert.equal(failure.repair.action, "REFRESH_PROJECT");
  assert.equal(context.TFCommandResult.toLegacyError(failure).code, "PROJECT_REVISION_CONFLICT");

  const changed = context.TFReadModelContracts.normalizeChanged([
    "imageReviewRows",
    "unknown",
    "cockpitSummary",
    "imageReviewRows",
  ]);
  assert.deepEqual(changed, ["imageReviewRows", "cockpitSummary"]);
  assert.equal(
    context.TFReadModelContracts.validateRow("videoQueueRows", {
      job_id: "job_1",
      prompt_id: "prompt_1",
      status: "queued",
      can_run: true,
    }).ok,
    true,
  );

  const mediaLink = context.TFMediaLinkContracts.normalizeMediaLink({
    media_link_id: "media_link_1",
    project_id: "project_1",
    variant_id: "variant_1",
    media_id: "flow_1",
    cacheKey: "cache_1",
    fileName: "S01.png",
  });
  assert.equal(mediaLink.owner_id, "variant_1");
  assert.equal(mediaLink.flow_media_id, "flow_1");
  assert.equal(mediaLink.cache_key, "cache_1");
  assert.equal(context.TFMediaLinkContracts.validateMediaLink(mediaLink).ok, true);
  assert.equal(
    context.TFMediaLinkContracts.hashCacheKey(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ),
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  );
  assert.equal(context.TFMediaLinkContracts.mediaCacheKey("Flow_Media_1"), "media:flow_media_1");

  assert.equal(context.TFMigrationShims.hasShim("studio_facade"), true);
  assert.throws(
    () => context.TFMigrationShims.requireGlobal("DefinitelyMissingAutoFlowGlobal"),
    /Required AutoFlow global/,
  );

  const legacyProject = context.TFLegacyProjectNormalizer.normalizeProject({
    video_jobs: [{ job_id: "job_1", status: "done", selectedVariantId: "variant_1" }],
    image_variants: [{ variant_id: "variant_1", generatedFileName: "S01.png" }],
  });
  assert.equal(legacyProject.video_jobs[0].status, "completed");
  assert.equal(legacyProject.video_jobs[0].selected_variant_id, "variant_1");
  assert.equal(legacyProject.image_variants[0].generated_file_name, "S01.png");

  console.log("project services contract smoke tests passed");
}

run();
