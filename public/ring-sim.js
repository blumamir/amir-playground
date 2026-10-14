/**
 * LED ring constellation — same geometry as led-rings RingVisualizationCanvas.
 * 12 big rings in a circle; each is 12 sub-rings × 12 pixels = 144 LEDs.
 */

export const PIXELS_PER_RING = 144;
export const RING_COUNT = 12;

const BASE = 680;
// Outer orbit of the 12 big-ring centers. Keep close to the canvas edge.
const BASE_OUTER_R = 278;
// Smaller big-rings → more air between neighbors (was 57/11/6, nearly touching).
const BASE_SUB_R = 44;
const BASE_PIX_R = 9;
const BASE_PIX_SIZE = 5;

/**
 * @typedef {{ cx: number, cy: number, ringIdx: number, pixelIndex: number }} PixelPos
 */

/** @param {number} size @param {number} scale @returns {PixelPos[]} */
export function buildPixelPositions(size, scale) {
  const outerR = BASE_OUTER_R * scale;
  const subR = BASE_SUB_R * scale;
  const pixR = BASE_PIX_R * scale;
  const center = size / 2;
  /** @type {PixelPos[]} */
  const all = [];
  for (let bigRingIdx = 0; bigRingIdx < RING_COUNT; bigRingIdx++) {
    // Match led-rings: big ring 0 near 4–5 o'clock-ish; photo has rainbow around clock.
    // led-rings uses (bigRingIdx * 30 - 60)°. Keep that for fidelity.
    const bigAngle = (bigRingIdx * 30 - 60) * (Math.PI / 180);
    const bigCx = center + outerR * Math.cos(bigAngle);
    const bigCy = center + outerR * Math.sin(bigAngle);
    for (let subRingIdx = 0; subRingIdx < 12; subRingIdx++) {
      const subAngle = (subRingIdx * 30 + 30) * (Math.PI / 180);
      const subCx = bigCx + subR * Math.cos(subAngle);
      const subCy = bigCy + subR * Math.sin(subAngle);
      for (let posIdx = 0; posIdx < 12; posIdx++) {
        const pixelIndex = subRingIdx * 12 + posIdx;
        const pixAngle = (210 + subRingIdx * 30 + posIdx * 30) * (Math.PI / 180);
        all.push({
          cx: subCx + pixR * Math.cos(pixAngle),
          cy: subCy + pixR * Math.sin(pixAngle),
          ringIdx: bigRingIdx,
          pixelIndex,
        });
      }
    }
  }
  return all;
}

function isOffColor(c) {
  if (!c) return true;
  const m = String(c).match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return false;
  return +m[1] + +m[2] + +m[3] < 12;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ darkOff?: boolean }} [opts]
 */
export function createRingSim(canvas, opts = {}) {
  const darkOff = opts.darkOff !== false;
  const ctx = canvas.getContext("2d");
  let size = BASE;
  let scale = 1;
  /** @type {PixelPos[]} */
  let positions = buildPixelPositions(size, scale);
  /** @type {Map<number, string[]>} ringNumber 1..12 → rgb strings[144] */
  let colors = new Map();

  function resize(cssSize) {
    const s = Math.max(200, Math.floor(cssSize || canvas.clientWidth || BASE));
    size = s;
    scale = s / BASE;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(s * dpr);
    canvas.height = Math.floor(s * dpr);
    canvas.style.width = `${s}px`;
    canvas.style.height = `${s}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    positions = buildPixelPositions(size, scale);
    draw();
  }

  /** @param {Map<number, string[]> | Record<number, string[]>} next */
  function setColors(next) {
    colors = next instanceof Map ? next : new Map(Object.entries(next).map(([k, v]) => [Number(k), v]));
    draw();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);

    const pixelRadius = (BASE_PIX_SIZE * scale) / 2;
    const activeStroke = "rgba(255,255,255,0.55)";

    for (const pos of positions) {
      const ringNumber = pos.ringIdx + 1;
      const fill = colors.get(ringNumber)?.[pos.pixelIndex] ?? "rgb(0,0,0)";

      if (darkOff) {
        if (isOffColor(fill)) continue;
        ctx.beginPath();
        ctx.arc(pos.cx, pos.cy, pixelRadius, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = activeStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
        continue;
      }

      ctx.beginPath();
      ctx.arc(pos.cx, pos.cy, pixelRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  return { resize, setColors, draw, get size() { return size; } };
}
