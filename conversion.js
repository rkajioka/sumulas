/**
 * Match report time conversion (browser + Node tests).
 */
const REGEX_TEMPO_PERIODO =
  /(\+\s*\d{1,2}:00|\d{1,2}:00|-)\s+(1\s*T|2\s*T|INT)\b/gi;

function normalizeLineForMatch(line) {
  return String(line || "")
    .replace(/\s+/g, " ")
    .replace(/\+\s+(\d)/g, "+$1")
    .trim();
}

function normalizePeriod(raw) {
  const s = String(raw || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (s === "1T" || s === "2T" || s === "INT") return s;
  return raw;
}

function normalizeTempoToken(tempo) {
  return String(tempo || "").replace(/\s+/g, "");
}

function convertTime(tempo, periodo) {
  const t = normalizeTempoToken(tempo);
  const p = normalizePeriod(periodo);

  if (t === "-" && p === "INT") {
    return "46'";
  }

  if (!t || !p) return null;

  const stoppage = t.match(/^\+(\d{1,2}):00$/);
  if (stoppage) {
    if (p === "1T") {
      return `45+${Number(stoppage[1])}'`;
    }
    return `90+${Number(stoppage[1])}'`;
  }

  const match = t.match(/^(\d{1,2}):00$/);
  if (!match) return null;

  const minute = Number(match[1]);

  if (p === "1T") {
    return `${minute}'`;
  }

  if (p === "2T") {
    return `${45 + minute}'`;
  }

  return null;
}

function needsOverlay(tempo, periodo, converted) {
  if (periodo === "INT") return true;

  const t = normalizeTempoToken(tempo);
  if (t.startsWith("+")) return true;

  const match = t.match(/^(\d{1,2}):00$/);
  if (!match) return true;

  const minute = Number(match[1]);
  return converted !== `${minute}'`;
}

function overlayTimeRange(match) {
  const start = match.index;
  const tempo = match[1];
  return { start, end: start + tempo.length };
}

function overlayDisplayText(converted, tempoOriginal) {
  const c = String(converted);
  const stoppage = c.match(/^(45|90)\+(\d+)'$/);
  if (stoppage) {
    return `${stoppage[1]}+${stoppage[2]}`;
  }

  if (normalizeTempoToken(tempoOriginal) === "-") {
    const n = parseInt(c.replace(/'$/, ""), 10);
    return Number.isFinite(n) ? `${n}:00` : "46:00";
  }

  const gameMinute = parseInt(c.replace(/'$/, ""), 10);
  return Number.isFinite(gameMinute) ? `${gameMinute}:00` : c;
}

const api = {
  REGEX_TEMPO_PERIODO,
  normalizeLineForMatch,
  normalizePeriod,
  normalizeTempoToken,
  convertTime,
  needsOverlay,
  overlayTimeRange,
  overlayDisplayText,
};

if (typeof globalThis !== "undefined") {
  Object.assign(globalThis, api);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
