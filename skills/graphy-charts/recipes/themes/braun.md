# Braun

Technique: config + theme tokens only (no plugins).

Dieter Rams applied to data: a warm-grey desk, charts as rounded plates in a warm panel tone, ink linework, and one orange (`indicator`) reserved for a single reading per chart — never a series. Bars are fully rounded pills at 55% band width resting on a single structure-grey baseline; there is no y axis and no grid — printed readings (data labels) carry the values. One typeface (Archivo) at one 12px cut for all engine text, with readings slightly heavier.

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

Measured font tokens (`fontTickLabel`, `fontAxisLabel`, `fontLegendLabel`, `fontDataLabel`) take structured `FontTokenOverride` objects; `fontSeriesLabel` and `fontPieLabel` take CSS font shorthand strings.

```ts
import { type FontTokenOverride, type ThemeOverrides } from '@graphysdk/react-renderer';

// Ticks, axis titles, and legend keys share one 12px cut in the muted grey.
const tickFont: FontTokenOverride = {
  family: BRAUN_FONT_FAMILY.body,
  size: { value: 12, unit: 'px' },
  lineHeight: 1.4,
  weight: 500,
};

// Printed readings sit heavier and slightly larger — the one number you read off a dial.
const readingFont: FontTokenOverride = {
  family: BRAUN_FONT_FAMILY.body,
  size: { value: 13, unit: 'px' },
  lineHeight: 1.2,
  weight: 600,
};

export const braunTheme: ThemeOverrides = {
  textPrimary: BRAUN_COLORS.ink,
  textSecondary: BRAUN_COLORS.labelMuted,
  gridLineColor: BRAUN_COLORS.structure,
  gridLineWidth: '1px',
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  legendTextColor: BRAUN_COLORS.labelMuted,
  dataLabelTextColor: BRAUN_COLORS.ink,
  dataLabelOutsideBackground: BRAUN_COLORS.panel,
  fontFamilyDefault: BRAUN_FONT_FAMILY.body,
  fontFamilyHeading: BRAUN_FONT_FAMILY.body,
  fontTickLabel: tickFont,
  fontAxisLabel: tickFont,
  fontLegendLabel: tickFont,
  fontDataLabel: readingFont,
  fontSeriesLabel: `500 12px/1.4 ${BRAUN_FONT_FAMILY.body}`,
  fontPieLabel: `500 11.5px/1.4 ${BRAUN_FONT_FAMILY.body}`,
};
```

## Shared config builder

```ts
import { config } from '@graphysdk/viz-engine';
import type { RichTextContent } from '@graphysdk/viz-engine';

// A pill is 55% of the band and fully rounded; the trace is a 2px ink stroke.
const BAR_WIDTH = 0.55;
const LINE_WIDTH = 2;

// Shared plate grammar: a warm panel with a single structure-grey baseline the
// geoms rest on. No y axis, no grid — the reading carries itself.
const createBraunConfig = (options: { legendPosition?: 'none' | 'top' | 'bottom' } = {}) =>
  config({
    legend: { position: options.legendPosition ?? 'none' },
    appearance: { background: { type: 'solid', color: BRAUN_COLORS.panel } },
    layout: {
      padding: 32,
      gaps: { header: options.legendPosition === 'top' ? 20 : 36 },
    },
    panel: {
      border: {
        top: { isVisible: false },
        bottom: { isVisible: true, lineStyle: 'solid', lineWidth: 1.2, color: BRAUN_COLORS.structure },
        left: { isVisible: false },
        right: { isVisible: false },
      },
    },
    axes: {
      x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
      y: { position: 'left', isVisible: false, grid: { isVisible: false } },
    },
  });

// Polar plates carry no cartesian baseline, so the bottom rule is suppressed.
const braunPolarConfig = config({
  panel: { border: { bottom: { isVisible: false } } },
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

Solid ink pills for shipped quarters; the forecast fill maps to `transparent` while every pill carries an ink outline — invisible on the filled ones, a crisp 1.5px ring on the empty one. Readings print above each pill in the heavier cut.

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
  geom.bar({
    position: 'identity',
    params: { width: BAR_WIDTH, borderRadius: 'full', borderColor: BRAUN_COLORS.ink, borderWidth: 1.5 },
    dataLabels: { showDataLabels: true, position: 'outside', justify: 'end', align: 'center' },
  }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 8 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [BRAUN_COLORS.ink, 'transparent'] }),
  createBraunConfig({ legendPosition: 'top' }),
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
    <GraphProvider data={cpmData} input={cpmSpec} theme="light" themeOverrides={braunTheme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Example: donut with one orange reading

Ring at 0.55 inner radius. The leader wedge takes the orange — the one reading on this plate — and the rest run down the warm-grey ramp, darker for larger. Panel-coloured borders open a 2px gap between wedges.

```tsx
import { config, coord, createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import '@graphysdk/react-renderer/styles.css';

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
    params: { borderRadius: 0, borderColor: BRAUN_COLORS.panel, borderWidth: 2 },
    dataLabels: {
      showDataLabels: true,
      format: 'percentage',
      showCategoryLabels: true,
      position: 'outside',
      justify: 'end',
      align: 'center',
    },
  }),
  coord.polar({ theta: 'y', innerRadius: 0.55 }),
  scale.x(),
  scale.y(),
  scale.color.discrete({
    domain: ['North', 'East', 'Central', 'South', 'West'],
    range: [BRAUN_COLORS.indicator, ...BRAUN_RAMP],
  }),
  createBraunConfig(),
  braunPolarConfig,
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
    <GraphProvider data={revenueData} input={revenueDonutSpec} theme="light" themeOverrides={braunTheme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Fonts

Archivo must be loaded by the host page (the theme falls back to Inter/sans-serif):

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap"
/>
```

## Other charts in this style

- Stacked pills: `geom.bar({ position: 'stack', params: { width: BAR_WIDTH, borderRadius: 'full', borderColor: BRAUN_COLORS.panel, borderWidth: 1.5 } })` — panel-coloured borders cut a hairline gap between segments; series colours `[BRAUN_COLORS.ink, BRAUN_RAMP[1]]`.
- Line race: `geom.line({ params: { lineWidth: LINE_WIDTH, showFill: false } })`, lead series in `ink`, follower in `trace2`; direct end labels via `config({ legend: { position: 'right', display: 'direct' } })`.
- Rose (coxcomb): `geom.bar({ position: 'identity', params: { width: 1, borderRadius: 0, borderColor: BRAUN_COLORS.panel, borderWidth: 1 } })` + `coord.polar({ theta: 'x' })` + `braunPolarConfig`; emphasised months in `ink`, the rest in `structure`.
- Racetrack: `geom.bar({ position: 'stack', params: { width: 0.9, borderRadius: 0 } })` + `coord.polar({ theta: 'y', innerRadius: 0.25 })` + `braunPolarConfig`; achieved in `ink`, remainder in `BRAUN_RAMP[3]`.
