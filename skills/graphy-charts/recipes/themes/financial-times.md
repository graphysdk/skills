# Financial Times

Technique: config + theme tokens only (no plugins).

The FT house look: charts sit on the signature salmon paper (`#FFF1E5`) with warm sand-toned rules for gridlines and panel edges, claret/wine-red data with a paler tint for forecasts, and Oxford blue as the counterpart series. Titles are 18px sentence-case headlines where key words take the series colour, so the headline doubles as the legend. Only horizontal structure: solid top rule, heavier 1.5px bottom rule, y gridlines on, no side borders.

## Constants

```ts
export const FT_COLORS = {
  paper: '#FFF1E5', // FT Pink — the signature salmon paper
  claret: '#990F3D', // emphasised headline accent
  claretBar: '#A8324A', // the wine-red used for solid bars
  forecastBar: '#E2A6BB', // paler claret tint used for forecast/estimate bars
  oxford: '#0F5499', // FT Oxford blue — the counterpart series colour
  steel: '#5D7C95', // muted steel blue for primary stacked segments
  steelLight: '#C3DDF0', // pale blue for secondary stacked segments
  black: '#33302E', // primary text — headline lead-in, subtitle, axis titles
  slate: '#66605C', // secondary text — axis tick labels
  rule: '#E4D5C5', // warm rule shared by gridlines and panel borders on the salmon paper
} as const;

export const FT_FONT_FAMILY = {
  body: 'Figtree, "Helvetica Neue", Arial, sans-serif', // stand-in for FT Metric — body, UI, chart headings
  display: '"Source Serif 4", Georgia, "Times New Roman", serif', // stand-in for FT Financier Display
} as const;

export const FT_CLARET_RAMP = ['#990F3D', '#BE4B75', '#D486A3', '#E5B0C4', '#F2D4DE'];
```

## Theme

This style keeps the engine's default font sizing and only swaps colours and families — no measured `FontTokenOverride` entries needed.

```ts
import type { ThemeOverrides } from '@graphysdk/react-renderer';

export const financialTimesTheme: ThemeOverrides = {
  textPrimary: FT_COLORS.black,
  textSecondary: FT_COLORS.slate,
  gridLineColor: FT_COLORS.rule,
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  fontFamilyDefault: FT_FONT_FAMILY.body,
  fontFamilyHeading: FT_FONT_FAMILY.body,
};
```

## Shared config builder

```ts
import { config } from '@graphysdk/viz-engine';
import type { RichTextContent } from '@graphysdk/viz-engine';

// Shared frame: FT Pink paper and headline spacing. Legends are opt-in per chart.
const createFinancialTimesConfig = (options: { legendPosition?: 'none' | 'top' | 'right' } = {}) =>
  config({
    legend: { position: options.legendPosition ?? 'none' },
    appearance: { background: { type: 'solid', color: FT_COLORS.paper } },
    layout: {
      padding: 32,
      gaps: { header: options.legendPosition === 'top' ? 24 : 64, topLegend: 32 },
    },
    panel: {
      border: {
        top: { isVisible: true, lineStyle: 'solid' },
        bottom: { isVisible: true, lineStyle: 'solid', lineWidth: 1.5 },
        left: { isVisible: false },
        right: { isVisible: false },
      },
    },
    axes: {
      x: { position: 'bottom', grid: { isVisible: false } },
      y: { position: 'left', grid: { isVisible: true, lineStyle: 'solid' } },
    },
  });

// Headline title: 18px Figtree, key words in the series colour.
const createFinancialTimesTitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: segments.map(({ text, color }) => ({
        type: 'text',
        text,
        marks: [
          {
            type: 'textStyle',
            attrs: { color: color ?? FT_COLORS.black, fontFamily: FT_FONT_FAMILY.body, fontSize: '18px' },
          },
        ],
      })),
    },
  ],
});
```

## Example: bar chart with a paler forecast tint

The last quarter is a forecast, painted in the paler claret tint via a discrete colour scale keyed on the `type` column. One observation per quarter, so `geom.bar` uses identity positioning.

```tsx
import { config, createSpec, geom, mapping, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import '@graphysdk/react-renderer/styles.css';

const cpmData = {
  columns: [{ key: 'quarter' }, { key: 'cpm' }, { key: 'type' }],
  rows: [
    { quarter: "Q2 '24", cpm: 4, type: 'actual' },
    { quarter: "Q3 '24", cpm: 6.1, type: 'actual' },
    { quarter: "Q4 '24", cpm: 5.9, type: 'actual' },
    { quarter: "Q1 '25", cpm: 3.9, type: 'actual' },
    { quarter: "Q2 '25", cpm: 6.5, type: 'forecast' },
  ],
};

const cpmSpec = pipe(
  createSpec(),
  mapping({ x: 'quarter', y: 'cpm', color: 'type' }),
  geom.bar({ position: 'identity', params: { borderRadius: 0 } }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 10 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [FT_COLORS.claretBar, FT_COLORS.forecastBar] }),
  createFinancialTimesConfig(),
  config({
    content: {
      title: createFinancialTimesTitle([{ text: 'CPM' }, { text: ' set to climb past €6', color: FT_COLORS.claret }]),
      isTitleVisible: true,
      subtitle: 'Cost per mille by quarter, €. Paler bars are forecasts',
      isSubtitleVisible: true,
    },
  })
);

export function FinancialTimesCpmChart() {
  return (
    <GraphProvider data={cpmData} input={cpmSpec} theme="light" themeOverrides={financialTimesTheme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Example: line race with colour-keyed headline and direct labels

The headline names each series in its line colour, so no boxed legend is needed; direct labels sit at the line endpoints.

```tsx
import { config, createSpec, geom, mapping, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import '@graphysdk/react-renderer/styles.css';

const productValueData = {
  columns: [{ key: 'month' }, { key: 'product' }, { key: 'value' }],
  rows: [
    { month: 'Jan', product: 'Product A', value: 120 },
    { month: 'Jan', product: 'Product B', value: 105 },
    { month: 'Feb', product: 'Product A', value: 180 },
    { month: 'Feb', product: 'Product B', value: 115 },
    { month: 'Mar', product: 'Product A', value: 150 },
    { month: 'Mar', product: 'Product B', value: 140 },
    { month: 'Apr', product: 'Product A', value: 220 },
    { month: 'Apr', product: 'Product B', value: 130 },
    { month: 'May', product: 'Product A', value: 260 },
    { month: 'May', product: 'Product B', value: 170 },
    { month: 'Jun', product: 'Product A', value: 300 },
    { month: 'Jun', product: 'Product B', value: 205 },
  ],
};

const productRaceSpec = pipe(
  createSpec(),
  mapping({ x: 'month', y: 'value', color: 'product' }),
  geom.line({ params: { lineWidth: 2.5, showFill: false } }),
  scale.x(),
  scale.y.continuous({ domainMin: 100 }),
  scale.color.discrete({ domain: ['Product A', 'Product B'], range: [FT_COLORS.oxford, FT_COLORS.claret] }),
  createFinancialTimesConfig(),
  config({
    legend: { position: 'right', display: 'direct' },
    content: {
      title: createFinancialTimesTitle([
        { text: 'Product A', color: FT_COLORS.oxford },
        { text: ' pulls ahead of ' },
        { text: 'Product B', color: FT_COLORS.claret },
      ]),
      isTitleVisible: true,
      subtitle: 'Monthly value by product',
      isSubtitleVisible: true,
    },
  })
);

export function FinancialTimesProductRace() {
  return (
    <GraphProvider data={productValueData} input={productRaceSpec} theme="light" themeOverrides={financialTimesTheme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Fonts

Figtree (stand-in for FT Metric) carries all chart text; Source Serif 4 (stand-in for Financier Display) is only for page-level display text outside the chart. Load on the host page:

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap"
/>
```

## Other charts in this style

- Stacked bars: `geom.bar({ position: 'stack', params: { borderRadius: 0, borderColor: '#000', borderWidth: 1 } })`; segments in `[FT_COLORS.steel, FT_COLORS.steelLight]`; `createFinancialTimesConfig({ legendPosition: 'top' })`.
- Donut: `geom.bar({ position: 'fill', params: { borderRadius: 0, borderColor: FT_COLORS.paper, borderWidth: 2 } })` + `coord.polar({ theta: 'y', innerRadius: 0.3 })`; colours from `FT_CLARET_RAMP`, percentage + category data labels outside; add `config({ layout: { gaps: { header: 24 } } })`.
- Rose (coxcomb): `geom.bar({ position: 'identity', params: { width: 1, borderRadius: 0, borderColor: FT_COLORS.paper, borderWidth: 1 } })` + `coord.polar({ theta: 'x' })`; emphasised months in `claretBar`, the rest in `forecastBar` — the same emphasis split the bar chart uses for actual vs forecast.
- Racetrack: `geom.bar({ position: 'stack', params: { width: 0.9, borderRadius: 0 } })` + `coord.polar({ theta: 'y', innerRadius: 0.25 })`; achieved in `claretBar`, remainder in `rule`; add `config({ layout: { gaps: { header: 24 } } })`.
