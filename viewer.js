/* global pdfjsLib */

const Y_TOLERANCE = 4;
const SCALE = 1.4;

let pdfDoc = null;
let loadGeneration = 0;
let totalMatchCount = 0;

const TRANSLATIONS = [
  {
    regex: /(?:Advertências\s*\/\s*Cartões\s+Amarelos|Cartões\s+Amarelos\s*\/\s*Advertências|Cartões\s+Amarelos|Advertências)/gi,
    en: "Yellow Cards"
  },
  {
    regex: /(?:Expulsões\s*\/\s*Cartões\s+Vermelhos|Cartões\s+Vermelhos\s*\/\s*Expulsões|Cartões\s+Vermelhos|Expulsões)/gi,
    en: "Red Cards"
  },
  {
    regex: /Substituições/gi,
    en: "Substitutions"
  },
  {
    regex: /\bGols\b/gi,
    en: "Goals"
  }
];

const el = {
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  layout: document.getElementById("layout"),
  pdfColumn: document.getElementById("pdf-column"),
  docTitle: document.getElementById("doc-title"),
  pageCount: document.getElementById("page-count"),
  urlForm: document.getElementById("url-form"),
  urlInput: document.getElementById("pdf-url"),
  disclaimer: document.getElementById("disclaimer"),
  warning: document.getElementById("warning"),
  btnClearHistory: document.getElementById("btn-clear-history"),
  recentUrls: document.getElementById("recent-urls"),
};

function findTempoRangeInRawText(rawText, tempoToken) {
  const compact = normalizeTempoToken(tempoToken);
  let start = rawText.indexOf(compact);
  if (start >= 0) {
    return { start, end: start + compact.length };
  }

  const escaped = tempoToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const flexible = new RegExp(escaped.replace(/\s+/g, "\\s*"));
  const m = flexible.exec(rawText);
  if (m) {
    return { start: m.index, end: m.index + m[0].length };
  }

  return null;
}

function extractLines(textContent) {
  const items = (textContent.items || []).filter(
    (item) => item.str && String(item.str).trim()
  );

  if (items.length === 0) return [];

  const groups = [];

  for (const item of items) {
    const transform = item.transform || [1, 0, 0, 1, 0, 0];
    const x = transform[4];
    const y = transform[5];

    let group = groups.find((g) => Math.abs(g.y - y) <= Y_TOLERANCE);
    if (!group) {
      group = { y, parts: [] };
      groups.push(group);
    }

    group.parts.push({
      x,
      y,
      str: String(item.str),
      width: item.width || 0,
      height: item.height || 0,
      transform,
    });
  }

  groups.sort((a, b) => b.y - a.y);

  return groups.map((group) => {
    group.parts.sort((a, b) => a.x - b.x);
    const text = group.parts
      .map((p) => p.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return { text, y: group.y, parts: group.parts };
  });
}

function buildTextMap(parts) {
  let text = "";
  const map = [];

  for (let i = 0; i < parts.length; i++) {
    if (i > 0) text += " ";
    const start = text.length;
    text += parts[i].str;
    map.push({ start, end: text.length, part: parts[i] });
  }

  return { text, map };
}

function matchPosition(parts, matchStart, matchEnd, viewport) {
  const { map } = buildTextMap(parts);
  if (map.length === 0) return null;

  const start = Math.max(0, matchStart);
  const end = Math.max(start, matchEnd);

  const partsInRange = map.filter((m) => m.end > start && m.start < end);
  if (partsInRange.length === 0) return null;

  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (const { part } of partsInRange) {
    const h = part.height || Math.abs(part.transform?.[3]) || 10;
    const x2 = part.x + (part.width || h * 2);
    const [vx1, vy1] = viewport.convertToViewportPoint(part.x, part.y);
    const [vx2, vy2] = viewport.convertToViewportPoint(x2, part.y + h);

    left = Math.min(left, vx1, vx2);
    right = Math.max(right, vx1, vx2);
    top = Math.min(top, vy1, vy2);
    bottom = Math.max(bottom, vy1, vy2);
  }

  const height = Math.max(bottom - top, 10);

  return {
    left,
    top,
    bottom,
    width: Math.max(right - left, 24),
    height,
    fontSize: height * 0.88,
  };
}

function countTextChars(textContent) {
  return (textContent.items || []).reduce(
    (sum, item) => sum + String(item.str || "").length,
    0
  );
}

function detectEventsOnPage(textContent, viewport) {
  const lines = extractLines(textContent);
  const events = [];
  const translationEvents = [];

  for (const line of lines) {
    const { text: rawText } = buildTextMap(line.parts);
    
    // Translation detection
    if (rawText) {
      for (const trans of TRANSLATIONS) {
        trans.regex.lastIndex = 0;
        let match;
        while ((match = trans.regex.exec(rawText)) !== null) {
          const start = match.index;
          const end = start + match[0].length;
          const pos = matchPosition(line.parts, start, end, viewport);
          if (pos) {
            translationEvents.push({
              pos,
              original: match[0],
              translated: trans.en,
            });
          }
        }
      }
    }

    const lineText = normalizeLineForMatch(rawText || line.text);
    if (!lineText) continue;

    REGEX_TEMPO_PERIODO.lastIndex = 0;
    let match;

    while ((match = REGEX_TEMPO_PERIODO.exec(lineText)) !== null) {
      const tempo = match[1];
      const periodo = normalizePeriod(match[2]);

      if (tempo && /^\d{1,2}$/.test(tempo.trim())) {
        const textBefore = lineText.substring(0, match.index);
        if (textBefore.trim().length > 0) {
          continue;
        }
      }

      const converted = convertTime(tempo, periodo, window.currentIsFPF);
      if (!converted) continue;

      const range =
        findTempoRangeInRawText(rawText, tempo) || overlayTimeRange(match);
      const pos = matchPosition(line.parts, range.start, range.end, viewport);

      events.push({
        tempo_original: normalizeTempoToken(tempo) === "-" ? "-" : tempo,
        periodo,
        tempo_convertido: converted,
        pos,
        showOverlay: needsOverlay(tempo, periodo, converted, window.currentIsFPF),
      });
    }
  }

  return { events, translationEvents };
}

function createOverlaySpan(pos, converted, tempo, periodo, canvas, ctx, alignedCenterX) {
  const span = document.createElement("span");
  span.className = "tempo-substituido";
  const display = overlayDisplayText(converted, tempo);
  span.textContent = display;
  const origin =
    normalizeTempoToken(tempo) === "-" ? "- INT" : `${tempo} ${periodo}`;
  span.title = `${origin} → ${converted}`;

  const rawHeight = Math.max(pos.height, 11);
  const fontSize = Math.max(pos.fontSize || rawHeight * 0.88, 11);
  const rawWidth = Math.max(pos.width, display.length * fontSize * 0.58 + 4);

  // Increase the pill size slightly for a better visual weight
  const paddingX = 12; // 6px padding on left and right
  const paddingY = 4;  // 2px padding on top and bottom

  const finalWidth = rawWidth + paddingX;
  const finalHeight = rawHeight + paddingY;

  // Use the aligned column center to perfectly align all pills in the same column
  const centerX = alignedCenterX !== undefined ? alignedCenterX : (pos.left + pos.width / 2);
  span.style.left = `${centerX - (finalWidth / 2)}px`;
  span.style.top = `${pos.top - (paddingY / 2)}px`;
  span.style.width = `${finalWidth}px`;
  span.style.height = `${finalHeight}px`;
  span.style.fontSize = `${fontSize}px`;
  span.style.lineHeight = `${finalHeight}px`;



  return span;
}

function overlayPositionKey(pos, converted) {
  return `${Math.round(pos.top / 4)}:${Math.round(pos.left / 4)}:${converted}`;
}

function addOverlays(overlayLayer, events, canvas, ctx) {
  const placed = new Set();

  // Group events into columns to perfectly align them vertically
  const columns = [];
  for (const event of events) {
    if (!event.pos) continue;
    const centerX = event.pos.left + event.pos.width / 2;
    
    let foundCol = null;
    for (const col of columns) {
      if (Math.abs(col.approxCenter - centerX) < 60) {
        foundCol = col;
        break;
      }
    }
    if (foundCol) {
      foundCol.events.push(event);
    } else {
      columns.push({ approxCenter: centerX, events: [event] });
    }
  }

  // Find the true center of each column (using the widest text, typically XX:XX)
  for (const col of columns) {
    let maxW = -1;
    let bestCenter = col.approxCenter;
    for (const ev of col.events) {
      if (ev.pos.width > maxW) {
        maxW = ev.pos.width;
        bestCenter = ev.pos.left + ev.pos.width / 2;
      }
    }
    for (const ev of col.events) {
      ev.alignedCenterX = bestCenter;
    }
  }

  for (const event of events) {
    if (!event.pos || !event.showOverlay) continue;

    const key = overlayPositionKey(event.pos, event.tempo_convertido);
    if (placed.has(key)) continue;
    placed.add(key);

    try {
      overlayLayer.appendChild(
        createOverlaySpan(
          event.pos,
          event.tempo_convertido,
          event.tempo_original,
          event.periodo,
          canvas,
          ctx,
          event.alignedCenterX
        )
      );
    } catch {
      /* optional overlay */
    }
  }
}

function addTranslationOverlays(overlayLayer, events, canvas, ctx) {
  for (const event of events) {
    try {
      overlayLayer.appendChild(createTranslationSpan(event, canvas, ctx));
    } catch {}
  }
}

function createTranslationSpan(event, canvas, ctx) {
  const { pos, translated, original } = event;
  const span = document.createElement("span");
  span.className = "translation-substituido";
  span.textContent = translated;
  span.title = `${original} → ${translated}`;

  const rawHeight = Math.max(pos.height, 12);
  const fontSize = Math.max(pos.fontSize || rawHeight * 0.88, 12);
  
  const paddingX = 16;
  const paddingY = 6;
  
  let bgColor = "#245899";
  let textColor = "#ffffff";
  
  if (ctx) {
    try {
      const data = ctx.getImageData(Math.max(0, pos.left - 4), Math.max(0, pos.top + pos.height / 2), 1, 1).data;
      if (data[0] > 200 && data[1] > 200 && data[2] > 200) {
        bgColor = "#ffffff";
        textColor = "#000000";
      } else if (data[3] > 0) {
        bgColor = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
      }
    } catch {}
  }

  span.style.left = `${pos.left - paddingX/2}px`;
  span.style.top = `${pos.top - paddingY/2}px`;
  span.style.width = `${pos.width + paddingX}px`;
  span.style.height = `${rawHeight + paddingY}px`;
  span.style.fontSize = `${fontSize}px`;
  span.style.lineHeight = `${rawHeight + paddingY}px`;
  span.style.backgroundColor = bgColor;
  span.style.color = textColor;

  return span;
}

async function renderPage(pageNum, gen) {
  if (gen !== loadGeneration) return { matches: 0, textChars: 0 };

  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: SCALE });

  const container = document.createElement("div");
  container.className = "page-container";
  container.dataset.page = String(pageNum);

  const label = document.createElement("div");
  label.className = "page-label";
  label.textContent = `Page ${pageNum}`;
  container.appendChild(label);

  const stage = document.createElement("div");
  stage.className = "page-stage";
  stage.style.width = `${viewport.width}px`;
  stage.style.height = `${viewport.height}px`;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const textLayer = document.createElement("div");
  textLayer.className = "textLayer";
  textLayer.style.setProperty("--scale-factor", String(viewport.scale));

  const overlay = document.createElement("div");
  overlay.className = "overlay-layer";

  stage.appendChild(canvas);
  stage.appendChild(textLayer);
  stage.appendChild(overlay);
  container.appendChild(stage);

  if (gen !== loadGeneration) return { matches: 0, textChars: 0 };

  el.pdfColumn.appendChild(container);

  const textContent = await page.getTextContent();
  const textChars = countTextChars(textContent);

  if (gen !== loadGeneration) return { matches: 0, textChars };

  await page.render({ canvasContext: ctx, viewport }).promise;

  if (gen !== loadGeneration) return { matches: 0, textChars };

  if (typeof pdfjsLib.renderTextLayer === "function") {
    const textTask = pdfjsLib.renderTextLayer({
      textContentSource: textContent,
      container: textLayer,
      viewport,
    });
    await textTask.promise;
  }

  if (gen !== loadGeneration) return { matches: 0, textChars };

  const { events, translationEvents } = detectEventsOnPage(textContent, viewport);
  const matchCount = events.length;
  addOverlays(overlay, events, canvas, ctx);
  addTranslationOverlays(overlay, translationEvents, canvas, ctx);

  return { matches: matchCount, textChars };
}

function showError(message) {
  el.loading.hidden = true;
  el.layout.hidden = true;
  el.error.hidden = false;
  el.error.textContent = message;
  if (el.warning) el.warning.hidden = true;
}

function showLayout() {
  el.loading.hidden = true;
  el.error.hidden = true;
  el.layout.hidden = false;
  if (el.disclaimer) el.disclaimer.hidden = false;

  const viewToggle = document.getElementById("view-toggle");
  if (viewToggle) viewToggle.hidden = false;
}

/* Toggle: Original ↔ Converted */
(function initToggle() {
  const checkbox = document.getElementById("toggle-converted");
  const labelOriginal = document.getElementById("toggle-label-original");
  const labelConverted = document.getElementById("toggle-label-converted");
  if (!checkbox) return;

  function applyToggle() {
    const showConverted = checkbox.checked;

    // Show/hide all overlay layers (time conversions)
    document.querySelectorAll(".overlay-layer").forEach((layer) => {
      layer.style.display = showConverted ? "" : "none";
    });

    // Show/hide all translation overlays
    document.querySelectorAll(".translation-substituido").forEach((el) => {
      el.style.display = showConverted ? "" : "none";
    });

    // Update label active states
    if (labelOriginal) {
      labelOriginal.classList.toggle("toggle-label--active", !showConverted);
    }
    if (labelConverted) {
      labelConverted.classList.toggle("toggle-label--active", showConverted);
    }

    // Show/hide disclaimer
    const disclaimer = document.getElementById("disclaimer");
    if (disclaimer) disclaimer.hidden = !showConverted;
  }

  checkbox.addEventListener("change", applyToggle);
})();

function hideWarning() {
  if (el.warning) {
    el.warning.hidden = true;
    el.warning.textContent = "";
  }
}

function showWarning(message) {
  if (!el.warning) return;
  el.warning.textContent = message;
  el.warning.hidden = false;
}

function updatePageCount(current, total) {
  if (total) {
    el.pageCount.textContent =
      current < total ? `Page ${current} of ${total}` : `${total} page(s)`;
  } else {
    el.pageCount.textContent = "";
  }
}

let pdfJsReady = false;

function initPdfJs() {
  if (pdfJsReady) return true;
  if (typeof pdfjsLib === "undefined") return false;

  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
    "lib/pdf.worker.min.js"
  );
  pdfJsReady = true;
  return true;
}

function isPdfJsLoaded() {
  if (typeof pdfjsLib !== "undefined") return initPdfJs();
  return (
    document.getElementById("pdfjs-script")?.getAttribute("data-error") !== "1"
  );
}

async function processPdf(buffer, name, gen, sourceUrl) {
  if (!isPdfJsLoaded()) {
    showError(
      "PDF.js not found (lib/pdf.min.js). Run npm run copy-pdfjs and reload the extension."
    );
    return false;
  }

  validatePdfBuffer(buffer);
  
  window.currentIsFPF = sourceUrl ? sourceUrl.includes("conteudo.fpf.org.br") : false;

  el.loading.hidden = false;
  el.layout.hidden = true;
  el.error.hidden = true;
  hideWarning();
  el.docTitle.textContent = name || "Match report";

  try {
    if (pdfDoc?.destroy) {
      try {
        await pdfDoc.destroy();
      } catch {
        /* ignore */
      }
    }

    const data = new Uint8Array(buffer);
    pdfDoc = await pdfjsLib.getDocument({ data, useWorkerFetch: false }).promise;

    if (gen !== loadGeneration) return false;

    el.pdfColumn.innerHTML = "";
    totalMatchCount = 0;
    let firstPageTextChars = 0;
    let scannedWarning = false;

    const total = pdfDoc.numPages;
    for (let p = 1; p <= total; p++) {
      if (gen !== loadGeneration) return false;

      updatePageCount(p, total);
      const result = await renderPage(p, gen);

      if (gen !== loadGeneration) return false;

      if (p === 1) {
        firstPageTextChars = result.textChars;
        showLayout();
        if (result.textChars < 30) {
          showWarning(
            "This PDF has no selectable text (scanned image?). Times may not be converted."
          );
          scannedWarning = true;
        }
      }

      totalMatchCount += result.matches;
    }

    if (gen !== loadGeneration) return false;

    updatePageCount(total, total);
    el.docTitle.textContent = name || "Match report";

    if (!scannedWarning && totalMatchCount === 0) {
      showWarning(
        "No 1T/2T/INT time patterns found. Format may differ from expected match report layout."
      );
    }

    if (sourceUrl) {
      await addRecentLink(sourceUrl);
      await populateUrlDatalist(el.recentUrls);
    }

    return true;
  } catch (err) {
    console.error(err);
    if (gen === loadGeneration) {
      showError(`Failed to load PDF: ${err.message || err}`);
    }
    return false;
  }
}

async function loadPdfFromUrl(url, suggestedName) {
  const gen = ++loadGeneration;

  el.loading.hidden = false;
  el.error.hidden = true;
  hideWarning();
  el.docTitle.textContent = "Downloading…";

  const { buffer, name } = await downloadPdfFromUrl(url);

  if (gen !== loadGeneration) return;

  const ok = await processPdf(buffer, suggestedName || name, gen, url);

  if (gen !== loadGeneration || !ok) return;

  const u = new URL(location.href);
  u.searchParams.set("url", url);
  history.replaceState(null, "", `${u.pathname}${u.search}`);
}

function setUrlInBar(url) {
  if (url) el.urlInput.value = url;
}

async function startLoading() {
  await populateUrlDatalist(el.recentUrls);

  const params = new URLSearchParams(location.search);
  const urlParam = params.get("url");

  if (urlParam) {
    setUrlInBar(urlParam);
    try {
      await loadPdfFromUrl(urlParam);
    } catch (err) {
      console.error(err);
      showError(err.message || "Could not load PDF from this link.");
    }
    return;
  }

  el.loading.hidden = true;
  showLayout();
}

el.urlForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = el.urlInput.value.trim();
  if (!url) return;

  el.error.hidden = true;
  try {
    await loadPdfFromUrl(url);
  } catch (err) {
    console.error(err);
    showError(err.message || "Could not load PDF from this link.");
  }
});

if (el.btnClearHistory) {
  el.btnClearHistory.addEventListener("click", async () => {
    await clearRecentLinks();
    await populateUrlDatalist(el.recentUrls);
  });
}

if (location.search.includes("dev=1")) {
  console.assert(convertTime("08:00", "2T") === "53'");
  console.assert(convertTime("+02:00", "2T") === "90+2'");
  console.log("[Match Report] dev checks passed.");
}

document.getElementById("pdfjs-script")?.addEventListener("error", () => {
  document.getElementById("pdfjs-script")?.setAttribute("data-error", "1");
});

if (chrome.runtime?.id) {
  startLoading();
} else {
  showError("Open this viewer from the extension popup.");
}
