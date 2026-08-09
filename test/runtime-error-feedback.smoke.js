"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const controlRunnerPath = path.join(root, "src/sidepanel/app/06b-control-runner.js");
const runtimeBootPath = path.join(root, "src/sidepanel/app/07-runtime-boot.js");
const controlRunner = fs.readFileSync(controlRunnerPath, "utf8");
const runtimeBoot = fs.readFileSync(runtimeBootPath, "utf8");

function createPollingHarness(sendMessage) {
  const intervalCallbacks = [];
  const badges = [];
  const toasts = [];
  const elements = new Map();
  const context = vm.createContext({
    chrome: { runtime: { sendMessage } },
    clearInterval() {},
    console,
    De(label, className) {
      badges.push({ className, label });
    },
    l: { _emptyPollCount: 0, activeBatchId: null, stats: {} },
    m: null,
    r(selector) {
      if (!elements.has(selector)) {
        elements.set(selector, { style: {}, textContent: "" });
      }
      return elements.get(selector);
    },
    setInterval(callback) {
      intervalCallbacks.push(callback);
      return intervalCallbacks.length;
    },
    Te(message, level) {
      toasts.push({ level, message });
    },
  });
  context.globalThis = context;
  vm.runInContext(`${controlRunner}\nglobalThis.__pollGenerationStats = Yn;`, context, {
    filename: path.relative(root, controlRunnerPath),
  });
  context.__pollGenerationStats();
  assert.equal(intervalCallbacks.length, 1, "poller must register one interval callback");
  return { badges, tick: intervalCallbacks[0], toasts };
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      const snippet = source.slice(start, index + 1);
      const context = vm.createContext({});
      context.globalThis = context;
      vm.runInContext(`${snippet}\nglobalThis.__extracted = ${name};`, context);
      return context.__extracted;
    }
  }
  assert.fail(`${name} has an unterminated body`);
}

async function run() {
  let failureCalls = 0;
  const failureHarness = createPollingHarness(async () => {
    failureCalls += 1;
    if (failureCalls <= 3) throw new Error("offline");
    return {
      downloading: false,
      isRunning: false,
      stats: { downloaded: 0, failed: 0, total: 0 },
    };
  });

  await failureHarness.tick();
  await failureHarness.tick();
  assert.deepEqual(failureHarness.badges, [], "transient failures must stay quiet");
  await failureHarness.tick();
  assert.deepEqual(
    failureHarness.badges.map(({ label }) => label),
    ["Connection lost"],
    "the third consecutive failure must report the outage once",
  );
  await failureHarness.tick();
  assert.deepEqual(
    failureHarness.badges.map(({ label }) => label),
    ["Connection lost", "Connected"],
    "recovery must not claim generation is running when the worker is idle",
  );
  assert.equal(
    failureHarness.toasts.filter(({ message }) => message.includes("connection restored")).length,
    1,
    "a visible outage must report one recovery",
  );

  const pendingResolvers = [];
  let concurrentCalls = 0;
  const overlapHarness = createPollingHarness(
    () =>
      new Promise((resolve) => {
        concurrentCalls += 1;
        pendingResolvers.push(resolve);
      }),
  );
  const firstPoll = overlapHarness.tick();
  await Promise.resolve();
  const overlappingPoll = overlapHarness.tick();
  await Promise.resolve();
  assert.equal(concurrentCalls, 1, "a slow status request must suppress overlapping polls");
  pendingResolvers[0]({
    downloading: false,
    isRunning: true,
    stats: { downloaded: 0, failed: 0, total: 0 },
  });
  await Promise.all([firstPoll, overlappingPoll]);

  const requireRuntimeState = extractFunction(runtimeBoot, "tfRequireRuntimeState");
  assert.throws(
    () => requireRuntimeState(undefined),
    /Generation state unavailable/,
    "empty startup responses must enter the visible recovery failure path",
  );
  const availableState = { items: [], running: false };
  assert.equal(requireRuntimeState(availableState), availableState);
  assert.match(
    runtimeBoot,
    /tfRequireRuntimeState\(\s*await chrome\.runtime\.sendMessage/,
    "startup restoration must validate the runtime response before using it",
  );

  console.log("Runtime error feedback smoke tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
