import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  KINDS,
  LAYOUT_CATALOG,
  COLORFUL_SEGMENTS,
  SEGMENT_INFO,
  SEGMENT_SCATTER,
  SCATTER_BUCKET_INFO,
  buildSequence,
  colorCountForKind,
  defaultColors,
  layoutsForKind,
  describeLayout,
} from "./coloring.js";
import {
  COLORFULNESS_BANDS,
  COLORFULNESS_LABELS,
  KIND_TO_COLORFULNESS,
} from "../public/palette.js";
import {
  MOTION_KINDS,
  MOTION_CATALOG,
  MOTION_LAYOUTS,
  MOTION_DEFAULTS,
  normalizeMotion,
  describeMotion,
  applyMotion,
  randomMotion,
} from "./motion.js";
import {
  BEAT_KINDS,
  BEAT_CATALOG,
  BEAT_LAYOUTS,
  BEAT_DEFAULTS,
  normalizeBeat,
  describeBeat,
  applyBeat,
} from "../public/beat.js";
import { sendAndTrigger, serviceConfig } from "./send.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 3090);
const DURATION_MS = 10_000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(root, "public")));

function layoutPublic(l) {
  return {
    id: l.id,
    label: l.label,
    group: l.group,
    mode: l.mode,
    segment: l.segment ?? null,
    twist: l.twist ?? null,
    assign: l.assign ?? null,
    flip: l.flip ?? null,
    hybridSegment: l.hybridSegment ?? null,
    scatterBucket: l.scatterBucket ?? "regions",
    pairAssign: l.pairAssign ?? null,
    blurb: describeLayout(l),
  };
}

app.get("/api/meta", (_req, res) => {
  res.json({
    layers: ["coloring", "motion", "beat"],
    kinds: KINDS,
    colorfulness: {
      bands: COLORFULNESS_BANDS,
      labels: COLORFULNESS_LABELS,
      kindDefaults: KIND_TO_COLORFULNESS,
    },
    colorfulSegments: COLORFUL_SEGMENTS,
    segmentInfo: SEGMENT_INFO,
    segmentScatter: SEGMENT_SCATTER,
    scatterBuckets: SCATTER_BUCKET_INFO,
    layoutCount: LAYOUT_CATALOG.length,
    layoutsByKind: Object.fromEntries(
      KINDS.map((k) => [k, layoutsForKind(k).map(layoutPublic)]),
    ),
    motionKinds: MOTION_KINDS,
    motionCatalog: MOTION_CATALOG,
    motionLayouts: MOTION_LAYOUTS,
    motionDefaults: MOTION_DEFAULTS,
    beatKinds: BEAT_KINDS,
    beatCatalog: BEAT_CATALOG,
    beatLayouts: BEAT_LAYOUTS,
    beatDefaults: BEAT_DEFAULTS,
    services: serviceConfig(),
    defaults: {
      range: 1,
      durationMs: DURATION_MS,
      colorfulSegment: "all",
      colorsByKind: Object.fromEntries(
        KINDS.map((k) => [k, defaultColors(colorCountForKind(k))]),
      ),
    },
  });
});

app.post("/api/play", async (req, res) => {
  try {
    const {
      kind = "const",
      colors,
      range = 1,
      layout,
      colorfulSegment = "all",
      scatterBucket = null,
      motion,
      beat,
      durationMs = DURATION_MS,
      triggerName = "amir-playground-v2",
    } = req.body ?? {};

    const dur = Number(durationMs) || DURATION_MS;
    const built = buildSequence(kind, {
      colors,
      range: Number(range),
      layout,
      colorfulSegment,
      scatterBucket,
      durationMs: dur,
    });

    const motionNorm = normalizeMotion(motion);
    const withMotion = applyMotion(built.sequence, motionNorm, { durationMs: dur });
    const beatNorm = normalizeBeat(beat);
    const sequence = applyBeat(withMotion, beatNorm, { durationMs: dur });

    const result = await sendAndTrigger(sequence, triggerName);
    res.json({
      ok: true,
      kind,
      layout: built.layout,
      colors: built.colors,
      colorfulSegment: built.colorfulSegment,
      scatterBucket: built.scatterBucket ?? scatterBucket,
      spectrumMode: built.spectrumMode ?? null,
      motion: motionNorm,
      motionBlurb: describeMotion(motionNorm),
      beat: beatNorm,
      beatBlurb: describeBeat(beatNorm),
      range,
      ...result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  const { sequence, trigger } = serviceConfig();
  console.log(`amir-playground UI  http://localhost:${PORT}`);
  console.log(`sequence ${sequence}  trigger ${trigger}`);
  console.log(
    `layers: coloring+motion+beat  layouts: ${LAYOUT_CATALOG.length}  motion layouts: ${MOTION_LAYOUTS.length}`,
  );
});
