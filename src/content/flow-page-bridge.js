(() => {
  "use strict";

  const TF_MAX_INTERCEPT_WORKFLOWS = 64;
  const TF_MAX_INTERCEPT_ID_LENGTH = 256;

  function isBoundedInterceptId(value) {
    return (
      typeof value === "string" &&
      value.length > 0 &&
      value.length <= TF_MAX_INTERCEPT_ID_LENGTH
    );
  }

  function normalizeInterceptedEvent(value) {
    if (!value || typeof value !== "object") return null;
    const rules = {
      BATCH_GENERATE_RESPONSE: { method: "POST" },
      WORKFLOW_UPDATE: { method: "PATCH" },
    };
    const rule = rules[value.eventType];
    if (
      !rule ||
      value.method !== rule.method ||
      !Number.isInteger(value.status) ||
      value.status < 200 ||
      value.status >= 300 ||
      !Number.isFinite(value.timestamp) ||
      Math.abs(Date.now() - value.timestamp) > 5 * 60 * 1000 ||
      typeof value.url !== "string" ||
      value.url.length > 2048
    )
      return null;
    let interceptedUrl;
    try {
      interceptedUrl = new URL(value.url, window.location.href);
    } catch {
      return null;
    }
    const trustedEndpoint =
      value.eventType === "BATCH_GENERATE_RESPONSE"
        ? interceptedUrl.origin === "https://aisandbox-pa.googleapis.com" &&
          /^\/v1\/projects\/[^/]{1,256}\/flowMedia:batchGenerateImages$/.test(
            interceptedUrl.pathname,
          )
        : interceptedUrl.origin === window.location.origin &&
          interceptedUrl.pathname.includes("flowWorkflows");
    if (!trustedEndpoint)
      return null;

    if (value.eventType === "WORKFLOW_UPDATE") {
      const metadata = value.data?.metadata;
      if (
        !isBoundedInterceptId(metadata?.batchId) ||
        !isBoundedInterceptId(metadata?.primaryMediaId)
      )
        return null;
      return {
        data: {
          metadata: {
            batchId: metadata.batchId,
            primaryMediaId: metadata.primaryMediaId,
          },
        },
        eventType: value.eventType,
        method: value.method,
        status: value.status,
        timestamp: value.timestamp,
        url: interceptedUrl.href,
      };
    }

    const workflows = value.data?.workflows;
    if (
      !Array.isArray(workflows) ||
      workflows.length === 0 ||
      workflows.length > TF_MAX_INTERCEPT_WORKFLOWS
    )
      return null;
    for (const workflow of workflows) {
      const metadata = workflow?.metadata;
      if (
        !isBoundedInterceptId(metadata?.batchId) ||
        !isBoundedInterceptId(metadata?.primaryMediaId)
      )
        return null;
    }
    const sanitizedWorkflows = workflows.map((workflow) => ({
      metadata: {
        batchId: workflow.metadata.batchId,
        primaryMediaId: workflow.metadata.primaryMediaId,
      },
    }));
    return {
      data: { workflows: sanitizedWorkflows },
      eventType: value.eventType,
      method: value.method,
      status: value.status,
      timestamp: value.timestamp,
      url: interceptedUrl.href,
    };
  }

  function projectIdFromLocation() {
    const match =
      window.location.pathname.match(/\/project\/([^/?#]+)/) ||
      window.location.href.match(/\/project\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function reportFlowPageReady() {
    const projectId = projectIdFromLocation();
    chrome.runtime?.id &&
      chrome.runtime
        .sendMessage({
          type: "FLOW_PAGE_READY",
          url: window.location.href,
          projectId,
          hasProject: !!projectId,
        })
        .catch(() => {});
  }

  function installNavigationHooks() {
    const notify = () => setTimeout(reportFlowPageReady, 100);
    for (const method of ["pushState", "replaceState"]) {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        notify();
        return result;
      };
    }
    window.addEventListener("popstate", notify);
    window.addEventListener("pageshow", notify);
  }

  reportFlowPageReady();
  installNavigationHooks();

  window.addEventListener("message", function (event) {
    if (
      event.source !== window ||
      "FLOW_AUTO_INTERCEPT" !== event.data?.type ||
      !chrome.runtime?.id
    )
      return;
    const intercepted = normalizeInterceptedEvent(event.data);
    intercepted &&
      chrome.runtime
        .sendMessage({ type: "API_INTERCEPTED", ...intercepted })
        .catch(() => {});
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if ("GET_PAGE_STATE" === message.type) {
      const editor = document.querySelector('div[data-slate-editor="true"]'),
        projectId = projectIdFromLocation();
      return (
        sendResponse({
          hasEditor: !!editor,
          currentPrompt: editor?.textContent || "",
          url: window.location.href,
          projectId,
          hasProject: !!projectId,
        }),
        !0
      );
    }
    if ("GET_ALL_IMAGES" === message.type) {
      const images = document.querySelectorAll('img[alt="Generated image"]');
      return (
        sendResponse({
          images: Array.from(images).map((image) => {
            const tile = image.closest("div[data-tile-id]"),
              src = image.src,
              match = src.match(/name=([a-f0-9-]+)/);
            return {
              src,
              tileId: tile?.getAttribute("data-tile-id") || null,
              mediaId: match ? match[1] : null,
            };
          }),
        }),
        !0
      );
    }
  });
})();
