(function initTFHtmlSafety(root) {
  "use strict";

  const allowedDataUrl = /^data:(?:image\/(?:avif|gif|jpeg|jpg|png|webp)|video\/(?:mp4|ogg|webm));base64,[a-z0-9+/]*={0,2}$/i;
  const allowedProtocols = new Set(["blob:", "chrome-extension:", "https:"]);
  const allowedFilesystemOrigins = new Set(["chrome-extension:", "https:"]);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function safeMediaUrl(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (allowedDataUrl.test(raw)) return escapeHtml(raw);

    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "filesystem:") {
        const innerUrl = new URL(raw.slice("filesystem:".length));
        return allowedFilesystemOrigins.has(innerUrl.protocol) ? escapeHtml(parsed.href) : "";
      }
      return allowedProtocols.has(parsed.protocol) ? escapeHtml(parsed.href) : "";
    } catch (_error) {
      return "";
    }
  }

  function allowlistedToken(value, allowedValues, fallback = "") {
    const allowed = allowedValues instanceof Set ? allowedValues : new Set(allowedValues);
    const raw = String(value ?? "");
    if (allowed.has(raw)) return raw;
    const safeFallback = String(fallback ?? "");
    return allowed.has(safeFallback) ? safeFallback : "";
  }

  root.TFHtmlSafety = Object.freeze({ allowlistedToken, escapeHtml, safeMediaUrl });
})(globalThis);
