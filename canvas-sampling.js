/**
 * Sample background color from a rendered PDF canvas region.
 */
function averageColorFromCanvas(ctx, left, top, width, height) {
  if (!ctx || width <= 0 || height <= 0) return null;

  const canvas = ctx.canvas;
  const x0 = Math.max(0, Math.floor(left));
  const y0 = Math.max(0, Math.floor(top));
  const x1 = Math.min(canvas.width, Math.ceil(left + width));
  const y1 = Math.min(canvas.height, Math.ceil(top + height));

  if (x1 <= x0 || y1 <= y0) return null;

  try {
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    const cols = 3;
    const rows = 3;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sx = Math.floor(x0 + ((col + 0.5) / cols) * (x1 - x0));
        const sy = Math.floor(y0 + ((row + 0.5) / rows) * (y1 - y0));
        const data = ctx.getImageData(sx, sy, 1, 1).data;
        rSum += data[0];
        gSum += data[1];
        bSum += data[2];
        count++;
      }
    }

    if (count === 0) return null;

    const r = Math.round(rSum / count);
    const g = Math.round(gSum / count);
    const b = Math.round(bSum / count);
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return null;
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.averageColorFromCanvas = averageColorFromCanvas;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { averageColorFromCanvas };
}
