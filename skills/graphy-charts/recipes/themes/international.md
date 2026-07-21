# International

**Tier: config + theme tokens.** No slots, no plugins — the entire look is spec config plus `themeOverrides`.

Editorial newspaper style: white chart plates, an ink-and-grey series palette with **one red accent reserved for the key data point**, and Golos Text headlines over small Inter engine text. Charts show a horizontal major grid only, no side rules, and a single solid bottom border as the axis baseline; the headline repeats the accent color on its key phrase so title and chart read as one statement.

## Constants

```ts
export const INTL_COLORS = {
  surface: '#F4F4F4', // canvas behind the charts
  paper: '#FFFFFF', // chart background
  heading: '#000000', // headlines
  body: '#1A1A1A', // body text
  accent: '#D72B1C', // red, reserved for the key data point and headline key phrase
  ink: '#111111', // primary series colour and hairline baselines
  grey: '#8F8F8F', // axis, legend, and caption text; third series colour
  greyLight: '#C9C9C9', // fourth series colour
  greyDark: '#4A4A4A', // fifth series colour
  greyFaint: '#E3E3E3', // de-emphasised remainder fills
  gridLine: '#E9E9E9', // horizontal major grid
} as const;

export const INTL_FONT_FAMILY = {
  heading: "'Golos Text', 'Inter', sans-serif",
  body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
} as const;

// Series palette in emphasis order: red only ever paints the key data point.
export const INTL_PALETTE = [
  INTL_COLORS.accent,
  INTL_COLORS.ink,
  INTL_COLORS.grey,
  INTL_COLORS.greyLight,
  INTL_COLORS.greyDark,
] as const;
```

## Theme overrides

The measured font tokens (`fontTickLabel`, `fontAxisLabel`, `fontLegendLabel`, `fontDataLabel`) take structured `FontTokenOverride` objects; `fontPieLabel` is a plain CSS font shorthand string.

```ts
import { type FontTokenOverride, type ThemeOverrides } from '@graphysdk/react-renderer';

// Axis, legend, and label text all share the same small Inter cut.
const smallCapsFont: FontTokenOverride = {
  family: INTL_FONT_FAMILY.body,
  size: { value: 10.5, unit: 'px' },
  lineHeight: 1.5,
  weight: 500,
};

export const theme: ThemeOverrides = {
  textPrimary: INTL_COLORS.body,
  textSecondary: INTL_COLORS.grey,
  gridLineColor: INTL_COLORS.gridLine,
  gridLineWidth: '1px',
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  legendTextColor: INTL_COLORS.grey,
  fontFamilyDefault: INTL_FONT_FAMILY.body,
  fontFamilyHeading: INTL_FONT_FAMILY.heading,
  fontTickLabel: smallCapsFont,
  fontAxisLabel: smallCapsFont,
  fontLegendLabel: smallCapsFont,
  fontDataLabel: smallCapsFont,
  fontPieLabel: `600 10.5px/1.4 ${INTL_FONT_FAMILY.body}`,
};
```

## Shared config builder

```ts
import { config } from '@graphysdk/viz-engine';

// Shared frame: white paper, horizontal major grid only, and a single solid bottom
// border as the axis baseline.
const createInternationalConfig = (options: { legendPosition?: 'none' | 'top' | 'bottom' } = {}) =>
  config({
    legend: { position: options.legendPosition ?? 'none' },
    appearance: { background: { type: 'solid', color: INTL_COLORS.paper } },
    layout: {
      padding: 32,
      gaps: { header: options.legendPosition === 'top' ? 24 : 40 },
    },
    panel: {
      border: {
        top: { isVisible: false },
        bottom: { isVisible: true, lineStyle: 'solid', lineWidth: 1 },
        left: { isVisible: false },
        right: { isVisible: false },
      },
    },
    axes: {
      x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
      y: { position: 'left', grid: { isVisible: true, lineStyle: 'solid', lineWidth: 1 } },
    },
  });
```

## Title helper

Headlines are rich-text docs: Golos Text, sentence case with a full stop, key phrase in red.

```ts
import type { RichTextContent } from '@graphysdk/viz-engine';

export const createInternationalTitle = (
  segments: Array<{ text: string; color?: string }>
): RichTextContent => ({
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
            attrs: { color: color ?? INTL_COLORS.heading, fontFamily: INTL_FONT_FAMILY.heading, fontSize: '20px' },
          },
        ],
      })),
    },
  ],
});
```

## Example: bar chart, actual vs forecast

Actual quarters take the ink; the red is spent on the single forecast bar.

```tsx
import { config, createSpec, geom, mapping, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import '@graphysdk/react-renderer/styles.css';

const cpmData = {
  columns: [{ key: 'quarter' }, { key: 'cpm' }, { key: 'type' }],
  rows: [
    { quarter: 'Q1', cpm: 4.2, type: 'actual' },
    { quarter: 'Q2', cpm: 4.8, type: 'actual' },
    { quarter: 'Q3', cpm: 5.1, type: 'actual' },
    { quarter: 'Q4', cpm: 5.6, type: 'actual' },
    { quarter: 'Q1 next', cpm: 6.3, type: 'forecast' },
  ],
};

const cpmSpec = pipe(
  createSpec(),
  mapping({ x: 'quarter', y: 'cpm', color: 'type' }),
  geom.bar({ position: 'identity', params: { width: 0.66, borderRadius: 0 } }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 8 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [INTL_COLORS.ink, INTL_COLORS.accent] }),
  createInternationalConfig(),
  config({
    content: {
      title: createInternationalTitle([
        { text: 'CPM is set to climb past ' },
        { text: '€6', color: INTL_COLORS.accent },
        { text: '.' },
      ]),
      isTitleVisible: true,
      subtitle: 'Cost per mille by quarter, €. The red bar is the forecast.',
      isSubtitleVisible: true,
    },
  })
);

export function CpmChart() {
  return (
    <GraphProvider data={cpmData} input={cpmSpec} theme="light" themeOverrides={theme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Example: donut

Ring at 0.55 inner radius with a 2px white separation between wedges; the red is spent on the leader wedge, the rest run down the ink-and-grey palette.

```tsx
import { config, coord, createSpec, geom, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const revenueData = {
  columns: [{ key: 'region' }, { key: 'revenue' }],
  rows: [
    { region: 'North', revenue: 26 },
    { region: 'East', revenue: 22 },
    { region: 'Central', revenue: 20 },
    { region: 'South', revenue: 17 },
    { region: 'West', revenue: 15 },
  ],
};

const revenueDonutSpec = pipe(
  createSpec({ x: '', y: 'revenue', color: 'region' }),
  geom.bar({
    position: 'fill',
    params: { borderRadius: 0, borderColor: INTL_COLORS.paper, borderWidth: 2 },
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
  scale.color.discrete({ domain: ['North', 'East', 'Central', 'South', 'West'], range: [...INTL_PALETTE] }),
  createInternationalConfig(),
  config({
    content: {
      title: createInternationalTitle([
        { text: 'North', color: INTL_COLORS.accent },
        { text: ' takes a quarter of revenue.' },
      ]),
      isTitleVisible: true,
      subtitle: 'Share of revenue by region, %.',
      isSubtitleVisible: true,
    },
  })
);

export function RevenueDonut() {
  return (
    <GraphProvider data={revenueData} input={revenueDonutSpec} theme="light" themeOverrides={theme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Fonts

Theme tokens set font families but do not load the fonts — the page must load them. Inter is the base; Golos Text carries the headlines:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Golos+Text:wght@400..900&display=swap" />
```
