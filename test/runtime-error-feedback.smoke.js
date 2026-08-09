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

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is missing`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  assert.fail(`${name} has an unterminated body`);
}

function extractRuntimeRecovery(source) {
  const start = source.indexOf("async function mr()");
  assert.notEqual(start, -1, "mr is missing");
  const end = source.indexOf("\n(setTimeout(", start);
  assert.notEqual(end, -1, "mr terminator is missing");
  return source.slice(start, end);
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

  const recoveryMessages = [];
  const recoveryToasts = [];
  const recoveryWarnings = [];
  const recoveryContext = vm.createContext({
    chrome: {
      runtime: {
        async sendMessage(message) {
          recoveryMessages.push(message);
          return undefined;
        },
      },
    },
    console: {
      warn(...args) {
        recoveryWarnings.push(args);
      },
    },
    Te(message, level) {
      recoveryToasts.push({ level, message });
    },
  });
  recoveryContext.globalThis = recoveryContext;
  vm.runInContext(
    `${extractFunctionSource(runtimeBoot, "tfRequireRuntimeState")}\n${extractRuntimeRecovery(
      runtimeBoot,
    )}\nglobalThis.__restoreRuntimeState = mr;`,
    recoveryContext,
    { filename: path.relative(root, runtimeBootPath) },
  );
  await recoveryContext.__restoreRuntimeState();
  assert.equal(recoveryMessages.length, 1);
  assert.equal(recoveryMessages[0].type, "GET_FULL_STATE");
  assert.deepEqual(
    recoveryToasts,
    [
      {
        level: "warn",
        message:
          "Could not restore the previous generation state. Reopen the panel to try again.",
      },
    ],
    "an empty startup response must execute the visible recovery warning path",
  );
  assert.equal(recoveryWarnings.length, 1, "startup recovery failure should be diagnosable");
  assert.match(String(recoveryWarnings[0][1]), /Generation state unavailable/);

  console.log("Runtime error feedback smoke tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
