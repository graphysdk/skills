---
name: graphy-charts
description: Build highly expressive charts with Graphy's viz stack (@graphysdk/viz-engine, @graphysdk/react-renderer). Also covers installing and setting up the SDK in a React codebase.
---

# graphy-charts

Build charts with `@graphysdk/viz-engine` (a grammar-of-graphics compiler, framework-agnostic) and `@graphysdk/react-renderer` (paints the compiled output to SVG/DOM in React).

## Mental model

The engine is a grammar of graphics in the ggplot2 / Vega-Lite tradition. You do not pick a chart type from a menu; you compose one from orthogonal primitives:

- A **layer** = a **geom** (mark kind: `point`, `line`, `area`, `bar`, `rule`) + an **aesthetic mapping** (data variable → visual channel) + a **stat** (per-layer reshape: `count`, `sum`, `mean`, `smooth`) + a **position adjuster** (`identity`, `stack`, `dodge`, `fill`).
- Chart types are compositions: a pie chart is `bar` + `position: 'fill'` + `coord.polar({ theta: 'y' })`; a donut adds `innerRadius`; a horizontal bar chart is `coord.flip()`; a radar chart is `line`/`area` + `coord.polar({ theta: 'x' })`.
- A reference line is `geom.rule()`. A trendline is `stat.smooth`. An average line is `stat.mean`.
- **Transforms** reshape data declaratively inside the spec: `transform.filter`, `transform.sort`, `transform.aggregate`, `transform.reshape` (wide→long), `transform.constant`. Prefer them over preprocessing `rows` with vanilla JS. Full option tables in `reference/spec-api.md`.
- **Scales** map data to visual values; **guides** (axes, legends, headline numbers) make scales legible. Calling `scale.x()` / `scale.y()` with no arguments infers the scale type from the data. Add a scale for every mapped positional aesthetic; `color` gets a default palette scale automatically.
- A **stylesheet** (`styles({ tokens, defaults, overrides })`) is a spec item like any other and owns **all paint**: mark fill/border/stroke/size, grid and tick lines, panel border, graph background, label typography (`reference/styling.md`).
- **Highlights** (predicate-driven emphasis) and **annotations** (arrows, text, shapes, images, …) are spec-level and serializable — the storytelling layer.

Data flows one way: raw `Data` → resolved `Spec` (defaults applied, types inferred, the authored stylesheet folded onto the built-in one) → `CompiledSpec` (render-ready, paint resolved per observation) → painted React output. You author the first step; the rest is automatic.

## Minimal chart

```tsx
import { createSpec, pipe, mapping, geom, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 1200 },
    { month: 'Feb', revenue: 1850 },
    { month: 'Mar', revenue: 1600 },
  ],
};

const input = pipe(createSpec(), mapping({ x: 'month', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

export function RevenueChart() {
  return (
    <GraphProvider data={data} input={input}>
      <GraphRenderer />
    </GraphProvider>
  );
}
```

This assumes the SDK is installed from npm and built by a bundler (`reference/install.md`). The
same chart also runs on a plain HTML page with no bundler, loading the SDK from a CDN URL — only
the imports change (`reference/cdn.md`).

## The expressiveness ladder

1. **Spec + `config()`** — chart structure and chart-level options: layers, scales, coords, legend/axes settings, titles, headline numbers, number formats, layout.
2. **Stylesheet** — pipe `styles({ ... })` into the spec to repaint anything the chart itself draws: mark fill/border/stroke/size, grid and tick lines, panel border, graph background, axis/tick/data-label typography. Predicate- and state-aware, serializable. This is the primary restyling tier — `reference/styling.md`.
3. **Theme tokens** — pass `themeOverrides` to `GraphProvider` for the HTML chrome *around* the plot only: legend, tooltip, headline, footer, default font family. React-only, not serializable.
4. **Slots** — replace whole regions (header, footer, tooltip, legend, grid, axis ticks, swatch) with your own React components via the `slots` prop on `GraphRenderer`.
5. **Plugins** — change how marks are painted (render-only override of a built-in geom) or add entirely new geoms/stats/transforms (`defineGeomRenderer`, `createGraphyKit`).

See `recipes/themes/` for complete worked examples at each tier.

## Where to look

Route by the intent of the request, not only the chart type it names. Comparative and narrative phrasing — "compare this with that", "show the increase", "call out the dip", "what changed since X" — is the storytelling layer (`reference/storytelling.md`).

| I want to… | Read |
|---|---|
| Install the SDK, or fix a failed install (peer errors, unstyled graph, missing types) | `reference/install.md` |
| Use the SDK on a page with no bundler or npm (`<script type="module">`, jsDelivr) | `reference/cdn.md` |
| See the full spec builder API and every `config()` key | `reference/spec-api.md` |
| Check the exact signature, option keys, or accepted values of an exported symbol | `reference/types.md` |
| Filter, sort, aggregate or derive data inside the spec (`transform.*`) | `reference/spec-api.md` |
| Understand the `Data` format, parsing, value formats, wide→long reshape | `reference/data.md` |
| Render in React: provider/renderer props, sizing, locales, error handling | `reference/react-api.md` |
| Recolor geoms; restyle grid, tick lines, panel border, graph background, label typography | `reference/styling.md` |
| Restyle the legend, tooltip, headline and footer chrome via theme tokens | `reference/theming.md` |
| Replace the header, footer, tooltip, legend, grid, or axis ticks | `reference/slots.md` |
| Annotate, highlight, add reference lines/trendlines/headline numbers/data labels | `reference/storytelling.md` |
| Compare two values or periods, show a change/gap/drop (difference arrows) | `reference/storytelling.md` |
| Author plugins: repaint a built-in geom or define a new one | `reference/plugins.md` |
| Bar or column chart (grouped, stacked, 100%, horizontal, negative) | `recipes/charts/bar.md` |
| Line chart (multi-series, dash styles, smoothing, missing values) | `recipes/charts/line.md` |
| Area chart (stacked, flipped) | `recipes/charts/area.md` |
| Scatter or bubble chart | `recipes/charts/scatter.md` |
| Pie or donut chart | `recipes/charts/pie-donut.md` |
| Radar / spider chart | `recipes/charts/radar.md` |
| Rose or racetrack (polar bars) | `recipes/charts/polar-bar.md` |
| Combo chart, dual y-axes | `recipes/charts/combo.md` |
| Apply a complete house style | `recipes/themes/` — see the Themes section below |
| Repaint a built-in geom's marks | `recipes/plugins/sketchy-bar.md` |
| Minimal custom geom to model a new one after | `recipes/plugins/lollipop.md` |
| Custom geom with two marks per observation | `recipes/plugins/dumbbell.md` |
| Custom positional aesthetics (open/high/low/close) | `recipes/plugins/candlestick.md` |
| Custom layout + hit-testing geometry | `recipes/plugins/treemap.md`, `recipes/plugins/voronoi.md` |
| Simulation-driven or pointer-owning geoms | `recipes/plugins/beeswarm.md`, `recipes/plugins/force-directed.md` |
| Multi-part flow geometry | `recipes/plugins/sankey.md` |
| Check a spec compiles before rendering | `scripts/validate-spec.mjs` (module shape in its usage header) |

## Themes

Complete house styles ready to apply or adapt. Each file states its tier, then gives palette/font constants, the spec stylesheet, the `ThemeOverrides` for the surrounding chrome, a shared `config()` builder, and worked example specs. All are stylesheet + tokens + config unless noted.

| Theme | Look | File |
|---|---|---|
| Braun | Dieter Rams minimalism: warm greys, ink pill bars, no grid, one orange accent | `recipes/themes/braun.md` |
| Financial Times | FT editorial: salmon paper, claret + Oxford blue, color-keyed headlines | `recipes/themes/financial-times.md` |
| International | Newspaper style: white plates, ink-and-grey series, one red accent | `recipes/themes/international.md` |
| Lenny's Newsletter | Warm newsletter: cream grounds, rounded corners, autumn orange ramp | `recipes/themes/lennys-newsletter.md` |
| Neo Brutalist | Near-black sheets, dashed borders, acid `#C8FF00` for data only | `recipes/themes/neo-brutalist.md` |
| Mexico 68 | Olympic op-art: magenta-led palette, concentric outline marks (plugin tier) | `recipes/themes/mexico-68.md` |

## Validating without rendering

The engine compiles without a DOM. `scripts/validate-spec.mjs` compiles a `{ data, input }` module headlessly and prints diagnostics — run it to check a spec before wiring it into React:

```bash
node scripts/validate-spec.mjs path/to/my-spec.mjs
```

## Hard rules

- Mappings, transforms and aesthetics reference columns by `key`, never by `label`.
- Every consumer must wrap `GraphRenderer` in a `GraphProvider`; the renderer has no standalone mode.
- The `plugins` array on `GraphProvider` is frozen at mount — remount with a React `key` to change it.
- Everything the chart draws — geoms, grid, tick lines, panel border, graph background, axis/tick/data-label type — is painted from the spec stylesheet (`styles`), varying per observation via `style.geom(decls, { where })` and per series via `{ layer }`. `themeOverrides` governs the surrounding HTML chrome: legend, tooltip, headline, footer.
- Geom `params` merge without validation, so a key the geom does not declare is accepted and ignored. A declaration that has no visible effect is usually one the stylesheet should have carried.
- Each entry point injects its own CSS; there is nothing to import. Editing lives behind the `@graphysdk/react-renderer/editable` entry point (`EditableGraphRenderer`, `EditorPanel`) — `mode="editable"` on a plain `GraphRenderer` renders no editor surface. Making charts editable, editing them programmatically, and the editor panel are the `graphy-editor` skill.
