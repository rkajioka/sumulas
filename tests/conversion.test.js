const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  convertTime,
  needsOverlay,
  overlayDisplayText,
  normalizeLineForMatch,
  normalizePeriod,
  REGEX_TEMPO_PERIODO,
} = require("../conversion.js");

describe("convertTime", () => {
  it("1T", () => {
    assert.equal(convertTime("12:00", "1T"), "12'");
  });

  it("2T", () => {
    assert.equal(convertTime("08:00", "2T"), "53'");
    assert.equal(convertTime("8:00", "2T"), "53'");
    assert.equal(convertTime("39:00", "2T"), "84'");
  });

  it("INT", () => {
    assert.equal(convertTime("-", "INT"), "46'");
  });

  it("stoppage +MM:00", () => {
    assert.equal(convertTime("+02:00", "2T"), "90+2'");
    assert.equal(convertTime("+ 02:00", "2T"), "90+2'");
    assert.equal(convertTime("+10:00", "2T"), "90+10'");
  });

  it("stoppage on 1T (rare)", () => {
    assert.equal(convertTime("+02:00", "1T"), "90+2'");
  });
});

describe("needsOverlay", () => {
  it("2T and INT need overlay", () => {
    assert.equal(needsOverlay("08:00", "2T", "53'"), true);
    assert.equal(needsOverlay("-", "INT", "46'"), true);
    assert.equal(needsOverlay("+02:00", "2T", "90+2'"), true);
  });

  it("1T same minute skips overlay", () => {
    assert.equal(needsOverlay("12:00", "1T", "12'"), false);
  });
});

describe("overlayDisplayText", () => {
  it("formats display", () => {
    assert.equal(overlayDisplayText("53'", "08:00"), "53:00");
    assert.equal(overlayDisplayText("46'", "-"), "46:00");
    assert.equal(overlayDisplayText("90+2'", "+02:00"), "90+2");
    assert.equal(overlayDisplayText("90+10'", "+10:00"), "90+10");
  });
});

describe("normalizeLineForMatch", () => {
  it("collapses + spacing", () => {
    assert.equal(normalizeLineForMatch("+ 02:00  2T"), "+02:00 2T");
  });
});

describe("normalizePeriod", () => {
  it("normalizes spaced periods", () => {
    assert.equal(normalizePeriod("2 T"), "2T");
    assert.equal(normalizePeriod("1 T"), "1T");
  });
});

describe("REGEX_TEMPO_PERIODO", () => {
  it("does not match bare clock", () => {
    REGEX_TEMPO_PERIODO.lastIndex = 0;
    assert.equal(REGEX_TEMPO_PERIODO.exec("kickoff 17:00"), null);
  });

  it("matches stoppage before normal time", () => {
    REGEX_TEMPO_PERIODO.lastIndex = 0;
    const m = REGEX_TEMPO_PERIODO.exec("row +02:00 2T");
    assert.ok(m);
    assert.equal(m[1].replace(/\s/g, ""), "+02:00");
    assert.equal(normalizePeriod(m[2]), "2T");
  });
});
