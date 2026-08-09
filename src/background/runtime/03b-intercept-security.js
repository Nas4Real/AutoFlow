// TurboFlow background runtime shard: untrusted page-intercept validation.
// Loaded after shared state and before the runtime message router.

function tfIsBoundedInterceptId(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= TF_MAX_INTERCEPT_ID_LENGTH
  );
}

function tfIsTrustedInterceptSender(sender) {
  const tab = sender?.tab;
  return !!(
    tab &&
    Number.isInteger(tab.id) &&
    tab.id === _vD.flowTabId &&
    Ie(tab.url || "")
  );
}

function tfInterceptedMediaPairs(message, sender) {
  if (!tfIsTrustedInterceptSender(sender)) return [];
  const rules = {
    BATCH_GENERATE_RESPONSE: { method: "POST" },
    WORKFLOW_UPDATE: { method: "PATCH" },
  };
  const rule = rules[message?.eventType];
  if (
    !rule ||
    message.method !== rule.method ||
    !Number.isInteger(message.status) ||
    message.status < 200 ||
    message.status >= 300 ||
    !Number.isFinite(message.timestamp) ||
    Math.abs(Date.now() - message.timestamp) > 5 * 60 * 1000 ||
    typeof message.url !== "string" ||
    message.url.length > 2048
  )
    return [];
  let interceptedUrl, senderUrl;
  try {
    senderUrl = new URL(sender.tab.url);
    interceptedUrl = new URL(message.url, senderUrl);
  } catch {
    return [];
  }
  const trustedEndpoint =
    message.eventType === "BATCH_GENERATE_RESPONSE"
      ? interceptedUrl.origin === "https://aisandbox-pa.googleapis.com" &&
        /^\/v1\/projects\/[^/]{1,256}\/flowMedia:batchGenerateImages$/.test(
          interceptedUrl.pathname,
        )
      : interceptedUrl.origin === senderUrl.origin &&
        interceptedUrl.pathname.includes("flowWorkflows");
  if (!trustedEndpoint)
    return [];

  const toPair = (metadata) =>
    tfIsBoundedInterceptId(metadata?.batchId) &&
    tfIsBoundedInterceptId(metadata?.primaryMediaId)
      ? { batchId: metadata.batchId, mediaId: metadata.primaryMediaId }
      : null;
  if (message.eventType === "WORKFLOW_UPDATE") {
    const pair = toPair(message.data?.metadata);
    return pair ? [pair] : [];
  }
  const workflows = message.data?.workflows;
  if (
    !Array.isArray(workflows) ||
    workflows.length === 0 ||
    workflows.length > TF_MAX_INTERCEPT_WORKFLOWS
  )
    return [];
  for (const workflow of workflows) {
    if (
      !tfIsBoundedInterceptId(workflow?.metadata?.batchId) ||
      !tfIsBoundedInterceptId(workflow?.metadata?.primaryMediaId)
    )
      return [];
  }
  return workflows.map((workflow) => ({
    batchId: workflow.metadata.batchId,
    mediaId: workflow.metadata.primaryMediaId,
  }));
}
