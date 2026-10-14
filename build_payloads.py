#!/usr/bin/env python3
"""Build simple LED test payloads (const_color + timed/position/snake modifiers)."""

from __future__ import annotations

import json
from pathlib import Path

DUR = 10_000  # ms
RINGS = 12
OUT = Path(__file__).parent / "payloads"


def cfg(segments: str = "all", *, repeats: float | None = None) -> dict:
    c: dict = {"segments": segments, "start_time": 0, "end_time": DUR}
    if repeats is not None:
        c.update(repeat_num=repeats, repeat_start=0, repeat_end=1)
    return c


def const_color(hue: float, sat: float = 1.0, val: float = 1.0) -> dict:
    return {
        "effect_config": cfg(),
        "const_color": {"color": {"hue": hue, "sat": sat, "val": val}},
    }


def ring_seq(*effects: dict) -> dict:
    return {"effects": list(effects), "duration_ms": DUR, "num_repeats": 0}


def all_rings(*effects: dict) -> dict:
    return {f"ring{i}": ring_seq(*effects) for i in range(1, RINGS + 1)}


def write(name: str, payload: dict) -> None:
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"wrote {path}")


# HSV hues: 0=red, 0.33=green, 0.66=blue, 0.83=magenta
PAYLOADS = {
    # Sanity: solid color, no modifiers
    "01_const_color_red": all_rings(const_color(0.0)),
    "02_const_color_green": all_rings(const_color(0.33)),
    "03_const_color_blue": all_rings(const_color(0.66)),

    # timed_*
    "10_timed_brightness_fade": all_rings(
        const_color(0.0),
        {
            "effect_config": cfg(repeats=4),
            "timed_brightness": {
                "mult_factor_decrease": {"linear": {"start": 0.0, "end": 1.0}},
            },
        },
    ),
    "11_timed_hue_shift": all_rings(
        const_color(0.0),
        {
            "effect_config": cfg(repeats=2),
            "timed_hue": {
                "offset_factor": {"linear": {"start": 0.0, "end": 1.0}},
            },
        },
    ),
    "12_timed_saturation_pulse": all_rings(
        const_color(0.83),
        {
            "effect_config": cfg(repeats=4),
            "timed_saturation": {
                "mult_factor_decrease": {"linear": {"start": 0.2, "end": 1.0}},
            },
        },
    ),

    # position_*
    "20_position_brightness_gradient": all_rings(
        const_color(0.55),
        {
            "effect_config": cfg(),
            "position_brightness": {
                "mult_factor_decrease": {"linear": {"start": 1.0, "end": 0.0}},
            },
        },
    ),
    "21_position_hue_gradient": all_rings(
        const_color(0.0),
        {
            "effect_config": cfg(),
            "position_hue": {
                "offset_factor": {"linear": {"start": 0.0, "end": 0.5}},
            },
        },
    ),
    "22_position_saturation_gradient": all_rings(
        const_color(0.33),
        {
            "effect_config": cfg(),
            "position_saturation": {
                "mult_factor_decrease": {"linear": {"start": 1.0, "end": 0.1}},
            },
        },
    ),

    # snake_*
    "30_snake_brightness": all_rings(
        const_color(0.1),
        {
            "effect_config": cfg(repeats=6),
            "snake_brightness": {
                "head": {"linear": {"start": 0.0, "end": 1.0}},
                "tail_length": {"const_value": {"value": 0.35}},
                "cyclic": True,
                "mult_factor_decrease": {"linear": {"start": 1.0, "end": 0.0}},
            },
        },
    ),
    "31_snake_hue": all_rings(
        const_color(0.5),
        {
            "effect_config": cfg(repeats=6),
            "snake_hue": {
                "head": {"linear": {"start": 0.0, "end": 1.0}},
                "tail_length": {"const_value": {"value": 0.4}},
                "cyclic": True,
                "offset_factor": {"linear": {"start": 0.0, "end": 0.25}},
            },
        },
    ),
    "32_snake_saturation": all_rings(
        const_color(0.75),
        {
            "effect_config": cfg(repeats=6),
            "snake_saturation": {
                "head": {"linear": {"start": 0.0, "end": 1.0}},
                "tail_length": {"const_value": {"value": 0.4}},
                "cyclic": True,
                "mult_factor_decrease": {"linear": {"start": 1.0, "end": 0.15}},
            },
        },
    ),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, payload in PAYLOADS.items():
        write(name, payload)


if __name__ == "__main__":
    main()
