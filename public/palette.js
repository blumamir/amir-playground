/**
 * High-level coloring control: colorfulness (0..1).
 *
 * Low  → few colors, close in hue (mono / analogous)
 * Mid  → more colors, wider hue span
 * High → continuous "colorful" rainbow around a center (range)
 *
 * Other names that fit the same idea: palette richness, hue variety, spectrum.
 */

export const COLORFULNESS_LABELS = [
  { max: 0.1, label: "mono" },
  { max: 0.32, label: "analogous" },
  { max: 0.55, label: "varied" },
  { max: 0.78, label: "rich" },
  { max: 1.01, label: "spectrum" },
];

/** Bands map colorfulness → discrete kind + hue span or continuous range. */
export const COLORFULNESS_BANDS = [
  { max: 0.1, kind: "const", label: "mono" },
  {
    max: 0.32,
    kind: "2",
    spanMin: 0.05,
    spanMax: 0.28,
    label: "analogous",
  },
  {
    max: 0.55,
    kind: "4",
    spanMin: 0.18,
    spanMax: 0.55,
    label: "varied",
  },
  {
    max: 0.78,
    kind: "8",
    spanMin: 0.35,
    spanMax: 0.95,
    label: "rich",
  },
  {
    max: 1.01,
    kind: "colorful",
    rangeMin: 0.2,
    rangeMax: 2,
    label: "spectrum",
  },
];

const KIND_COUNTS = { const: 1, 2: 2, 4: 4, 8: 8, colorful: 1 };

/** Representative colorfulness when picking a kind manually. */
export const KIND_TO_COLORFULNESS = {
  const: 0.05,
  2: 0.22,
  4: 0.44,
  8: 0.66,
  colorful: 0.9,
};

function clamp01(x) {
  return Math.min(1, Math.max(0, Number(x) || 0));
}

function wrapHue(h) {
  return ((h % 1) + 1) % 1;
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

function bandFor(colorfulness) {
  const c = clamp01(colorfulness);
  return COLORFULNESS_BANDS.find((b) => c < b.max) || COLORFULNESS_BANDS.at(-1);
}

function tInBand(colorfulness, band) {
  const prevMax =
    COLORFULNESS_BANDS[
      Math.max(0, COLORFULNESS_BANDS.indexOf(band) - 1)
    ]?.max ?? 0;
  const lo = COLORFULNESS_BANDS.indexOf(band) === 0 ? 0 : prevMax;
  const hi = Math.min(1, band.max);
  if (hi <= lo) return 0;
  return clamp01((clamp01(colorfulness) - lo) / (hi - lo));
}

export function colorfulnessLabel(colorfulness) {
  const c = clamp01(colorfulness);
  return (
    COLORFULNESS_LABELS.find((b) => c < b.max)?.label ||
    COLORFULNESS_LABELS.at(-1).label
  );
}

/**
 * Resolve colorfulness → kind + span (discrete) or range (colorful).
 * @returns {{ kind: string, label: string, span: number|null, range: number|null }}
 */
export function resolveColorfulness(colorfulness) {
  const band = bandFor(colorfulness);
  const t = tInBand(colorfulness, band);
  if (band.kind === "colorful") {
    const range = round2(
      band.rangeMin + t * (band.rangeMax - band.rangeMin),
    );
    return { kind: "colorful", label: band.label, span: null, range };
  }
  if (band.kind === "const") {
    return { kind: "const", label: band.label, span: 0, range: null };
  }
  const span = round2(band.spanMin + t * (band.spanMax - band.spanMin));
  return { kind: band.kind, label: band.label, span, range: null };
}

/**
 * Build a palette from colorfulness (+ optional vividness for sat).
 * Colors sit on an arc of width `span` around a center hue (close when low).
 * For colorful: one center color + continuous range.
 *
 * Hues stay random; vividness only steers saturation (and a bit of value).
 * Multi-color palettes sample sat per color so they can differ.
 *
 * @param {number} colorfulness
 * @param {{ center?: {hue,sat,val}, seedHue?: number, vividness?: number }} [opts]
 */
export function generatePalette(colorfulness, opts = {}) {
  const resolved = resolveColorfulness(colorfulness);
  const n = KIND_COUNTS[resolved.kind] ?? 1;
  const vividness = clamp01(opts.vividness ?? 0.7);
  const baseHue = opts.center?.hue ?? opts.seedHue ?? Math.random();
  const centerHue = wrapHue(baseHue);

  if (resolved.kind === "const" || resolved.kind === "colorful") {
    const tone = sampleTone(vividness);
    return {
      ...resolved,
      colors: [
        {
          hue: round2(centerHue),
          sat: round2(tone.sat),
          val: round2(tone.val),
        },
      ],
    };
  }

  const span = resolved.span ?? 0.2;
  const colors = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const hue = wrapHue(centerHue - span / 2 + t * span);
    const tone = sampleTone(vividness);
    return {
      hue: round2(hue),
      sat: round2(tone.sat),
      val: round2(tone.val),
    };
  });

  return { ...resolved, colors };
}

/**
 * Re-sample sat/val for existing colors from vividness (keep hues).
 */
export function retoneColors(colors, vividness) {
  return (colors || []).map((c) => {
    const tone = sampleTone(vividness);
    return {
      hue: round2(wrapHue(c.hue)),
      sat: round2(tone.sat),
      val: round2(tone.val),
    };
  });
}

export function vividnessLabel(vividness) {
  const v = clamp01(vividness);
  if (v < 0.25) return "pastel";
  if (v < 0.5) return "soft";
  if (v < 0.75) return "rich";
  return "vivid";
}

/** Saturation (+ value) band for a vividness dial. */
function satValRange(vividness) {
  const v = clamp01(vividness);
  // pastel: still clearly tinted on LEDs (not near-white); vivid: high sat
  const satLo = 0.28 + v * 0.5;
  const satHi = 0.48 + v * 0.52;
  const valLo = 0.55 + (1 - v) * 0.12;
  const valHi = 0.78 + (1 - v) * 0.1;
  return {
    satLo,
    satHi: Math.min(1, satHi),
    valLo,
    valHi: Math.min(1, valHi),
  };
}

function sampleTone(vividness) {
  const { satLo, satHi, valLo, valHi } = satValRange(vividness);
  return {
    sat: satLo + Math.random() * (satHi - satLo),
    val: valLo + Math.random() * (valHi - valLo),
  };
}

/**
 * Infer a colorfulness from an existing kind (for syncing the slider).
 */
export function colorfulnessFromKind(kind) {
  return KIND_TO_COLORFULNESS[kind] ?? 0.5;
}
