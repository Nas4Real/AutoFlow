"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} has an unterminated body`);
}

async function testContentBridge() {
  const listeners = new Map();
  const sent = [];
  const windowObject = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    location: {
      href: "https://labs.google/fx/tools/flow/project/project-1",
      origin: "https://labs.google",
      pathname: "/fx/tools/flow/project/project-1",
    },
  };
  const context = vm.createContext({
    Array,
    URL,
    chrome: {
      runtime: {
        id: "extension-id",
        onMessage: { addListener() {} },
        async sendMessage(message) {
          sent.push(message);
        },
      },
    },
    document: { querySelector() {}, querySelectorAll: () => [] },
    history: {
      pushState() {},
      replaceState() {},
    },
    setTimeout() {},
    window: windowObject,
  });
  context.globalThis = context;
  vm.runInContext(
    fs.readFileSync(path.join(root, "src/content/flow-page-bridge.js"), "utf8"),
    context,
    { filename: "src/content/flow-page-bridge.js" },
  );
  sent.length = 0;
  const onMessage = listeners.get("message");
  assert.equal(typeof onMessage, "function", "page bridge message listener is missing");

  onMessage({
    data: {
      data: {
        workflows: Array.from({ length: 65 }, (_, index) => ({
          metadata: { batchId: `batch-${index}`, primaryMediaId: `media-${index}` },
        })),
      },
      eventType: "BATCH_GENERATE_RESPONSE",
      method: "POST",
      status: 200,
      timestamp: Date.now(),
      type: "FLOW_AUTO_INTERCEPT",
      url: "https://aisandbox-pa.googleapis.com/v1/projects/project-1/flowMedia:batchGenerateImages",
    },
    source: windowObject,
  });
  await Promise.resolve();
  assert.equal(sent.length, 0, "oversized intercepted workflow arrays must be rejected");

  onMessage({
    data: {
      data: {
        workflows: [
          { metadata: { batchId: "batch-1", primaryMediaId: "media-1" } },
        ],
      },
      eventType: "BATCH_GENERATE_RESPONSE",
      method: "POST",
      status: 200,
      timestamp: Date.now(),
      type: "FLOW_AUTO_INTERCEPT",
      url: "https://labs.google/fx/api/trpc/media.batchGenerateImages",
    },
    source: windowObject,
  });
  await Promise.resolve();
  assert.equal(sent.length, 0, "fabricated same-origin generation routes must be rejected");

  onMessage({
    data: {
      data: {
        ignored: "must not cross the extension boundary",
        workflows: [
          {
            ignored: "drop me",
            metadata: { batchId: "batch-1", primaryMediaId: "media-1" },
          },
        ],
      },
      eventType: "BATCH_GENERATE_RESPONSE",
      method: "POST",
      status: 200,
      timestamp: Date.now(),
      type: "FLOW_AUTO_INTERCEPT",
      url: "https://aisandbox-pa.googleapis.com/v1/projects/project-1/flowMedia:batchGenerateImages",
    },
    source: windowObject,
  });
  await Promise.resolve();
  assert.equal(sent.length, 1, "valid intercepted responses should be forwarded once");
  assert.equal(sent[0].data.workflows.length, 1);
  assert.equal(sent[0].data.workflows[0].metadata.batchId, "batch-1");
  assert.equal(sent[0].data.workflows[0].metadata.primaryMediaId, "media-1");
  assert.equal(sent[0].data.ignored, undefined, "unneeded page data must be discarded");
  assert.equal(sent[0].data.workflows[0].ignored, undefined);
}

function testBackgroundValidation() {
  const source = fs.readFileSync(
    path.join(root, "src/background/runtime/03b-intercept-security.js"),
    "utf8",
  );
  const context = vm.createContext({
    TF_MAX_INTERCEPT_ID_LENGTH: 256,
    TF_MAX_INTERCEPT_WORKFLOWS: 64,
    URL,
    _vD: { flowTabId: 17 },
    Ie: (value) => String(value).startsWith("https://labs.google/fx/tools/flow"),
  });
  context.globalThis = context;
  vm.runInContext(
    [
      "tfIsBoundedInterceptId",
      "tfIsTrustedInterceptSender",
      "tfInterceptedMediaPairs",
    ]
      .map((name) => extractFunctionSource(source, name))
      .join("\n") + "\nglobalThis.__pairs = tfInterceptedMediaPairs;",
    context,
  );
  const validMessage = {
    data: {
      workflows: [
        { metadata: { batchId: "batch-1", primaryMediaId: "media-1" } },
      ],
    },
    eventType: "BATCH_GENERATE_RESPONSE",
    method: "POST",
    status: 200,
    timestamp: Date.now(),
    url: "https://aisandbox-pa.googleapis.com/v1/projects/project-1/flowMedia:batchGenerateImages",
  };
  const validSender = {
    tab: { id: 17, url: "https://labs.google/fx/tools/flow/project/project-1" },
  };

  assert.equal(context.__pairs(validMessage, { tab: { ...validSender.tab, id: 18 } }).length, 0);
  assert.equal(
    context.__pairs({ ...validMessage, method: "GET" }, validSender).length,
    0,
    "method mismatches must fail closed",
  );
  assert.equal(
    context.__pairs(
      { ...validMessage, url: "https://labs.google/fx/api/trpc/media.batchGenerateImages" },
      validSender,
    ).length,
    0,
    "generation captures must use the exact allowlisted Google API origin and path",
  );
  assert.equal(
    context.__pairs(
      {
        ...validMessage,
        data: { workflows: Array.from({ length: 65 }, () => validMessage.data.workflows[0]) },
      },
      validSender,
    ).length,
    0,
    "background validation must enforce its own workflow cap",
  );
  const pairs = context.__pairs(validMessage, validSender);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].batchId, "batch-1");
  assert.equal(pairs[0].mediaId, "media-1");
}

function testDownloadCorrelation() {
  const source = fs.readFileSync(
    path.join(root, "src/background/runtime/03-downloads-cache.js"),
    "utf8",
  );
  const messages = [];
  const context = vm.createContext({
    E: { downloaded: 0, failed: 0, total: 0 },
    K: new Set(),
    TF_MAX_CAPTURED_MEDIA: 512,
    TF_MAX_INTERCEPT_ID_LENGTH: 256,
    TF_MAX_DOWNLOAD_QUEUE: 256,
    V: new Map(),
    Vt() {},
    W: [],
    Y: new Map(),
    Z: false,
    _: true,
    tfExactDownloadName: () => "001.png",
    w: {},
    z: new Map(),
    zt(type, payload) {
      messages.push({ payload, type });
    },
  });
  context.globalThis = context;
  vm.runInContext(
    `${extractFunctionSource(source, "kt")}\nglobalThis.__queueCapturedImage = kt;`,
    context,
  );

  context.Y.set("media-unknown-batch", {
    batchId: "batch-unknown",
    prompt: "prompt",
    type: "image",
  });
  context.__queueCapturedImage("media-unknown-batch", "batch-unknown");
  assert.equal(context.K.size, 0, "unknown batches must not consume dedupe capacity");
  assert.equal(context.W.length, 0);

  context.V.set("batch-1", 0);
  context.__queueCapturedImage("media-unexpected", "batch-1");
  assert.equal(context.K.size, 0, "uncorrelated media must not consume dedupe capacity");
  assert.equal(context.W.length, 0, "uncorrelated media must not reach the download queue");

  context.Y.set("media-wrong-batch", {
    batchId: "batch-2",
    prompt: "prompt",
    type: "image",
  });
  context.__queueCapturedImage("media-wrong-batch", "batch-1");
  assert.equal(context.K.size, 0, "media must be correlated to the exact captured batch");

  context.Y.set("media-1", { batchId: "batch-1", prompt: "prompt", type: "image" });
  context.__queueCapturedImage("media-1", "batch-1");
  context.__queueCapturedImage("media-1", "batch-1");
  assert.equal(context.K.size, 1);
  assert.equal(context.W.length, 1, "correlated media should be queued exactly once");

  context.W.length = context.TF_MAX_DOWNLOAD_QUEUE;
  context.Y.set("media-over-cap", {
    batchId: "batch-1",
    prompt: "prompt",
    type: "image",
  });
  context.__queueCapturedImage("media-over-cap", "batch-1");
  assert.equal(context.K.has("media-over-cap"), false, "queue overflow must fail closed");
}

async function run() {
  await testContentBridge();
  testBackgroundValidation();
  testDownloadCorrelation();
  console.log("Intercept security smoke tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
