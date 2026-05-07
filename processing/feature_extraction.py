#!/usr/bin/env python3
"""
Convert raw browser interaction events into one ML-ready feature row per session.

Input raw CSV columns expected:
  session_id,event_type,timestamp,x,y,key,element,target_value,page,received_at

Output processed CSV columns:
  session_id,avg_mouse_speed,click_frequency,avg_click_interval,typing_speed,
  avg_key_interval,session_duration,scroll_speed,task_completion_time,label

Units:
  - timestamps: milliseconds since epoch
  - session_duration/task_completion_time: milliseconds
  - avg_mouse_speed: pixels per second
  - click_frequency: clicks per second
  - typing_speed: keydown events per second
  - scroll_speed: pixels per second, based on scroll position changes
  - average intervals: milliseconds
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Dict, Optional

import pandas as pd

RAW_REQUIRED_COLUMNS = [
    "session_id",
    "event_type",
    "timestamp",
    "x",
    "y",
    "key",
    "element",
    "target_value",
]

OUTPUT_COLUMNS = [
    "session_id",
    "avg_mouse_speed",
    "click_frequency",
    "avg_click_interval",
    "typing_speed",
    "avg_key_interval",
    "session_duration",
    "scroll_speed",
    "task_completion_time",
    "label",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create ML features from raw behavioral event CSV.")
    parser.add_argument("--input", required=True, help="Path to raw events CSV downloaded from Google Sheets.")
    parser.add_argument("--output", required=True, help="Path to write processed ML CSV.")
    parser.add_argument(
        "--label",
        default="unlabeled",
        help="Default label for all sessions, e.g. human or bot. Default: unlabeled.",
    )
    parser.add_argument(
        "--labels-file",
        default=None,
        help="Optional CSV with columns session_id,label. Overrides --label for matching sessions.",
    )
    return parser.parse_args()


def safe_number(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def load_labels(path: Optional[str]) -> Dict[str, str]:
    if not path:
        return {}
    labels_df = pd.read_csv(path)
    if not {"session_id", "label"}.issubset(labels_df.columns):
        raise ValueError("labels file must contain session_id,label columns")
    return dict(zip(labels_df["session_id"].astype(str), labels_df["label"].astype(str)))


def average_interval_ms(timestamps: pd.Series) -> float:
    values = timestamps.dropna().sort_values().to_numpy()
    if len(values) < 2:
        return 0.0
    intervals = pd.Series(values).diff().dropna()
    return float(intervals.mean()) if len(intervals) else 0.0


def mouse_speed_px_per_sec(mouse_df: pd.DataFrame) -> float:
    points = mouse_df[["timestamp", "x", "y"]].dropna().sort_values("timestamp")
    if len(points) < 2:
        return 0.0

    total_distance = 0.0
    total_time_ms = 0.0
    prev = None
    for row in points.itertuples(index=False):
        if prev is not None:
            dt = float(row.timestamp - prev.timestamp)
            if dt > 0:
                dx = float(row.x - prev.x)
                dy = float(row.y - prev.y)
                total_distance += math.hypot(dx, dy)
                total_time_ms += dt
        prev = row

    if total_time_ms <= 0:
        return 0.0
    return float(total_distance / (total_time_ms / 1000.0))


def scroll_speed_px_per_sec(scroll_df: pd.DataFrame) -> float:
    points = scroll_df[["timestamp", "y"]].dropna().sort_values("timestamp")
    if len(points) < 2:
        return 0.0

    total_distance = 0.0
    total_time_ms = 0.0
    prev = None
    for row in points.itertuples(index=False):
        if prev is not None:
            dt = float(row.timestamp - prev.timestamp)
            if dt > 0:
                total_distance += abs(float(row.y - prev.y))
                total_time_ms += dt
        prev = row

    if total_time_ms <= 0:
        return 0.0
    return float(total_distance / (total_time_ms / 1000.0))


def task_completion_time_ms(group: pd.DataFrame) -> float:
    start_events = group[group["event_type"].isin(["session_start", "page_view"])]
    finish_events = group[group["event_type"].isin(["search_submit", "session_finish"])]

    start = start_events["timestamp"].min() if not start_events.empty else group["timestamp"].min()
    finish = finish_events["timestamp"].max() if not finish_events.empty else group["timestamp"].max()

    if pd.isna(start) or pd.isna(finish):
        return 0.0
    return max(0.0, float(finish - start))


def features_for_session(session_id: str, group: pd.DataFrame, label: str) -> dict:
    group = group.sort_values("timestamp")
    first_ts = group["timestamp"].min()
    last_ts = group["timestamp"].max()
    session_duration = max(0.0, float(last_ts - first_ts)) if not pd.isna(first_ts) and not pd.isna(last_ts) else 0.0
    duration_sec = session_duration / 1000.0 if session_duration > 0 else 0.0

    mouse_df = group[group["event_type"] == "mousemove"]
    click_df = group[group["event_type"] == "click"]
    key_df = group[group["event_type"] == "keydown"]
    scroll_df = group[group["event_type"] == "scroll"]

    click_count = len(click_df)
    key_count = len(key_df)

    return {
        "session_id": session_id,
        "avg_mouse_speed": round(mouse_speed_px_per_sec(mouse_df), 6),
        "click_frequency": round(click_count / duration_sec, 6) if duration_sec > 0 else 0.0,
        "avg_click_interval": round(average_interval_ms(click_df["timestamp"]), 6),
        "typing_speed": round(key_count / duration_sec, 6) if duration_sec > 0 else 0.0,
        "avg_key_interval": round(average_interval_ms(key_df["timestamp"]), 6),
        "session_duration": round(session_duration, 6),
        "scroll_speed": round(scroll_speed_px_per_sec(scroll_df), 6),
        "task_completion_time": round(task_completion_time_ms(group), 6),
        "label": label,
    }


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    raw = pd.read_csv(input_path)
    missing = [col for col in RAW_REQUIRED_COLUMNS if col not in raw.columns]
    if missing:
        raise ValueError(f"Missing required raw CSV columns: {missing}")

    raw["session_id"] = raw["session_id"].astype(str)
    raw["event_type"] = raw["event_type"].astype(str)
    raw["timestamp"] = safe_number(raw["timestamp"])
    raw["x"] = safe_number(raw.get("x", pd.Series(dtype=float)))
    raw["y"] = safe_number(raw.get("y", pd.Series(dtype=float)))
    raw = raw.dropna(subset=["session_id", "event_type", "timestamp"])

    labels = load_labels(args.labels_file)
    rows = []
    for session_id, group in raw.groupby("session_id"):
        label = labels.get(str(session_id), args.label)
        rows.append(features_for_session(str(session_id), group, label))

    output_df = pd.DataFrame(rows, columns=OUTPUT_COLUMNS)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_csv(output_path, index=False)
    print(f"Wrote {len(output_df)} session rows to {output_path}")


if __name__ == "__main__":
    main()
