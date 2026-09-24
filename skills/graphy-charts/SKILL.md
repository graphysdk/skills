---
name: graphy-charts
description: Build charts in React with the Graphy SDK (@graphysdk/react). Covers install, data, specs, styling, annotations, slots, and custom geoms. Editing an existing chart is the graphy-editor skill.
---

# Graphy charts

`@graphysdk/react` builds a chart from two inputs: a `data` table and a `spec`. You build the spec by piping small functions together. `GraphProvider` compiles the table and the spec. `GraphRenderer` paints the result.

Start from the closest recipe before opening a reference. Recipes are complete components.

## Minimal graph

```tsx
import { GraphProvider, GraphRenderer, createSpec, geom, pipe, scale } from '@graphysdk/react';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: 'Jan', revenue: 120 },
    { month: 'Feb', revenue: 150 },
    { month: 'Mar', revenue: 90 },
  ],
};

const spec = pipe(createSpec({ x: 'month', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

export function RevenueGraph() {
  return (
    <div style={{ height: 320 }}>
      <GraphProvider data={data} spec={spec}>
        <GraphRenderer />
      </GraphProvider>
    </div>
  );
}
```

`GraphRenderer` fills its parent. Give that parent a height, or pass `sizing={{ mode: 'fixed', width: 640, height: 400 }}`.

## What goes in a spec

Mappings name a column `key`, never its `label`. The six geoms are `point`, `line`, `area`, `bar`, `rule`, and `tile`. Declare `scale.x()` and `scale.y()` for every mapped position. Colour scales are inferred. Then add `coord`, `stat`, `transform`, `config`, `styles`, `highlight`, and `annotation` only when you need them.

## Which tool

1. `config()` sets structure: titles, legend, axes, number format.
2. `styles()` paints the chart. A theme is a stylesheet you reuse, not a provider prop.
3. Slots replace a whole region, such as the tooltip or the header.
4. A plugin draws a mark the six geoms cannot draw.
5. Point-and-click edits belong to the `graphy-editor` skill.

## Packages

| Package | Use it when | Brand mark |
| --- | --- | --- |
| `@graphysdk/react` | Building charts in React. This is the default. | on |
| `@graphysdk/react-renderer` | The same components without the builders. | off |
| `@graphysdk/viz-engine` | Compiling a spec without React. | none |

## Where to look

Open one file, then use the contents list at the top of that file.

| Task | Read |
| --- | --- |
| Install, CDN, brand mark | [setup](reference/setup.md) |
| Data, dates, CSV | [data](reference/data.md) |
| Mappings, geoms, scales, config | [spec](reference/spec.md) |
| Provider, sizing, live data, dark mode | [React](reference/react.md) |
| Colours, fonts, conditions | [styling](reference/styling.md) |
| Highlights, labels, annotations | [storytelling](reference/storytelling.md) |
| Replace the tooltip, legend, or axes | [slots](reference/slots.md) |
| A new mark | [plugins](reference/plugins.md) |
| Exact option names | [types](reference/types.md) |
| Refresh types or check samples | [maintenance](reference/maintenance.md) |
| Edit an existing chart | the `graphy-editor` skill |
| Human docs | [graphy.dev](https://graphy.dev) · [docs.graphy.dev](https://docs.graphy.dev) |

- Dark mode is `colorScheme` on the provider plus stylesheet tokens.
- Currency and percentages are a column format. `config({ numberFormat })` formats the whole chart.
- CSV import generates keys such as `c1`. Map those keys.
- Date parsing and the display locale are different settings.
- A goal line is [storytelling](reference/storytelling.md). A second axis is [spec config](reference/spec.md).
- Waterfall, funnel, mekko, and table are unsupported.

## Recipes

| Chart | File |
| --- | --- |
| Bar, grouped, stacked, percent, horizontal | [bar](recipes/charts/bar.md) |
| Line, several series, smooth, gaps, dates | [line](recipes/charts/line.md) |
| Area, stacked, percent | [area](recipes/charts/area.md) |
| Pie, donut | [pie](recipes/charts/pie.md) |
| Scatter, bubble | [scatter](recipes/charts/scatter.md) |
| Heatmap | [heatmap](recipes/charts/heatmap.md) |
| Combo, bar plus line, secondary axis | [combo](recipes/charts/combo.md) |
| Radar | [radar](recipes/charts/radar.md) |
| Polar bar | [polar-bar](recipes/charts/polar-bar.md) |

Themes are one file each under [recipes/themes](recipes/themes). Each file is a stylesheet plus config. Plugins are one file each under [recipes/plugins](recipes/plugins), from small examples to full layouts.

## Pitfalls

- A mapped `x` or `y` without `scale.x()` or `scale.y()` draws nothing.
- Map the column `key`, never the label.
- There is no pie geom. Pie and donut are a polar bar.
- `plugins` is read once at mount. Remount the provider to change the set.
- Date strings are read day-first unless the column sets `dateFormat`.
- Build the spec once, or memoize it. A new spec object recompiles the chart.
- A responsive chart with no parent height is zero pixels tall.
- `@graphysdk/react` shows the brand mark unless the spec turns it off.
- Waterfall, funnel, mekko, and table are not chart types here. Say so and stop. Do not write a plugin for them.

## Checking a spec

```bash
node skills/graphy-charts/scripts/validate-spec.mjs ./my-spec.mjs
```

`reference/types.md` is a generated snapshot. If it disagrees with the installed package, trust the package. Regenerating it is [maintenance](reference/maintenance.md).
