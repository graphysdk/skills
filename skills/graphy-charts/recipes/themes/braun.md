# Braun

Technique: spec `config()` + a stylesheet + theme tokens (no slots, no plugins).

Dieter Rams applied to data: a warm-grey desk, charts as rounded plates in a warm panel tone, ink linework, and one orange (`indicator`) reserved for a single reading per chart — never a series. Bars are fully rounded pills at 55% band width resting on a single structure-grey baseline; there is no y axis and no grid — printed readings (data labels) carry the values. One typeface (Archivo) at one 12px cut for all engine text, with readings slightly heavier.

The split: `config()` decides what exists (legend, axes, padding), the **stylesheet** paints it (plate, baseline, label type), and `themeOverrides` dresses only the HTML chrome around the plot. See `reference/styling.md`.

## Constants

```ts
export const BRAUN_COLORS = {
  ink: '#1D1D1B', // bars, traces, printed readings
  indicator: '#F07E13', // orange — one reading per chart, never a series
  trace2: '#8E8C86', // second line series
  structure: '#C9C6BE', // baseline rule and hairlines
  label: '#55534E', // dial and pie labels
  labelMuted: '#87857F', // tick labels, legend key text
  page: '#E3E1DB', // the desk (page background, outside the chart)
  panel: '#EFEDE8', // a chart plate
} as const;

// Donut ramp, darkest reads as the biggest slice.
export const BRAUN_RAMP = ['#A6A39B', '#B7B4AC', '#C8C5BD', '#D8D5CD'] as const;

export const BRAUN_FONT_FAMILY = {
  body: "'Archivo', 'Inter', sans-serif",
} as const;
```

## Theme

The theme carries the chrome around the plot: the legend key, the headline family, and the fallback family every text target inherits when the stylesheet names none. `fontLegendLabel` is the measured font token and takes a structured `FontTokenOverride`; `fontSeriesLabel` and `fontPieLabel` take CSS font shorthand strings.

```ts
import { type FontTokenOverride, type ThemeOverrides } from '@graphysdk/react-renderer';

// Legend keys take the same 12px cut in the muted grey the plot's ticks use.
const legendFont: FontTokenOverride = {
  family: BRAUN_FONT_FAMILY.body,
  size: { value: 12, unit: 'px' },
  lineHeight: 1.4,
  weight: 500,
};

export const braunTheme: ThemeOverrides = {
  textPrimary: BRAUN_COLORS.ink,
  textSecondary: BRAUN_COLORS.labelMuted,
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  legendTextColor: BRAUN_COLORS.labelMuted,
  fontFamilyDefault: BRAUN_FONT_FAMILY.body,
  fontFamilyHeading: BRAUN_FONT_FAMILY.body,
  fontLegendLabel: legendFont,
  fontSeriesLabel: `500 12px/1.4 ${BRAUN_FONT_FAMILY.body}`,
  fontPieLabel: `500 11.5px/1.4 ${BRAUN_FONT_FAMILY.body}`,
};
```

These `textPrimary` / `textSecondary` values dress the legend, headline and footer. The plot's own text — axis, tick and data labels — takes its colour from the stylesheet below, which names it per target.

## Shared plate stylesheet

```ts
import { style, styles } from '@graphysdk/viz-engine';

// The plate paint: a warm panel ground with a single structure-grey baseline the
// geoms rest on, and one 12px Archivo cut across the engine's text — readings
// heavier. No family is declared, so every target inherits `fontFamilyDefault`.
const braunChromeStyles = styles({
  defaults: [
    style.axisLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: BRAUN_COLORS.ink }),
    style.tickLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: BRAUN_COLORS.labelMuted }),
    // Printed readings sit heavier and slightly larger — the one number you read off a dial.
    style.dataLabel({ fontSize: 13, fontWeight: 600, textColor: BRAUN_COLORS.ink }),
    // Outside readings print straight onto the plate colour, so no pill shows behind them.
    style.dataLabel.observation.outside({ background: BRAUN_COLORS.panel }),

    style.graph({ background: BRAUN_COLORS.panel }),
    // `strokeWidth: 0` hides an edge and reserves no space for it.
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ lineType: 'solid', strokeWidth: 1.2, color: BRAUN_COLORS.structure }),
  ],
});

// Polar plates carry no cartesian baseline, so the bottom rule is suppressed.
const braunPolarStyles = styles({ defaults: [style.panelBorder.bottom({ strokeWidth: 0 })] });
```

## Shared config builder

```ts
import { config } from '@graphysdk/viz-engine';
import type { RichTextContent } from '@graphysdk/viz-engine';

// A pill is 55% of the band and fully rounded; the trace is a 2px ink stroke.
const BAR_WIDTH = 0.55;
const LINE_WIDTH = 2;

// Shared plate grammar: what exists on the plate. No y axis, no grid — the
// reading carries itself. What each piece looks like is in the stylesheet above.
const createBraunConfig = (options: { legendPosition?: 'none' | 'top' | 'bottom' } = {}) =>
  config({
    legend: { position: options.legendPosition ?? 'none' },
    layout: {
      padding: 32,
      gaps: { header: options.legendPosition === 'top' ? 20 : 36 },
    },
    axes: {
      x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
      y: { position: 'left', isVisible: false, grid: { isVisible: false } },
    },
  });

// Chart title: Archivo 500 16px in ink. Rams-plain — it names the reading, no
// accent phrase, since orange belongs to the data.
const createBraunTitle = (text: string): RichTextContent => ({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [
        {
          type: 'text',
          text,
          marks: [
            {
              type: 'textStyle',
              attrs: { color: BRAUN_COLORS.ink, fontFamily: BRAUN_FONT_FAMILY.body, fontSize: '16px' },
            },
          ],
        },
      ],
    },
  ],
});
```

## Example: column chart with a hollow forecast pill

Solid ink pills for shipped quarters; the forecast fill maps to `transparent` while every pill carries an ink outline — invisible on the filled ones, a crisp 1.5px ring on the empty one. The pill's geometry (`width`) is a geom param; its paint (`borderRadius`, `borderColor`, `borderWidth`) is a stylesheet entry piped beside the geom. Readings print above each pill in the heavier cut.

```tsx
import { config, createSpec, geom, mapping, pipe, scale, style, styles } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

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
  geom.bar({
    position: 'identity',
    params: { width: BAR_WIDTH },
    dataLabels: { showDataLabels: true, position: 'outside', justify: 'end', align: 'center' },
  }),
  styles({ defaults: [style.geom.bar({ borderRadius: 'full', borderColor: BRAUN_COLORS.ink, borderWidth: 1.5 })] }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 8 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [BRAUN_COLORS.ink, 'transparent'] }),
  createBraunConfig({ legendPosition: 'top' }),
  braunChromeStyles,
  config({
    axes: { x: { label: 'Quarter' } },
    content: {
      title: createBraunTitle('CPM, € — actual vs forecast'),
      isTitleVisible: true,
      subtitle: 'Cost per mille by quarter, €. The hollow pill is a forecast',
      isSubtitleVisible: true,
    },
  })
);

export function BraunCpmChart() {
  return (
    <GraphProvider data={cpmData} input={cpmSpec} colorScheme="light" themeOverrides={braunTheme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

`style.geom.bar({ borderRadius: 'full' })` sits in `defaults`, so it never fights the `color` mapping — the scale still decides each pill's fill. The colour range is the mapping's business; the ring is the plate's.

## Example: donut with one orange reading

Ring at 0.55 inner radius. The leader wedge takes the orange — the one reading on this plate — and the rest run down the warm-grey ramp, darker for larger. Panel-coloured borders open a 2px gap between wedges. Wedge corners are square — on a geom, `borderRadius` is a token, so square reads as `'none'`.

```tsx
import { config, coord, createSpec, geom, pipe, scale, style, styles } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const revenueData = {
  columns: [{ key: 'region' }, { key: 'revenue' }],
  rows: [
    { region: 'North', revenue: 26 },
    { region: 'East', revenue: 21 },
    { region: 'Central', revenue: 20 },
    { region: 'South', revenue: 17 },
    { region: 'West', revenue: 16 },
  ],
};

const revenueDonutSpec = pipe(
  createSpec({ x: '', y: 'revenue', color: 'region' }),
  geom.bar({
    position: 'fill',
    dataLabels: {
      showDataLabels: true,
      format: 'percentage',
      showCategoryLabels: true,
      position: 'outside',
      justify: 'end',
      align: 'center',
    },
  }),
  styles({ defaults: [style.geom.bar({ borderRadius: 'none', borderColor: BRAUN_COLORS.panel, borderWidth: 2 })] }),
  coord.polar({ theta: 'y', innerRadius: 0.55 }),
  scale.x(),
  scale.y(),
  scale.color.discrete({
    domain: ['North', 'East', 'Central', 'South', 'West'],
    range: [BRAUN_COLORS.indicator, ...BRAUN_RAMP],
  }),
  createBraunConfig(),
  braunChromeStyles,
  braunPolarStyles,
  config({
    content: {
      title: createBraunTitle('Revenue mix by region'),
      isTitleVisible: true,
      subtitle: 'Share of revenue by region. The leader wedge takes the orange',
      isSubtitleVisible: true,
    },
  })
);

export function BraunRevenueDonut() {
  return (
    <GraphProvider data={revenueData} input={revenueDonutSpec} colorScheme="light" themeOverrides={braunTheme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

`braunPolarStyles` is piped after `braunChromeStyles`: later stylesheets sit above earlier ones, so its `strokeWidth: 0` retires the baseline the plate declared.

## Fonts

Archivo must be loaded by the host page (the theme falls back to Inter/sans-serif):

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap"
/>
```

## Other charts in this style

Each pipes `createBraunConfig()` + `braunChromeStyles`, then its own one-line geom stylesheet.

- Stacked pills: `geom.bar({ position: 'stack', params: { width: BAR_WIDTH } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'full', borderColor: BRAUN_COLORS.panel, borderWidth: 1.5 })] })` — panel-coloured borders cut a hairline gap between segments; series colours `[BRAUN_COLORS.ink, BRAUN_RAMP[1]]`.
- Line race: `geom.line()` + `styles({ defaults: [style.geom.line({ strokeWidth: LINE_WIDTH })] })`, lead series in `ink`, follower in `trace2`; direct end labels via `config({ legend: { position: 'right', display: 'direct' } })`. There is no gradient wash unless you declare `fillAlpha`.
- Rose (coxcomb): `geom.bar({ position: 'identity', params: { width: 1 } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'none', borderColor: BRAUN_COLORS.panel, borderWidth: 1 })] })` + `coord.polar({ theta: 'x' })` + `braunPolarStyles`; emphasised months in `ink`, the rest in `structure`.
- Racetrack: `geom.bar({ position: 'stack', params: { width: 0.9 } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'none' })] })` + `coord.polar({ theta: 'y', innerRadius: 0.25 })` + `braunPolarStyles`; achieved in `ink`, remainder in `BRAUN_RAMP[3]`.
