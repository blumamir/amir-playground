/**
 * Coloring + layout catalog (~30 ways to place colors on the rings).
 *
 * Modes:
 *   around  — N color bands via position_* + halfTree on a segment map
 *   rings   — solid const_color per ring from an assignment pattern
 *   b1b2    — interleaved b1/b2 combs (2 colors), optional per-ring flip
 *   hybrid  — around on one ring group, solid on the other (2 colors)
 */

export const KINDS = ["const", "2", "4", "8", "colorful"];

const N_COLORS = { 2: 2, 4: 4, 8: 8 };
const TOTAL_RINGS = 12;

const SEGMENTS = ["all", "centric", "updown", "arc", "ind", "rand"];

/** Discrete scatter buckets — placement style, not a soft slider. */
export const SCATTER_BUCKETS = ["blocks", "regions", "stripes", "speckled", "chaos"];

export const SCATTER_BUCKET_INFO = {
  blocks: {
    label: "blocks",
    blurb: "One solid color per ring; large contiguous groups. Spectrum: hue steps across rings.",
  },
  regions: {
    label: "regions",
    blurb: "One solid color per ring; smaller contiguous groups. Spectrum: hue steps across rings.",
  },
  stripes: {
    label: "stripes",
    blurb: "Alternating rings, or color bands within a ring. Spectrum: within-ring mapping.",
  },
  speckled: {
    label: "speckled",
    blurb: "Fine mix — b1/b2 or twisted bands. Spectrum: within-ring mapping.",
  },
  chaos: {
    label: "chaos",
    blurb: "Scrambled / flipped. Spectrum: within-ring mapping.",
  },
};

/** Colorful segment → scatter bucket. */
export const SEGMENT_SCATTER = {
  all: "stripes",
  centric: "stripes",
  ind: "stripes",
  updown: "stripes",
  arc: "stripes",
  rand: "chaos",
};

/** Around layouts paint multiple colors on one ring → never blocks/regions. */
const AROUND_BUCKET = {
  all: "stripes",
  centric: "stripes",
  ind: "stripes",
  updown: "stripes",
  arc: "stripes",
  rand: "chaos",
};

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   group: string,
 *   mode: 'around' | 'rings' | 'b1b2' | 'hybrid',
 *   n: number[],
 *   scatterBucket: 'blocks' | 'regions' | 'stripes' | 'speckled' | 'chaos',
 *   segment?: string,
 *   twist?: boolean,
 *   assign?: string,
 *   flip?: 'none' | 'alternate' | 'sides' | 'odd',
 *   pairAssign?: 'sides' | 'alternate' | 'pairs',
 *   hybridSegment?: string,
 * }} LayoutDef
 */

/** @type {LayoutDef[]} */
export const LAYOUT_CATALOG = [
  // ── around: bands on segment map ─────────────────────────────────────
  ...SEGMENTS.map((segment) => ({
    id: `around-${segment}`,
    label: `around · ${segment}`,
    group: "around",
    mode: "around",
    segment,
    scatterBucket: AROUND_BUCKET[segment],
    n: [2, 4, 8],
  })),
  // twist: busier → speckled (rand twist stays chaos)
  ...SEGMENTS.map((segment) => ({
    id: `around-${segment}-twist`,
    label: `around · ${segment} · twist`,
    group: "around",
    mode: "around",
    segment,
    twist: "forward",
    scatterBucket: segment === "rand" ? "chaos" : "speckled",
    n: [2, 4, 8],
  })),
  // counter-twist
  ...["all", "centric", "updown"].map((segment) => ({
    id: `around-${segment}-counter`,
    label: `around · ${segment} · counter-twist`,
    group: "around",
    mode: "around",
    segment,
    twist: "reverse",
    scatterBucket: segment === "updown" ? "stripes" : "speckled",
    n: [2, 4, 8],
  })),

  // ── rings: solid color per ring ──────────────────────────────────────
  // blocks = one color per ring + contiguous same-color groups only
  {
    id: "rings-sides",
    label: "rings · left / right",
    group: "rings",
    mode: "rings",
    assign: "sides",
    scatterBucket: "blocks",
    n: [2, 4, 8],
  },
  {
    id: "rings-alternate",
    label: "rings · one-one",
    group: "rings",
    mode: "rings",
    assign: "alternate",
    scatterBucket: "stripes",
    n: [2, 4, 8],
  },
  {
    id: "rings-pairs",
    label: "rings · adjacent pairs",
    group: "rings",
    mode: "rings",
    assign: "pairs",
    scatterBucket: "regions",
    n: [2, 4, 8],
  },
  {
    id: "rings-odd-even",
    label: "rings · odd / even",
    group: "rings",
    mode: "rings",
    assign: "odd-even",
    scatterBucket: "stripes",
    n: [2],
  },
  {
    id: "rings-center-outer",
    label: "rings · center / outer",
    group: "rings",
    mode: "rings",
    assign: "center-outer",
    scatterBucket: "blocks",
    n: [2],
  },
  {
    id: "rings-mirror",
    label: "rings · mirror pairs",
    group: "rings",
    mode: "rings",
    assign: "mirror",
    scatterBucket: "regions",
    n: [2, 4, 8],
  },
  {
    id: "rings-from-ends",
    label: "rings · from ends",
    group: "rings",
    mode: "rings",
    assign: "from-ends",
    scatterBucket: "blocks",
    n: [2, 4, 8],
  },

  // ── comb: b1 / b2 (2/4/8 colors — pairs per ring) ────────────────────
  {
    id: "comb-b1b2",
    label: "comb · b1 / b2",
    group: "comb",
    mode: "b1b2",
    flip: "none",
    pairAssign: "sides",
    scatterBucket: "speckled",
    n: [2, 4, 8],
  },
  {
    id: "comb-b1b2-alt",
    label: "comb · b1 / b2 · flip each ring",
    group: "comb",
    mode: "b1b2",
    flip: "alternate",
    pairAssign: "sides",
    scatterBucket: "chaos",
    n: [2, 4, 8],
  },
  {
    id: "comb-b1b2-sides",
    label: "comb · b1 / b2 · flip on right",
    group: "comb",
    mode: "b1b2",
    flip: "sides",
    pairAssign: "sides",
    scatterBucket: "speckled",
    n: [2, 4, 8],
  },
  {
    id: "comb-b1b2-odd",
    label: "comb · b1 / b2 · flip on odd",
    group: "comb",
    mode: "b1b2",
    flip: "odd",
    pairAssign: "sides",
    scatterBucket: "chaos",
    n: [2, 4, 8],
  },
  {
    id: "comb-b1b2-cycle",
    label: "comb · b1 / b2 · cycle pairs",
    group: "comb",
    mode: "b1b2",
    flip: "none",
    pairAssign: "alternate",
    scatterBucket: "speckled",
    n: [4, 8],
  },
  {
    id: "comb-b1b2-cycle-alt",
    label: "comb · b1 / b2 · cycle + flip",
    group: "comb",
    mode: "b1b2",
    flip: "alternate",
    pairAssign: "alternate",
    scatterBucket: "chaos",
    n: [4, 8],
  },

  // ── hybrid: around on one side, solid on the other (2 colors) ─────────
  {
    id: "hybrid-centric-left",
    label: "hybrid · centric left / solid right",
    group: "hybrid",
    mode: "hybrid",
    hybridSegment: "centric",
    assign: "sides",
    scatterBucket: "stripes",
    n: [2],
  },
  {
    id: "hybrid-arc-left",
    label: "hybrid · arc left / solid right",
    group: "hybrid",
    mode: "hybrid",
    hybridSegment: "arc",
    assign: "sides",
    scatterBucket: "stripes",
    n: [2],
  },
  {
    id: "hybrid-ind-center",
    label: "hybrid · ind center / solid outer",
    group: "hybrid",
    mode: "hybrid",
    hybridSegment: "ind",
    assign: "center-outer",
    scatterBucket: "stripes",
    n: [2],
  },
  {
    id: "hybrid-updown-odd",
    label: "hybrid · updown odd / solid even",
    group: "hybrid",
    mode: "hybrid",
    hybridSegment: "updown",
    assign: "odd-even",
    scatterBucket: "stripes",
    n: [2],
  },
  {
    id: "hybrid-all-left",
    label: "hybrid · all left / solid right",
    group: "hybrid",
    mode: "hybrid",
    hybridSegment: "all",
    assign: "sides",
    scatterBucket: "stripes",
    n: [2],
  },
  {
    id: "hybrid-rand-center",
    label: "hybrid · rand center / solid outer",
    group: "hybrid",
    mode: "hybrid",
    hybridSegment: "rand",
    assign: "center-outer",
    scatterBucket: "chaos",
    n: [2],
  },
];

export const SEGMENT_INFO = {
  all: "Full 144-LED strip; position runs linearly through the tunnel.",
  centric: "Same angle on every sub-ring — colors form aligned radial wedges.",
  updown: "Like centric, but each sub-ring is rotated one step — a spiral.",
  arc: "Triangle-wave around each sub-ring — mirrored arc halves.",
  ind: "Whole concentric sub-rings as steps — colors stack by depth.",
  rand: "Fixed pseudo-random positions — speckled / scrambled bands.",
};

const ASSIGN_BLURB = {
  sides: "Rings 1–6 vs 7–12 (left / right halves of the tunnel).",
  alternate: "Colors cycle ring-by-ring: 1,2,3…",
  pairs: "Adjacent rings share a color: (1–2), (3–4), …",
  "odd-even": "Odd rings one color, even rings the other.",
  "center-outer": "Center rings 4–9 vs outer rings 1–3 & 10–12.",
  mirror: "Mirrored pairs share a color: (1↔12), (2↔11), …",
  "from-ends": "Color by distance from the nearest end of the tunnel.",
};

const FLIP_BLURB = {
  none: "Same b1/b2 assignment on every ring.",
  alternate: "Swap which color is on b1 vs b2 on every other ring.",
  sides: "Normal on left rings, swapped on right rings.",
  odd: "Swapped on odd rings (1,3,5…).",
};

/**
 * Human-readable explanation of a layout.
 * @param {LayoutDef} l
 */
export function describeLayout(l) {
  if (!l) return "";
  if (l.mode === "around") {
    const seg = SEGMENT_INFO[l.segment] || l.segment;
    let twist = "";
    if (l.twist === "forward") {
      twist = " Color bands rotate forward on each next ring (twist down the tunnel).";
    } else if (l.twist === "reverse") {
      twist = " Color bands rotate the other way on each next ring.";
    }
    return `Splits each ring into equal color bands using the “${l.segment}” map. ${seg}${twist}`;
  }
  if (l.mode === "rings") {
    return `Each ring is a solid color. ${ASSIGN_BLURB[l.assign] || ""}`.trim();
  }
  if (l.mode === "b1b2") {
    const pairBit =
      (l.n?.length > 1 || (l.n && l.n.some((x) => x > 2)))
        ? " With 4/8 colors, rings get consecutive pairs (or cycled pairs)."
        : "";
    return `Interleaves two colors with b1/b2 pixel combs (every 3rd LED vs the rest). ${FLIP_BLURB[l.flip] || ""}${pairBit}`.trim();
  }
  if (l.mode === "hybrid") {
    const seg = l.hybridSegment || "centric";
    return `Primary rings get multi-color bands on “${seg}” (${SEGMENT_INFO[seg] || ""}). Other rings are solid color 2. ${ASSIGN_BLURB[l.assign] || ""}`.trim();
  }
  return l.label;
}

export function describeSegment(segment) {
  return SEGMENT_INFO[segment] || "";
}

export function normalizeColor(c = {}) {
  return {
    hue: clamp01(Number(c.hue) || 0),
    sat: clamp01(Number(c.sat) ?? 1),
    val: clamp01(Number(c.val) ?? 1),
  };
}

export function defaultColors(n) {
  return Array.from({ length: n }, (_, i) =>
    normalizeColor({ hue: n === 1 ? 0 : i / n, sat: 1, val: 1 }),
  );
}

export function colorCountForKind(kind) {
  if (kind === "const" || kind === "colorful") return 1;
  return N_COLORS[kind] ?? 1;
}

export function layoutsForKind(kind) {
  const n = colorCountForKind(kind);
  if (n < 2) return [];
  return LAYOUT_CATALOG.filter((l) => l.n.includes(n));
}

export function getLayout(id) {
  return LAYOUT_CATALOG.find((l) => l.id === id) ?? null;
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function rotate(arr, by) {
  const n = arr.length;
  const k = ((by % n) + n) % n;
  return arr.slice(k).concat(arr.slice(0, k));
}

function baseCfg(durationMs, segments = "all") {
  return { segments, start_time: 0, end_time: durationMs };
}

function halfTree(values) {
  if (values.length === 1) return { const_value: { value: values[0] } };
  if (values.length < 1 || (values.length & (values.length - 1)) !== 0) {
    throw new Error(`halfTree requires a power-of-two length, got ${values.length}`);
  }
  const mid = values.length / 2;
  return {
    half: {
      f1: halfTree(values.slice(0, mid)),
      f2: halfTree(values.slice(mid)),
    },
  };
}

function constColorEffect(color, effectConfig) {
  return {
    effect_config: structuredClone(effectConfig),
    const_color: { color: { ...normalizeColor(color) } },
  };
}

function resolveColors(kind, opts) {
  const n = colorCountForKind(kind);
  if (Array.isArray(opts.colors) && opts.colors.length > 0) {
    const list = opts.colors.map(normalizeColor);
    while (list.length < n) list.push(defaultColors(1)[0]);
    return list.slice(0, n);
  }
  return defaultColors(n);
}

/** Contiguous group index for ring 0..11 among n colors. */
export function ringGroupIndex(ringIndex0, n, totalRings = TOTAL_RINGS) {
  return Math.min(n - 1, Math.floor((ringIndex0 * n) / totalRings));
}

/**
 * Map ring index → color index for solid ring layouts.
 */
export function colorIndexForRing(ringIndex0, assign, n, totalRings = TOTAL_RINGS) {
  switch (assign) {
    case "sides":
      return ringGroupIndex(ringIndex0, n, totalRings);
    case "alternate":
      return ringIndex0 % n;
    case "odd-even":
      return ringIndex0 % 2;
    case "center-outer": {
      // outer: 0,1,2,9,10,11 → 0 ; center: 3..8 → 1
      const r = ringIndex0;
      return r >= 3 && r <= 8 ? 1 : 0;
    }
    case "mirror": {
      // pairs (0,11), (1,10), ... share a color; pair index cycles through n
      const pair = Math.min(ringIndex0, totalRings - 1 - ringIndex0);
      return pair % n;
    }
    case "from-ends": {
      // color by distance from nearest end
      const dist = Math.min(ringIndex0, totalRings - 1 - ringIndex0);
      return Math.min(n - 1, Math.floor((dist * n) / (totalRings / 2)));
    }
    case "pairs":
      // (0,1) (2,3) … share a color index
      return Math.floor(ringIndex0 / 2) % n;
    default:
      return ringGroupIndex(ringIndex0, n, totalRings);
  }
}

function effectsAround(colors, durationMs, segment = "all") {
  const cfg = baseCfg(durationMs, segment);
  return [
    constColorEffect({ hue: 0, sat: 1, val: 1 }, cfg),
    {
      effect_config: structuredClone(cfg),
      position_hue: { offset_factor: halfTree(colors.map((c) => c.hue)) },
    },
    {
      effect_config: structuredClone(cfg),
      position_saturation: { mult_factor_decrease: halfTree(colors.map((c) => c.sat)) },
    },
    {
      effect_config: structuredClone(cfg),
      position_brightness: { mult_factor_decrease: halfTree(colors.map((c) => c.val)) },
    },
  ];
}

function effectsSolid(color, durationMs, segments = "all") {
  return [constColorEffect(color, baseCfg(durationMs, segments))];
}

function effectsB1B2(pair, durationMs, flipped) {
  const a = flipped ? pair[1] : pair[0];
  const b = flipped ? pair[0] : pair[1];
  return [
    constColorEffect(a, baseCfg(durationMs, "b1")),
    constColorEffect(b, baseCfg(durationMs, "b2")),
  ];
}

/**
 * Pick which two colors form the b1/b2 pair on a given ring.
 * Colors are grouped as (0,1), (2,3), … — different rings can use different pairs.
 */
export function colorPairForRing(colors, ringIndex0, pairAssign = "sides", totalRings = TOTAL_RINGS) {
  const n = colors.length;
  if (n < 2) {
    throw new Error(`b1b2 needs at least 2 colors, got ${n}`);
  }
  if (n === 2) return [colors[0], colors[1]];
  const numPairs = Math.floor(n / 2);
  let pairIdx;
  switch (pairAssign) {
    case "alternate":
      pairIdx = ringIndex0 % numPairs;
      break;
    case "pairs":
      pairIdx = Math.floor(ringIndex0 / 2) % numPairs;
      break;
    case "sides":
    default:
      pairIdx = ringGroupIndex(ringIndex0, numPairs, totalRings);
      break;
  }
  const i = pairIdx * 2;
  return [colors[i], colors[i + 1]];
}

function effectsColorful(color, range, durationMs, segment = "all") {
  const cfg = baseCfg(durationMs, segment);
  const half = Number(range) / 2;
  return [
    constColorEffect(color, cfg),
    {
      effect_config: structuredClone(cfg),
      position_hue: {
        offset_factor: { linear: { start: -half, end: half } },
      },
    },
  ];
}

function wrapHue(h) {
  return ((Number(h) % 1) + 1) % 1;
}

/** How many contiguous solid groups an assign pattern uses across the tunnel. */
export function groupCountForAssign(assign, totalRings = TOTAL_RINGS) {
  switch (assign) {
    case "sides":
    case "center-outer":
    case "odd-even":
      return 2;
    case "pairs":
    case "mirror":
      return Math.floor(totalRings / 2);
    case "from-ends":
      return Math.max(2, Math.floor(totalRings / 2));
    case "alternate":
      return totalRings;
    default:
      return 2;
  }
}

/**
 * Spectrum as solid per-ring colors: hue walks the range across contiguous ring groups.
 */
function effectsSpectrumAcrossRings(center, range, assign, durationMs, rings = TOTAL_RINGS) {
  const half = Number(range) / 2;
  const nGroups = groupCountForAssign(assign, rings);
  const out = {};
  for (let i = 1; i <= rings; i++) {
    const gi = colorIndexForRing(i - 1, assign, nGroups, rings);
    const t = nGroups <= 1 ? 0.5 : gi / (nGroups - 1);
    const hue = wrapHue(center.hue - half + t * Number(range));
    const color = {
      hue,
      sat: center.sat,
      val: center.val,
    };
    out[`ring${i}`] = ringSeq(effectsSolid(color, durationMs), durationMs);
  }
  return out;
}

function shouldFlipB1B2(flip, ringIndex0) {
  switch (flip) {
    case "alternate":
      return ringIndex0 % 2 === 1;
    case "sides":
      return ringIndex0 >= 6;
    case "odd":
      return ringIndex0 % 2 === 0; // rings 1,3,5… (0-based even)
    default:
      return false;
  }
}

/** Is this ring in the "primary" set for hybrid (gets around)? */
function ringInPrimary(ringIndex0, assign) {
  switch (assign) {
    case "sides":
      return ringIndex0 < 6;
    case "center-outer":
      return ringIndex0 >= 3 && ringIndex0 <= 8;
    case "odd-even":
      return ringIndex0 % 2 === 0;
    default:
      return ringIndex0 < 6;
  }
}

function ringSeq(effects, durationMs) {
  return {
    effects: structuredClone(effects),
    duration_ms: durationMs,
    num_repeats: 0,
  };
}

/**
 * Build a full SequencePerThing for the given coloring + layout.
 */
export function buildSequence(kind, opts = {}) {
  const {
    range = 1,
    layout: layoutOpt,
    durationMs = 10_000,
    rings = TOTAL_RINGS,
    colorfulSegment = "all",
    scatterBucket = null,
  } = opts;

  const k = String(kind);
  if (!KINDS.includes(k)) {
    throw new Error(`Unknown coloring kind "${k}". Choose from: ${KINDS.join(", ")}`);
  }

  const colors = resolveColors(k, opts);
  const available = layoutsForKind(k);
  const layoutDef =
    (layoutOpt && available.find((l) => l.id === layoutOpt)) || available[0] || null;

  const out = {};

  if (k === "const") {
    const effects = effectsSolid(colors[0], durationMs);
    for (let i = 1; i <= rings; i++) out[`ring${i}`] = ringSeq(effects, durationMs);
    return { sequence: out, layout: null, colors };
  }

  if (k === "colorful") {
    const solidRing =
      scatterBucket === "blocks" || scatterBucket === "regions";

    if (solidRing) {
      // Spectrum across whole rings (one solid hue per ring / contiguous group).
      const ringLayout =
        (layoutOpt && getLayout(layoutOpt)) ||
        LAYOUT_CATALOG.find(
          (l) => l.mode === "rings" && l.scatterBucket === scatterBucket,
        ) ||
        LAYOUT_CATALOG.find((l) => l.mode === "rings" && l.assign === "sides");
      const assign = ringLayout?.assign || "sides";
      const sequence = effectsSpectrumAcrossRings(
        colors[0],
        range,
        assign,
        durationMs,
        rings,
      );
      return {
        sequence,
        layout: ringLayout?.id ?? null,
        colors,
        colorfulSegment: null,
        scatterBucket,
        spectrumMode: "rings",
      };
    }

    // Within-ring position mapping (stripes / speckled / chaos).
    const segment = SEGMENTS.includes(colorfulSegment) ? colorfulSegment : "all";
    const effects = effectsColorful(colors[0], range, durationMs, segment);
    for (let i = 1; i <= rings; i++) out[`ring${i}`] = ringSeq(effects, durationMs);
    return {
      sequence: out,
      layout: null,
      colors,
      colorfulSegment: segment,
      scatterBucket,
      spectrumMode: "within-ring",
    };
  }

  if (!layoutDef) {
    throw new Error(`No layout available for kind "${k}"`);
  }

  const layout = layoutDef.id;

  if (layoutDef.mode === "around") {
    for (let i = 1; i <= rings; i++) {
      let used = colors;
      if (layoutDef.twist === "forward") used = rotate(colors, i - 1);
      else if (layoutDef.twist === "reverse") used = rotate(colors, 1 - i);
      out[`ring${i}`] = ringSeq(
        effectsAround(used, durationMs, layoutDef.segment || "all"),
        durationMs,
      );
    }
    return { sequence: out, layout, colors };
  }

  if (layoutDef.mode === "rings") {
    for (let i = 1; i <= rings; i++) {
      const ci = colorIndexForRing(i - 1, layoutDef.assign, colors.length, rings);
      out[`ring${i}`] = ringSeq(effectsSolid(colors[ci], durationMs), durationMs);
    }
    return { sequence: out, layout, colors };
  }

  if (layoutDef.mode === "b1b2") {
    for (let i = 1; i <= rings; i++) {
      const pair = colorPairForRing(
        colors,
        i - 1,
        layoutDef.pairAssign || "sides",
        rings,
      );
      const flipped = shouldFlipB1B2(layoutDef.flip || "none", i - 1);
      out[`ring${i}`] = ringSeq(effectsB1B2(pair, durationMs, flipped), durationMs);
    }
    return { sequence: out, layout, colors };
  }

  if (layoutDef.mode === "hybrid") {
    if (colors.length !== 2) throw new Error("hybrid layouts require 2 colors");
    // Primary rings: around with both colors on hybridSegment
    // Secondary rings: solid color[1]
    const aroundFx = effectsAround(colors, durationMs, layoutDef.hybridSegment || "centric");
    const solidFx = effectsSolid(colors[1], durationMs);
    for (let i = 1; i <= rings; i++) {
      const primary = ringInPrimary(i - 1, layoutDef.assign || "sides");
      out[`ring${i}`] = ringSeq(primary ? aroundFx : solidFx, durationMs);
    }
    return { sequence: out, layout, colors };
  }

  throw new Error(`Unsupported layout mode for "${layout}"`);
}

/** @deprecated prefer buildSequence */
export function coloring(kind, opts = {}) {
  const { sequence } = buildSequence(kind, opts);
  return sequence.ring1.effects;
}

export function asSequence(effects, { durationMs = 10_000, numRepeats = 0, rings = 12 } = {}) {
  const seq = {
    effects: structuredClone(effects),
    duration_ms: durationMs,
    num_repeats: numRepeats,
  };
  const out = {};
  for (let i = 1; i <= rings; i++) out[`ring${i}`] = structuredClone(seq);
  return out;
}

/** Segment options for colorful kind */
export const COLORFUL_SEGMENTS = SEGMENTS;
