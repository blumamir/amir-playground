import {
  resolveColorfulness,
  generatePalette,
  colorfulnessFromKind,
  retoneColors,
} from "./palette.js";
import {
  pickLayoutForScatter,
  pickSegmentForScatter,
  scatterBlurb,
} from "./scatter.js";
import { createRingSim, PIXELS_PER_RING, RING_COUNT } from "./ring-sim.js";
import {
  BEAT_KINDS,
  BEAT_CATALOG,
  BEAT_LAYOUTS,
  BEAT_DEFAULTS,
  beatBrightnessAt,
  describeBeat,
  getBeatLayout,
} from "./beat.js";

const KIND_COUNTS = { const: 1, 2: 2, 4: 4, 8: 8, colorful: 1 };
const TOTAL_RINGS = 12;
const DEFAULT_SEGMENTS = ["all", "centric", "updown", "arc", "ind", "rand"];
const DEFAULT_SEGMENT_INFO = {
  all: "Full 144-LED strip; position runs linearly through the tunnel.",
  centric: "Same angle on every sub-ring — colors form aligned radial wedges.",
  updown: "Like centric, but each sub-ring is rotated one step — a spiral.",
  arc: "Triangle-wave around each sub-ring — mirrored arc halves.",
  ind: "Whole concentric sub-rings as steps — colors stack by depth.",
  rand: "Fixed pseudo-random positions — speckled / scrambled bands.",
};

const DEFAULT_MOTION_KINDS = [
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
const DEFAULT_MOTION_CATALOG = {
  none: { id: "none", label: "none", blurb: "No motion — coloring stays static.", params: [] },
  chase: { id: "chase", label: "chase", blurb: "A bright head runs around the ring with a fading tail.", params: ["tail", "cyclic", "repeats"] },
  "chase-reverse": { id: "chase-reverse", label: "chase reverse", blurb: "Same as chase, traveling the opposite direction.", params: ["tail", "cyclic", "repeats"] },
  pulse: { id: "pulse", label: "pulse", blurb: "Snake head oscillates with a sine wave — back and forth energy.", params: ["tail", "cyclic", "repeats"] },
  comet: { id: "comet", label: "comet", blurb: "Short tail, fast passes — a tight comet streak.", params: ["tail", "cyclic", "repeats"] },
  steps: { id: "steps", label: "steps", blurb: "Head jumps in discrete steps around the ring.", params: ["tail", "cyclic", "repeats", "steps"] },
  "slow-fast": { id: "slow-fast", label: "slow / fast", blurb: "Mix of sine + linear head motion — speeds up and slows down.", params: ["tail", "cyclic", "repeats"] },
  fill: { id: "fill", label: "fill", blurb: "Head advances while the tail grows — a filling sweep.", params: ["cyclic", "repeats"] },
  "tail-breathe": { id: "tail-breathe", label: "tail breathe", blurb: "Head pulses while the tail length breathes in and out.", params: ["cyclic", "repeats"] },
};
const DEFAULT_MOTION_LAYOUTS = [
  {
    id: "sync-all",
    label: "sync · all map",
    blurb: "Same motion on every ring, segment map “all”.",
  },
];

let kind = "const";
/** Discrete dial options — first is always "random" (resolved on randomize). */
const COLORFULNESS_OPTIONS = [
  { id: "random", label: "random" },
  { id: "mono", label: "mono", value: 0.05 },
  { id: "analogous", label: "analogous", value: 0.22 },
  { id: "varied", label: "varied", value: 0.44 },
  { id: "rich", label: "rich", value: 0.66 },
  { id: "spectrum", label: "spectrum", value: 0.9 },
];
const SCATTER_OPTIONS = [
  { id: "random", label: "random" },
  { id: "blocks", label: "blocks" },
  { id: "regions", label: "regions" },
  { id: "stripes", label: "stripes" },
  { id: "speckled", label: "speckled" },
  { id: "chaos", label: "chaos" },
];
const VIVIDNESS_OPTIONS = [
  { id: "random", label: "random" },
  { id: "pastel", label: "pastel", value: 0.12 },
  { id: "soft", label: "soft", value: 0.38 },
  { id: "rich", label: "rich", value: 0.62 },
  { id: "vivid", label: "vivid", value: 0.9 },
];
const MOTION_PRESENCE_OPTIONS = [
  { id: "random", label: "random" },
  { id: "off", label: "off" },
  { id: "on", label: "on" },
];
const MOTION_SPEED_OPTIONS = [
  { id: "random", label: "random" },
  { id: "slow", label: "slow", value: 0.12 },
  { id: "medium", label: "medium", value: 0.4 },
  { id: "fast", label: "fast", value: 0.72 },
  { id: "blazing", label: "blazing", value: 0.95 },
];

/** Phase groups across 12 rings: 1=sync, 2=alt, 4=four sets ×3, … */
const MOTION_PHASE_OPTIONS = [
  { id: "random", label: "random" },
  { id: "1", label: "1 · sync", value: 1 },
  { id: "2", label: "2 · alt", value: 2 },
  { id: "3", label: "3", value: 3 },
  { id: "4", label: "4 · sets", value: 4 },
  { id: "6", label: "6", value: 6 },
];

const BEAT_PRESENCE_OPTIONS = [
  { id: "random", label: "random" },
  { id: "off", label: "off" },
  { id: "on", label: "on" },
];
/** Tempo is a property of the track, so there is no "random" here. */
const BEAT_BPM_OPTIONS = [
  { id: "90", label: "90", value: 90 },
  { id: "100", label: "100", value: 100 },
  { id: "110", label: "110", value: 110 },
  { id: "120", label: "120", value: 120 },
  { id: "128", label: "128", value: 128 },
  { id: "140", label: "140", value: 140 },
  { id: "174", label: "174", value: 174 },
];
const BEAT_DECAY_OPTIONS = [
  { id: "random", label: "random" },
  { id: "tight", label: "tight", value: 0.25 },
  { id: "punchy", label: "punchy", value: 0.5 },
  { id: "loose", label: "loose", value: 1 },
];
const BEAT_DEPTH_OPTIONS = [
  { id: "random", label: "random" },
  { id: "blackout", label: "blackout", value: 0 },
  { id: "deep", label: "deep", value: 0.12 },
  { id: "soft", label: "soft", value: 0.35 },
];
/** Must match the server's play duration — the sequence restarts after this. */
const SEQUENCE_MS = 10_000;

/** Selected dial ids (may be "random"). */
let colorfulnessChoice = "random";
let scatterChoice = "random";
let vividnessChoice = "random";
let motionPresenceChoice = "random";
let motionSpeedChoice = "random";
let motionPhaseChoice = "random";
let beatPresenceChoice = "random";
let beatBpmChoice = "120";
let beatDecayChoice = "random";
let beatDepthChoice = "random";

/** Last resolved values used for generation / preview. */
let colorfulness = 0.44;
/** Active scatter bucket id (blocks|regions|…). */
let scatter = "regions";
let vividness = 0.62;
let motionSpeed = 0.4;
let motionPhaseGroups = 1;
let layout = null;
let colorfulSegment = "all";
let layoutFilter = "";
/** @type {{hue:number,sat:number,val:number}[]} */
let colors = defaultColors(1);
/** @type {Record<string, object[]>} */
let layoutsByKind = {};
let colorfulSegments = DEFAULT_SEGMENTS;
let segmentInfo = DEFAULT_SEGMENT_INFO;
let segmentScatter = {
  all: "blocks",
  centric: "blocks",
  ind: "regions",
  updown: "stripes",
  arc: "stripes",
  rand: "chaos",
};

/** @type {Record<string, object>} */
let motionCatalog = { ...DEFAULT_MOTION_CATALOG };
let motionKinds = [...DEFAULT_MOTION_KINDS];
/** @type {object[]} */
let motionLayouts = [...DEFAULT_MOTION_LAYOUTS];
let motion = {
  kind: "none",
  layout: "sync-all",
  tail: 0.35,
  cyclic: true,
  repeats: 4,
  reverse: false,
  steps: 8,
  phaseGroups: 1,
};

let beatKinds = [...BEAT_KINDS];
let beatCatalog = { ...BEAT_CATALOG };
let beatLayouts = [...BEAT_LAYOUTS];
let beat = { ...BEAT_DEFAULTS };

const $ = (id) => document.getElementById(id);
const colorList = $("colorList");
const layoutsEl = $("layouts");
const layoutPanel = $("layoutPanel");
const layoutCount = $("layoutCount");
const layoutFilterEl = $("layoutFilter");
const segmentRow = $("segmentRow");
const segmentsEl = $("segments");
const motionsEl = $("motions");
const motionBlurbEl = $("motionBlurb");
const motionLayoutsEl = $("motionLayouts");
const motionLayoutPanel = $("motionLayoutPanel");
const motionLayoutBlurb = $("motionLayoutBlurb");
const motionParamsEl = $("motionParams");
const rangeEl = $("range");
const rangeField = $("rangeField");
const colorfulnessOptionsEl = $("colorfulnessOptions");
const colorfulnessHint = $("colorfulnessHint");
const colorfulnessViz = $("colorfulnessViz");
const scatterOptionsEl = $("scatterOptions");
const scatterHint = $("scatterHint");
const scatterViz = $("scatterViz");
const vividnessOptionsEl = $("vividnessOptions");
const vividnessHint = $("vividnessHint");
const vividnessViz = $("vividnessViz");
const motionPresenceOptionsEl = $("motionPresenceOptions");
const motionPresenceHint = $("motionPresenceHint");
const motionPresenceViz = $("motionPresenceViz");
const motionSpeedOptionsEl = $("motionSpeedOptions");
const motionSpeedHint = $("motionSpeedHint");
const motionSpeedViz = $("motionSpeedViz");
const motionPhaseOptionsEl = $("motionPhaseOptions");
const motionPhaseHint = $("motionPhaseHint");
const motionPhaseViz = $("motionPhaseViz");
const beatsEl = $("beats");
const beatBlurbEl = $("beatBlurb");
const beatLayoutsEl = $("beatLayouts");
const beatLayoutPanel = $("beatLayoutPanel");
const beatLayoutBlurb = $("beatLayoutBlurb");
const beatChipLabelEl = $("beatChipLabel");
const summaryBeat = $("summaryBeat");
const explainBlurb = $("explainBlurb");
const coloringChipLabelEl = $("coloringChipLabel");
const motionChipLabelEl = $("motionChipLabel");
const summarySwatches = $("summarySwatches");
const summaryBlurb = $("summaryBlurb");
const summaryMotion = $("summaryMotion");
const detailsHint = $("detailsHint");
const ringSimCanvas = $("ringSim");
const statusEl = $("status");
const servicesEl = $("services");
const sendBtn = $("send");
const randomBtn = $("random");
const randomPreviewBtn = $("randomPreview");

const ringSim = ringSimCanvas ? createRingSim(ringSimCanvas, { darkOff: true }) : null;
let simAnimId = 0;
let simStartMs = performance.now();
/** @type {AbortController | null} */
let playAbort = null;

function fixedOptions(options) {
  return options.filter((o) => o.id !== "random");
}

function optionById(options, id) {
  return options.find((o) => o.id === id) || options[0];
}

function nearestFixedOption(options, value) {
  return nearestOption(fixedOptions(options), value);
}

function nearestOption(options, value) {
  let best = options[0];
  let bestD = Infinity;
  const v = Number(value);
  for (const opt of options) {
    if (opt.value == null) continue;
    const d = Math.abs(opt.value - v);
    if (d < bestD) {
      bestD = d;
      best = opt;
    }
  }
  return best;
}

/** Resolve a dial choice to a concrete option (rolls if "random"). */
function resolveChoice(options, choiceId) {
  if (choiceId === "random") return pick(fixedOptions(options));
  return optionById(options, choiceId);
}

function choiceLabel(options, choiceId) {
  return optionById(options, choiceId).label;
}

function renderDialOptions(container, options, choiceId, onPick, resolvedId = null) {
  if (!container) return;
  container.innerHTML = "";
  const randomMode = choiceId === "random";
  for (const opt of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.opt = opt.id;
    btn.textContent = opt.label;

    const classes = ["dial-opt"];
    if (opt.id === "random") classes.push("dial-opt-random");

    if (randomMode) {
      // Mode: random — dashed "random" chip + mark what was actually rolled.
      if (opt.id === "random") classes.push("active");
      else if (resolvedId && opt.id === resolvedId) classes.push("rolled");
    } else if (opt.id === choiceId) {
      // Mode: locked user pick — solid selection (not random).
      classes.push("active", "locked");
    }

    btn.className = classes.join(" ");
    btn.title = randomMode
      ? opt.id === "random"
        ? "Random mode — rolls on randomize"
        : opt.id === resolvedId
          ? `Rolled: ${opt.label}`
          : opt.label
      : opt.id === choiceId
        ? `Locked: ${opt.label}`
        : opt.label;
    btn.addEventListener("click", () => onPick(opt));
    container.appendChild(btn);
  }
}

/** Concrete option id currently in effect (for marking rolled picks). */
function resolvedDialId(options, choiceId, valueOrId) {
  if (choiceId !== "random") return choiceId;
  if (valueOrId == null) return null;
  if (typeof valueOrId === "string") {
    const byId = optionById(options, valueOrId);
    if (byId && byId.id !== "random") return byId.id;
  }
  if (typeof valueOrId === "number") {
    return nearestFixedOption(options, valueOrId)?.id ?? null;
  }
  return null;
}

function motionSpeedLabel() {
  return choiceLabel(MOTION_SPEED_OPTIONS, motionSpeedChoice);
}

function motionPhaseLabel() {
  return choiceLabel(MOTION_PHASE_OPTIONS, motionPhaseChoice);
}

function motionPresenceLabel() {
  return choiceLabel(MOTION_PRESENCE_OPTIONS, motionPresenceChoice);
}

function resolvedPresenceId() {
  if (motionPresenceChoice !== "random") return motionPresenceChoice;
  return !motion.kind || motion.kind === "none" ? "off" : "on";
}

function applyMotionNone() {
  motion.kind = "none";
  motion.layout = "sync-all";
}

function pickMotionKind(includeNone) {
  const motionPool = motionKinds.filter((k) => k !== "none");
  if (!includeNone) {
    return pick(motionPool.length ? motionPool : motionKinds);
  }
  const pool = Math.random() < 0.12 ? motionKinds : motionPool.length ? motionPool : motionKinds;
  return pick(pool);
}

function applyPickedMotionKind(nextKind) {
  const layoutId = motionLayouts.length > 0 ? pick(motionLayouts).id : "sync-all";
  motion = {
    kind: nextKind,
    layout: nextKind === "none" ? "sync-all" : layoutId,
    tail: round2(rand(0.1, 0.65)),
    cyclic: Math.random() > 0.2,
    repeats: repeatsFromSpeed(motionSpeed),
    reverse: Math.random() > 0.7,
    steps: Math.round(rand(4, 14)),
    phaseGroups: motionPhaseGroups,
  };
}

function applyMotionPresence(choiceId) {
  motionPresenceChoice = choiceId;
  if (choiceId === "off") {
    applyMotionNone();
  } else if (choiceId === "on") {
    if (!motion.kind || motion.kind === "none") {
      resolveMotionSpeedForRandomize();
      resolveMotionPhaseForRandomize();
      applyPickedMotionKind(pickMotionKind(false));
    }
  } else if (choiceId === "random") {
    resolveMotionSpeedForRandomize();
    resolveMotionPhaseForRandomize();
    applyPickedMotionKind(pickMotionKind(true));
  }
  syncMotionPresenceUI();
}

function syncMotionPresenceUI() {
  const rolled = resolvedPresenceId();
  setDialViz(motionPresenceViz, motionPresenceChoice, rolled);
  const bar = document.querySelector(".layer-bar-motion");
  if (bar) bar.classList.toggle("is-off", rolled === "off");
  renderDialOptions(
    motionPresenceOptionsEl,
    MOTION_PRESENCE_OPTIONS,
    motionPresenceChoice,
    (picked) => {
      if (picked.id === "random") {
        applyMotionPresence("random");
        motionPresenceChoice = "random";
        syncMotionPresenceUI();
        renderMotions();
        previewAndSend();
        return;
      }
      applyMotionPresence(picked.id);
      renderMotions();
      previewAndSend();
    },
    rolled,
  );
  if (motionPresenceHint) {
    if (motionPresenceChoice === "random") {
      motionPresenceHint.textContent = rolled === "off"
        ? "random · rolled off — static until the next randomize"
        : "random · rolled on — motion included in randomize";
    } else if (motionPresenceChoice === "off") {
      motionPresenceHint.textContent = "locked · off — static coloring, skipped on randomize all";
    } else {
      motionPresenceHint.textContent = "locked · on — always pick a motion when randomizing";
    }
  }
}

/** Map 0..1 speed → repeats within the fixed play duration. */
function repeatsFromSpeed(speed) {
  const s = clamp01(speed);
  // ~0.8× (very slow) … ~18× (very fast)
  return round2(0.8 + s * 17.2);
}

function setDialViz(el, choiceId, resolvedId = null) {
  if (!el) return;
  // Preview chip shows the concrete look; dataset.mode tracks random vs locked.
  const shown = choiceId === "random" ? resolvedId || "random" : choiceId;
  el.dataset.choice = shown || "random";
  el.dataset.mode = choiceId === "random" ? "random" : "locked";
}

function syncMotionSpeedUI() {
  const repeats = repeatsFromSpeed(motionSpeed);
  const rolled = resolvedDialId(MOTION_SPEED_OPTIONS, motionSpeedChoice, motionSpeed);
  setDialViz(motionSpeedViz, motionSpeedChoice, rolled);
  renderDialOptions(
    motionSpeedOptionsEl,
    MOTION_SPEED_OPTIONS,
    motionSpeedChoice,
    (picked) => {
      if (picked.id === "random") {
        const rolled = resolveChoice(MOTION_SPEED_OPTIONS, "random");
        applyMotionSpeed(rolled.id);
        motionSpeedChoice = "random";
        syncMotionSpeedUI();
        renderMotionParams();
        previewAndSend();
        return;
      }
      applyMotionSpeed(picked.id);
      renderMotionParams();
      previewAndSend();
    },
    rolled,
  );
  if (motionSpeedHint) {
    const bit =
      motionSpeedChoice === "random"
        ? rolled
          ? `random · rolled ${choiceLabel(MOTION_SPEED_OPTIONS, rolled)} · ≈ ${repeats}× per loop`
          : "random · rolls on randomize"
        : `locked · ${motionSpeedLabel()} · ≈ ${repeats}× per loop`;
    motionSpeedHint.textContent = bit;
  }
}

function syncMotionPhaseUI() {
  const rolled = resolvedDialId(MOTION_PHASE_OPTIONS, motionPhaseChoice, motionPhaseGroups);
  setDialViz(motionPhaseViz, motionPhaseChoice, rolled);
  renderDialOptions(
    motionPhaseOptionsEl,
    MOTION_PHASE_OPTIONS,
    motionPhaseChoice,
    (picked) => {
      if (picked.id === "random") {
        const rolled = resolveChoice(MOTION_PHASE_OPTIONS, "random");
        applyMotionPhase(rolled.id);
        motionPhaseChoice = "random";
        syncMotionPhaseUI();
        previewAndSend();
        return;
      }
      applyMotionPhase(picked.id);
      previewAndSend();
    },
    rolled,
  );
  if (motionPhaseHint) {
    const g = motionPhaseGroups;
    const bit =
      motionPhaseChoice === "random"
        ? rolled
          ? `random · rolled ${choiceLabel(MOTION_PHASE_OPTIONS, rolled)}`
          : "random · rolls on randomize"
        : g === 1
          ? "locked · all 12 rings share one phase"
          : `locked · ${g} phases · pattern repeats ${12 / g}×`;
    motionPhaseHint.textContent = bit;
  }
}

function applyMotionSpeed(choiceOrValue) {
  if (choiceOrValue === "random" || choiceOrValue?.id === "random") {
    motionSpeedChoice = "random";
    syncMotionSpeedUI();
    return;
  }
  let opt;
  if (typeof choiceOrValue === "string") {
    opt = optionById(MOTION_SPEED_OPTIONS, choiceOrValue);
  } else if (typeof choiceOrValue === "number") {
    opt = nearestFixedOption(MOTION_SPEED_OPTIONS, choiceOrValue);
  } else {
    opt = choiceOrValue;
  }
  motionSpeedChoice = opt.id;
  motionSpeed = opt.value;
  motion.repeats = repeatsFromSpeed(motionSpeed);
  syncMotionSpeedUI();
}

function applyMotionPhase(choiceOrValue) {
  if (choiceOrValue === "random" || choiceOrValue?.id === "random") {
    motionPhaseChoice = "random";
    syncMotionPhaseUI();
    return;
  }
  let opt;
  if (typeof choiceOrValue === "string" || typeof choiceOrValue === "number") {
    opt = optionById(MOTION_PHASE_OPTIONS, String(choiceOrValue));
    if (!opt || opt.id === "random") {
      const n = Number(choiceOrValue);
      opt = MOTION_PHASE_OPTIONS.filter((o) => o.id !== "random").reduce((best, o) =>
        Math.abs(o.value - n) < Math.abs(best.value - n) ? o : best,
      );
    }
  } else {
    opt = choiceOrValue;
  }
  motionPhaseChoice = opt.id;
  motionPhaseGroups = opt.value;
  motion.phaseGroups = motionPhaseGroups;
  syncMotionPhaseUI();
}

/** Roll speed if choice is random; otherwise keep fixed. */
function resolveMotionSpeedForRandomize() {
  const opt = resolveChoice(MOTION_SPEED_OPTIONS, motionSpeedChoice);
  motionSpeed = opt.value;
  motion.repeats = repeatsFromSpeed(motionSpeed);
  syncMotionSpeedUI();
}

/** Roll phase groups if choice is random; otherwise keep fixed. */
function resolveMotionPhaseForRandomize() {
  const opt = resolveChoice(MOTION_PHASE_OPTIONS, motionPhaseChoice);
  motionPhaseGroups = opt.value;
  motion.phaseGroups = motionPhaseGroups;
  syncMotionPhaseUI();
}

/* ── beat layer ── */

function beatHasKind() {
  return Boolean(beat.kind) && beat.kind !== "none";
}

function resolvedBeatPresenceId() {
  if (beatPresenceChoice !== "random") return beatPresenceChoice;
  return beatHasKind() ? "on" : "off";
}

function applyBeatNone() {
  beat.kind = "none";
}

function pickBeatKind(includeNone) {
  const pool = beatKinds.filter((k) => k !== "none");
  if (!includeNone) return pick(pool.length ? pool : beatKinds);
  return pick(Math.random() < 0.12 || !pool.length ? beatKinds : pool);
}

function applyPickedBeatKind(nextKind) {
  // Unison most of the time — spread variants are the spice.
  const layoutId = Math.random() < 0.5 ? "unison" : pick(beatLayouts).id;
  beat = { ...beat, kind: nextKind, layout: layoutId };
}

/** Roll decay/depth if their dial is random; BPM always stays as chosen. */
function resolveBeatDialsForRandomize() {
  beat.decay = resolveChoice(BEAT_DECAY_OPTIONS, beatDecayChoice).value;
  beat.depth = resolveChoice(BEAT_DEPTH_OPTIONS, beatDepthChoice).value;
  beat.bpm = optionById(BEAT_BPM_OPTIONS, beatBpmChoice).value;
}

function applyBeatPresence(choiceId) {
  beatPresenceChoice = choiceId;
  if (choiceId === "off") {
    applyBeatNone();
  } else if (choiceId === "on") {
    if (!beatHasKind()) {
      resolveBeatDialsForRandomize();
      applyPickedBeatKind(pickBeatKind(false));
    }
  } else {
    resolveBeatDialsForRandomize();
    applyPickedBeatKind(pickBeatKind(true));
  }
  syncBeatDialsUI();
}

/** Shared renderer for a beat dial: options, viz chip, hint text. */
function syncBeatDial({ field, options, choice, rolledId, hint, onPick }) {
  setDialViz($(`${field}Viz`), choice, rolledId);
  renderDialOptions($(`${field}Options`), options, choice, onPick, rolledId);
  const hintEl = $(`${field}Hint`);
  if (hintEl) hintEl.textContent = hint;
}

function syncBeatDialsUI() {
  const presence = resolvedBeatPresenceId();
  const bar = document.querySelector(".layer-bar-beat");
  if (bar) bar.classList.toggle("is-off", presence === "off");

  syncBeatDial({
    field: "beatPresence",
    options: BEAT_PRESENCE_OPTIONS,
    choice: beatPresenceChoice,
    rolledId: presence,
    hint:
      beatPresenceChoice === "random"
        ? presence === "off"
          ? "random · rolled off — steady until the next randomize"
          : "random · rolled on — beat included in randomize"
        : beatPresenceChoice === "off"
          ? "locked · off — steady brightness, skipped on randomize all"
          : "locked · on — always pick a beat pattern when randomizing",
    onPick: (picked) => {
      applyBeatPresence(picked.id);
      renderBeats();
      previewAndSend();
    },
  });

  const beatMs = Math.round(60_000 / beat.bpm);
  syncBeatDial({
    field: "beatBpm",
    options: BEAT_BPM_OPTIONS,
    choice: beatBpmChoice,
    rolledId: beatBpmChoice,
    hint: `locked · ${beat.bpm} BPM · one beat every ${beatMs} ms`,
    onPick: (picked) => {
      beatBpmChoice = picked.id;
      beat.bpm = picked.value;
      syncBeatDialsUI();
      previewAndSend();
    },
  });

  const decayRolled = resolvedDialId(BEAT_DECAY_OPTIONS, beatDecayChoice, beat.decay);
  syncBeatDial({
    field: "beatDecay",
    options: BEAT_DECAY_OPTIONS,
    choice: beatDecayChoice,
    rolledId: decayRolled,
    hint:
      beatDecayChoice === "random"
        ? `random · rolled ${choiceLabel(BEAT_DECAY_OPTIONS, decayRolled)}`
        : `locked · ${choiceLabel(BEAT_DECAY_OPTIONS, beatDecayChoice)} · fades over ${Math.round(beat.decay * 100)}% of each hit`,
    onPick: (picked) => {
      const opt = picked.id === "random" ? resolveChoice(BEAT_DECAY_OPTIONS, "random") : picked;
      beatDecayChoice = picked.id;
      beat.decay = opt.value;
      syncBeatDialsUI();
      previewAndSend();
    },
  });

  const depthRolled = resolvedDialId(BEAT_DEPTH_OPTIONS, beatDepthChoice, beat.depth);
  syncBeatDial({
    field: "beatDepth",
    options: BEAT_DEPTH_OPTIONS,
    choice: beatDepthChoice,
    rolledId: depthRolled,
    hint:
      beatDepthChoice === "random"
        ? `random · rolled ${choiceLabel(BEAT_DEPTH_OPTIONS, depthRolled)}`
        : `locked · ${choiceLabel(BEAT_DEPTH_OPTIONS, beatDepthChoice)} · floor ${beat.depth.toFixed(2)} between hits`,
    onPick: (picked) => {
      const opt = picked.id === "random" ? resolveChoice(BEAT_DEPTH_OPTIONS, "random") : picked;
      beatDepthChoice = picked.id;
      beat.depth = opt.value;
      syncBeatDialsUI();
      previewAndSend();
    },
  });
}

function beatMeta() {
  return beatCatalog[beat.kind] || { label: beat.kind, blurb: "" };
}

function beatChipLabel() {
  const presenceBit = choiceLabel(BEAT_PRESENCE_OPTIONS, beatPresenceChoice);
  if (!beatHasKind()) return `beat · none · ${presenceBit}`;
  const decayBit = resolvedDialId(BEAT_DECAY_OPTIONS, beatDecayChoice, beat.decay);
  const depthBit = resolvedDialId(BEAT_DEPTH_OPTIONS, beatDepthChoice, beat.depth);
  return `beat · ${beatMeta().label} · ${beat.bpm} bpm · ${decayBit} · ${depthBit} · ${getBeatLayout(beat.layout).label}`;
}

function renderBeats() {
  if (!beatsEl) return;
  beatsEl.innerHTML = "";
  for (const id of beatKinds) {
    const meta = beatCatalog[id] || { label: id };
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "motion beat" + (id === beat.kind ? " active" : "");
    btn.textContent = meta.label || id;
    btn.title = meta.blurb || id;
    btn.addEventListener("click", () => {
      beat.kind = id;
      if (id === "none") beatPresenceChoice = "off";
      else if (beatPresenceChoice === "off") beatPresenceChoice = "on";
      syncBeatDialsUI();
      renderBeats();
      previewAndSend();
    });
    beatsEl.appendChild(btn);
  }
  renderBeatLayouts();
  updateBeatBlurb();
}

function renderBeatLayouts() {
  if (!beatLayoutsEl) return;
  const show = beatHasKind();
  if (beatLayoutPanel) beatLayoutPanel.hidden = !show;
  beatLayoutsEl.innerHTML = "";
  if (!beatLayouts.some((l) => l.id === beat.layout)) beat.layout = beatLayouts[0]?.id || "unison";
  if (beatLayoutBlurb) beatLayoutBlurb.textContent = show ? getBeatLayout(beat.layout).blurb : "";
  if (!show) return;
  for (const l of beatLayouts) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "layout" + (l.id === beat.layout ? " active" : "");
    btn.textContent = l.label;
    btn.title = l.blurb || l.label;
    btn.addEventListener("click", () => {
      beat.layout = l.id;
      renderBeatLayouts();
      previewAndSend();
    });
    beatLayoutsEl.appendChild(btn);
  }
}

function updateBeatBlurb() {
  const text = describeBeat(beat);
  if (beatBlurbEl) beatBlurbEl.textContent = text;
  if (summaryBeat) summaryBeat.textContent = `Beat: ${beatMeta().label || beat.kind} — ${text}`;
  if (beatChipLabelEl) beatChipLabelEl.textContent = beatChipLabel();
}

function randomizeBeat() {
  if (beatPresenceChoice === "off") {
    applyBeatNone();
  } else {
    resolveBeatDialsForRandomize();
    applyPickedBeatKind(pickBeatKind(beatPresenceChoice === "random"));
  }
  syncBeatDialsUI();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

/** Random vivid-ish HSV so the result is visible on LEDs. */
function randomColor() {
  return {
    hue: round2(Math.random()),
    sat: round2(rand(0.55, 1)),
    val: round2(rand(0.65, 1)),
  };
}

function defaultColors(n) {
  return Array.from({ length: n }, (_, i) => ({
    hue: n === 1 ? 0 : i / n,
    sat: 1,
    val: 1,
  }));
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function wrapHue(h) {
  return ((h % 1) + 1) % 1;
}

function rotate(arr, by) {
  const n = arr.length;
  const k = ((by % n) + n) % n;
  return arr.slice(k).concat(arr.slice(0, k));
}

function hsvToRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  return {
    r: Math.round(f(5) * 255),
    g: Math.round(f(3) * 255),
    b: Math.round(f(1) * 255),
  };
}

function hsvToCss(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return `rgb(${r}, ${g}, ${b})`;
}

function hsvToHex(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function hexToHsv(hex) {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  const s = max === 0 ? 0 : d / max;
  return { hue: h, sat: s, val: max };
}

function ringGroupIndex(ringIndex0, n) {
  return Math.min(n - 1, Math.floor((ringIndex0 * n) / TOTAL_RINGS));
}

function colorIndexForRing(ringIndex0, assign, n) {
  switch (assign) {
    case "sides":
      return ringGroupIndex(ringIndex0, n);
    case "alternate":
      return ringIndex0 % n;
    case "odd-even":
      return ringIndex0 % 2;
    case "center-outer":
      return ringIndex0 >= 3 && ringIndex0 <= 8 ? 1 : 0;
    case "mirror": {
      const pair = Math.min(ringIndex0, TOTAL_RINGS - 1 - ringIndex0);
      return pair % n;
    }
    case "from-ends": {
      const dist = Math.min(ringIndex0, TOTAL_RINGS - 1 - ringIndex0);
      return Math.min(n - 1, Math.floor((dist * n) / (TOTAL_RINGS / 2)));
    }
    case "pairs":
      return Math.floor(ringIndex0 / 2) % n;
    default:
      return ringGroupIndex(ringIndex0, n);
  }
}

function ensureColorCount() {
  const n = KIND_COUNTS[kind];
  if (colors.length === n) return;
  if (colors.length < n) {
    colors = [...colors, ...defaultColors(n).slice(colors.length)];
  } else {
    colors = colors.slice(0, n);
  }
}

function availableLayouts() {
  return layoutsByKind[kind] || [];
}

function currentLayoutMeta() {
  if (kind === "colorful" && (scatter === "blocks" || scatter === "regions")) {
    return (
      solidRingLayoutsForBucket(scatter).find((l) => l.id === layout) || null
    );
  }
  return availableLayouts().find((l) => l.id === layout) || null;
}

function currentMotionLayoutMeta() {
  return motionLayouts.find((l) => l.id === motion.layout) || null;
}

function cssStops(colorList) {
  if (colorList.length === 1) {
    return hsvToCss(colorList[0].hue, colorList[0].sat, colorList[0].val);
  }
  const parts = colorList.map((c, i) => {
    const start = (i / colorList.length) * 100;
    const end = ((i + 1) / colorList.length) * 100;
    const css = hsvToCss(c.hue, c.sat, c.val);
    return `${css} ${start}%, ${css} ${end}%`;
  });
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

function stripeStops(c0, c1, flipped) {
  const a = flipped ? c1 : c0;
  const b = flipped ? c0 : c1;
  const ca = hsvToCss(a.hue, a.sat, a.val);
  const cb = hsvToCss(b.hue, b.sat, b.val);
  return `repeating-linear-gradient(90deg, ${ca} 0 4px, ${cb} 4px 12px)`;
}

/** Match server colorPairForRing for tunnel preview. */
function colorPairForPreview(ringIndex0, pairAssign = "sides") {
  const n = colors.length;
  if (n <= 2) return [colors[0], colors[1] || colors[0]];
  const numPairs = Math.floor(n / 2);
  let pairIdx;
  if (pairAssign === "alternate") pairIdx = ringIndex0 % numPairs;
  else if (pairAssign === "pairs") pairIdx = Math.floor(ringIndex0 / 2) % numPairs;
  else pairIdx = ringGroupIndex(ringIndex0, numPairs);
  const i = pairIdx * 2;
  return [colors[i], colors[i + 1]];
}

function bandStops(colorList) {
  return cssStops(colorList);
}

function colorfulStops() {
  const c = colors[0];
  const range = Number(rangeEl.value);
  const half = range / 2;
  const samples = 16;
  const stops = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const h = wrapHue(c.hue - half + t * range);
    const pct = (t * 100).toFixed(1);
    stops.push(`${hsvToCss(h, c.sat, c.val)} ${pct}%`);
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** Spectrum hue for one solid ring (blocks/regions). */
function spectrumRingColor(ringIndex0, meta) {
  const c = colors[0];
  const range = Number(rangeEl.value);
  const half = range / 2;
  const assign = meta?.assign || (scatter === "regions" ? "pairs" : "sides");
  const nGroups =
    assign === "pairs" || assign === "mirror"
      ? Math.floor(TOTAL_RINGS / 2)
      : assign === "from-ends"
        ? Math.floor(TOTAL_RINGS / 2)
        : 2;
  const gi = colorIndexForRing(ringIndex0, assign, nGroups);
  const t = nGroups <= 1 ? 0.5 : gi / (nGroups - 1);
  return {
    hue: wrapHue(c.hue - half + t * range),
    sat: c.sat,
    val: c.val,
  };
}

function ringInPrimary(ringIndex0, assign) {
  switch (assign) {
    case "center-outer":
      return ringIndex0 >= 3 && ringIndex0 <= 8;
    case "odd-even":
      return ringIndex0 % 2 === 0;
    default:
      return ringIndex0 < 6;
  }
}

function shouldFlip(flip, ringIndex0) {
  switch (flip) {
    case "alternate":
      return ringIndex0 % 2 === 1;
    case "sides":
      return ringIndex0 >= 6;
    case "odd":
      return ringIndex0 % 2 === 0;
    default:
      return false;
  }
}

/** Background CSS for one ring row in the tunnel diagram. */
function ringStripCss(ringIndex0, meta) {
  if (kind === "const") {
    return cssStops([colors[0]]);
  }
  if (kind === "colorful") {
    if (scatter === "blocks" || scatter === "regions") {
      return cssStops([spectrumRingColor(ringIndex0, meta)]);
    }
    return colorfulStops();
  }
  if (!meta) return "#333";

  if (meta.mode === "around") {
    let used = colors;
    if (meta.twist === "forward") used = rotate(colors, ringIndex0);
    else if (meta.twist === "reverse") used = rotate(colors, -ringIndex0);
    return bandStops(used);
  }

  if (meta.mode === "rings") {
    const ci = colorIndexForRing(ringIndex0, meta.assign, colors.length);
    return cssStops([colors[ci]]);
  }

  if (meta.mode === "b1b2") {
    const pair = colorPairForPreview(ringIndex0, meta.pairAssign || "sides");
    return stripeStops(pair[0], pair[1], shouldFlip(meta.flip, ringIndex0));
  }

  if (meta.mode === "hybrid") {
    if (ringInPrimary(ringIndex0, meta.assign)) {
      return bandStops(colors);
    }
    return cssStops([colors[1]]);
  }

  return cssStops(colors);
}

function coloringChipLabel() {
  const tag = choiceLabel(COLORFULNESS_OPTIONS, colorfulnessChoice);
  const scat = choiceLabel(SCATTER_OPTIONS, scatterChoice);
  const viv = choiceLabel(VIVIDNESS_OPTIONS, vividnessChoice);
  if (kind === "colorful") {
    return `coloring · ${tag} · ${scat} · ${viv} · ${colorfulSegment}`;
  }
  const meta = currentLayoutMeta();
  if (kind === "const") return `coloring · ${tag} · ${viv}`;
  if (meta) return `coloring · ${tag} · ${scat} · ${viv} · ${meta.label}`;
  return `coloring · ${tag} · ${scat} · ${viv}`;
}

function motionChipLabel() {
  const mMeta = motionMeta();
  const layoutMeta = currentMotionLayoutMeta();
  const presenceBit = motionPresenceLabel();
  const speedBit = motionSpeedLabel();
  const phaseBit = motionPhaseLabel();
  if (motion.kind === "none") return `motion · none · ${presenceBit}`;
  const layoutBit = layoutMeta ? layoutMeta.label : motion.layout;
  return `motion · ${mMeta.label || motion.kind} · ${presenceBit} · ${speedBit} · ${phaseBit} · ${layoutBit}`;
}

/** HSV for one LED (ring 0..11, pixel 0..143). */
function ledColorHsv(ringIndex0, pixelIndex) {
  const meta = currentLayoutMeta();
  const t = pixelIndex / PIXELS_PER_RING;

  if (kind === "const") return colors[0];

  if (kind === "colorful") {
    if (scatter === "blocks" || scatter === "regions") {
      return spectrumRingColor(ringIndex0, meta);
    }
    const c = colors[0];
    const range = Number(rangeEl.value);
    const half = range / 2;
    return {
      hue: wrapHue(c.hue - half + t * range),
      sat: c.sat,
      val: c.val,
    };
  }

  if (!meta) return colors[0];

  if (meta.mode === "rings") {
    const ci = colorIndexForRing(ringIndex0, meta.assign, colors.length);
    return colors[ci] || colors[0];
  }

  if (meta.mode === "around") {
    let used = colors;
    if (meta.twist === "forward") used = rotate(colors, ringIndex0);
    else if (meta.twist === "reverse") used = rotate(colors, -ringIndex0);
    const idx = Math.min(used.length - 1, Math.floor(t * used.length));
    return used[idx];
  }

  if (meta.mode === "b1b2") {
    const pair = colorPairForPreview(ringIndex0, meta.pairAssign || "sides");
    const flipped = shouldFlip(meta.flip, ringIndex0);
    // b1/b2 comb: every 3rd LED is the secondary color
    const isB1 = pixelIndex % 3 === 0;
    const a = flipped ? pair[1] : pair[0];
    const b = flipped ? pair[0] : pair[1];
    return isB1 ? b : a;
  }

  if (meta.mode === "hybrid") {
    if (ringInPrimary(ringIndex0, meta.assign)) {
      const idx = Math.min(colors.length - 1, Math.floor(t * colors.length));
      return colors[idx];
    }
    return colors[1] || colors[0];
  }

  return colors[0];
}

/** Motion head position 0..1 for a ring at time tSec. */
function motionHeadPos(ringIndex0, tSec) {
  const groups = Math.max(1, motion.phaseGroups | 0);
  const phase = groups <= 1 ? 0 : (ringIndex0 % groups) / groups;
  const repeats = Math.max(0.25, Number(motion.repeats) || 4);
  const loopSec = 8; // preview loop length
  let u = (tSec / loopSec) * repeats;

  const layoutMeta = currentMotionLayoutMeta();
  const flip =
    layoutMeta?.flip === "alternate"
      ? ringIndex0 % 2 === 1
      : layoutMeta?.flip === "sides"
        ? ringIndex0 >= 6
        : false;
  const reverse =
    motion.kind === "chase-reverse" || motion.reverse || flip;

  if (motion.kind === "pulse" || motion.kind === "tail-breathe") {
    const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * (u + (flip ? 0.5 : 0)));
    return (wave + phase) % 1;
  }
  if (motion.kind === "steps") {
    const steps = Math.max(2, motion.steps | 0);
    const stepped = Math.floor(((u % 1) + 1) % 1 * steps) / steps;
    return reverse ? (1 - stepped + phase) % 1 : (stepped + phase) % 1;
  }
  if (reverse) u = -u;
  return ((u + phase) % 1 + 1) % 1;
}

/** Brightness 0..1 for one LED under current motion. */
function motionBrightness(ringIndex0, pixelIndex, tSec) {
  if (!motion.kind || motion.kind === "none") return 1;

  const layoutMeta = currentMotionLayoutMeta();
  const rings = layoutMeta?.rings || "all";
  if (rings === "left" && ringIndex0 >= 6) return 0.08;
  if (rings === "right" && ringIndex0 < 6) return 0.08;
  if (rings === "odd" && ringIndex0 % 2 === 1) return 0.08;
  if (rings === "even" && ringIndex0 % 2 === 0) return 0.08;
  if (rings === "center" && (ringIndex0 < 3 || ringIndex0 > 8)) return 0.08;
  if (rings === "outer" && ringIndex0 >= 3 && ringIndex0 <= 8) return 0.08;

  const head = motionHeadPos(ringIndex0, tSec);
  const pos = pixelIndex / PIXELS_PER_RING;
  let d = (head - pos + 1) % 1;
  let tail = Number(motion.tail) || 0.35;
  if (motion.kind === "comet") tail = Math.min(tail, 0.2);
  if (motion.kind === "fill") {
    // growing fill: lit from 0 toward head
    const filled = head;
    if (pos <= filled) return 0.35 + 0.65 * (pos / Math.max(filled, 0.001));
    return 0;
  }
  if (d > tail) return 0;
  return 1 - d / tail;
}

function rgbCssScaled(h, s, v, brightness) {
  const { r, g, b } = hsvToRgb(h, s, v * clamp01(brightness));
  return `rgb(${r},${g},${b})`;
}

/** Build per-ring LED color arrays for the clock-face simulator. */
function buildSimColors(tSec) {
  /** @type {Map<number, string[]>} */
  const map = new Map();
  const hasMotion = motion.kind && motion.kind !== "none";
  const hasBeat = beatHasKind();
  // Beat runs on the real sequence clock so the tempo in the preview is exact.
  const seqMs = (tSec * 1000) % SEQUENCE_MS;
  for (let ring = 0; ring < TOTAL_RINGS; ring++) {
    const arr = new Array(PIXELS_PER_RING);
    const beatBri = hasBeat ? beatBrightnessAt(beat, ring, seqMs) : 1;
    for (let p = 0; p < PIXELS_PER_RING; p++) {
      const c = ledColorHsv(ring, p);
      const bri = (hasMotion ? motionBrightness(ring, p, tSec) : 1) * beatBri;
      // When no motion, still show all LEDs; when motion, darkOff hides bri≈0
      arr[p] = rgbCssScaled(c.hue, c.sat, c.val, bri);
    }
    map.set(ring + 1, arr);
  }
  return map;
}

function paintRingSim(tSec = (performance.now() - simStartMs) / 1000) {
  if (!ringSim) return;
  ringSim.setColors(buildSimColors(tSec));
}

function startSimLoop() {
  if (!ringSim) return;
  cancelAnimationFrame(simAnimId);
  const tick = () => {
    try {
      paintRingSim();
    } catch (err) {
      console.error("ring sim paint failed", err);
    }
    simAnimId = requestAnimationFrame(tick);
  };
  simAnimId = requestAnimationFrame(tick);
}

function updateExplain() {
  const meta = currentLayoutMeta();
  let blurb = "";

  if (kind === "const") {
    blurb = "One solid color on every LED of every ring.";
  } else if (kind === "colorful") {
    if (scatter === "blocks" || scatter === "regions") {
      blurb =
        `Spectrum across whole rings (${scatter}) — one solid hue per contiguous group` +
        (meta ? ` · ${meta.label}` : "") +
        ` (range ${Number(rangeEl.value).toFixed(2)}).`;
    } else {
      blurb =
        `Continuous hue band within each ring (range ${Number(rangeEl.value).toFixed(2)}). ` +
        (segmentInfo[colorfulSegment] || "");
    }
  } else if (meta) {
    const resolved = resolveColorfulness(colorfulness);
    const spanBit =
      resolved.span != null
        ? ` Hue span ≈ ${resolved.span.toFixed(2)} (closer = more related).`
        : "";
    blurb = (meta.blurb || meta.label || "") + spanBit;
  } else {
    blurb = "Pick a layout to see what it does.";
  }

  if (explainBlurb) explainBlurb.textContent = blurb;
  if (summaryBlurb) summaryBlurb.textContent = blurb;

  if (coloringChipLabelEl) coloringChipLabelEl.textContent = coloringChipLabel();
  if (motionChipLabelEl) motionChipLabelEl.textContent = motionChipLabel();

  summarySwatches.innerHTML = "";
  for (const c of colors) {
    const d = document.createElement("span");
    d.className = "swatch-dot";
    d.style.background = hsvToCss(c.hue, c.sat, c.val);
    d.title = `h ${c.hue.toFixed(2)}  s ${c.sat.toFixed(2)}  v ${c.val.toFixed(2)}`;
    summarySwatches.appendChild(d);
  }

  updateMotionBlurb();
  updateMotionLayoutBlurb();
  updateBeatBlurb();
  paintRingSim();

  if (detailsHint) {
    detailsHint.textContent = `${coloringChipLabel()} · ${motionChipLabel()} · ${beatChipLabel()}`;
  }
}

function renderLayouts() {
  const list =
    kind === "colorful" && (scatter === "blocks" || scatter === "regions")
      ? solidRingLayoutsForBucket(scatter)
      : availableLayouts();
  const q = layoutFilter.trim().toLowerCase();
  const filtered = q
    ? list.filter(
        (l) =>
          l.label.toLowerCase().includes(q) ||
          (l.group || "").includes(q) ||
          (l.blurb || "").toLowerCase().includes(q),
      )
    : list;

  layoutPanel.hidden = list.length === 0;
  layoutsEl.innerHTML = "";

  if (list.length === 0) {
    if (kind !== "colorful" || (scatter !== "blocks" && scatter !== "regions")) {
      layout = null;
    }
    layoutCount.textContent = "";
    return;
  }

  if (!list.some((l) => l.id === layout)) {
    layout = list[0].id;
  }

  layoutCount.textContent = `${filtered.length}/${list.length} layouts`;

  const groups = new Map();
  for (const l of filtered) {
    const g = l.group || "layouts";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(l);
  }

  for (const [group, items] of groups) {
    const head = document.createElement("div");
    head.className = "layout-group";
    head.textContent = group;
    layoutsEl.appendChild(head);
    for (const l of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "layout" + (l.id === layout ? " active" : "");
      btn.dataset.layout = l.id;
      btn.textContent = l.label.replace(/^[a-z]+ · /, "");
      btn.title = l.blurb || l.label;
      btn.addEventListener("click", () => {
        layout = l.id;
        if (l.scatterBucket) {
          scatterChoice = l.scatterBucket;
          scatter = l.scatterBucket;
          syncScatterUI();
        }
        renderLayouts();
        previewAndSend();
      });
      layoutsEl.appendChild(btn);
    }
  }
}

function renderSegments() {
  const show =
    kind === "colorful" && scatter !== "blocks" && scatter !== "regions";
  segmentRow.hidden = !show;
  segmentsEl.innerHTML = "";
  if (!show) return;
  for (const seg of colorfulSegments) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "segment" + (seg === colorfulSegment ? " active" : "");
    btn.textContent = seg;
    btn.title = segmentInfo[seg] || seg;
    btn.addEventListener("click", () => {
      colorfulSegment = seg;
      if (segmentScatter[seg]) {
        scatterChoice = segmentScatter[seg];
        scatter = segmentScatter[seg];
        syncScatterUI();
      }
      renderSegments();
      previewAndSend();
    });
    segmentsEl.appendChild(btn);
  }
}

function motionMeta() {
  return motionCatalog[motion.kind] || { label: motion.kind, blurb: "", params: [] };
}

function renderMotions() {
  motionsEl.innerHTML = "";
  for (const id of motionKinds) {
    const meta = motionCatalog[id] || { label: id };
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "motion" + (id === motion.kind ? " active" : "");
    btn.textContent = meta.label || id;
    btn.title = meta.blurb || id;
    btn.addEventListener("click", () => {
      motion.kind = id;
      if (id === "none") {
        motionPresenceChoice = "off";
        motion.layout = "sync-all";
      } else if (motionPresenceChoice === "off") {
        motionPresenceChoice = "on";
      }
      syncMotionPresenceUI();
      renderMotions();
      renderMotionLayouts();
      renderMotionParams();
      previewAndSend();
    });
    motionsEl.appendChild(btn);
  }
  renderMotionLayouts();
  renderMotionParams();
  updateMotionBlurb();
}

function renderMotionLayouts() {
  const list = motionLayouts;
  const show = motion.kind !== "none" && list.length > 0;
  if (motionLayoutPanel) motionLayoutPanel.hidden = !show;
  motionLayoutsEl.innerHTML = "";

  if (!list.length) {
    motion.layout = "sync-all";
    updateMotionLayoutBlurb();
    return;
  }

  if (!list.some((l) => l.id === motion.layout)) {
    motion.layout = list[0].id;
  }

  if (!show) {
    updateMotionLayoutBlurb();
    return;
  }

  for (const l of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "layout" + (l.id === motion.layout ? " active" : "");
    btn.dataset.motionLayout = l.id;
    btn.textContent = l.label;
    btn.title = l.blurb || l.label;
    btn.addEventListener("click", () => {
      motion.layout = l.id;
      renderMotionLayouts();
      previewAndSend();
    });
    motionLayoutsEl.appendChild(btn);
  }
  updateMotionLayoutBlurb();
}

function updateMotionLayoutBlurb() {
  const layoutMeta = currentMotionLayoutMeta();
  const text =
    motion.kind === "none"
      ? ""
      : layoutMeta?.blurb || layoutMeta?.label || "";
  if (motionLayoutBlurb) motionLayoutBlurb.textContent = text;
}

function updateMotionBlurb() {
  const meta = motionMeta();
  const layoutMeta = currentMotionLayoutMeta();
  let text;
  if (motion.kind === "none") {
    text = meta.blurb || "No motion.";
  } else {
    const bits = [meta.blurb];
    if (layoutMeta) bits.push(`Layout: ${layoutMeta.label}.`);
    if (meta.params?.includes("tail")) bits.push(`Tail ${Number(motion.tail).toFixed(2)}.`);
    if (meta.params?.includes("repeats")) bits.push(`${motion.repeats}× per loop.`);
    if (meta.params?.includes("cyclic")) bits.push(motion.cyclic ? "Cyclic." : "Non-cyclic.");
    if (meta.params?.includes("steps")) bits.push(`${motion.steps} steps.`);
    const g = motion.phaseGroups || 1;
    bits.push(
      g === 1
        ? "Phase sync."
        : `Phase ×${g} (sets repeat ${Math.round(12 / g)}×).`,
    );
    text = bits.join(" ");
  }
  if (motionBlurbEl) motionBlurbEl.textContent = text;
  if (summaryMotion) summaryMotion.textContent = `Motion: ${meta.label || motion.kind} — ${text}`;
}

function renderMotionParams() {
  const meta = motionMeta();
  const params = meta.params || [];
  motionParamsEl.hidden = params.length === 0 || motion.kind === "none";
  motionParamsEl.innerHTML = "";
  if (motionParamsEl.hidden) return;

  const addSlider = (key, label, min, max, step) => {
    const wrap = document.createElement("label");
    wrap.className = "field";
    const display =
      key === "steps" || key === "repeats"
        ? String(motion[key])
        : Number(motion[key]).toFixed(2);
    wrap.innerHTML = `
      <span class="label">${label} <em id="motion-${key}-val">${display}</em></span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${motion[key]}" data-motion="${key}" />
    `;
    motionParamsEl.appendChild(wrap);
  };

  const addCheck = (key, label) => {
    const wrap = document.createElement("label");
    wrap.className = "check";
    wrap.innerHTML = `<input type="checkbox" data-motion="${key}" ${motion[key] ? "checked" : ""} /> ${label}`;
    motionParamsEl.appendChild(wrap);
  };

  if (params.includes("tail")) addSlider("tail", "tail", 0.05, 1.2, 0.01);
  if (params.includes("repeats")) addSlider("repeats", "repeats", 0.5, 20, 0.5);
  if (params.includes("steps")) addSlider("steps", "steps", 2, 24, 1);
  if (params.includes("cyclic")) addCheck("cyclic", "cyclic");
}

motionParamsEl.addEventListener("input", (e) => {
  const t = e.target;
  const key = t.dataset.motion;
  if (!key) return;
  if (t.type === "checkbox") {
    motion[key] = t.checked;
  } else {
    motion[key] = Number(t.value);
    const valEl = document.getElementById(`motion-${key}-val`);
    if (valEl) {
      valEl.textContent =
        key === "steps" || key === "repeats"
          ? String(motion[key])
          : Number(motion[key]).toFixed(2);
    }
    if (key === "repeats") {
      const opt = nearestFixedOption(
        MOTION_SPEED_OPTIONS,
        clamp01((motion.repeats - 0.8) / 17.2),
      );
      motionSpeedChoice = opt.id;
      motionSpeed = opt.value;
      syncMotionSpeedUI();
    }
  }
  updateMotionBlurb();
  if (motionChipLabelEl) motionChipLabelEl.textContent = motionChipLabel();
  if (detailsHint) {
    detailsHint.textContent = `${coloringChipLabel()} · ${motionChipLabel()} · ${beatChipLabel()}`;
  }
  previewAndSend();
});

function renderColorList() {
  ensureColorCount();
  colorList.innerHTML = "";
  colors.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "color-card";
    card.dataset.index = String(i);
    const title =
      kind === "colorful" ? "center" : colors.length === 1 ? "color" : `color ${i + 1}`;
    card.innerHTML = `
      <div class="color-card-head">
        <span class="color-card-title">${title}</span>
        <input type="color" class="picker" value="${hsvToHex(c.hue, c.sat, c.val)}" aria-label="${title} picker" />
      </div>
      <label class="field">
        <span class="label">hue <em class="hue-val">${c.hue.toFixed(2)}</em></span>
        <input class="hue" type="range" min="0" max="1" step="0.01" value="${c.hue}" />
      </label>
      <label class="field">
        <span class="label">sat <em class="sat-val">${c.sat.toFixed(2)}</em></span>
        <input class="sat" type="range" min="0" max="1" step="0.01" value="${c.sat}" />
      </label>
      <label class="field">
        <span class="label">val <em class="val-val">${c.val.toFixed(2)}</em></span>
        <input class="val" type="range" min="0" max="1" step="0.01" value="${c.val}" />
      </label>
    `;
    colorList.appendChild(card);
  });
}

function readCard(card) {
  const i = Number(card.dataset.index);
  colors[i] = {
    hue: clamp01(Number(card.querySelector(".hue").value)),
    sat: clamp01(Number(card.querySelector(".sat").value)),
    val: clamp01(Number(card.querySelector(".val").value)),
  };
  card.querySelector(".hue-val").textContent = colors[i].hue.toFixed(2);
  card.querySelector(".sat-val").textContent = colors[i].sat.toFixed(2);
  card.querySelector(".val-val").textContent = colors[i].val.toFixed(2);
  card.querySelector(".picker").value = hsvToHex(colors[i].hue, colors[i].sat, colors[i].val);
}

function setStatus(msg, type = "") {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`.trim();
}

function syncKindButtons() {
  document.querySelectorAll(".kind").forEach((b) => {
    b.classList.toggle("active", b.dataset.kind === kind);
  });
  rangeField.hidden = kind !== "colorful";
}

function syncColorfulnessUI() {
  const resolved = resolveColorfulness(colorfulness);
  const rolled = resolvedDialId(COLORFULNESS_OPTIONS, colorfulnessChoice, colorfulness);
  setDialViz(colorfulnessViz, colorfulnessChoice, rolled);
  renderDialOptions(
    colorfulnessOptionsEl,
    COLORFULNESS_OPTIONS,
    colorfulnessChoice,
    (picked) => {
      if (picked.id === "random") {
        const rolledOpt = resolveChoice(COLORFULNESS_OPTIONS, "random");
        applyColorfulness(rolledOpt.id, { keepCenter: true });
        colorfulnessChoice = "random";
        syncColorfulnessUI();
        renderLayouts();
        renderSegments();
        renderColorList();
        previewAndSend();
        return;
      }
      applyColorfulness(picked.id, { keepCenter: true });
      renderLayouts();
      renderSegments();
      renderColorList();
      previewAndSend();
    },
    rolled,
  );
  if (colorfulnessHint) {
    if (colorfulnessChoice === "random") {
      colorfulnessHint.textContent = rolled
        ? `random · rolled ${choiceLabel(COLORFULNESS_OPTIONS, rolled)}`
        : "random · rolls on randomize";
    } else if (resolved.kind === "const") {
      colorfulnessHint.textContent = "locked · mono · one color everywhere";
    } else if (resolved.kind === "colorful") {
      colorfulnessHint.textContent = `locked · spectrum · continuous hue range ≈ ${resolved.range.toFixed(2)}`;
    } else {
      colorfulnessHint.textContent = `locked · ${choiceLabel(COLORFULNESS_OPTIONS, colorfulnessChoice)} · ${KIND_COUNTS[resolved.kind]} colors · hue span ≈ ${resolved.span.toFixed(2)}`;
    }
  }
}

function syncScatterUI() {
  const rolled = resolvedDialId(SCATTER_OPTIONS, scatterChoice, scatter);
  setDialViz(scatterViz, scatterChoice, rolled);
  renderDialOptions(
    scatterOptionsEl,
    SCATTER_OPTIONS,
    scatterChoice,
    (picked) => {
      if (picked.id === "random") {
        const rolledOpt = resolveChoice(SCATTER_OPTIONS, "random");
        applyScatter(rolledOpt.id, { random: true });
        scatterChoice = "random";
        syncScatterUI();
        renderLayouts();
        renderSegments();
        previewAndSend();
        return;
      }
      applyScatter(picked.id, { random: false });
      renderLayouts();
      renderSegments();
      previewAndSend();
    },
    rolled,
  );
  if (scatterHint) {
    if (scatterChoice === "random") {
      scatterHint.textContent = rolled
        ? `random · rolled ${choiceLabel(SCATTER_OPTIONS, rolled)}`
        : "random · rolls on randomize";
    } else if (kind === "const") {
      scatterHint.textContent = "n/a for mono — need 2+ colors to place";
    } else {
      scatterHint.textContent = `locked · ${scatterBlurb(scatterChoice) || scatterChoice}`;
    }
  }
}

function syncVividnessUI() {
  const rolled = resolvedDialId(VIVIDNESS_OPTIONS, vividnessChoice, vividness);
  setDialViz(vividnessViz, vividnessChoice, rolled);
  renderDialOptions(
    vividnessOptionsEl,
    VIVIDNESS_OPTIONS,
    vividnessChoice,
    (picked) => {
      if (picked.id === "random") {
        const rolledOpt = resolveChoice(VIVIDNESS_OPTIONS, "random");
        applyVividness(rolledOpt.id);
        vividnessChoice = "random";
        syncVividnessUI();
        renderColorList();
        previewAndSend();
        return;
      }
      applyVividness(picked.id);
      renderColorList();
      previewAndSend();
    },
    rolled,
  );
  if (vividnessHint) {
    vividnessHint.textContent =
      vividnessChoice === "random"
        ? rolled
          ? `random · rolled ${choiceLabel(VIVIDNESS_OPTIONS, rolled)}`
          : "random · rolls on randomize"
        : `locked · ${choiceLabel(VIVIDNESS_OPTIONS, vividnessChoice)} · saturation band`;
  }
}

/** Retone current colors from vividness; keep hues. */
function applyVividness(choiceOrValue) {
  if (choiceOrValue === "random") {
    vividnessChoice = "random";
    syncVividnessUI();
    return;
  }
  const opt =
    typeof choiceOrValue === "string"
      ? optionById(VIVIDNESS_OPTIONS, choiceOrValue)
      : typeof choiceOrValue === "number"
        ? nearestFixedOption(VIVIDNESS_OPTIONS, choiceOrValue)
        : choiceOrValue;
  vividnessChoice = opt.id;
  vividness = opt.value;
  colors = retoneColors(colors, vividness);
  syncVividnessUI();
}

/** Apply scatter bucket: only layouts in that style family. */
function applyScatter(choiceOrBucket, { random = false } = {}) {
  if (choiceOrBucket === "random") {
    scatterChoice = "random";
    syncScatterUI();
    return;
  }
  const bucket =
    typeof choiceOrBucket === "string" ? choiceOrBucket : scatterChoice;
  scatterChoice = bucket;
  scatter = bucket;
  syncScatterUI();
  placeFromScatter({ random });
}

function placeFromScatter({ random = false } = {}) {
  if (kind === "const") {
    layout = null;
    return;
  }
  if (kind === "colorful") {
    if (scatter === "blocks" || scatter === "regions") {
      // Spectrum across whole rings — pick a solid rings layout for grouping.
      colorfulSegment = "all";
      const ringLayouts = solidRingLayoutsForBucket(scatter);
      const picked = pickLayoutForScatter(ringLayouts, scatter, { random });
      layout = picked?.id ?? (scatter === "blocks" ? "rings-sides" : "rings-pairs");
    } else {
      layout = null;
      colorfulSegment = pickSegmentForScatter(
        colorfulSegments,
        scatter,
        segmentScatter,
        { random },
      );
    }
    return;
  }
  const list = availableLayouts();
  const picked = pickLayoutForScatter(list, scatter, { random });
  layout = picked?.id ?? null;
}

/** Rings-only layouts for spectrum blocks/regions (from any kind catalog). */
function solidRingLayoutsForBucket(bucket) {
  const seen = new Set();
  const out = [];
  for (const list of Object.values(layoutsByKind)) {
    for (const l of list || []) {
      if (l.mode !== "rings" || l.scatterBucket !== bucket) continue;
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      out.push(l);
    }
  }
  return out;
}

/** Apply colorfulness: set kind, regenerate palette, keep layout valid. */
function applyColorfulness(choiceOrValue, { keepCenter = false } = {}) {
  if (choiceOrValue === "random") {
    colorfulnessChoice = "random";
    syncColorfulnessUI();
    return;
  }
  const opt =
    typeof choiceOrValue === "string"
      ? optionById(COLORFULNESS_OPTIONS, choiceOrValue)
      : typeof choiceOrValue === "number"
        ? nearestFixedOption(COLORFULNESS_OPTIONS, choiceOrValue)
        : choiceOrValue;
  colorfulnessChoice = opt.id;
  colorfulness = opt.value;
  const center = keepCenter && colors[0] ? { hue: colors[0].hue } : undefined;
  const palette = generatePalette(colorfulness, { center, vividness });
  kind = palette.kind;
  colors = palette.colors;
  if (palette.range != null) {
    rangeEl.value = String(palette.range);
    $("rangeVal").textContent = Number(rangeEl.value).toFixed(2);
  }
  syncColorfulnessUI();
  syncVividnessUI();
  syncKindButtons();

  // Refresh placement using current scatter bucket without changing scatterChoice.
  placeFromScatter({ random: false });
}

function setKind(next) {
  // Kind buttons are a shortcut: snap colorfulness to that band and regenerate.
  const value = colorfulnessFromKind(next);
  const opt = nearestFixedOption(COLORFULNESS_OPTIONS, value);
  applyColorfulness(opt.id);
  renderLayouts();
  renderSegments();
  renderColorList();
  previewAndSend();
}

document.querySelectorAll(".kind").forEach((btn) => {
  btn.addEventListener("click", () => setKind(btn.dataset.kind));
});

layoutFilterEl.addEventListener("input", () => {
  layoutFilter = layoutFilterEl.value;
  renderLayouts();
});

colorList.addEventListener("input", (e) => {
  const t = e.target;
  const card = t.closest(".color-card");
  if (!card) return;

  if (t.classList.contains("picker")) {
    const hsv = hexToHsv(t.value);
    const i = Number(card.dataset.index);
    colors[i] = hsv;
    card.querySelector(".hue").value = hsv.hue;
    card.querySelector(".sat").value = hsv.sat;
    card.querySelector(".val").value = hsv.val;
    card.querySelector(".hue-val").textContent = hsv.hue.toFixed(2);
    card.querySelector(".sat-val").textContent = hsv.sat.toFixed(2);
    card.querySelector(".val-val").textContent = hsv.val.toFixed(2);
  } else {
    readCard(card);
  }
  previewAndSend();
});

rangeEl.addEventListener("input", () => {
  $("rangeVal").textContent = Number(rangeEl.value).toFixed(2);
  previewAndSend();
});

sendBtn.addEventListener("click", async () => {
  await playCurrent();
});

randomBtn.addEventListener("click", async () => {
  randomizeAll();
  await playCurrent();
});

randomPreviewBtn.addEventListener("click", () => {
  randomizeAll();
  setStatus("Randomized — preview only (not sent)");
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-rand]");
  if (!btn) return;
  e.preventDefault();
  randomizeSection(btn.dataset.rand);
  await playCurrent();
});

function randomizeColors() {
  resolveColoringDials();
  const palette = generatePalette(colorfulness, { vividness });
  kind = palette.kind;
  colors = palette.colors;
  if (palette.range != null) {
    rangeEl.value = String(palette.range);
    $("rangeVal").textContent = Number(rangeEl.value).toFixed(2);
  }
  syncColorfulnessUI();
  syncVividnessUI();
  syncScatterUI();
  syncKindButtons();
}

/** Resolve dial choices (rolls any that are "random"). */
function resolveColoringDials() {
  colorfulness = resolveChoice(COLORFULNESS_OPTIONS, colorfulnessChoice).value;
  scatter = resolveChoice(SCATTER_OPTIONS, scatterChoice).id;
  vividness = resolveChoice(VIVIDNESS_OPTIONS, vividnessChoice).value;
}

function randomizeLayout() {
  if (kind === "const" || kind === "colorful") return;
  layoutFilter = "";
  if (layoutFilterEl) layoutFilterEl.value = "";
  if (scatterChoice === "random") {
    scatter = resolveChoice(SCATTER_OPTIONS, "random").id;
  }
  placeFromScatter({ random: true });
  syncScatterUI();
}

function randomizeSegment() {
  if (kind !== "colorful") return;
  if (scatterChoice === "random") {
    scatter = resolveChoice(SCATTER_OPTIONS, "random").id;
  }
  placeFromScatter({ random: true });
  syncScatterUI();
}

function randomizeColoring() {
  // Fixed dials stay fixed; "random" dials are rolled each time.
  resolveColoringDials();
  const palette = generatePalette(colorfulness, { vividness });
  kind = palette.kind;
  colors = palette.colors;
  if (palette.range != null) {
    rangeEl.value = String(palette.range);
    $("rangeVal").textContent = Number(rangeEl.value).toFixed(2);
  }
  syncColorfulnessUI();
  syncVividnessUI();
  syncScatterUI();
  syncKindButtons();
  placeFromScatter({ random: true });
}

function randomizeMotion() {
  if (motionPresenceChoice === "off") {
    applyMotionNone();
    syncMotionPresenceUI();
    return;
  }
  resolveMotionSpeedForRandomize();
  resolveMotionPhaseForRandomize();
  const includeNone = motionPresenceChoice === "random";
  applyPickedMotionKind(pickMotionKind(includeNone));
  syncMotionSpeedUI();
  syncMotionPhaseUI();
  syncMotionPresenceUI();
}

function refreshAll() {
  renderLayouts();
  renderSegments();
  renderMotions();
  renderBeats();
  renderColorList();
  updateExplain();
}

function setupRingSim() {
  if (!ringSim || !ringSimCanvas) return;
  const wrap = ringSimCanvas.parentElement;
  const applySize = () => {
    const w = wrap?.clientWidth || ringSimCanvas.clientWidth || 680;
    ringSim.resize(w);
  };
  applySize();
  if (wrap && typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => applySize());
    ro.observe(wrap);
  }
  startSimLoop();
}

function randomizeSection(key) {
  if (key === "coloring") randomizeColoring();
  else if (key === "motion") randomizeMotion();
  else if (key === "beat") randomizeBeat();
  else if (key === "all") {
    randomizeAll();
    return;
  }
  refreshAll();
}

function randomizeAll() {
  randomizeColoring();
  randomizeMotion();
  randomizeBeat();
  refreshAll();
}


let playTimer = null;
let playGen = 0;

/** Re-render preview and send to LEDs (coalesces rapid clicks; aborts in-flight send). */
function previewAndSend() {
  updateExplain();
  const gen = ++playGen;
  clearTimeout(playTimer);
  playTimer = setTimeout(() => {
    if (gen !== playGen) return;
    void playCurrent();
  }, 180);
}

async function playCurrent() {
  const body = {
    kind,
    colors,
    range: Number(rangeEl.value),
    layout,
    colorfulSegment,
    scatterBucket: scatter,
    motion,
    beat,
  };

  // Cancel any in-flight play so we don't pile up PUTs to the LED box.
  if (playAbort) playAbort.abort();
  playAbort = new AbortController();
  const { signal } = playAbort;

  sendBtn.disabled = true;
  randomBtn.disabled = true;
  if (randomPreviewBtn) randomPreviewBtn.disabled = true;
  setStatus("Sending…");
  try {
    const res = await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || res.statusText);
    const parts = [
      data.kind,
      data.layout || data.colorfulSegment,
      data.motion?.kind,
      data.motion?.layout,
      data.beat?.kind && data.beat.kind !== "none" ? `${data.beat.kind} @ ${data.beat.bpm}` : null,
    ]
      .filter(Boolean)
      .filter((x) => x !== "none");
    // Restart the preview clock so the sim's beat roughly lines up with the rings.
    simStartMs = performance.now();
    setStatus(`Playing ${parts.join(" · ")} → ${data.triggerName}`, "ok");
  } catch (err) {
    if (err?.name === "AbortError") return;
    setStatus(err.message || String(err), "err");
  } finally {
    if (!signal.aborted) {
      sendBtn.disabled = false;
      randomBtn.disabled = false;
      if (randomPreviewBtn) randomPreviewBtn.disabled = false;
    }
  }
}

async function init() {
  try {
    const res = await fetch("/api/meta");
    const meta = await res.json();
    servicesEl.textContent = `sequence ${meta.services.sequence} · trigger ${meta.services.trigger} · ${meta.layoutCount} layouts`;
    if (meta.layoutsByKind) layoutsByKind = meta.layoutsByKind;
    if (meta.colorfulSegments) colorfulSegments = meta.colorfulSegments;
    if (meta.segmentInfo) segmentInfo = meta.segmentInfo;
    if (meta.segmentScatter) segmentScatter = meta.segmentScatter;
    if (meta.motionCatalog) motionCatalog = meta.motionCatalog;
    if (meta.motionKinds) motionKinds = meta.motionKinds;
    if (meta.motionLayouts?.length) motionLayouts = meta.motionLayouts;
    if (meta.motionDefaults) motion = { ...motion, ...meta.motionDefaults };
    if (meta.beatCatalog) beatCatalog = meta.beatCatalog;
    if (meta.beatKinds) beatKinds = meta.beatKinds;
    if (meta.beatLayouts?.length) beatLayouts = meta.beatLayouts;
  } catch {
    servicesEl.textContent = "Could not load service config";
  }
  rangeField.hidden = kind !== "colorful";
  syncColorfulnessUI();
  syncScatterUI();
  syncVividnessUI();
  motion.repeats = repeatsFromSpeed(motionSpeed);
  syncMotionSpeedUI();
  syncMotionPhaseUI();
  syncMotionPresenceUI();
  beat.bpm = optionById(BEAT_BPM_OPTIONS, beatBpmChoice).value;
  syncBeatDialsUI();
  setupRingSim();
  refreshAll();
}

init();
