/**
 * Motion layer: kind + layout + params → snake_brightness on top of coloring.
 *
 * Layout controls where/how motion is placed (segment map, which rings,
 * sync vs stagger vs opposite directions) — same idea as coloring layouts.
 */

export const MOTION_KINDS = [
  "none",
  "chase",
  "chase-reverse",
  "pulse",
  "comet",
  "steps",
  "slow-fast",
  "fill",
  "tail-breathe",
];

/** @type {Record<string, { id: string, label: string, blurb: string, params: string[] }>} */
export const MOTION_CATALOG = {
  none: {
    id: "none",
    label: "none",
    blurb: "No motion — coloring stays static.",
    params: [],
  },
  chase: {
    id: "chase",
    label: "chase",
    blurb: "A bright head runs around the ring with a fading tail.",
    params: ["tail", "cyclic", "repeats"],
  },
  "chase-reverse": {
    id: "chase-reverse",
    label: "chase reverse",
    blurb: "Same as chase, traveling the opposite direction.",
    params: ["tail", "cyclic", "repeats"],
  },
  pulse: {
    id: "pulse",
    label: "pulse",
    blurb: "Snake head oscillates with a sine wave — back and forth energy.",
    params: ["tail", "cyclic", "repeats"],
  },
  comet: {
    id: "comet",
    label: "comet",
    blurb: "Short tail, fast passes — a tight comet streak.",
    params: ["tail", "cyclic", "repeats"],
  },
  steps: {
    id: "steps",
    label: "steps",
    blurb: "Head jumps in discrete steps around the ring.",
    params: ["tail", "cyclic", "repeats", "steps"],
  },
  "slow-fast": {
    id: "slow-fast",
    label: "slow / fast",
    blurb: "Mix of sine + linear head motion — speeds up and slows down.",
    params: ["tail", "cyclic", "repeats"],
  },
  fill: {
    id: "fill",
    label: "fill",
    blurb: "Head advances while the tail grows — a filling sweep.",
    params: ["cyclic", "repeats"],
  },
  "tail-breathe": {
    id: "tail-breathe",
    label: "tail breathe",
    blurb: "Head pulses while the tail length breathes in and out.",
    params: ["cyclic", "repeats"],
  },
};

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   blurb: string,
 *   segment?: string,
 *   stagger?: number,
 *   flip?: 'none' | 'alternate' | 'sides',
 *   rings?: 'all' | 'left' | 'right' | 'odd' | 'even' | 'center' | 'outer',
 * }} MotionLayoutDef
 */

/** @type {MotionLayoutDef[]} */
export const MOTION_LAYOUTS = [
  {
    id: "sync-all",
    label: "sync · all map",
    blurb: "Same motion on every ring, segment map “all”.",
    segment: "all",
    stagger: 0,
    flip: "none",
    rings: "all",
  },
  {
    id: "stagger-all",
    label: "stagger · all map",
    blurb: "Phase-shifts down the tunnel on “all”.",
    segment: "all",
    stagger: 0.75,
    flip: "none",
    rings: "all",
  },
  {
    id: "stagger-centric",
    label: "stagger · centric",
    blurb: "Staggered motion on the centric map (aligned wedges).",
    segment: "centric",
    stagger: 0.75,
    flip: "none",
    rings: "all",
  },
  {
    id: "sync-centric",
    label: "sync · centric",
    blurb: "Synced motion on centric.",
    segment: "centric",
    stagger: 0,
    flip: "none",
    rings: "all",
  },
  {
    id: "stagger-updown",
    label: "stagger · updown",
    blurb: "Staggered spiral (updown map).",
    segment: "updown",
    stagger: 0.85,
    flip: "none",
    rings: "all",
  },
  {
    id: "sync-arc",
    label: "sync · arc",
    blurb: "Synced motion on the arc map.",
    segment: "arc",
    stagger: 0,
    flip: "none",
    rings: "all",
  },
  {
    id: "stagger-ind",
    label: "stagger · ind",
    blurb: "Staggered depth (ind map).",
    segment: "ind",
    stagger: 0.6,
    flip: "none",
    rings: "all",
  },
  {
    id: "sync-rand",
    label: "sync · rand",
    blurb: "Synced motion on the rand map.",
    segment: "rand",
    stagger: 0,
    flip: "none",
    rings: "all",
  },
  {
    id: "alt-flip",
    label: "alternate reverse",
    blurb: "Every other ring runs the opposite direction.",
    segment: "all",
    stagger: 0,
    flip: "alternate",
    rings: "all",
  },
  {
    id: "sides-flip",
    label: "left / right opposite",
    blurb: "Left rings one way, right rings the other.",
    segment: "centric",
    stagger: 0.3,
    flip: "sides",
    rings: "all",
  },
  {
    id: "left-only",
    label: "left rings only",
    blurb: "Motion only on rings 1–6.",
    segment: "all",
    stagger: 0.4,
    flip: "none",
    rings: "left",
  },
  {
    id: "right-only",
    label: "right rings only",
    blurb: "Motion only on rings 7–12.",
    segment: "all",
    stagger: 0.4,
    flip: "none",
    rings: "right",
  },
  {
    id: "odd-only",
    label: "odd rings only",
    blurb: "Motion on odd rings only.",
    segment: "centric",
    stagger: 0.5,
    flip: "none",
    rings: "odd",
  },
  {
    id: "center-stagger",
    label: "center · stagger",
    blurb: "Staggered motion on center rings 4–9.",
    segment: "updown",
    stagger: 0.7,
    flip: "none",
    rings: "center",
  },
];

export const MOTION_DEFAULTS = {
  kind: "none",
  layout: "sync-all",
  tail: 0.35,
  cyclic: true,
  repeats: 4,
  reverse: false,
  steps: 8,
  /** Distinct phase groups across rings (1=sync, 2=alt, 4=four sets ×3 on 12 rings). */
  phaseGroups: 1,
};

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function getMotionLayout(id) {
  return MOTION_LAYOUTS.find((l) => l.id === id) || MOTION_LAYOUTS[0];
}

export function normalizeMotion(opts = {}) {
  const kind = MOTION_KINDS.includes(opts.kind) ? opts.kind : "none";
  const layoutId =
    MOTION_LAYOUTS.some((l) => l.id === opts.layout) ? opts.layout : MOTION_DEFAULTS.layout;
  const phaseRaw = Number(opts.phaseGroups ?? MOTION_DEFAULTS.phaseGroups);
  // Prefer divisors of 12 so patterns tile cleanly on the tunnel.
  const allowedPhases = [1, 2, 3, 4, 6];
  const phaseGroups = allowedPhases.includes(phaseRaw)
    ? phaseRaw
    : allowedPhases.reduce((best, n) =>
        Math.abs(n - phaseRaw) < Math.abs(best - phaseRaw) ? n : best,
      1);
  return {
    kind,
    layout: layoutId,
    tail: clamp(Number(opts.tail ?? MOTION_DEFAULTS.tail), 0.02, 2),
    cyclic: opts.cyclic !== false && opts.cyclic !== "false",
    repeats: clamp(Number(opts.repeats ?? MOTION_DEFAULTS.repeats), 0.25, 60),
    reverse: Boolean(opts.reverse),
    steps: Math.max(2, Math.round(Number(opts.steps ?? MOTION_DEFAULTS.steps))),
    phaseGroups,
  };
}

export function describeMotion(motion) {
  const m = normalizeMotion(motion);
  const meta = MOTION_CATALOG[m.kind];
  const layout = getMotionLayout(m.layout);
  if (!meta || m.kind === "none") return meta?.blurb || "No motion.";
  const bits = [meta.blurb, `Layout: ${layout.label}. ${layout.blurb}`];
  if (meta.params.includes("tail")) bits.push(`Tail ${m.tail.toFixed(2)}.`);
  if (meta.params.includes("repeats")) bits.push(`${m.repeats}× per loop.`);
  if (meta.params.includes("cyclic")) bits.push(m.cyclic ? "Cyclic." : "Non-cyclic.");
  if (meta.params.includes("steps")) bits.push(`${m.steps} steps.`);
  if (m.phaseGroups === 1) bits.push("Phase sync (all rings).");
  else bits.push(`Phase ×${m.phaseGroups} (ring i → set i%${m.phaseGroups}).`);
  return bits.join(" ");
}

export function describeMotionLayout(layoutId) {
  return getMotionLayout(layoutId)?.blurb || "";
}

function ringIncluded(ringIndex0, rings) {
  switch (rings) {
    case "left":
      return ringIndex0 < 6;
    case "right":
      return ringIndex0 >= 6;
    case "odd":
      return ringIndex0 % 2 === 0;
    case "even":
      return ringIndex0 % 2 === 1;
    case "center":
      return ringIndex0 >= 3 && ringIndex0 <= 8;
    case "outer":
      return ringIndex0 < 3 || ringIndex0 > 8;
    default:
      return true;
  }
}

function shouldFlipDirection(flip, ringIndex0) {
  switch (flip) {
    case "alternate":
      return ringIndex0 % 2 === 1;
    case "sides":
      return ringIndex0 >= 6;
    default:
      return false;
  }
}

function cfg(durationMs, repeats, segments = "all") {
  const c = {
    segments,
    start_time: 0,
    end_time: durationMs,
  };
  if (repeats != null) {
    c.repeat_num = repeats;
    c.repeat_start = 0;
    c.repeat_end = 1;
  }
  return c;
}

function brightnessFade() {
  return { linear: { start: 1, end: 0 } };
}

/**
 * Build snake_brightness effect(s) for one ring.
 */
export function motionEffects(
  motion,
  {
    ringIndex0 = 0,
    durationMs = 10_000,
    ringCount = 12,
  } = {},
) {
  const m = normalizeMotion(motion);
  if (m.kind === "none") return [];

  const layout = getMotionLayout(m.layout);
  if (!ringIncluded(ringIndex0, layout.rings || "all")) return [];

  // phaseGroups=1 → all rings same; =2 → alt A/B; =4 → A/B/C/D repeating ×3 on 12 rings
  const groups = Math.max(1, m.phaseGroups | 0);
  const phase = groups <= 1 ? 0 : (ringIndex0 % groups) / groups;
  const flip = shouldFlipDirection(layout.flip || "none", ringIndex0);
  const segment = layout.segment || "all";

  const effectCfg = cfg(durationMs, m.repeats, segment);
  const cyclic = m.cyclic;
  const tail = m.kind === "comet" ? Math.min(m.tail, 0.2) : m.tail;
  const repeats = m.kind === "comet" ? Math.max(m.repeats, 8) : m.repeats;
  effectCfg.repeat_num = repeats;

  /** @type {object} */
  let snake;

  if (m.kind === "chase" || m.kind === "chase-reverse" || m.kind === "comet") {
    const reverse = m.kind === "chase-reverse" || m.reverse || flip;
    snake = {
      head: {
        linear: {
          start: reverse ? phase + 1 : phase,
          end: reverse ? phase : phase + 1,
        },
      },
      tail_length: { const_value: { value: tail } },
      cyclic,
      mult_factor_decrease: brightnessFade(),
    };
  } else if (m.kind === "pulse") {
    snake = {
      head: {
        sin: {
          min: 0,
          max: 1,
          phase: flip ? phase + 0.5 : phase,
          repeats: 1,
        },
      },
      tail_length: { const_value: { value: tail } },
      cyclic,
      mult_factor_decrease: brightnessFade(),
    };
  } else if (m.kind === "steps") {
    snake = {
      head: {
        steps: {
          num_steps: m.steps,
          diff_per_step: flip ? -1 / m.steps : 1 / m.steps,
          first_step_value: phase,
        },
      },
      tail_length: { const_value: { value: tail } },
      cyclic,
      mult_factor_decrease: brightnessFade(),
    };
  } else if (m.kind === "slow-fast") {
    const start = flip ? phase + 1 : phase;
    const end = flip ? phase : phase + 1;
    snake = {
      head: {
        comb2: {
          f1: { sin: { min: 0, max: 1, phase, repeats: 1 } },
          amount1: 1,
          f2: { linear: { start, end } },
          amount2: 1,
        },
      },
      tail_length: { const_value: { value: tail } },
      cyclic: true,
      mult_factor_decrease: brightnessFade(),
    };
  } else if (m.kind === "fill") {
    snake = {
      head: {
        half: {
          f1: { linear: { start: phase, end: phase + 1 } },
          f2: { const_value: { value: phase + 1 } },
        },
      },
      tail_length: {
        half: {
          f1: { const_value: { value: 0.35 } },
          f2: { linear: { start: 0.35, end: 1.2 } },
        },
      },
      cyclic: false,
      mult_factor_decrease: brightnessFade(),
    };
  } else if (m.kind === "tail-breathe") {
    snake = {
      head: {
        sin: { min: 0, max: 1, phase: flip ? phase + 0.5 : phase, repeats: 1 },
      },
      tail_length: {
        half: {
          f1: { linear: { start: 0.25, end: 0.85 } },
          f2: { linear: { start: 0.85, end: 0.25 } },
        },
      },
      cyclic: true,
      mult_factor_decrease: brightnessFade(),
    };
  } else {
    return [];
  }

  return [
    {
      effect_config: effectCfg,
      snake_brightness: snake,
    },
  ];
}

/**
 * Append motion effects onto an existing SequencePerThing.
 */
export function applyMotion(sequence, motion, { durationMs = 10_000 } = {}) {
  const m = normalizeMotion(motion);
  const out = structuredClone(sequence);
  const ringKeys = Object.keys(out).sort((a, b) => {
    const na = Number(a.replace(/\D/g, "")) || 0;
    const nb = Number(b.replace(/\D/g, "")) || 0;
    return na - nb;
  });
  const ringCount = ringKeys.length || 12;

  for (let i = 0; i < ringKeys.length; i++) {
    const key = ringKeys[i];
    const fx = motionEffects(m, {
      ringIndex0: i,
      durationMs: out[key].duration_ms || durationMs,
      ringCount,
    });
    out[key].effects.push(...fx);
  }
  return out;
}

export function randomMotion() {
  const active = MOTION_KINDS.filter((k) => k !== "none");
  const kind =
    Math.random() < 0.1
      ? "none"
      : active[Math.floor(Math.random() * active.length)];
  if (kind === "none") return normalizeMotion({ kind: "none" });
  return normalizeMotion({
    kind,
    layout: MOTION_LAYOUTS[Math.floor(Math.random() * MOTION_LAYOUTS.length)].id,
    tail: 0.1 + Math.random() * 0.55,
    cyclic: Math.random() > 0.2,
    repeats: 1 + Math.floor(Math.random() * 10),
    reverse: Math.random() > 0.75,
    steps: 4 + Math.floor(Math.random() * 10),
    phaseGroups: [1, 2, 3, 4, 6][Math.floor(Math.random() * 5)],
  });
}
