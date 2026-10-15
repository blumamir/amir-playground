---
name: led-animation-layout
description: Design good-looking LED ring animations for the kivsee led-rings project by deciding the layout — which segment(s) each of the 12 rings uses and which effects go on each. Use this whenever the user asks to create, design, compose, improve or vary an animation, pattern, preset, song section or effect on the rings, even if they don't say "layout" or "segment" (e.g. "make something chill for the chorus", "add a sparkle on rings 3-9", "this part looks boring").
---

# LED animation layout

An animation here is a set of layers. Each layer is a choice of **which rings**, **which segment** on those rings, **when** (beats), and **which effect**. "Layout" means making those choices per ring, and different rings can make different choices. Your job is to turn the user's request into a layout that looks deliberate and good, then express it in whatever output form the user asks for.

## The hardware model

- **12 big rings**, `ring1`..`ring12` (elements `1..12`), standing in one big circle. Read the circle as a clock face: ring `r` sits at `r:30`. Ring 1 is at 1:30, ring 2 at 2:30, ..., ring 12 at 0:30. Increasing ring number therefore runs **clockwise**.

```
              11    12
          10            1
        9                 2
        8                 3
          7             4
               6    5
```
The exact angle of ring `r` is `(r + 0.5) × 30°` clockwise from 12 o'clock. No ring sits exactly at 12, 3, 6 or 9 o'clock. Each of those points falls between a pair: top = 11|12, right = 2|3, bottom = 5|6, left = 8|9.

Geometry you can design with:
- **Opposite rings**: `r` ↔ `r+6`, i.e. (1,7) (2,8) (3,9) (4,10) (5,11) (6,12).
- **Left/right mirror** (across the vertical axis): (12,11) (1,10) (2,9) (3,8) (4,7) (5,6).
- **Top/bottom mirror** (across the horizontal axis): (12,5) (1,4) (2,3) (11,6) (10,7) (9,8).
- **Rotation**: stepping rings 1→12 (or a `phase` across `all`) moves around the circle clockwise. 12→1 moves counter-clockwise.
- **Physical halves**: right = 12,1,2,3,4,5. Left = 6,7,8,9,10,11. Top = 9,10,11,12,1,2. Bottom = 3,4,5,6,7,8.
- The exported groups in `ring-elements.ts` are named by index, not by physical side. `left` (1-6) is physically the right/lower-right side, `right` (7-12) is the left/upper-left side, `center` (4-9) is roughly the bottom-left, and `outer` (1-3, 10-12) is roughly the top-right. When the user says "left", "top" or similar, use the physical sets above instead of the group names.
- **Each big ring is a circle of 12 small rings**, each with 12 pixels, for **144 pixels** in total. Pixel index = `small*12 + pos`.
  - **Small ring 0 always faces the center of the installation**, so in every big ring it is the inner side and small ring 6 is the outer side.
  - *Assumed, not yet confirmed:* small rings are numbered clockwise, and pixel 0 of each small ring sits on its side facing the big ring's center, with pixels also running clockwise.

```
   one big ring (installation center below)
              6
          5       7
       4             8
       3             9
       2             10
          1       11
              0      ← faces the installation center
```
- An effect never addresses pixels directly. It runs over a **segment**, which assigns each pixel a `relPos` in [0,1). Motion effects (snake, hue shift, etc.) travel along `relPos`. So the segment you pick decides the *shape* of the motion. Segments are defined in `src/ring-segments/segments.json`.
- So a layout has two levels: **which big rings** (the circle of 12) and, inside each big ring, **which small rings and pixels** (the segment).

### Segments and what they look like

| Segment | Pixels | relPos mapping | Visual result |
|---|---|---|---|
| `all` | 144 | 0→1 linearly through every pixel, small ring by small ring | one long path; a snake crawls through small ring 0, then 1, 2… around the big ring |
| `0`..`11` | 12 each | 0→0.92 around that one small ring | target a single small ring (`0` = the one facing the installation center, `6` = the outermost) |
| `centric` | 144 | every small ring runs 0→0.92 in parallel | all 12 small rings spin in sync |
| `updown` | 144 | like centric, but small ring `k` is rotated by `k` pixels (starts at `k/12`) | each small ring sits 30° further around the big ring, so this rotation cancels that turn and gives every small ring the same absolute direction; motion likely sweeps across the big ring (e.g. up/down) — confirm on hardware |
| `arc` | 144 | each small ring goes 0→0.86→0, peaking at pixel 6 | mirrored inside each small ring; things grow from pixel 0 around both sides and meet at pixel 6 |
| `ind` | 144 | whole small ring `k` has constant relPos `k/12` | small rings light up as solid units in order around the big ring, starting from the one facing the installation center |
| `b1` | 48 | every 3rd pixel, relPos 0 | static sparse dotted pattern (no spatial motion) |
| `b2` | 96 | the other 2 of every 3 pixels, relPos 0 | complement of `b1`; use with `b1` for two-tone or alternating patterns |
| `rand` | 144 | shuffled relPos | glitter / sparkle; motion effects become random twinkles |

Because small ring 0 always faces the installation center, segments `0` and `6` (and `ind`, which starts at small ring 0) behave consistently on every big ring. For example, segment `0` on all 12 big rings lights a small inner circle, and `6` lights the outer edge of the whole installation.

### Ring groups

`src/objects/ring-elements.ts` exports: `all`, `odd`, `even`, `left` (1-6), `right` (7-12), `center` (4-9), `outer` (1-3, 10-12). You can also use any custom list, e.g. `[1, 7]` for an opposite pair.

### Building blocks (TS song DSL)

The functions nest. The outer scopes set the context and the innermost call adds the effect:

```ts
beats(start, end, () => {            // time window, in beats
  elements(right, () => {            // which rings
    segment(segment_arc, () => {     // which segment
      phase(0.5, () => {             // optional: offset the effect across the rings in this group
        cycle(4, () => {             // optional: repeat every 4 beats
          snake({ tailLength: 0.3 })
        });
      });
    });
  });
});
```

- Time: `beats`, `cycle`, `cycleBeats` in `src/time/time.ts`.
- Phase: `phase(intensity)` in `src/phase/phase.ts` gives ring `i` an offset of `i/N * intensity`. Negative values reverse it, which gives left/right mirror symmetry.
- Color: `src/effects/coloring.ts` (`constColor`, `vivid`, `pastel`, `rainbow`, `fullRainbow`, `dotted`, ...).
- Brightness: `src/effects/brightness.ts` (`fadeIn/Out`, `fadeInOut`, `blink`, `pulse`, `brightness`, `snakeBrightness`).
- Motion: `src/effects/motion.ts` (`snake`, `snakeHeadMove`, `snakeFillGrow`, `snakeInOut`, `snakeHeadSteps`, ...).
- Hue: `src/effects/hue.ts` (`staticHueShift`, `hueShiftSin`, `hueShiftStartToEnd`, `snakeHue`).
- Raw effects: `addEffect({...})` takes the proto-shaped config directly.

Read the effect file before using an effect whose parameters you don't remember. The signatures are short.

UI equivalents: the timeline's movement types in `ui/src/movementGenerators.ts` (spread / sweep / stagger / random × forward / backward / center-out / edges-in / opposite pairs / custom order) compile down to per-ring `beats()` blocks. Presets in `presets/<category>/*.json` are the same layers serialized per ring (`ring1.effects[]` with `effect_config.segments`).

## Two-part layouts

Many ideas need the installation split into **two parts, A and B**:
- **Two colors**: A gets color 1 and B gets color 2.
- **Alternating beats**: A hits on one beat, B on the next. For example, A on beats 0, 2, 4 and B on 1, 3, 5.
- **Conversation (call and response)**: A plays a phrase, B answers with the same or a related phrase, then back to A.

A split works at the level of whole rings, segments, or **both**:
- **Whole rings**: each big ring belongs entirely to A or B (segment `all`).
- **Segments**: the split runs *inside* the big rings, the same way on every ring. A ring controller cannot light arbitrary pixels, so inside a big ring a part must be built from segments, optionally narrowed by a **position mask** (below). Different big rings may use different segments and masks.
- **Both**: different big rings use different segments, so the shape comes from the combination: zigzags, shifted circles, mirror images, spirals.

### Memory: prefer whole-ring segments + position masks

Every effect costs scarce controller memory. Building a part from single small-ring segments (`"0"`..`"11"`) needs **one effect per small ring per layer**. Five or six of them for one part quickly runs out. Prefer a segment that covers the whole ring (`ind`, `centric`, `arc`, `updown`, `rand`, `b1`/`b2`, `all`) narrowed by **one `position_brightness` mask**. The mask is a brightness function evaluated at each pixel's `relPos`, so it selects a relPos range in a single effect:

```ts
const on = { const_value: { value: 1 } }, off = { const_value: { value: 0 } };
const mask = (f: object) => addEffect({ position_brightness: { mult_factor_decrease: f } });

const lowHalf      = { half: { f1: on, f2: off } };                                         // relPos < 0.5
const highHalf     = { half: { f1: off, f2: on } };                                         // relPos >= 0.5
const outerQuarters = { half: { f1: { half: { f1: on, f2: off } }, f2: { half: { f1: off, f2: on } } } }; // <0.25 or >=0.75
const middleHalf   = { half: { f1: { half: { f1: off, f2: on } }, f2: { half: { f1: on, f2: off } } } }; // 0.25..0.75
const everyOther   = { sin: { min: 0, max: 1, phase: 0.25, repeats: 6 } };                  // 1,0,1,0… on k/12 steps
```

What a mask selects depends on the segment's relPos:
- `ind` (relPos = k/12 per small ring): `lowHalf` = small rings 0..5, `outerQuarters` = 9..2 (inner side), `middleHalf` = 3..8 (outer side), `everyOther` = even small rings.
- `arc`: `lowHalf` = the inner-facing half of every small ring (pixels 0-3, 9-11). It's symmetric because arc mirrors around pixel 0.
- `centric`: `everyOther` = every other pixel in every small ring. `lowHalf` = pixels 0..5 of every small ring.
- `rand`: any range = a random, evenly spread fraction of pixels (`<0.5` = half, `<0.2` = sparse).
- `updown`: `lowHalf` should be the same absolute side of every small ring (unconfirmed).

For the *two colors* use you may not even need a brightness mask: a single color layer plus a `position_hue` effect with the same `half` shape gives two hues from one segment.

Masks are hard edges only on segments whose relPos steps (ind) or when the edge falls between pixels. On smooth relPos a `sin` mask is soft. Only use a single small-ring segment when one or two small rings are enough (e.g. `"0"` for an inner glow), or when no mask can express the set (see Mirror wings).
The mask behaviour is taken from the UI preview code (`ui/src/effectPreview.ts`), which mirrors the firmware. Verify on hardware the first time you use it.

### The options: big-ring split × inside split × combine

Build a two-part layout from three choices. Picking only one level is fine too: *no big split* gives an inside-only split, and *whole ring* gives a ring-only split.

**1. Big-ring split** (groups G1 / G2). This is free: it only chooses `elements`.

| Big split | G1 | G2 | Character |
|---|---|---|---|
| None | all rings | — | the inside split is the same everywhere |
| Left / right | `[12, 1, 2, 3, 4, 5]` | `[6..11]` | two halves facing each other; conversation |
| Top / bottom | `[9, 10, 11, 12, 1, 2]` | `[3..8]` | sky and ground; build-ups and drops |
| Every third (X) | `[1, 4, 7, 10]` | the other 8 | 4 accent rings on the diagonals over a base of 8 |
| Alternate | odd rings | even rings | neighbouring rings differ; fast rhythm, the whole circle stays busy |
| Bowtie | `[10, 11, 12, 1, 4, 5, 6, 7]` | `[2, 3, 8, 9]` | top + bottom vs the two sides |

**2. Inside split** (halves s0 / s1 of every big ring). Cost = effects per ring per part per layer.

| Inside split | s0 | s1 | Cost | Character |
|---|---|---|---|---|
| Whole ring | `all` | — | 1 | no inside split |
| Inner / outer | `ind` + `outerQuarters` (small rings 9..2) | `ind` + `middleHalf` (3..8) | 2 | inner side facing the center vs outer edge; concentric circles |
| Pinwheel | `ind` + `lowHalf` (0..5) | `ind` + `highHalf` (6..11) | 2 | same half of every ring; rotational |
| Gear teeth | `ind` + `everyOther` (even small rings) | inverted | 2 | alternating small rings |
| Half moons | `arc` + `lowHalf` | `arc` + `highHalf` | 2 | inner/outer half of every small ring; symmetric, organic |
| Dots | `b1` | `b2` | 1 | every 3rd pixel vs the rest; texture up close |
| Pixel stripes | `centric` + `everyOther` | inverted | 2 | every other pixel; finer than dots |
| Starfield | `rand` + `lowHalf` | `rand` + `highHalf` | 2 | random half of the pixels; glitter. `<0.2` for sparse |
| Sunlit side | `updown` + `lowHalf` | `updown` + `highHalf` | 2 | same absolute side of every small ring (unconfirmed) |

**3. Combine** (how the levels produce parts A and B).

| Combine | G1 rings | G2 rings | Character |
|---|---|---|---|
| Swap | s0 = A, s1 = B | s0 = B, s1 = A | every ring shows both parts, roles flip between groups; alternating makes the pattern flip or ripple |
| One side each | s0 = A, s1 dark | s1 = B, s0 dark | sparser and sculpted; the shape comes from where the light is not |
| Full + pattern | whole ring = A | s0 = B, s1 dark | bold full rings as the accent over a quieter structured base |
| Pattern on G1 only | s0 = A, s1 = B | dark | focuses the pattern in one region |

**Named combinations** (big × inside × combine):

| Name | Recipe | Looks like |
|---|---|---|
| Zigzag | alternate × inner/outer × swap | the lit band jumps inner/outer from ring to ring |
| Sway (shifted circle) | left/right × inner/outer × swap | each part is a circle shifted sideways; alternating = side-to-side sway |
| Vertical sway | top/bottom × inner/outer × swap | the same, up and down |
| Checkerboard | alternate × dots × swap | dot texture whose roles swap between neighbours |
| Moon zigzag | alternate × half moons × swap | half moons flipping orientation ring to ring |
| Counter-pinwheel | alternate × pinwheel × swap | neighbouring pinwheel halves oppose each other, like gears meshing |
| Yin-yang | left/right × pinwheel × swap | the two halves of the installation hold opposite pinwheel halves |
| Crossed gears | every third × gear teeth × swap | gear texture where the X rings run opposite to the rest |
| Accent + inner glow | every third × inner/outer × full + pattern | 4 full rings over an inner-side glow on the rest |
| Crown & roots | top/bottom × inner/outer × one side each | top rings lit on the inner side, bottom rings on the outer side |
| Woven bowtie | bowtie × pixel stripes × swap | fine weave whose phase flips between the top/bottom and the sides |

**Special shapes** that don't fit the grid:

| Name | Part A | Part B | Cost | Looks like |
|---|---|---|---|---|
| Mirror wings | right rings `ind`+`lowHalf`, left rings `"7".."11","0"` | the rest | right 2, left 6 | mirror-symmetric butterfly; calm and posed. Expensive |
| Twist | ring `r`: small rings `r … r+5` (mod 12) | the other 6 | 2 soft (`ind` + `sin` mask, phase `r/12`) / 6 hard | each ring's half is rotated one step further, forming a spiral |
| Crown + inner circle | top rings (9..2) `ind` + `middleHalf` | `"0"` on all rings | 2 + 1 | quiet inner circle with a bright crown on top; drops |

Describe and compare options with these properties. They're also shown as tags in `layout-demo.html`, where they're computed from each option's pixel map:
- **Coverage**: full or partial (% of pixels lit). Partial leaves dark space, which adds contrast and depth.
- **Balance**: even or uneven part sizes. Uneven = accent over base.
- **Grain**: whole rings → large shapes → small-ring pattern → fine texture. Coarser reads from farther away.
- **Order**: organized (regular, repeating) or scattered (random-looking, e.g. `rand`).
- **Symmetry**: mirror (left/right) and/or rotational ×N (parts may swap), or asymmetric.
- **Feel**: calm (mirror-symmetric), dynamic (rotational but not mirrored: suggests spinning), directional (asymmetric: points somewhere), sparkly (scattered).
- **Complexity**: simple (one clear idea; bold but boring if held long), moderate, intricate (lots to look at; busy if overused). Match it to the music's density, and vary it between sections.
- **Cost**: effects per ring per part per layer.

How to choose:
- **Halves (left/right, top/bottom, pinwheel, inner/outer)** read as two *places*, so the eye moves between them. Use them when the music has two distinct voices or a call and response.
- **Interleaved splits (alternate, every third, gear teeth, dots, stripes, starfield, and anything combined with swap)** read as one *texture* that flickers. Use them for rhythm, fast beats and two-color patterns where everything should stay lit.
- **Whole rings vs. segments**: whole-ring splits are the boldest and read from anywhere. Small-ring splits (inner/outer, pinwheel, teeth) add shape *inside* each ring while staying visible from far away. `b1`/`b2` splits only read up close.
- **Equal vs. unequal size**: equal splits feel balanced, like a dialog. Unequal splits (every third, bowtie, full + pattern) feel like an accent over a base, so give the smaller part the brighter or more saturated color or the sharper effect.
- **Mixing levels** (big × inside): these draw shapes neither level can make alone. Symmetric ones (mirror wings, sway, crown & roots) feel calm and posed, while rotational or alternating ones (twist, zigzag, checkerboard) feel energetic. Keep it to one idea per musical phrase, because stacking several splits at once reads as noise.
- Changing split partway through a section reads as an event. Save it for musical transitions.
- Every inside split built on `ind` (inner/outer, pinwheel, gear teeth) and everything combined from them depends on the assumed small-ring numbering direction (see "The hardware model").

Example: alternating beats on the left/right split (whole rings).

```ts
const partA = [12, 1, 2, 3, 4, 5];
const partB = [6, 7, 8, 9, 10, 11];
beats(0, 16, () => {
  elements(partA, () => segment(segment_all, () => {
    constColor({ hue: 0.6 });
    cycleBeats(2, 0, 1, () => fadeOut());                  // A flashes on even beats
    cycleBeats(2, 1, 2, () => brightness({ value: 0 }));   // ...and is dark on odd beats
  }));
  elements(partB, () => segment(segment_all, () => {
    constColor({ hue: 0.05 });
    cycleBeats(2, 0, 1, () => brightness({ value: 0 }));   // B is dark on even beats
    cycleBeats(2, 1, 2, () => fadeOut());                  // ...and flashes on odd beats
  }));
});
```

Example: inner/outer conversation, 4 beats each, in **4 effects per ring** for both parts. The same thing with single small-ring segments would need about 30 (10 segments × color + 2 brightness windows).

```ts
const zero = { const_value: { value: 0 } }, shift = { const_value: { value: 0.45 } };
const outerSideHue = { half: { f1: { half: { f1: zero, f2: shift } }, f2: { half: { f1: shift, f2: zero } } } }; // shift hue on 0.25..0.75
beats(0, 8, () => elements(all, () => segment(segment_ind, () => {
  constColor({ hue: 0.6 });                                    // inner side: blue
  addEffect({ position_hue: { offset_factor: outerSideHue } }); // outer side: blue + 0.45 = orange
  cycleBeats(8, 0, 4, () => mask(outerQuarters));              // beats 0-3: inner side speaks
  cycleBeats(8, 4, 8, () => mask(middleHalf));                 // beats 4-7: outer side answers
})));
```

Note: a brightness effect only applies inside its own time window. Outside it, the color layer shows at full brightness. That's why each part needs an explicit "dark" window for the beats where it should be off.

## Motion for two-part layouts

### How a snake works

A snake effect has a `head` and a `tail_length`, each a **FloatFunction of time** `t ∈ [0,1]` over the effect window (or over each `cycle(n)` repeat). A pixel is lit when its segment `relPos` lies between `head − tail` and `head`, brightest at the head. With `cyclic: true` it wraps around 1→0. The segment is the **path**: the same snake looks completely different on each one.

FloatFunctions you can use for head or tail:
- `const_value` holds still.
- `linear {start, end}` moves at constant speed (e.g. 1→0 runs backward).
- `sin {min, max, phase, repeats}` swings back and forth, easing at the ends.
- `steps {num_steps, diff_per_step, first_step_value}` jumps like a clock tick.
- `half {f1, f2}` does f1 in the first half of the cycle, then f2.
- `comb2 {f1, amount1, f2, amount2}` is a weighted average, e.g. sin + linear = slow-fast surge.

Motion recipes (helpers in `src/effects/motion.ts`, or raw `addEffect`):

| Motion | Head / tail | Helper | Feel |
|---|---|---|---|
| Chase | head `linear 0→1`, cyclic | `snake({ tailLength, cyclic: true, reverse? })` | steady travel. A short tail (0.1-0.15) makes a comet; a long one (0.6+) makes a glow |
| Tick ×N | head `steps(N, 1/N)`, cyclic | `snakeHeadSteps({ steps, tailLength })` | clock-like jumps. On `ind` with 12 steps over 12 beats: one small ring per beat |
| Surge | head `comb2(sin, linear)`, cyclic | `snakeSlowFast({ tailLength })` | pushes then eases: acceleration on every cycle |
| Breathe | head `sin 0..1`, not cyclic | `snakeInOut()` (tail 0.5) | grows out and recedes |
| Ping-pong | head `half(linear up, linear down)` | raw | swings forward and back |
| Heartbeat | head `sin`, tail `half(0.5→1, 1→0.5)` | `snakeTailShrinkGrow()` | pulsing length |
| Fill / drain | head `linear`, tail 3, not cyclic | raw | the path fills up (or drains in reverse) |

Paths:
- `all`: a long crawl through every small ring.
- `centric`: every small ring spins in sync.
- `ind`: steps from small ring to small ring.
- `arc`: mirrored; two heads run up both sides of each small ring and meet at the tip.
- `updown`: same absolute direction (unconfirmed).
- `rand`: motion becomes twinkling.
- `b1`/`b2` have relPos 0 everywhere, so a snake can't travel on them.

**Phase across rings:** `phase(x, …)` gives the ring at index `i` of the `elements` list a head offset of `i/N · x`, so list order matters. `1` spreads one full wave over the group (a spiral), `0.5` a half wave, and negative values run the offsets from the last ring to the first. Only *function-form* effects receive it: helpers, or `addEffect((p) => ({ snake: { head: …p… } }))`. A raw snake object passed to `addEffect` is **not** phase-shifted.

### Two parts in motion

- **Ring-level splits** (left/right, alternate, X, …): each group is a separate `elements(...)` block, so its path, motion, direction, tempo and wave are completely independent. This costs nothing extra.
- **Inside splits** (pinwheel, half moons, …): both parts live in the same rings. Every effect on a segment touches all of its pixels, so the parts **share one motion** and differ only in color. Put the colors on the split's segment (`constColor` + `position_hue`) and the snake on any path segment.

Ways to relate the two groups:
- **Opposite directions**: same motion, one `reverse`. Counter-rotation, gears.
- **Mirror**: on left/right or top/bottom, use the same motion with reversed direction **and** a negated wave (`phase(1)` vs `phase(-1)`). The halves become mirror images: calm, posed.
- **Tempo ratio**: `cycle(2)` vs `cycle(3)` gives a 3:2 polyrhythm, and `cycle(2)` vs `cycle(4)` gives 2:1. Cycles realign on the least common multiple; put that on a bar line.
- **Unison vs wave**: the same motion with `phase(0)` on one group and `phase(1)` on the other is a subtle contrast.
- **Foreground / background**: one group fast and bright, the other slow (breathe, long chase) at `brightness({ value: 0.2-0.5 })`.
- **Different motion families**: tick against breathe, or comet against glow. Keep the colors distinct so the two ideas don't blur.

Proven pairings (presets in `layout-demo.html` panel 6, which also generates the code):

| Preset | Layout | A | B |
|---|---|---|---|
| Counter-rotation | alternate | `all` chase, phase 1 | `all` chase reverse, phase 1 |
| Mirror chase | left/right | `centric` chase, phase 1 | `centric` chase reverse, phase −1 |
| Twin galaxies | top/bottom | `all` chase tail 0.6, 8 beats | same, reversed |
| Breathing halves | top/bottom | `ind` breathe | `ind` breathe half a cycle later |
| Clock hands | every third | `ind` tick ×12 over 12 beats | `centric` breathe 8 beats at 20% |
| Polyrhythm 3:2 | alternate | `centric` comet, 2 beats | `centric` comet reverse, 3 beats |
| Meeting arcs | left/right | `arc` chase, phase 0.5 | `arc` chase reverse, phase −0.5 |
| Glitter duet | alternate | `rand` chase, 1 beat | `rand` chase reverse, 2 beats |
| Fill & drain | left/right | `ind` fill | `ind` drain |
| Spin vs spiral | alternate | `centric` chase, unison | `centric` chase, phase 1 |

Example: mirror chase, 2 effects per ring.

```ts
beats(0, 16, () => {
  elements([12, 1, 2, 3, 4, 5], () => segment(segment_centric, () => phase(1, () => {
    constColor({ hue: 0.514 });
    cycle(2, () => snake({ tailLength: 0.4, cyclic: true }));
  })));
  elements([6, 7, 8, 9, 10, 11], () => segment(segment_centric, () => phase(-1, () => {
    constColor({ hue: 0.833 });
    cycle(2, () => snake({ tailLength: 0.4, cyclic: true, reverse: true }));
  })));
});
```

## Stacked snakes (two snakes on the same rings)

Effects are applied **in order** to each pixel (`kivsee-render`):
- `constColor` sets hue, saturation and value, so it resets brightness. Put it first.
- `snake` multiplies brightness by the snake mask, and pixels outside the snake become 0.
- `snake_brightness` changes only the pixels inside its snake: `mult_factor_increase` pushes them toward full brightness (`v + (1−v)·f`), and `mult_factor_decrease` multiplies them.
- `snake_hue` adds a hue offset inside its snake.

The factor and offset are functions of the *snake index* (0 at the tail end, 1 at the head).

So the second snake's effect type decides the blend:

| Blend | Layer 2 effect | Result | Good for |
|---|---|---|---|
| Intersect | `snake` | lit only where both snakes overlap | crossing flashes (same motion, opposite directions), a fast spin visible only inside a slow window, glitter inside a comet (`rand` × `all`) |
| Add | `snake_brightness` + `mult_factor_increase` (`K(1)` solid or `L(0,1)` gradient) | both snakes visible, overlap brightest | twin comets, spinners over a spiral, searchlights at two tempos |
| Add, two colors | the same + `snake_hue` with the same head/tail | layer 2 in a second color | complementary comets (`offset 0.5`) |
| Shadow | `snake_brightness` + `mult_factor_decrease` (`K(0)` hard, `L(1,0)` soft) | a dark snake cuts through the light | "Eclipse": static full light with a dark orbit; soft ripples |
| Color band | `snake_hue` (`K(off)` or `L(0, off)`) | a moving band of shifted color | color rivers, aurora, one small ring per beat flipping color |

Rules:
- Each layer can use a **different path segment** (e.g. layer 1 on `all`, layer 2 on `centric`). They're separate effects on the same rings.
- Write layer 2 in **function form**, `addEffect((p: number) => ({ snake_brightness: { head: { linear: { start: p, end: p + 1 } }, … } }))`. `phase()` on a raw object offsets the brightness factor, not the head.
- Keep `snake_brightness` / `snake_hue` heads **≥ 0**: the renderer mishandles negative cyclic heads. For reversed motion use `linear(1+p → p)`, or steps with `first_step_value: 1 + p` and a negative `diff_per_step`.
- Cost: color + layer 1 + layer 2 = 3 effects per ring (+1 for `snake_hue` in a second color). A static layer 1 needs no effect.

The `layout-demo.html` panel 7 has presets, a gallery of every blend × layer pairing, and generated code.

## Four-part layouts

The same idea with **four parts, A–D**. Uses:
- **Four colors**: all lit together.
- **Round robin**: A, B, C, D, one beat each.
- **Pairs**: A+C against B+D on alternating beats.
- **Build-up**: A, then A+B, then A+B+C, then all, over 4 beats or 4 bars.

There are two ways to build them.

**1. 4-way splits**: a 4-way big split and/or a 4-way inside split.

| 4-way big split | Groups | Character |
|---|---|---|
| Quadrants | `[12,1,2]` `[3,4,5]` `[6,7,8]` `[9,10,11]` | four sides of the circle (top-right, bottom-right, bottom-left, top-left) |
| Triangles (every 4th) | `[1,5,9]` `[2,6,10]` `[3,7,11]` `[4,8,12]` | each group is a triangle; round robin spins a triangle around the circle |
| Alternate × left/right | right odd, right even, left odd, left even | alternation inside each half: two conversations at once |
| Alternate × top/bottom | top odd, top even, bottom odd, bottom even | the same for top and bottom |

| 4-way inside split | Recipe | Cost | Character |
|---|---|---|---|
| Quarter pinwheel | `ind` + quarter masks (small rings 0-2, 3-5, 6-8, 9-11) | 2 | each big ring cut into four quarters, the same way on every ring |
| Bands | `arc` + quarter masks | 2 | each small ring split into bands from inner-facing side to outer tip (uneven: 3/4/4/1 pixels) |
| Quartered small rings | `centric` + quarter masks (pixels 0-2, 3-5, 6-8, 9-11) | 2 | every small ring cut into four quarters |
| 4-color starfield | `rand` + quarter masks | 2 | four random, even quarters of all pixels |
| Compass | `updown` + quarter masks | 2 | small rings quartered by absolute direction (unconfirmed) |

Quarter masks (relPos in [0,0.25), [0.25,0.5), [0.5,0.75), [0.75,1)):

```ts
const q1 = { half: { f1: { half: { f1: on, f2: off } }, f2: off } };
const q2 = { half: { f1: { half: { f1: off, f2: on } }, f2: off } };
const q3 = { half: { f1: off, f2: { half: { f1: on, f2: off } } } };
const q4 = { half: { f1: off, f2: { half: { f1: off, f2: on } } } };
```

When both levels are used, combine them:
- **Rotate**: part = (group + quarter) mod 4. Every group shows all four parts shifted by one step, so round robin makes the pattern turn.
- **Counter-rotate**: part = (quarter − group) mod 4. Neighbouring groups seem to turn against each other.

**2. 2×2 cross**: any two-way big split (G1/G2) ⊗ any two-way inside split (s0/s1) from the two-part tables, so A = G1·s0, B = G1·s1, C = G2·s0, D = G2·s1. Pairs then read naturally: A+C vs B+D is the inside split, and A+B vs C+D is the big split. That lets one layout play both two-part ideas, for example alternate × inner/outer gives a zigzag on pairs and alternating rings on halves.

**Cost tip for four colors:** don't build four separate color layers. One color layer plus one `position_hue` with `steps` (`num_steps: 4, first_step_value: 0, diff_per_step: 0.25`) on the same segment gives four hues in 2 effects per ring. Add brightness masks only for the parts that need to switch off.

## How to design a layout

1. **Find the intent**: mood, energy, which part of the song, how many beats, any rings or colors the user named.
2. **Pick the base layer**: a color on the rings that should be lit. Every lit pixel needs a color layer, because brightness and motion layers only modulate it.
3. **Pick the spatial idea across rings**: all the same, mirrored halves, opposite pairs, a wave via `phase`, or a sweep / spread order.
4. **Pick the shape inside each ring**: choose the segment whose relPos mapping produces the motion you want (see the table). Different rings, or different layers, may use different segments.
5. **Add motion, brightness and hue layers** on top, timed to beats or cycles.
6. **Review the result as a viewer would**: does it read clearly from a distance, does it change on musically meaningful beats, and is there a contrast (in color, segment or timing) between the layers?

Before writing code, present the layout as a short per-ring / per-layer table. That makes it easy for the user to correct a choice early.

## Aesthetic rules

<!-- TODO(amir): list the parameters / rules that make an animation look good.
     For each rule, also write down *why* it matters. -->

## Output

<!-- TODO(amir): decide the output form(s): TS song code in src/songs/, preset JSON in presets/, UI timeline, or chat-only layout. -->
Until this is decided, describe the layout in chat and ask the user which form to write it in.
