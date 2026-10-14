/**
 * Beat layer: percussive brightness hits locked to a BPM grid.
 *
 * Each kind is a drum-style pattern over a short cycle (kick on every beat,
 * snare on 2 & 4, offbeat “and”, …). Every hit is a sharp attack at a grid
 * slot followed by a decay down to a floor — so light only moves on the beat.
 *
 * Shared by the server (sequence JSON) and the browser (ring sim preview):
 * the sim evaluates the exact same FloatFunction trees that get sent.
 */

export const BEAT_KINDS = [
  "none",
  "kick",
  "half-time",
  "snare",
  "backbeat",
  "offbeat",
  "hihat",
  "double",
  "sixteenths",
  "accent-one",
  "breakbeat",
];

/**
 * cycleBeats: pattern length in beats. slots: grid cells per cycle (power of 2).
 * hits: which slots fire and how bright the attack peaks (1 = full).
 * minFloor: lowest brightness between hits for this kind (hi-hats stay lit).
 *
 * @type {Record<string, { id: string, label: string, blurb: string, cycleBeats?: number, slots?: number, hits?: { slot: number, level: number }[], minFloor?: number }>}
 */
export const BEAT_CATALOG = {
  none: { id: "none", label: "none", blurb: "No beat — brightness stays steady." },
  kick: {
    id: "kick",
    label: "kick",
    blurb: "Four on the floor — a hit on every beat.",
    cycleBeats: 1,
    slots: 1,
    hits: [{ slot: 0, level: 1 }],
  },
  "half-time": {
    id: "half-time",
    label: "half-time",
    blurb: "Kick on 1 and 3 only — heavy, half-speed feel.",
    cycleBeats: 2,
    slots: 2,
    hits: [{ slot: 0, level: 1 }],
  },
  snare: {
    id: "snare",
    label: "snare 2 & 4",
    blurb: "Hits on the backbeat — beats 2 and 4.",
    cycleBeats: 2,
    slots: 2,
    hits: [{ slot: 1, level: 1 }],
  },
  backbeat: {
    id: "backbeat",
    label: "kick + snare",
    blurb: "Strong kick on 1 & 3, softer snare on 2 & 4.",
    cycleBeats: 2,
    slots: 2,
    hits: [
      { slot: 0, level: 1 },
      { slot: 1, level: 0.7 },
    ],
  },
  offbeat: {
    id: "offbeat",
    label: "offbeat",
    blurb: "Hits on the “and” between beats — open hi-hat / bass stab.",
    cycleBeats: 1,
    slots: 2,
    hits: [{ slot: 1, level: 1 }],
  },
  hihat: {
    id: "hihat",
    label: "hi-hat 8ths",
    blurb: "Shallow ticks on every 8th note — stays lit, just shimmers.",
    cycleBeats: 1,
    slots: 2,
    hits: [
      { slot: 0, level: 1 },
      { slot: 1, level: 0.8 },
    ],
    minFloor: 0.45,
  },
  double: {
    id: "double",
    label: "double kick",
    blurb: "Two quick 16th hits at the top of every beat.",
    cycleBeats: 1,
    slots: 4,
    hits: [
      { slot: 0, level: 1 },
      { slot: 1, level: 0.7 },
    ],
  },
  sixteenths: {
    id: "sixteenths",
    label: "16ths",
    blurb: "Hit on every 16th note — fast, driving strobe on the grid.",
    cycleBeats: 1,
    slots: 4,
    hits: [
      { slot: 0, level: 1 },
      { slot: 1, level: 0.65 },
      { slot: 2, level: 0.8 },
      { slot: 3, level: 0.65 },
    ],
  },
  "accent-one": {
    id: "accent-one",
    label: "accent the 1",
    blurb: "Every beat hits, the downbeat of each bar hits hardest.",
    cycleBeats: 4,
    slots: 4,
    hits: [
      { slot: 0, level: 1 },
      { slot: 1, level: 0.45 },
      { slot: 2, level: 0.45 },
      { slot: 3, level: 0.45 },
    ],
  },
  breakbeat: {
    id: "breakbeat",
    label: "breakbeat",
    blurb: "Kick 1 · snare 2 · kick “and” of 3 · snare 4 — broken groove.",
    cycleBeats: 4,
    slots: 8,
    hits: [
      { slot: 0, level: 1 },
      { slot: 2, level: 0.8 },
      { slot: 5, level: 0.9 },
      { slot: 6, level: 0.8 },
    ],
  },
};

/**
 * Spread: which rings take which hit. groups=G → the pattern runs G times per
 * super-cycle and ring group g only fires on pass g (others sit at the floor).
 *
 * @type {{ id: string, label: string, blurb: string, groups: number }[]}
 */
export const BEAT_LAYOUTS = [
  { id: "unison", label: "unison", blurb: "Every ring hits together.", groups: 1 },
  {
    id: "alternate",
    label: "alternate rings",
    blurb: "Odd and even rings take turns, one hit each.",
    groups: 2,
  },
  {
    id: "sides",
    label: "left / right",
    blurb: "Left rings take one hit, right rings the next — ping-pong.",
    groups: 2,
  },
  {
    id: "chase",
    label: "chase ×4",
    blurb: "Four ring sets fire in turn around the circle, one per hit.",
    groups: 4,
  },
];

export const BEAT_DEFAULTS = {
  kind: "none",
  layout: "unison",
  bpm: 120,
  /** Fraction of a hit slot spent decaying (1 = whole slot, 0.25 = tight). */
  decay: 0.5,
  /** Brightness between hits (0 = blackout). */
  depth: 0.1,
};

const DECAYS = [0.25, 0.5, 1];

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function getBeatLayout(id) {
  return BEAT_LAYOUTS.find((l) => l.id === id) || BEAT_LAYOUTS[0];
}

export function normalizeBeat(opts = {}) {
  const kind = BEAT_KINDS.includes(opts?.kind) ? opts.kind : "none";
  const layout = BEAT_LAYOUTS.some((l) => l.id === opts?.layout)
    ? opts.layout
    : BEAT_DEFAULTS.layout;
  const decayRaw = Number(opts?.decay ?? BEAT_DEFAULTS.decay);
  const decay = DECAYS.reduce((best, d) =>
    Math.abs(d - decayRaw) < Math.abs(best - decayRaw) ? d : best,
  );
  const bpm = clamp(Number(opts?.bpm) || BEAT_DEFAULTS.bpm, 40, 220);
  const depthRaw = Number(opts?.depth ?? BEAT_DEFAULTS.depth);
  const depth = clamp(Number.isFinite(depthRaw) ? depthRaw : BEAT_DEFAULTS.depth, 0, 0.8);
  return { kind, layout, bpm, decay, depth };
}

export function describeBeat(beat) {
  const b = normalizeBeat(beat);
  const meta = BEAT_CATALOG[b.kind];
  if (b.kind === "none") return meta.blurb;
  const layout = getBeatLayout(b.layout);
  const decayBit = b.decay <= 0.25 ? "tight" : b.decay <= 0.5 ? "punchy" : "loose";
  return `${meta.blurb} ${b.bpm} BPM · ${decayBit} decay · floor ${b.depth.toFixed(2)} · ${layout.label}.`;
}

function ringGroup(layoutId, ringIndex0, groups) {
  if (groups <= 1) return 0;
  if (layoutId === "sides") return ringIndex0 < 6 ? 0 : 1;
  return ringIndex0 % groups;
}

const constFn = (value) => ({ const_value: { value } });

/** level → floor over the first `decay` fraction of the slot, then hold floor. */
function hitLeaf(level, floor, decay) {
  let fn = { linear: { start: level, end: floor } };
  for (let d = decay; d < 1; d *= 2) fn = { half: { f1: fn, f2: constFn(floor) } };
  return fn;
}

/** Binary `half` tree over leaves (length is a power of 2); equal consts merge. */
function halfTree(leaves) {
  if (leaves.length === 1) return leaves[0];
  const mid = leaves.length / 2;
  const f1 = halfTree(leaves.slice(0, mid));
  const f2 = halfTree(leaves.slice(mid));
  if (f1.const_value && f2.const_value && f1.const_value.value === f2.const_value.value) {
    return f1;
  }
  return { half: { f1, f2 } };
}

/**
 * Brightness function + cycle length for one ring.
 * @returns {{ fn: object, cycleBeats: number } | null}
 */
export function beatRingPlan(beat, ringIndex0) {
  const b = normalizeBeat(beat);
  const meta = BEAT_CATALOG[b.kind];
  if (!meta?.hits) return null;

  const layout = getBeatLayout(b.layout);
  const groups = layout.groups || 1;
  const g = ringGroup(layout.id, ringIndex0, groups);
  const floor = Math.max(b.depth, meta.minFloor ?? 0);
  const slots = meta.slots;

  const leaves = [];
  for (let pass = 0; pass < groups; pass++) {
    for (let s = 0; s < slots; s++) {
      const hit = pass === g ? meta.hits.find((h) => h.slot === s) : null;
      leaves.push(hit ? hitLeaf(hit.level, floor, b.decay) : constFn(floor));
    }
  }
  return { fn: halfTree(leaves), cycleBeats: meta.cycleBeats * groups };
}

/** timed_brightness effect(s) for one ring. */
export function beatEffects(beat, { ringIndex0 = 0, durationMs = 10_000 } = {}) {
  const b = normalizeBeat(beat);
  const plan = beatRingPlan(b, ringIndex0);
  if (!plan) return [];
  const totalBeats = (durationMs / 60_000) * b.bpm;
  return [
    {
      effect_config: {
        segments: "all",
        start_time: 0,
        end_time: durationMs,
        repeat_num: totalBeats / plan.cycleBeats,
        repeat_start: 0,
        repeat_end: 1,
      },
      timed_brightness: { mult_factor_decrease: plan.fn },
    },
  ];
}

/** Append beat effects onto an existing SequencePerThing. */
export function applyBeat(sequence, beat, { durationMs = 10_000 } = {}) {
  const b = normalizeBeat(beat);
  const out = structuredClone(sequence);
  const ringKeys = Object.keys(out).sort(
    (a, z) => (Number(a.replace(/\D/g, "")) || 0) - (Number(z.replace(/\D/g, "")) || 0),
  );
  ringKeys.forEach((key, i) => {
    out[key].effects.push(
      ...beatEffects(b, { ringIndex0: i, durationMs: out[key].duration_ms || durationMs }),
    );
  });
  return out;
}

/** Evaluate a FloatFunction tree at t ∈ [0, 1] (for the preview sim). */
export function evalFloatFn(fn, t) {
  if (!fn) return 1;
  if (fn.const_value) return fn.const_value.value;
  if (fn.linear) return fn.linear.start + (fn.linear.end - fn.linear.start) * t;
  if (fn.half) return t < 0.5 ? evalFloatFn(fn.half.f1, t * 2) : evalFloatFn(fn.half.f2, t * 2 - 1);
  if (fn.sin) {
    const { min, max, phase = 0, repeats = 1 } = fn.sin;
    return min + (max - min) * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t * repeats + phase)));
  }
  if (fn.steps) {
    const { num_steps, diff_per_step, first_step_value } = fn.steps;
    return first_step_value + diff_per_step * Math.min(num_steps - 1, Math.floor(t * num_steps));
  }
  if (fn.comb2) {
    const c = fn.comb2;
    return c.amount1 * evalFloatFn(c.f1, t) + c.amount2 * evalFloatFn(c.f2, t);
  }
  return 1;
}

/** Brightness multiplier for one ring at absolute time tMs (sim preview). */
export function beatBrightnessAt(beat, ringIndex0, tMs) {
  const plan = beatRingPlan(beat, ringIndex0);
  if (!plan) return 1;
  const cycleMs = (plan.cycleBeats * 60_000) / normalizeBeat(beat).bpm;
  const u = ((tMs % cycleMs) + cycleMs) % cycleMs / cycleMs;
  return evalFloatFn(plan.fn, u);
}
