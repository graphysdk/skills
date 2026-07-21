# Lenny's Newsletter

**Tier: config + theme tokens.** No slots, no plugins — the card chrome and headline both come from the spec.

Warm newsletter style: cream chart grounds with a hairline ink outline and a 28px corner radius (drawn by the spec's `appearance`, not an outer card), one full-strength brand orange leading a soft autumn ramp, and Plus Jakarta Sans throughout. Value labels are plain bold ink with no plate behind them; cartesian charts sit on a single 2px ink baseline while polar charts drop the baseline and grid entirely.

## Constants

```ts
export const LENNY_COLORS = {
  actual: '#F8A24B',
  forecast: '#FCD9B8',
  card: '#FFF3EA',
  page: '#FBECE2',
  ink: '#322E2C',
  inkSecondary: '#97836E',
  gridLine: '#D6B29A',
} as const;

export const LENNY_FONT_FAMILY = {
  body: "'Plus Jakarta Sans', sans-serif",
} as const;

/** Autumn ramp for ranked charts: orange leads, gold second, browns fading to cream. */
export const AUTUMN_RAMP = ['#F5820D', '#F4B93F', '#AE9070', '#CBB499', '#E7DAC8'];

/** Full-strength brand orange — lines take full-strength hues only, and the title key phrase. */
export const BRAND_ORANGE = '#F5820D';

/** Muted warm tones for the radial charts: the strong orange leads, these recede behind it. */
export const ROSE_REST = '#CBB499';
export const TRACK_REMAINING = '#E7DAC8';

/** The follower line's warm brown — a mid-ramp tone that recedes behind the orange lead. */
export const LINE_FOLLOWER = '#AE9070';
```

## Theme overrides

`fontDataLabel`, `fontCategoryLabel`, and `fontTickLabel` are measured font tokens and take structured `FontTokenOverride` objects — a partial override like `{ weight: 600 }` keeps every other font property at its default.

```ts
import type { ThemeOverrides } from '@graphysdk/react-renderer';

export const themeOverrides: ThemeOverrides = {
  fontFamilyDefault: LENNY_FONT_FAMILY.body,
  fontFamilyHeading: LENNY_FONT_FAMILY.body,
  textPrimary: LENNY_COLORS.ink,
  textSecondary: LENNY_COLORS.inkSecondary,
  gridLineColor: LENNY_COLORS.gridLine,
  // Legend as plain dot + label, no pill chrome.
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  // Value labels as plain bold ink, no plate behind them.
  dataLabelOutsideBackground: 'transparent',
  dataLabelTextColor: LENNY_COLORS.ink,
  dataLabelInsideTextColor: LENNY_COLORS.ink,
  fontDataLabel: { weight: 700, size: { value: 1.3, unit: 'em' } },
  fontCategoryLabel: { weight: 600, size: { value: 1.1, unit: 'em' } },
  fontTickLabel: { weight: 600 },
};
```

## Shared config fragments

This style composes three reusable config fragments instead of one builder: the card appearance plus a cartesian or polar panel.

```ts
/** Shared card chrome, applied through the spec: cream ground, radius 28 with a hairline ink outline. */
const cardAppearance = {
  background: { type: 'solid', color: LENNY_COLORS.card },
  border: { type: 'solid', color: LENNY_COLORS.ink, width: 1 },
  cornerRadius: 28,
  textScale: 1.2,
} as const;

// A cartesian plate: a single 2px ink baseline, a solid horizontal grid, no side rules.
const cartesianPanel = {
  axes: {
    x: { ticks: { isVisible: false } },
    y: { position: 'left', grid: { lineStyle: 'solid' } },
  },
  panel: {
    border: {
      top: { isVisible: false },
      right: { isVisible: false },
      bottom: { isVisible: true, lineStyle: 'solid', lineWidth: 2, color: LENNY_COLORS.ink },
      left: { isVisible: false },
    },
  },
} as const;

// A polar plate: no baseline, no grid — the ring is its own ground.
const polarPanel = {
  axes: {
    x: { ticks: { isVisible: false } },
    y: { ticks: { isVisible: false }, grid: { isVisible: false } },
  },
  panel: {
    border: {
      top: { isVisible: false },
      right: { isVisible: false },
      bottom: { isVisible: false },
      left: { isVisible: false },
    },
  },
} as const;
```

## Title helper

```ts
import type { RichTextContent } from '@graphysdk/viz-engine';

/** Headline as a rich-text doc: sentence case with the key phrase carried in brand orange. */
export const createLennyTitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: segments.map(({ text, color }) => ({
        type: 'text',
        text,
        marks: color ? [{ type: 'textStyle', attrs: { color } }] : undefined,
      })),
    },
  ],
});
```

## Example: columns, actual vs forecast

Slim columns via wider band padding; the forecast bar takes the paler tint of the same orange.

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
  geom.bar({ position: 'identity', dataLabels: { showDataLabels: true, position: 'outside', offset: 8 } }),
  // Wider gaps between bars for slim columns.
  scale.x({ padding: 0.45 }),
  scale.y.continuous({ domainMax: 10 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [LENNY_COLORS.actual, LENNY_COLORS.forecast] }),
  config({
    content: {
      title: createLennyTitle([
        { text: 'CPM is set to climb past ' },
        { text: '€6', color: BRAND_ORANGE },
        { text: '.' },
      ]),
      subtitle: 'Cost per mille by quarter, €. Paler bars are forecasts.',
    },
    legend: { position: 'bottom' },
    ...cartesianPanel,
    appearance: cardAppearance,
  })
);

export function CpmChart() {
  return (
    <GraphProvider data={cpmData} input={cpmSpec} themeOverrides={themeOverrides}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Example: line race with direct end labels

The lead series takes the full-strength orange, the follower the muted brown. Thick 6px strokes carry the newsletter's hand-drawn weight.

```tsx
import { config, createSpec, geom, mapping, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const productData = {
  columns: [{ key: 'month' }, { key: 'value' }, { key: 'product' }],
  rows: [
    { month: 'Jan', value: 100, product: 'Product A' },
    { month: 'Feb', value: 112, product: 'Product A' },
    { month: 'Mar', value: 128, product: 'Product A' },
    { month: 'Apr', value: 149, product: 'Product A' },
    { month: 'May', value: 168, product: 'Product A' },
    { month: 'Jan', value: 100, product: 'Product B' },
    { month: 'Feb', value: 104, product: 'Product B' },
    { month: 'Mar', value: 111, product: 'Product B' },
    { month: 'Apr', value: 116, product: 'Product B' },
    { month: 'May', value: 121, product: 'Product B' },
  ],
};

const productRaceSpec = pipe(
  createSpec(),
  mapping({ x: 'month', y: 'value', color: 'product' }),
  geom.line({ params: { lineWidth: 6, showFill: false } }),
  scale.x(),
  scale.y.continuous({ domainMin: 100 }),
  scale.color.discrete({ domain: ['Product A', 'Product B'], range: [BRAND_ORANGE, LINE_FOLLOWER] }),
  config({ ...cartesianPanel, appearance: cardAppearance }),
  config({
    legend: { position: 'right', display: 'direct' },
    content: {
      title: createLennyTitle([{ text: 'Product A', color: BRAND_ORANGE }, { text: ' pulls ahead of product B.' }]),
      subtitle: 'Monthly value by product.',
    },
  })
);

export function ProductRaceChart() {
  return (
    <GraphProvider data={productData} input={productRaceSpec} themeOverrides={themeOverrides}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Fonts

Theme tokens set font families but do not load the fonts — the page must load Plus Jakarta Sans:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap" />
```
