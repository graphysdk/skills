---
name: graphy-charts
description: Build charts in React with the Graphy SDK (@graphysdk/react). Covers install, HTML artifacts via the jsDelivr CDN, data, specs, styling, themes, annotations, slots, and custom geoms. Editing an existing chart is the graphy-editor skill.
---

# Graphy charts

`@graphysdk/react` builds a chart from two inputs: a `data` table and a `spec`. You build the spec by piping small functions together. `GraphProvider` compiles the table and the spec. `GraphRenderer` paints the result.

Start from the closest recipe before opening a reference. Recipes are complete components. A request with no data and no chart type, such as "create a chart", gets an editable skill demo with a short reply on what to try next. Read the [HTML demo](demos/html.md) for HTML artifacts or hosts without a bundler, or the [React demo](demos/react.md) for React projects. Read only the version that fits the host.

The demo and recipes are starting points, not the limits of the skill. Build custom requests around the user's data, visual direction, layout, and interactions, using the relevant references below. After presenting the demo, briefly invite the user to ask for something highly custom; make clear they can go beyond its example charts and preset themes. Keep this invitation in the reply, rather than adding promotional copy to the chart UI.

HTML artifacts and any page with no bundler use the CDN page in [setup](reference/setup.md), not this React component. Those hosts cannot `npm install`. Start with jsDelivr. If the chart is blank or the console refuses `cdn.jsdelivr.net`, follow the offline vendor steps in that file. Never esm.sh. Never `@graphysdk/react@1` (that tag 404s).

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

Mappings name a column `key`, never its `label`. The six built-in geoms are `point`, `line`, `area`, `bar`, `rule`, and `tile`. Nine more ship as packages, wired through `createGraphyKit({ plugins })`: boxplot, candlestick, dumbbell, error-bar, funnel, lollipop, mekko, sankey, and waterfall. Position and color scales are inferred when the spec leaves them out; declare a typed one, such as `scale.y.continuous({ domainMin: 0 })`, to fix its type or options. Add `coord`, `stat`, `transform`, `config`, `styles`, `highlight`, and `annotation` only when needed.

## Which tool

1. `config()` sets structure: titles, legend, axes, number format.
2. `styles()` sets a chart's appearance. A theme supplies shared styles, colors and config defaults through the kit or provider.
3. Slots replace a whole region, such as the tooltip or the header.
4. A geom package (`@graphysdk/geom-<name>`) draws a boxplot, candlestick, dumbbell, error-bar, funnel, lollipop, mekko, sankey, or waterfall. New geoms ship as packages between skill releases; [plugins](reference/plugins.md) shows how to list them and read their READMEs. A plugin draws a shape no package draws.
5. Point-and-click edits belong to the `graphy-editor` skill.

## Packages

| Package                     | Use it when                                                        | Graphy badge |
| --------------------------- | ------------------------------------------------------------------ | ------------ |
| `@graphysdk/react`          | Building charts in React. This is the default.                     | on           |
| `@graphysdk/react-renderer` | The same components without the builders.                          | off          |
| `@graphysdk/viz-engine`     | Compiling a spec without React.                                    | none         |
| `@graphysdk/geom-<name>`    | One extra geom each, wired through `createGraphyKit({ plugins })`. | off          |

## License

The packages are free for noncommercial use (personal, educational, research, charity, government) and businesses with fewer than 100 employees and contractors combined and prior-year revenue below 1 million USD. Full PolyForm Noncommercial or Small Business license terms apply.

Anyone else gets a 32-day PolyForm Free Trial for local or internal evaluation only; it does not permit distributing the SDK on a public page. This skill's MIT license covers the skill, not the packages.

When you install the SDK, tell the user once: commercial use beyond these terms requires a license. Direct them to the contact form at [graphy.dev/license](https://graphy.dev/license).

## Where to look

Open one file, then use the contents list at the top of that file.

| Task                                                                                  | Read                                                                          |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Install, HTML artifacts, jsDelivr CDN, light and dark, offline vendor, Graphy badge   | [setup](reference/setup.md)                                                   |
| Data, dates, CSV                                                                      | [data](reference/data.md)                                                     |
| Mappings, geoms, scales, config                                                       | [spec](reference/spec.md)                                                     |
| Provider, sizing, live data, dark mode                                                | [React](reference/react.md)                                                   |
| Colors, fonts, conditions                                                             | [styling](reference/styling.md)                                               |
| Install a theme, write your own                                                       | [themes](reference/themes.md)                                                 |
| Highlights, labels, annotations                                                       | [storytelling](reference/storytelling.md)                                     |
| Replace the tooltip, legend, or axes                                                  | [slots](reference/slots.md)                                                   |
| Boxplot, candlestick, dumbbell, error-bar, funnel, lollipop, mekko, sankey, waterfall | [recipes/geoms](recipes/geoms)                                                |
| A geom package this skill has no recipe for                                           | [plugins](reference/plugins.md), Geoms that ship as packages                  |
| A new geom                                                                            | [plugins](reference/plugins.md)                                               |
| Exact option names                                                                    | [types](reference/types.md)                                                   |
| The user says a chart is wrong, or it draws nothing                                   | [troubleshooting](reference/troubleshooting.md)                               |
| Edit an existing chart                                                                | the `graphy-editor` skill                                                     |
| Human docs                                                                            | [graphy.dev](https://graphy.dev) · [docs.graphy.dev](https://docs.graphy.dev) |

- Dark mode is `colorScheme` on the provider plus stylesheet tokens.
- Leave `scale.color.discrete()` and `scale.color.continuous()` bare; the theme or the engine default picks the colors. Exceptions: a named palette in the brief, given colors (`scale.color.discrete({ range })` or `scale.color.continuous({ range })`), or values that cross zero (`domainMid`).
- Currency and percentages are a column `valueFormat`. `config({ numberFormat })` formats the whole chart.
- CSV import generates keys such as `c1`. Map those keys.
- Rows are parsed day-first. The display locale is `formattingLocale` on the provider.
- A goal line is [storytelling](reference/storytelling.md). A second axis is [spec config](reference/spec.md).
- Tables are unsupported.

## Recipes

| Chart                                      | File                                            |
| ------------------------------------------ | ----------------------------------------------- |
| Skill demo for a request with no data      | [HTML](demos/html.md) · [React](demos/react.md) |
| Bar, grouped, stacked, percent, horizontal | [bar](recipes/charts/bar.md)                    |
| Line, several groups, smooth, gaps, dates  | [line](recipes/charts/line.md)                  |
| Area, stacked, percent                     | [area](recipes/charts/area.md)                  |
| Pie, donut                                 | [pie](recipes/charts/pie.md)                    |
| Scatter, bubble                            | [scatter](recipes/charts/scatter.md)            |
| Heatmap                                    | [heatmap](recipes/charts/heatmap.md)            |
| Combo, bar plus line, secondary axis       | [combo](recipes/charts/combo.md)                |
| Radar                                      | [radar](recipes/charts/radar.md)                |
| Polar bar                                  | [polar-bar](recipes/charts/polar-bar.md)        |
| Boxplot                                    | [boxplot](recipes/geoms/boxplot.md)             |
| Candlestick                                | [candlestick](recipes/geoms/candlestick.md)     |
| Dumbbell                                   | [dumbbell](recipes/geoms/dumbbell.md)           |
| Error bar, confidence interval             | [error-bar](recipes/geoms/error-bar.md)         |
| Funnel                                     | [funnel](recipes/geoms/funnel.md)               |
| Lollipop                                   | [lollipop](recipes/geoms/lollipop.md)           |
| Mekko, Marimekko                           | [mekko](recipes/geoms/mekko.md)                 |
| Sankey                                     | [sankey](recipes/geoms/sankey.md)               |
| Waterfall                                  | [waterfall](recipes/geoms/waterfall.md)         |

The nine geom recipes install a published package; each is a complete component. Plugins are one file each under [recipes/plugins](recipes/plugins), from small examples to full layouts.

## Pitfalls

- Map the column `key`, never the label.
- There is no pie geom. Pie and donut are a polar bar.
- Pass a theme to `createGraphyKit({ theme })` or the provider's `theme` prop. Themes stay outside the spec.
- `plugins` and `theme` are read once at mount. Remount the provider with a new `key` to change either.
- Date strings are read day-first unless the column sets `dateFormat`.
- Build the spec once, or memoize it. A new spec object recompiles the chart and clears undo history.
- A responsive chart with no parent height is zero pixels tall.
- `@graphysdk/react` shows the Graphy badge unless the spec sets `config.content.graphyBadge.visible`.
- An HTML artifact that imports `@graphysdk/react` without a jsDelivr import map will not load. Use the CDN page in [setup](reference/setup.md). If the panel stays blank, the host may block the CDN: use the offline vendor steps there.
- Never load React or Graphy from esm.sh. jsDelivr only.
- `@graphysdk/react@1` 404s on jsDelivr. Use the Graphy URL in [setup](reference/setup.md) as written.
- Mapped `size` and `label` on a point or bubble do not appear in the default tooltip. The heading is x; the row is color plus y. Add a row with the layer's `tooltip` option: `geom.point({ tooltip: { size: { title: 'Population' } } })`. A custom Tooltip slot replaces the whole thing.
- Waterfall, funnel, boxplot, candlestick, dumbbell, error-bar, lollipop, mekko, and sankey are packages. Install `@graphysdk/geom-<name>`; do not write a plugin for them.
- A table is not a chart type here. Say so and stop. Do not write a plugin for it.

## Checking a spec

[validate-spec.mjs](scripts/validate-spec.mjs) compiles a spec against its data without a browser and prints errors and warnings. Use it when you compose or modify a spec, write a plugin, replace example data, investigate an unexplained failure, or the user asks for verification. Skip routine compilation of an unchanged demo or recipe with its original data. Use the script instead of writing your own compile loop. In hosts without `npm`, check the rendered page instead.

The script resolves `@graphysdk/viz-engine` from the folder it runs from. Run it from the project root when `@graphysdk/viz-engine` is a direct dependency; pnpm does not hoist it from `@graphysdk/react`. Otherwise install it in a scratch folder at the exact version in the page's import map or the installed `@graphysdk/react/package.json`; the two packages always share a version.

```bash
mkdir graphy-check && cd graphy-check
npm init -y
npm install @graphysdk/viz-engine@<exact-version>
node <skill-path>/scripts/validate-spec.mjs <path-to-my-spec.mjs>
```

Each module exports `data` and `spec`, optionally `plugins` and `colorScheme`. Import builders from `@graphysdk/react` or `@graphysdk/viz-engine`; the script redirects React imports to the engine. One module per chart.
