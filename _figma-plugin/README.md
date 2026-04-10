# Bartender — Figma Plugin

Syncs Google Sheets or JSON data into Figma component frames,
driving bar heights and candle dimensions from real data values.

---

## Setup

### 1. Compile the TypeScript

Install the Figma plugin typings and compile `code.ts`:

```bash
npm install --save-dev @figma/plugin-typings typescript
npx tsc code.ts --target es2017 --lib es2017 --outDir . --skipLibCheck
```

This produces `code.js` which the manifest references.

Alternatively, use the [Figma Plugin DS Webpack starter](https://github.com/thomas-lowry/figma-plugin-ds-svelte)
or just rename `code.ts` → `code.js` if you remove the TypeScript type annotations manually.

### 2. Load in Figma

- Open Figma Desktop
- Plugins → Development → Import plugin from manifest…
- Select this folder's `manifest.json`

---

## Naming Convention (Figma components)

All nodes are matched by **name**. The plugin does a deep search inside
each `[chart] <ID>` container, so nesting depth doesn't matter.

### Bar chart

```
Frame: [chart] Revenue          ← container; chartId = "Revenue"
└── (any Auto Layout structure)
    ├── Frame: bar__Q1          ← height driven by data value
    ├── Text:  label__Q1        ← set to label string or key
    ├── Text:  value__Q1        ← set to "72.6%"
    ├── Frame: bar__Q2
    └── ...
```

### Candlestick chart

```
Frame: [chart] AAPL Daily
└── (any structure)
    ├── Frame: candle_wick__Mon  ← height = (high - low) / 100 * scale
    ├── Frame: candle_body__Mon  ← height = |close - open| / 100 * scale
    ├── Text:  label__Mon
    └── ...
```

Candle body/wick colors:
- Bullish (close ≥ open): `#2ecc71` green
- Bearish  (close < open): `#e8364a` red

---

## Scale

`scale` = pixels per 100 units (default: 1000).

| Scale | 72.6% → px |
|-------|------------|
| 1000  | 726 px     |
| 800   | 580.8 px   |
| 500   | 363 px     |

Set the scale to match your component's maximum bar height.

---

## JSON Schema

### Bar chart

```json
{
  "charts": [
    {
      "type": "bar",
      "chartId": "Revenue",
      "scale": 1000,
      "data": {
        "Q1": 42.5,
        "Q2": 68.1,
        "Q3": 72.6,
        "Q4": 91.0
      },
      "labels": {
        "Q1": "Jan–Mar",
        "Q2": "Apr–Jun",
        "Q3": "Jul–Sep",
        "Q4": "Oct–Dec"
      }
    }
  ]
}
```

### Candlestick chart

```json
{
  "charts": [
    {
      "type": "candle",
      "chartId": "AAPL Daily",
      "scale": 800,
      "data": {
        "Mon": { "open": 48.2, "close": 61.7, "high": 65.0, "low": 44.1, "label": "Mon" },
        "Tue": { "open": 61.7, "close": 55.3, "high": 63.2, "low": 52.1, "label": "Tue" }
      }
    }
  ]
}
```

Multiple chart types can be combined in a single `charts` array and
synced in one operation.

---

## Google Sheets

1. Open your sheet → File → Share → Publish to web → CSV
2. Copy the published CSV URL
3. In the plugin, switch to **Google Sheets** tab
4. Paste the URL, enter the Chart ID, pick chart type and scale
5. Click **Fetch & Preview** — the JSON is built automatically
6. Click **Sync Charts**

### Sheet column layout — bar chart

| key | value | label    |
|-----|-------|----------|
| Q1  | 42.5  | Jan–Mar  |
| Q2  | 72.6  | Apr–Jun  |

### Sheet column layout — candlestick

| key | open | close | high | low  | label |
|-----|------|-------|------|------|-------|
| Mon | 48.2 | 61.7  | 65.0 | 44.1 | Mon   |

Column names are case-insensitive. `key` is required; `label` is optional.

---

## Plugin Metadata

The plugin stores binding data on nodes via `setPluginData`:

- On the chart container: `chartType`, `lastSync`
- On each bar/candle frame: `chartId`, `dataKey`, `dataValue`

Use **↺ Scan Page** to inspect all bound charts and their last sync time.
