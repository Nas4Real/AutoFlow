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

function createStorage() {
  const data = {};
  return {
    data,
    get(keys, callback) {
      const result = {};
      if (typeof keys === "string") {
        result[keys] = data[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach((key) => {
          result[key] = data[key];
        });
      } else {
        Object.keys(keys || {}).forEach((key) => {
          result[key] = data[key] === undefined ? keys[key] : data[key];
        });
      }
      queueMicrotask(() => callback(result));
    },
    set(items, callback) {
      Object.assign(data, JSON.parse(JSON.stringify(items)));
      queueMicrotask(() => callback?.());
    },
  };
}

class FakeFileReader {
  constructor() {
    this.listeners = {};
    this.result = "";
    this.error = null;
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  readAsDataURL(file) {
    this.result = file.dataUrl || "";
    queueMicrotask(() => this.listeners.load?.());
  }
}

function createContext(storage, runtimeMessages) {
  let id = 0;
  const context = vm.createContext({
    Array,
    Boolean,
    Date,
    Error,
    FakeFileReader,
    FileReader: FakeFileReader,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    Set,
    String,
    TextDecoder,
    Uint8Array,
    clearTimeout,
    console,
    queueMicrotask,
    setTimeout,
    chrome: {
      runtime: {
        async sendMessage(message) {
          runtimeMessages.push(JSON.parse(JSON.stringify(message)));
          return { ok: true };
        },
      },
      storage: { local: storage },
    },
    crypto: {
      randomUUID() {
        id += 1;
        return `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`;
      },
    },
  });
  context.globalThis = context;
  loadScript(context, "src/shared/project-domain/00-project-domain.js");
  loadScript(context, "src/shared/project-domain/01-project-json-contract.js");
  loadScript(context, "src/shared/project-domain/02-project-prompt-import.js");
  loadScript(context, "src/shared/project-services/project-schema.js");
  loadScript(context, "src/shared/project-services/media-link-contracts.js");
  loadScript(context, "src/shared/project-services/image-generation-contracts.js");
  loadScript(context, "src/project-studio/app/00-studio-state.js");
  return context;
}

async function run() {
  const storage = createStorage();
  const runtimeMessages = [];
  const context = createContext(storage, runtimeMessages);
  const domain = context.TFProjectDomain;
  const importer = context.TFProjectPromptImport;
  const studio = context.TFProjectStudioState;
  domain.setStorageAdapter(storage);

  const created = await domain.createProject({
    display_name: "Finance Channel",
    current_flow_context_id: "flow-context-1",
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
      },
    ],
  });

  const firstImport = await importer.importPromptJson(
    JSON.stringify({
      prompts: [
        {
          file_name: "scenes/jack_checks_his_budget.png",
          image_prompt: "Jack checks his budget",
          animation_prompt: "Jack studies the numbers and nods.",
          references: ["Jack"],
        },
        {
          file_name: "budget_chart.png",
          image_prompt: "A clean budget chart",
          animation_prompt: "Budget bars rise into place.",
        },
      ],
    }),
    { projectId: created.project.project_id, sourceName: "budget-basics.json" },
  );
  const secondImport = await importer.importPromptJson(
    JSON.stringify([
      {
        file_name: "market_open.png",
        image_prompt: "Market opens",
        animation_prompt: "Numbers tick upward.",
      },
    ]),
    { projectId: created.project.project_id, sourceName: "market-update.json" },
  );

  let domainState = await domain.load();
  let project = domainState.projects[0];
  const firstVideoId = project.prompt_imports[0].import_id;
  const secondVideoId = project.prompt_imports[1].import_id;
  const firstPromptId = firstImport.records[0].prompt_id;
  const secondPromptId = firstImport.records[1].prompt_id;
  await studio.loadProjectState();
  const firstVideoGate = studio.getImageGenerationGate(project, firstVideoId);
  const secondVideoGate = studio.getImageGenerationGate(project, secondVideoId);
  assert.equal(firstVideoGate.prompt_count, 2);
  assert.equal(firstVideoGate.ready_count, 2);
  assert.deepEqual(
    Array.from(firstVideoGate.items, (item) => item.prompt_id),
    firstImport.records.map((record) => record.prompt_id),
  );
  assert.equal(secondVideoGate.prompt_count, 1);
  assert.equal(secondVideoGate.ready_count, 1);
  assert.equal(secondVideoGate.items[0].prompt_id, secondImport.records[0].prompt_id);

  const imageRun = await studio.startImageGenerationRun(firstVideoId, {
    imageModel: "GEM_PIX_2",
    imageRatio: "IMAGE_ASPECT_RATIO_SQUARE",
    imageCount: 3,
    speedMode: "balanced",
  });
  assert.equal(imageRun.run.video_id, firstVideoId);
  assert.equal(imageRun.run.image_count, 3);
  assert.deepEqual(
    Array.from(imageRun.run.request_items, (item) => item.prompt_id),
    firstImport.records.map((record) => record.prompt_id),
  );
  const startImageMessage = runtimeMessages.find((message) => message.type === "START_BATCH");
  assert.ok(startImageMessage);
  assert.equal(startImageMessage.batchId, imageRun.run.image_run_id);
  assert.deepEqual(startImageMessage.prompts, [
    "Jack checks his budget",
    "A clean budget chart",
  ]);
  assert.equal(startImageMessage.settings.imageModel, "GEM_PIX_2");
  assert.equal(startImageMessage.settings.aspectRatio, "IMAGE_ASPECT_RATIO_SQUARE");
  assert.equal(startImageMessage.settings.imageCount, 3);
  assert.equal(startImageMessage.settings.speedMode, "balanced");

  assert.equal(
    await studio.handleVideoRuntimeMessage({
      type: "FROM_BACKGROUND",
      subType: "PREVIEW_READY",
      uiBatchId: imageRun.run.image_run_id,
      mediaType: "image",
      mediaId: "flow-media-runtime-preview",
      fifeUrl: "https://example.test/runtime-preview.png",
      promptIndex: 0,
      fileName: "scenes/jack_checks_his_budget__1.png",
    }),
    true,
  );
  project = studio.getState().activeProject;
  const runtimeVariant = project.image_variants.find(
    (variant) => variant.media_id === "flow-media-runtime-preview",
  );
  assert.ok(runtimeVariant);
  assert.equal(runtimeVariant.prompt_id, firstPromptId);
  assert.equal(runtimeVariant.image_run_id, imageRun.run.image_run_id);
  assert.equal(runtimeVariant.thumbnail_url, "https://example.test/runtime-preview.png");
  assert.equal(
    project.image_generation_runs.find(
      (run) => run.image_run_id === imageRun.run.image_run_id,
    ).status,
    "generating",
  );
  assert.equal(
    await studio.handleVideoRuntimeMessage({
      type: "FROM_BACKGROUND",
      subType: "PROMPT_STATUS",
      uiBatchId: imageRun.run.image_run_id,
      promptIndex: 1,
      status: "failed",
      error: "Flow rejected this prompt.",
    }),
    true,
  );
  project = studio.getState().activeProject;
  assert.equal(
    project.prompt_records.find((record) => record.prompt_id === secondPromptId)
      .image_generation_state,
    "failed",
  );
  assert.equal(
    await studio.handleVideoRuntimeMessage({
      type: "FROM_BACKGROUND",
      subType: "BATCH_GENERATION_DONE",
      uiBatchId: imageRun.run.image_run_id,
      successfulPrompts: 1,
      failedPrompts: 1,
      totalImages: 1,
    }),
    true,
  );
  project = studio.getState().activeProject;
  assert.equal(
    project.image_generation_runs.find(
      (run) => run.image_run_id === imageRun.run.image_run_id,
    ).status,
    "partial",
  );
  const firstCacheKey = `sha256:${"b".repeat(64)}`;
  const recorded = await studio.recordImageGenerationRunVariants(imageRun.run.image_run_id, [
    {
      prompt_id: firstPromptId,
      variants: [
        {
          variant_index: 0,
          media_id: "flow-media-recorded",
          cache_key: firstCacheKey,
          cached_file_name: "scenes/jack_checks_his_budget__1.png",
          fife_url: "https://example.test/preview.png",
          status: "available",
        },
      ],
    },
  ]);
  project = studio.getState().activeProject;
  const recordedVariant = recorded.variants.find(
    (variant) => variant.media_id === "flow-media-recorded",
  );
  assert.ok(recordedVariant);
  assert.ok(
    studio.getProjectMediaLinks(project).some((link) => {
      return link.owner_id === recordedVariant.variant_id && link.cache_key === firstCacheKey;
    }),
  );

  const repairedCacheKey = `sha256:${"c".repeat(64)}`;
  assert.equal(
    await studio.handleVideoRuntimeMessage({
      type: "FROM_BACKGROUND",
      subType: "PREVIEW_CACHED",
      uiBatchId: imageRun.run.image_run_id,
      mediaId: "flow-media-recorded",
      cacheKey: repairedCacheKey,
      cachedFileName: "scenes/jack_checks_his_budget__1.png",
      cachedAt: 1234,
    }),
    true,
  );
  project = studio.getState().activeProject;
  const cachedVariant = project.image_variants.find(
    (variant) => variant.variant_id === recordedVariant.variant_id,
  );
  assert.equal(cachedVariant.cache_key, repairedCacheKey);
  assert.equal(cachedVariant.cached_file_name, "scenes/jack_checks_his_budget__1.png");
  assert.equal(cachedVariant.file_state, "available");
  assert.ok(
    studio.getProjectMediaLinks(project).some((link) => {
      return (
        link.owner_id === recordedVariant.variant_id &&
        link.cache_key === repairedCacheKey &&
        link.flow_media_id === "flow-media-recorded"
      );
    }),
  );

  domainState = await domain.load();
  project = domainState.projects[0];
  const firstVariant = {
    variant_id: "variant_budget_1",
    prompt_id: firstPromptId,
    variant_index: 0,
    file_name: "scenes/jack_checks_his_budget.png",
    generated_file_name: "scenes/jack_checks_his_budget.png",
    thumbnail_url: "data:image/png;base64,cHJldmlldw==",
    media_id: "flow-media-1",
    flow_context_id: "flow-context-1",
    status: "available",
    is_selected: true,
  };
  const secondVariant = {
    variant_id: "variant_budget_2",
    prompt_id: secondPromptId,
    variant_index: 0,
    file_name: "budget_chart.png",
    generated_file_name: "budget_chart.png",
    thumbnail_url: "data:image/png;base64,Y2hhcnQ=",
    media_id: "flow-media-2",
    flow_context_id: "flow-context-1",
    status: "available",
    is_selected: true,
  };
  await domain.updateProject(project.project_id, {
    prompt_records: project.prompt_records.map((record) => {
      if (record.prompt_id === firstPromptId) {
        return Object.assign({}, record, { selected_variant_id: firstVariant.variant_id });
      }
      if (record.prompt_id === secondPromptId) {
        return Object.assign({}, record, { selected_variant_id: secondVariant.variant_id });
      }
      return record;
    }),
    image_variants: [firstVariant, secondVariant],
  });

  await studio.loadProjectState();
  project = studio.getState().activeProject;
  const videos = studio.getProjectVideos(project);
  assert.equal(videos.length, 2);
  assert.equal(videos[0].video_id, firstVideoId);
  assert.equal(videos[0].display_name, "budget-basics");
  assert.equal(videos[0].prompt_count, 2);
  assert.equal(videos[1].video_id, secondVideoId);
  assert.equal(studio.getVideoPromptRecords(project, firstVideoId).length, 2);
  assert.equal(studio.getVideoPromptRecords(project, secondVideoId).length, 1);
  assert.equal(
    studio.sceneTitleFromFileName("scenes/jack_checks_his_budget.png"),
    "jack_checks_his_budget",
  );

  let firstQueue = studio.getVideoQueueItems(project, firstVideoId);
  let secondQueue = studio.getVideoQueueItems(project, secondVideoId);
  assert.equal(firstQueue.length, 2);
  assert.equal(secondQueue.length, 1);
  assert.equal(firstQueue[0].selected_preview_url, firstVariant.thumbnail_url);
  assert.equal(firstQueue[0].scene_title, "jack_checks_his_budget");
  assert.equal(firstQueue[0].status, "draft");
  assert.equal(secondQueue[0].selected_preview_url, "");

  const queuedJob = await studio.queuePromptVideo(firstPromptId);
  assert.equal(queuedJob.status, "ready");
  assert.equal(queuedJob.source_prompt_file_name, "scenes/jack_checks_his_budget.png");
  assert.equal(queuedJob.expected_output_file_name, "scenes/jack_checks_his_budget.mp4");
  project = studio.getState().activeProject;
  firstQueue = studio.getVideoQueueItems(project, firstVideoId);
  assert.equal(firstQueue[0].status, "ready");
  assert.equal(firstQueue[0].can_run, true);
  assert.equal(firstQueue[1].status, "draft");

  const secondQueuedJob = await studio.queuePromptVideo(secondPromptId);
  assert.equal(secondQueuedJob.status, "ready");
  project = studio.getState().activeProject;
  firstQueue = studio.getVideoQueueItems(project, firstVideoId);
  assert.deepEqual(
    firstQueue.filter((item) => item.status === "ready").map((item) => item.prompt_id),
    [firstPromptId, secondPromptId],
  );
  await studio.moveVideoJob(secondQueuedJob.job_id, "up");
  project = studio.getState().activeProject;
  firstQueue = studio.getVideoQueueItems(project, firstVideoId);
  assert.deepEqual(
    firstQueue.filter((item) => item.status === "ready").map((item) => item.prompt_id),
    [secondPromptId, firstPromptId],
  );

  const assetCount = project.assets.length;
  const newAsset = await studio.createAssetWithFile(
    { display_name: "Office" },
    [
      {
        name: "office.webp",
        type: "image/webp",
        size: 42,
        lastModified: 123,
        dataUrl: "data:image/webp;base64,b2ZmaWNl",
      },
    ],
  );
  assert.equal(newAsset.display_name, "Office");
  assert.equal(newAsset.files.length, 1);
  assert.equal(newAsset.files[0].data_url, "data:image/webp;base64,b2ZmaWNl");
  project = studio.getState().activeProject;
  assert.equal(project.assets.length, assetCount + 1);
  await assert.rejects(
    studio.createAssetWithFile(
      { display_name: "Invalid" },
      [{ name: "notes.txt", type: "text/plain", dataUrl: "data:text/plain;base64,eA==" }],
    ),
    /must be an image/,
  );
  assert.equal(studio.getState().activeProject.assets.length, assetCount + 1);

  const jobsBeforeAssetDelete = studio.getState().activeProject.video_jobs.length;
  await studio.deleteAsset("asset_jack");
  project = studio.getState().activeProject;
  assert.equal(project.assets.some((asset) => asset.asset_id === "asset_jack"), false);
  const affectedPrompt = project.prompt_records.find((record) => record.prompt_id === firstPromptId);
  assert.equal(affectedPrompt.status, "blocked");
  assert.equal(project.video_jobs.length, jobsBeforeAssetDelete);

  await studio.renameProjectVideo(secondVideoId, "Daily Market Update");
  project = studio.getState().activeProject;
  assert.equal(
    studio.getProjectVideos(project).find((video) => video.video_id === secondVideoId).display_name,
    "Daily Market Update",
  );
  await studio.deleteProjectVideo(secondVideoId);
  project = studio.getState().activeProject;
  assert.equal(studio.getProjectVideos(project).some((video) => video.video_id === secondVideoId), false);
  assert.equal(project.prompt_records.some((record) => record.prompt_id === firstPromptId), true);
  assert.equal(
    project.prompt_records.some((record) => record.prompt_id === secondImport.records[0].prompt_id),
    false,
  );

  const studioSource = fs.readFileSync(
    path.join(root, "src/project-studio/react/studio.jsx"),
    "utf8",
  );
  const studioHtml = fs.readFileSync(
    path.join(root, "src/project-studio/index.html"),
    "utf8",
  );
  assert.match(studioSource, /from "@heroui\/react"/);
  assert.doesNotMatch(studioSource, /Create Draft|Update Draft|Create New Draft|onDraft|create_label/);
  assert.doesNotMatch(studioSource, /getVideoQueueItems\(project, video\.video_id\)\.filter\(\(item\) => !!item\.animation_prompt\)/);
  assert.match(studioSource, /item\.status === "not_ready"/);
  assert.match(studioSource, /studioApi\.holdVideoJob/);
  assert.match(studioSource, /studioApi\.moveVideoJob/);
  assert.match(studioSource, /item\.can_create_draft/);
  assert.match(studioSource, /studioApi\.queuePromptVideo/);
  assert.match(studioSource, /current\.currentJobId === jobId/);
  assert.match(studioSource, />Video<\/Chip>/);
  assert.match(studioSource, /items\.find\(\(item\) => item\.status === "ready"\)/);
  assert.doesNotMatch(studioSource, /items\.find\(\(item\) => item\.status === "failed"\)/);
  assert.match(studioSource, /appendStudioLog\(`Video queue paused:/);
  assert.match(studioSource, /getViewFromLocationHash/);
  assert.match(studioSource, /useState\(\(\) => getViewFromLocationHash\(\)\)/);
  assert.match(studioSource, /hashchange/);
  assert.doesNotMatch(studioSource, /<Modal\.Root\s+isOpen=/);
  assert.match(studioSource, /<Modal\.Backdrop\s+[^>]*isOpen=/);
  assert.match(studioHtml, /generated\/studio\.bundle\.js/);
  assert.doesNotMatch(studioHtml, /01-studio-shell\.js|07-studio-boot\.js|details-inspector/);

  console.log("studio workspace smoke tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
