---
name: graphy
description: Render graphs in a React app using @graphysdk/viz-engine and @graphysdk/react-canvas-renderer. Use this skill when the user asks to add a graph, chart, visualize data, or integrate Graphy. Covers private-registry auth, package setup, the GraphConfig API, and a minimal Pixi-backed React component tree.
---

# Graphy — render graphs in a React app

This skill walks through integrating **Graphy** (a renderer-agnostic graphing library) into an existing React app using the WebGL/Canvas renderer (Pixi.js under the hood). It uses the declarative `GraphConfig` API — the simplest way to author a graph.

The skill is model-invocable: Claude / GPT / Gemini / etc. will pick it up automatically when you ask things like *"add a graph that shows monthly revenue"* or *"visualize this dataset"*. You can also invoke it explicitly with the slash trigger — `/graphy` if installed via the [`skills` CLI](https://github.com/vercel-labs/skills), or `/graphy:sdk` if installed via the Claude Code plugin marketplace.

---

## Goal: ship a working graph in this session

**Don't stop at "I've added the code."** The point of this skill is for the user to *see* a graph rendering in their browser before the conversation ends. So:

1. Walk all the way through Steps 1–5 — auth, install, Pixi setup, component, render call.
2. **Pick concrete data and a concrete chart type and render it.** If the user gave you a dataset, use it. If they didn't, use one of the examples below and tell them you're using sample data they can swap out later.
3. After wiring everything up, **start their dev server (or the existing one) and open the page so they can see the graph**. If you can't open a browser, give them the exact URL to load and confirm what they should see (axes, bars, legend, etc.).
4. If something blocks rendering — missing token, wrong React version, Pixi init error — solve it before moving on. Don't paper over errors with TODOs.

Be proactive. The user came here to see a chart, not to read a long markdown file.

---

## Prerequisites

- React **19+**
- Node **20+**
- A browser environment that can run Pixi.js (any modern browser)
- A **Graphy npm access token** — provided to you by Graphy. The two SDK packages are private.

---

## Step 1 — Configure private-registry authentication

The `@graphysdk/*` packages are private. Without auth configured, `npm install` will return **404**.

### If you already have an `NPM_TOKEN` env var

Skip ahead to Step 2. Make sure your project's `.npmrc` maps the `@graphysdk` scope (the snippet below).

### If you don't yet have it set up

1. Export the token in your shell (and your CI environment):

   ```bash
   export NPM_TOKEN=<the-token-graphy-gave-you>
   ```

2. Create or update **`.npmrc`** in the root of your project:

   ```
   @graphysdk:registry=https://registry.npmjs.org/
   //registry.npmjs.org/:_authToken=${NPM_TOKEN}
   ```

   The `${NPM_TOKEN}` placeholder is interpolated by npm/pnpm/yarn/bun at install time — do **not** commit the literal token. If you must inline a token (e.g. for a CI image), make sure `.npmrc` is in `.gitignore`.

> **Troubleshooting:** A 404 on `pnpm add @graphysdk/...` (or any package manager) almost always means the token is missing or the scope isn't mapped. Double-check `echo $NPM_TOKEN` is non-empty and that `.npmrc` exists in the project root.

---

## Step 2 — Install the packages

> **Critical: use the `@alpha` tag.** The SDK packages are currently published on the alpha channel only. Without `@alpha` the install will resolve nothing or pin a non-functional version, and the integration will fail. Always pass `@alpha` for both `@graphysdk/viz-engine` and `@graphysdk/react-canvas-renderer`.

Detect the customer's package manager from the lockfile (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`) and run the matching command.

```bash
# pnpm
pnpm add @graphysdk/react-canvas-renderer@alpha @graphysdk/viz-engine@alpha pixi.js zustand

# npm
npm install @graphysdk/react-canvas-renderer@alpha @graphysdk/viz-engine@alpha pixi.js zustand

# yarn
yarn add @graphysdk/react-canvas-renderer@alpha @graphysdk/viz-engine@alpha pixi.js zustand

# bun
bun add @graphysdk/react-canvas-renderer@alpha @graphysdk/viz-engine@alpha pixi.js zustand
```

Peer-dep notes:
- `pixi.js` ≥ 8 — required, included above.
- `zustand` ≥ 5.0.12 — required, included above. Customers easily miss this one because it's not the kind of dep you'd guess from the package name.
- `react` ≥ 19 — required, but assumed already present in the customer's React app. If they're on React 18 or older, the integration won't work — tell them they need to upgrade.
- No CSS imports needed — the renderer is pure Pixi/Canvas, not DOM.

---

## Step 3 — Set up (or reuse) a Pixi `Application`

Graphy mounts its rendered output as a Pixi sub-tree under a **parent `Container`** that you own. So the integration depends on whether you already have a Pixi `Application` in your app.

**Before writing any setup code, check the project for an existing Pixi app** — search for `new Application(` or `from 'pixi.js'`. If you find one, **ask the user** whether to:
1. Reuse the existing app and mount the graph under `app.stage` (or some other existing `Container`), or
2. Create a new dedicated `Application` for the graph.

Don't assume. The right choice depends on the app's architecture (board/canvas tools usually want option 1; a one-off graph in a dashboard usually wants option 2).

### If you need a fresh Pixi `Application`

The minimal setup looks like this:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';

export function usePixiApp(width: number, height: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [app, setApp] = useState<Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    const instance = new Application();

    instance
      .init({
        canvas: canvasRef.current,
        width,
        height,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        backgroundAlpha: 0,
      })
      .then(() => {
        if (cancelled) instance.destroy(true);
        else setApp(instance);
      });

    return () => {
      cancelled = true;
      instance.destroy(true);
    };
  }, [width, height]);

  return { canvasRef, app };
}
```

You own the lifecycle of the `Application`. Graphy will only manage its own sub-tree under whichever `Container` you pass as `parent`.

---

## Step 4 — Render a graph with `GraphConfig`

A `GraphConfig` is a plain JSON-shaped object describing what to draw. The renderer compiles it internally — you don't need to call any compiler yourself.

The component tree is intentionally tiny: one `<GraphRenderer>` wired up to your Pixi `Application`'s stage.

```tsx
import { GraphRenderer, darkPixiTheme } from '@graphysdk/react-canvas-renderer';
import type { GraphConfig } from '@graphysdk/viz-engine';

interface GraphCanvasProps {
  spec: GraphConfig;
  width: number;
  height: number;
}

export function GraphCanvas({ spec, width, height }: GraphCanvasProps) {
  const { canvasRef, app } = usePixiApp(width, height);

  return (
    <>
      <canvas ref={canvasRef} style={{ width, height }} />
      {app && (
        <GraphRenderer
          parent={app.stage}
          spec={spec}
          width={width}
          height={height}
          theme={darkPixiTheme}
        />
      )}
    </>
  );
}
```

`<GraphRenderer>` props (the public API):

| Prop | Type | Notes |
|---|---|---|
| `parent` | `pixi.Container` | Where the graph mounts. Usually `app.stage`. You own it. |
| `spec` | `GraphConfig` (or `SpecInput`) | The graph definition. Auto-detected. |
| `width` | `number` | Canvas width in CSS pixels. |
| `height` | `number` | Canvas height in CSS pixels. |
| `theme` | `PixiGraphTheme` | `darkPixiTheme` or `lightPixiTheme` from `@graphysdk/react-canvas-renderer`. |
| `pixelRatio` | `number?` | Optional. Defaults to `window.devicePixelRatio`. Pass `parentZoom * devicePixelRatio` if your parent `Container` is scaled, to keep text crisp. |
| `formattingLocale` | `Locale?` | Optional locale for number/date formatting. |

> **Note:** `<GraphProvider>` is exported from the package but **not required** for plain rendering. It's only useful if you want to dispatch runtime commands (set legend position, etc.) from elsewhere in your React tree. Skip it for the basic case.

### Example A — Column graph: revenue vs. expenses

```tsx
import type { GraphConfig } from '@graphysdk/viz-engine';

const revenueGraph: GraphConfig = {
  data: {
    columns: [
      { key: 'month', label: 'Month' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'expenses', label: 'Expenses' },
    ],
    rows: [
      { month: 'Jan', revenue: 1200, expenses: 800 },
      { month: 'Feb', revenue: 1500, expenses: 900 },
      { month: 'Mar', revenue: 1100, expenses: 750 },
      { month: 'Apr', revenue: 1800, expenses: 1000 },
      { month: 'May', revenue: 2000, expenses: 1100 },
    ],
  },
  type: 'column',
  axes: {
    x: { label: 'Month' },
    y: { label: 'Amount ($)' },
    showGridLines: true,
  },
  legend: { position: 'right' },
};

// ...
<GraphCanvas spec={revenueGraph} width={640} height={400} />
```

---

## Step 5 — A second example, to show the API generalizes

Same component tree, just a different `GraphConfig`. The renderer reacts to `spec` changes — swap one for the other and you're done.

### Example B — Line graph with a dual y-axis

```tsx
const trafficGraph: GraphConfig = {
  data: {
    columns: [
      { key: 'week', label: 'Week' },
      { key: 'visitors', label: 'Visitors' },
      { key: 'conversionRate', label: 'Conversion %' },
    ],
    rows: [
      { week: 'W1', visitors: 4200, conversionRate: 2.4 },
      { week: 'W2', visitors: 5100, conversionRate: 2.8 },
      { week: 'W3', visitors: 4800, conversionRate: 3.1 },
      { week: 'W4', visitors: 6300, conversionRate: 3.6 },
      { week: 'W5', visitors: 7100, conversionRate: 4.2 },
    ],
  },
  type: 'line',
  axes: {
    x: { label: 'Week' },
    y: { label: 'Visitors' },
    y2: { label: 'Conversion %' },
    hasDualYAxis: true,
    showGridLines: true,
  },
  options: { isSmoothLine: true, showPoints: true },
  headlineNumbers: { show: 'current', compareWith: 'previous', size: 'medium' },
};

// ...
<GraphCanvas spec={trafficGraph} width={640} height={400} />
```

---

## `GraphConfig` at a glance

The full type is the source of truth (it lives in `@graphysdk/viz-engine`'s exports as `GraphConfig`). Top-level fields:

| Field | Purpose |
|---|---|
| `data` | `{ columns, rows }`. `columns` declares each variable's `key` (used in `rows`) and human `label`. `rows` is an array of objects keyed by column key. Values can be `number`, `string`, `Date`, or `null` (missing). |
| `type` | The graph type. See supported list below. |
| `axes` | `x` / `y` / `y2` axis options (label, min, max, scaleType, isReversed, isHidden, tickDisplayMode), `hasDualYAxis`, `showGridLines`. |
| `legend` | `position`: `'auto' \| 'top' \| 'right' \| 'none'`. |
| `appearance` | Background, rounded corners, number formatting (`decimalPlaces`, `abbreviation`), tooltip toggle, animation toggle, text scale. **Do not set `paletteId` or `seriesStyles` — palettes and per-series colors are not yet supported.** The default palette renders out of the box. |
| `options` | Type-specific tuning: `isSmoothLine`, `showPoints`, `missingValues`, `sortBars`, `pointSize`, `comboType`, `pieTotalPosition`. |
| `headlineNumbers` | KPI badge: `show` (`'current' \| 'average' \| 'total' \| 'conversion' \| 'none'`), `compareWith` (`'previous' \| 'first' \| 'none'`), `size`. |
| `dataLabels` | `showDataLabels`, `dataLabelFormat`, `showStackTotals`, `showCategoryLabels`. |
| `referenceLines` | `goalLine` (target value with optional marker/label), `trendline` (linear/loess/exponential/…), `averageLine`. |
| `content` | `title`, `subtitle`, `caption`, `source` (label + url), each with a corresponding `is*Hidden` toggle. |

### Supported `type` values

**Currently supported** (render correctly):
`'line'`, `'areaStacked'`, `'bar'`, `'barStacked'`, `'barStackedFill'`, `'column'`, `'columnStacked'`, `'columnStackedFill'`, `'pie'`, `'donut'`, `'scatter'`, `'bubble'`, `'combo'`.

**Not yet implemented in this version of the SDK** (the `GraphType` union lists them but they will throw `"Unsupported graph type"` at runtime — and dropping down to `SpecInput` won't help, no renderer is wired up for them yet):
`'funnel'`, `'heatmap'`, `'waterfall'`, `'mekko'`, `'table'`.

---

## Common pitfalls

- **`404 Not Found` on install** → npm auth isn't set up. Re-check Step 1: `NPM_TOKEN` env var, `.npmrc` scope mapping.
- **Install resolves a wrong version (or empty install)** → you forgot `@alpha`. The SDK is published on the alpha tag only. Re-run install with `@graphysdk/react-canvas-renderer@alpha @graphysdk/viz-engine@alpha`.
- **Runtime error mentioning `zustand` / `useStore`** → `zustand` peer dep is missing. Add it: `pnpm add zustand` (or equivalent).
- **`Unsupported graph type` runtime error** → the `type` is one of `funnel`, `heatmap`, `waterfall`, `mekko`, `table`. These aren't implemented yet — pick a supported type from the list above.
- **User asks for custom colors / a specific palette / branded styling** → not supported yet. Tell them honestly: per-series colors, `paletteId`, and `seriesStyles` aren't wired up in this version. The default palette renders out of the box; styling will land in a later release.
- **Blank graph for a frame on first render** → expected. `<GraphRenderer>` returns `null` until `document.fonts.ready` resolves so tick labels and titles use real font metrics. Plan layout accordingly (it's typically <100ms).
- **Blurry text under a zoomed parent `Container`** → pass `pixelRatio={parentZoom * window.devicePixelRatio}` to keep text textures crisp. Default is `window.devicePixelRatio` only.
- **Pixi cleanup is your responsibility.** Graphy cleans up its own sub-tree on unmount, but the surrounding `Application` is yours to destroy.

---

## Verification (do this, don't skip it)

You aren't done until the graph is on screen. Specifically:

1. Make sure the dev server is running (`pnpm dev` / `npm run dev` / etc.) — start it if it isn't.
2. Open the page that mounts `<GraphCanvas>`. Confirm a column or line graph renders with axes, gridlines, and legend in the default palette.
3. If you can drive the browser, do so and report what you see. If you can't, ask the user to load the URL and tell you what's there.
4. If nothing renders, debug it now: check the browser console for errors, verify `app.stage` is non-null when `<GraphRenderer>` mounts, and re-check `@alpha` was on the install command.

A successful Graphy integration looks like a chart, not a passing typecheck.

---

## When you outgrow `GraphConfig`

`GraphConfig` is the easy front door. For more control — annotations (stickers, text, arrows, shapes), custom theme overrides, per-series styling, more flexible reference lines, or programmatic spec composition — drop down to the lower-level `SpecInput` builder API exported from `@graphysdk/viz-engine`:

```ts
import { createSpec, geom, mapping, scale, pipe } from '@graphysdk/viz-engine';
```

`<GraphRenderer>` accepts a `SpecInput` exactly the same way it accepts a `GraphConfig`.

Note: `SpecInput` does **not** unlock the graph types listed as "not yet implemented" above — it gives you more *control* over the supported ones.
