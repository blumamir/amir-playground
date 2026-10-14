#!/usr/bin/env python3
"""Send a payload JSON to the sequence service and trigger it on the LEDs."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

PAYLOADS = Path(__file__).parent / "payloads"

SEQUENCE_IP = os.environ.get("SEQUENCE_SERVICE_IP", "10.0.1.200")
SEQUENCE_PORT = int(os.environ.get("SEQUENCE_SERVICE_PORT", "8082"))
TRIGGER_IP = os.environ.get("TRIGGER_SERVICE_IP", "10.0.1.200")
TRIGGER_PORT = int(os.environ.get("TRIGGER_SERVICE_PORT", "8083"))


def http_json(method: str, url: str, body: dict | None = None) -> None:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if data else {},
    )
    with urllib.request.urlopen(req, timeout=10) as res:
        print(f"{method} {url} -> {res.status}")


def resolve_payload(name: str) -> Path:
    path = Path(name)
    if path.exists():
        return path
    candidates = [
        PAYLOADS / name,
        PAYLOADS / f"{name}.json",
    ]
    for c in candidates:
        if c.exists():
            return c
    available = sorted(p.stem for p in PAYLOADS.glob("*.json"))
    print(f"Payload not found: {name}", file=sys.stderr)
    print("Available:", ", ".join(available), file=sys.stderr)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Send an LED test payload")
    parser.add_argument(
        "payload",
        nargs="?",
        help="Payload name or path (omit to list)",
    )
    parser.add_argument(
        "--trigger-name",
        default="amir-playground",
        help="Trigger name to register/fire (default: amir-playground)",
    )
    parser.add_argument(
        "--no-trigger",
        action="store_true",
        help="Only upload the sequence, do not fire the trigger",
    )
    args = parser.parse_args()

    if not args.payload:
        files = sorted(PAYLOADS.glob("*.json"))
        if not files:
            print("No payloads yet. Run: python3 build_payloads.py")
            sys.exit(1)
        print("Available payloads:")
        for f in files:
            print(f"  {f.stem}")
        print("\nUsage: python3 send.py <name>")
        return

    path = resolve_payload(args.payload)
    sequence = json.loads(path.read_text())
    trigger = args.trigger_name

    seq_url = f"http://{SEQUENCE_IP}:{SEQUENCE_PORT}/triggers/{trigger}"
    trig_url = f"http://{TRIGGER_IP}:{TRIGGER_PORT}/trigger/{trigger}"

    print(f"Sending {path.name} as trigger '{trigger}'...")
    try:
        http_json("PUT", seq_url, sequence)
        if not args.no_trigger:
            http_json("POST", trig_url, {"start_offset_ms": 0})
            print("Playing.")
        else:
            print("Uploaded (not triggered).")
    except urllib.error.URLError as e:
        print(f"Request failed: {e}", file=sys.stderr)
        print(
            f"Check SEQUENCE_SERVICE_IP/TRIGGER_SERVICE_IP "
            f"(currently {SEQUENCE_IP} / {TRIGGER_IP})",
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
