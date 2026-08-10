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

function run() {
  const context = vm.createContext({
    console,
    Date,
    Error,
    Object,
    String,
    Array,
  });
  context.globalThis = context;

  loadScript(context, "src/background/runtime/contracts/runtime-events.js");

  const previewReady = context.TFRuntimeEvents.createEvent("PREVIEW_READY", {
    batch_id: "batch_1",
    media_id: "media_1",
    prompt_id: "prompt_1",
  });
  assert.equal(previewReady.type, "PREVIEW_READY");
  assert.equal(previewReady.event_type, "PREVIEW_READY");
  assert.equal(previewReady.idempotency_key, "batch_1:media_1");
  assert.equal(context.TFProjectServices.runtimeEvents, context.TFRuntimeEvents);

  const parsed = context.TFRuntimeEvents.parseEvent({
    type: "DOWNLOAD_COMPLETE",
    download_id: "download_1",
    file_name: "S01.png",
    extra_field: "preserved",
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.event.extra_field, "preserved");
  assert.equal(parsed.contract.command, "recordDownloadCompletion");

  const missing = context.TFRuntimeEvents.parseEvent({
    type: "PREVIEW_CACHED",
    media_id: "media_1",
  });
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join(" "), /cache_key/);

  const unknown = context.TFRuntimeEvents.parseEvent({ type: "NOPE" });
  assert.equal(unknown.ok, false);
  assert.match(unknown.errors.join(" "), /Unknown runtime event/);

  const imageGenerationSource = fs.readFileSync(
    path.join(root, "src/background/runtime/02b-image-generation.js"),
    "utf8",
  );
  assert.match(
    imageGenerationSource,
    /zt\("BATCH_GENERATION_DONE", \{[\s\S]*?uiBatchId: t\.uiBatchId \|\| null,[\s\S]*?successfulPrompts:/,
    "image completion events must retain the Studio run ID",
  );

  console.log("runtime event contract smoke tests passed");
}

run();
