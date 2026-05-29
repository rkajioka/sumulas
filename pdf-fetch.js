/**
 * PDF download and validation (viewer page, host_permissions).
 */

function fileNameFromUrl(url, contentDisposition) {
  if (contentDisposition) {
    const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(contentDisposition);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1].replace(/"/g, ""));
      } catch {
        return match[1];
      }
    }
  }
  try {
    const base = new URL(url).pathname.split("/").pop();
    if (base?.toLowerCase().endsWith(".pdf")) return base;
  } catch {
    /* ignore */
  }
  return "report.pdf";
}

function validatePdfBuffer(buffer) {
  const size = buffer?.byteLength ?? 0;
  if (size < 4) {
    throw new Error(
      `PDF is empty or was not downloaded (${size} bytes). Check the link.`
    );
  }
  const bytes = new Uint8Array(buffer, 0, 4);
  const signature = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (signature !== "%PDF") {
    const sample = new Uint8Array(buffer, 0, Math.min(80, size));
    const start = new TextDecoder().decode(sample).replace(/\s+/g, " ").trim();
    throw new Error(
      `Link did not return a PDF (response starts with: "${start.slice(0, 40)}…").`
    );
  }
}

/**
 * @param {string} url
 * @returns {Promise<{ buffer: ArrayBuffer, name: string }>}
 */
async function downloadPdfFromUrl(url) {
  let finalUrl;
  try {
    finalUrl = new URL(url).href;
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!["http:", "https:"].includes(new URL(finalUrl).protocol)) {
    throw new Error("Use an http or https link.");
  }

  const response = await fetch(finalUrl, {
    method: "GET",
    credentials: "omit",
    redirect: "follow",
    cache: "default",
    headers: {
      Accept: "application/pdf,application/octet-stream,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Could not download PDF (HTTP ${response.status} ${response.statusText}).`
    );
  }

  const buffer = await response.arrayBuffer();
  validatePdfBuffer(buffer);

  return {
    buffer,
    name: fileNameFromUrl(finalUrl, response.headers.get("content-disposition")),
  };
}

// Alias used by viewer.js
const baixarPdfDaUrl = downloadPdfFromUrl;
const validarBufferPdf = validatePdfBuffer;
