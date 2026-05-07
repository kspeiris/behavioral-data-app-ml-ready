# Feature Extraction Setup

This step converts raw browser events into the session-level features needed for machine learning.

## 1. Export raw data from Google Sheets

1. Open your Google Sheet.
2. Open the `RawEvents` tab.
3. Click **File → Download → Comma-separated values (.csv)**.
4. Rename the downloaded file to:

```text
raw_events.csv
```

## 2. Install Python requirements

From the project root:

```bash
pip install -r processing/requirements.txt
```

## 3. Generate the processed ML CSV

For human sessions:

```bash
python processing/feature_extraction.py --input raw_events.csv --output processed_human.csv --label human
```

For bot sessions:

```bash
python processing/feature_extraction.py --input raw_events.csv --output processed_bot.csv --label bot
```

For mixed sessions, create a labels CSV:

```csv
session_id,label
sess-abc123,human
sess-def456,bot
```

Then run:

```bash
python processing/feature_extraction.py \
  --input raw_events.csv \
  --output processed_dataset.csv \
  --labels-file session_labels.csv
```

## Output columns

```text
session_id,avg_mouse_speed,click_frequency,avg_click_interval,typing_speed,avg_key_interval,session_duration,scroll_speed,task_completion_time,label
```

## Feature meanings

| Feature | Meaning | Unit |
|---|---|---|
| `avg_mouse_speed` | Average mouse movement speed | pixels/second |
| `click_frequency` | Number of clicks divided by session duration | clicks/second |
| `avg_click_interval` | Average time between clicks | milliseconds |
| `typing_speed` | Number of keydown events divided by session duration | keys/second |
| `avg_key_interval` | Average time between keydown events | milliseconds |
| `session_duration` | Last raw event timestamp minus first timestamp | milliseconds |
| `scroll_speed` | Average absolute scroll position change | pixels/second |
| `task_completion_time` | From session/page start to search submit or finish | milliseconds |
| `label` | Human/bot class label | `human`, `bot`, or `unlabeled` |

## Test with sample data

```bash
python processing/feature_extraction.py \
  --input data_samples/raw_events_sample.csv \
  --output data_samples/processed_sample.csv \
  --labels-file data_samples/session_labels_sample.csv
```
