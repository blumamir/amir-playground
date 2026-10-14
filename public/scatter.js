/**
 * Scatter = placement style (hard buckets — no cross-bucket fallback).
 *
 * blocks   → solid color per ring; large contiguous groups
 * regions  → solid color per ring; smaller contiguous groups
 * stripes  → alternating rings, or multi-color within a ring
 * speckled → b1/b2 combs / twisted bands
 * chaos    → scrambled / flipped combs
 */

export const SCATTER_BUCKETS = ["blocks", "regions", "stripes", "speckled", "chaos"];

export const SCATTER_BUCKET_INFO = {
  blocks: {
    label: "blocks",
    blurb: "One solid color per ring; large contiguous groups. With spectrum: hue steps across rings.",
  },
  regions: {
    label: "regions",
    blurb: "One solid color per ring; smaller contiguous groups. With spectrum: hue steps across rings.",
  },
  stripes: {
    label: "stripes",
    blurb: "Alternating rings, or color bands within a ring. Spectrum uses within-ring mapping.",
  },
  speckled: {
    label: "speckled",
    blurb: "Fine mix — b1/b2 or twisted bands. Spectrum uses within-ring mapping.",
  },
  chaos: {
    label: "chaos",
    blurb: "Scrambled / flipped. Spectrum uses within-ring mapping.",
  },
};

/** Buckets that must only use solid-per-ring layouts. */
const SOLID_RING_BUCKETS = new Set(["blocks", "regions"]);

export function scatterLabel(bucket) {
  return SCATTER_BUCKET_INFO[bucket]?.label || bucket || "blocks";
}

export function scatterBlurb(bucket) {
  return SCATTER_BUCKET_INFO[bucket]?.blurb || "";
}

function layoutsInBucket(layouts, bucket) {
  return (layouts || []).filter((l) => {
    if (l.scatterBucket !== bucket) return false;
    // Safety: blocks/regions never include within-ring multi-color modes.
    if (SOLID_RING_BUCKETS.has(bucket) && l.mode !== "rings") return false;
    return true;
  });
}

/**
 * Pick a layout strictly from the scatter bucket (never jumps to another style).
 */
export function pickLayoutForScatter(layouts, bucket, { random = true } = {}) {
  if (!layouts?.length) return null;
  const pool = layoutsInBucket(layouts, bucket);
  if (!pool.length) return null;
  if (!random) return pool[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Pick a colorful segment for a scatter bucket (strict match only).
 */
export function pickSegmentForScatter(segments, bucket, segmentScatter, { random = true } = {}) {
  const list = (segments || []).map((id) => ({
    id,
    scatterBucket: segmentScatter?.[id] || "stripes",
  }));
  const pool = list.filter((s) => s.scatterBucket === bucket);
  const use = pool.length ? pool : list;
  const picked = random
    ? use[Math.floor(Math.random() * use.length)]
    : use[0];
  return picked?.id ?? segments?.[0] ?? "all";
}
