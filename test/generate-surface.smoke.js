"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.resolve(__dirname, "../src/sidepanel/app/08-generate-surface.js"),
  "utf8",
);
const queueSource = fs.readFileSync(
  path.resolve(__dirname, "../src/sidepanel/app/05c-queue-ui-actions.js"),
  "utf8",
);
const imageGenerationSource = fs.readFileSync(
  path.resolve(
    __dirname,
    "../src/shared/project-services/image-generation-contracts.js",
  ),
  "utf8",
);

async function run() {
  const project = {
    project_id: "channel_1",
    display_name: "Finance Channel",
    assets: [
      {
        asset_id: "asset_jack",
        display_name: "Jack",
        files: [
          {
            asset_file_id: "file_jack",
            file_name: "Jack.jpg",
            mime_type: "image/jpeg",
            data_url: "data:image/jpeg;base64,SmFjaw==",
            is_primary: true,
          },
        ],
        primary_file_id: "file_jack",
        flow_upload_state: "none",
      },
    ],
    prompt_imports: [
      {
        import_id: "import_jack_talks_money",
        source_name: "Jack Talks Money",
        record_count: 1,
      },
    ],
    prompt_records: [
      {
        prompt_id: "prompt_1",
        file_name: "scene.png",
        image_prompt: "Jack at work",
        status: "ready",
        can_generate_images: true,
        source: { import_id: "import_jack_talks_money", source_name: "Jack Talks Money" },
      },
    ],
    image_generation_runs: [],
    image_variants: [],
    video_jobs: [],
    media_links: [],
  };
  let uploadCount = 0;
  let idCount = 0;
  const elements = new Map();
  function element(selector) {
    if (!elements.has(selector)) {
      elements.set(selector, {
        attributes: {},
        disabled: false,
        innerHTML: "",
        style: {},
        textContent: "",
        value: "",
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
      });
    }
    return elements.get(selector);
  }
  const domain = {
    async load() {
      return { active_project_id: project.project_id, projects: [project] };
    },
    async updateProject(projectId, updates) {
      assert.equal(projectId, project.project_id);
      Object.assign(project, JSON.parse(JSON.stringify(updates)));
      return { ok: true, project: JSON.parse(JSON.stringify(project)) };
    },
    createId(prefix) {
      idCount += 1;
      return `${prefix}_${idCount}`;
    },
  };
  const context = vm.createContext({
    Array,
    Date,
    Error,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Promise,
    Set,
    String,
    console,
    TFProjectDomain: domain,
    l: {
      settings: {
        imageCount: 2,
        imageModel: "NARWHAL",
        imageRatio: "IMAGE_ASPECT_RATIO_LANDSCAPE",
      },
    },
    Oe: async () => true,
    async tfImportPromptIndexJson(_content, fileName, options) {
      assert.equal(options.createLegacyBatches, false);
      return {
        import_record: {
          import_id: "import_jack_talks_money",
          source_name: fileName,
        },
        records: JSON.parse(JSON.stringify(project.prompt_records)),
      };
    },
    tfCurrentFlowProjectId: async () => "flow_project_1",
    X() {},
    Sn() {},
    Te() {},
    chrome: {
      runtime: {
        async sendMessage(message) {
          assert.equal(message.type, "UPLOAD_IMAGE");
          assert.equal(message.base64Data, "SmFjaw==");
          uploadCount += 1;
          return { ok: true, mediaId: "flow_media_jack" };
        },
      },
      storage: {
        local: {
          get(_keys, callback) {
            callback({
              flowAutoBatches: [
                {
                  id: "old_batch",
                  projectName: "Finance Channel",
                  settings: { mode: "image" },
                },
              ],
              turboflowGallery: [
                {
                  mediaId: "old_generated_media",
                  type: "image",
                  batchId: "old_batch",
                  projectName: "Finance Channel",
                  originalIndex: 0,
                  fifeUrl: "https://example.test/old-preview.jpg",
                  fileName: "scene.png",
                },
              ],
            });
          },
        },
      },
    },
    document: {
      readyState: "loading",
      addEventListener() {},
      querySelector(selector) {
        return elements.has(selector) ? elements.get(selector) : null;
      },
      querySelectorAll() {
        return [];
      },
    },
    addEventListener() {},
  });
  context.globalThis = context;
  vm.runInContext(imageGenerationSource, context, {
    filename: "image-generation-contracts.js",
  });
  vm.runInContext(source, context, { filename: "08-generate-surface.js" });
  vm.runInContext(queueSource, context, { filename: "05c-queue-ui-actions.js" });
  context.Sn = () => {};

  const removableBatch = {
    prompts: [{ text: "one" }, { text: "two" }, { text: "three" }],
    settings: {
      perPromptIds: { 0: "prompt_1", 1: "prompt_2", 2: "prompt_3" },
      perPromptAssetIds: { 0: ["asset_jack"], 2: ["asset_jack"] },
      perPromptFileNames: { 0: "one.png", 1: "two.png", 2: "three.png" },
    },
  };
  context.tfRemoveBatchPromptAt(removableBatch, 1);
  assert.deepEqual(removableBatch.prompts.map((prompt) => prompt.text), ["one", "three"]);
  assert.deepEqual(JSON.parse(JSON.stringify(removableBatch.settings.perPromptIds)), {
    0: "prompt_1",
    1: "prompt_3",
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(removableBatch.settings.perPromptFileNames)),
    { 0: "one.png", 1: "three.png" },
  );

  const batch = {
    id: "batch_1",
    settings: {
      mode: "image",
      projectId: project.project_id,
      perPromptIds: { 0: "prompt_1" },
      perPromptAssetIds: { 0: ["asset_jack"] },
    },
  };
  await context.tfPrepareStudioImageBatch(batch);
  assert.equal(project.image_generation_runs.length, 1);
  assert.equal(project.image_generation_runs[0].image_run_id, "batch_1");
  assert.equal(await context.tfEnsureProjectReferencesForBatch(batch), true);
  assert.equal(uploadCount, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(batch.settings.perPromptReferences)), {
    0: ["flow_media_jack"],
  });
  assert.equal(project.assets[0].flow_upload_state, "ready");

  await context.tfEnsureProjectReferencesForBatch(batch);
  assert.equal(uploadCount, 1, "cached Flow media should be reused");

  assert.equal(await context.tfRestoreStoredGalleryPreviews(), 1);
  assert.equal(project.image_variants[0].media_id, "old_generated_media");

  await context.tfHandleStudioGenerationMessage(
    {
      subType: "PREVIEW_READY",
      mediaType: "image",
      mediaId: "generated_media_1",
      fifeUrl: "https://example.test/preview.jpg",
      promptIndex: 0,
      fileName: "scene.png",
    },
    batch,
  );
  assert.equal(project.image_variants.length, 2);
  const generatedVariant = project.image_variants.find(
    (variant) => variant.media_id === "generated_media_1",
  );
  assert.equal(generatedVariant.prompt_id, "prompt_1");
  assert.equal(generatedVariant.thumbnail_url, "https://example.test/preview.jpg");
  assert.equal(generatedVariant.flow_context_id, "flow:flow_project_1");
  assert.equal(generatedVariant.status, "available");
  assert.equal(generatedVariant.cache_state, "pending");
  assert.equal(project.current_flow_context_id, "flow:flow_project_1");
  assert.equal(project.flow_context.project_id, "flow_project_1");
  assert.equal(project.image_generation_runs[0].status, "generating");

  await context.tfHandleStudioGenerationMessage(
    {
      subType: "PREVIEW_CACHED",
      mediaType: "image",
      mediaId: "generated_media_1",
      cacheKey: "sha256:abc123",
      cachedFileName: "scene.png",
      mimeType: "image/png",
      byteLength: 1234,
    },
    batch,
  );
  const cachedVariant = project.image_variants.find(
    (variant) => variant.media_id === "generated_media_1",
  );
  assert.equal(cachedVariant.cache_key, "sha256:abc123");
  assert.equal(cachedVariant.cached_file_name, "scene.png");
  assert.equal(cachedVariant.cache_mime_type, "image/png");
  assert.equal(cachedVariant.cache_byte_length, 1234);
  assert.equal(cachedVariant.cache_state, "available");
  assert.equal(cachedVariant.file_state, "cached");

  project.video_jobs = [
    {
      job_id: "job_1",
      prompt_id: "prompt_1",
      output_media_id: "generated_media_1",
      status: "ready",
    },
  ];
  project.media_links = [
    {
      media_link_id: "media_link_1",
      owner_type: "image_variant",
      owner_id: generatedVariant.variant_id,
      flow_media_id: "generated_media_1",
      cache_key: "sha256:abc123",
    },
  ];
  const unsafeRemoval = await context.tfRemoveGenerateJson({ skipConfirm: true });
  assert.equal(unsafeRemoval.removed_count, 0);
  assert.equal(project.prompt_imports.length, 1);
  assert.equal(project.prompt_records.length, 1);

  [
    "#generate-image-model",
    "#setting-image-model",
    "#ratio-select",
    "#variants-value",
    "#generate-json-entry",
    "#generate-json-entry-status",
    "#generate-json-summary",
    "#generate-form",
    "#generate-actions",
    "#generate-blocked-row",
    "#generate-json-name",
    "#generate-json-meta",
    "#generate-json-stats",
    "#generate-blocked-text",
    "#btn-add-to-queue",
    "#btn-generate",
    "#btn-import-json-generate",
    "#btn-replace-json",
    "#btn-remove-json",
  ].forEach(element);
  context.tfRefreshGenerateSurface();
  assert.equal(element("#generate-json-summary").style.display, "none");
  assert.equal(element("#generate-json-entry").style.display, "");
  assert.equal(element("#btn-generate").disabled, true);

  await context.tfHandleGenerateJsonFile("{}", "jack-video.json");
  assert.equal(element("#generate-json-name").textContent, "jack-video.json");
  assert.notEqual(element("#generate-json-name").textContent, project.display_name);
  assert.equal(element("#generate-json-summary").style.display, "");
  assert.equal(element("#btn-generate").disabled, false);

  const removal = await context.tfRemoveGenerateJson({ skipConfirm: true });
  assert.equal(removal.removed_count, 1);
  assert.deepEqual(project.prompt_imports, []);
  assert.deepEqual(project.prompt_records, []);
  assert.deepEqual(project.image_generation_runs, []);
  assert.deepEqual(project.image_variants, []);
  assert.deepEqual(project.video_jobs, []);
  assert.deepEqual(project.media_links, []);

  console.log("generate surface smoke tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
