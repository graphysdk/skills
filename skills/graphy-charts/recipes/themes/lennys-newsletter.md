# Lenny's Newsletter

**Tier: config + stylesheet + theme tokens.** No slots, no plugins — the card chrome, the plate rules, the tooltip and the legend all come from the spec's stylesheet; theme tokens only dress the header and footer type.

Warm newsletter style: cream chart grounds with a hairline ink outline and a 28px corner radius drawn by the chart's own frame, not an outer card, one full-strength brand orange leading a soft autumn ramp, and Plus Jakarta Sans throughout. Value labels are plain bold ink with no plate behind them; cartesian charts sit on a single 2px ink baseline while polar charts drop the baseline and grid entirely.

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

The stylesheet paints the plot and the tooltip, legend and headline; theme tokens are left with the HTML header and footer. `fontFamilyHeading` is the family a plain-string title takes; `fontFamilyDefault` is what a plain-string subtitle, caption and the source line take (and the measurement fallback) — a rich-text title like `createLennyTitle` inherits the host page's font unless its `textStyle` mark names `font`, which is why the helper below sets it. `textPrimary` inks the title, subtitle and caption; `textSecondary` only the source line. The legend overflow "+N" pill and its popover still read theme tokens (`legendBackground`, `legendBorderColor`, `legendTextColor`, `fontLegendLabel`, `tooltip*`), so a narrow legend collapses into an unstyled pill unless those are set too.

```ts
import type { ThemeOverrides } from '@graphysdk/react-renderer';

export const themeOverrides: ThemeOverrides = {
  fontFamilyDefault: LENNY_FONT_FAMILY.body,
  fontFamilyHeading: LENNY_FONT_FAMILY.body,
  // Header and footer text: title, subtitle and caption in ink; the source line in the secondary ink.
  textPrimary: LENNY_COLORS.ink,
  textSecondary: LENNY_COLORS.inkSecondary,
};
```

## Shared fragments

This style composes small fragments: the card, then a cartesian or polar plate. Each comes in two halves — a `config` object for what the chart contains, and a stylesheet for what it looks like.

```ts
import { style, styles } from '@graphysdk/viz-engine';

/** The card itself: cream ground, radius 28, hairline ink outline, and text one fifth up. */
// `textScale` also scales the stylesheet's px `fontSize` values (the 13px value labels print at 15.6).
const cardAppearance = { textScale: 1.2 } as const;
const cardChromeStyles = styles({
  // Ink for every primary text target; the secondary ink for ticks, legend items and tooltip values.
  tokens: { textPrimary: LENNY_COLORS.ink, textSecondary: LENNY_COLORS.inkSecondary },
  defaults: [
    style.graph({
      background: LENNY_COLORS.card,
      borderColor: LENNY_COLORS.ink,
      borderWidth: 1,
      borderRadius: 28,
      fontFamily: LENNY_FONT_FAMILY.body,
    }),
    style.tickLabel({ fontWeight: 600, textColor: LENNY_COLORS.inkSecondary }),
    // Value labels as plain bold ink; no label carries a background by default, so nothing needs clearing.
    style.dataLabel({ fontSize: 13, fontWeight: 700, textColor: LENNY_COLORS.ink }),
    // The built-in legend item is already bare text (no background, no border); only its ink is set.
    style.legendItem({ textColor: LENNY_COLORS.ink }),
    // The tooltip is a small flat card: cream ground, hairline ink ring.
    style.tooltip({ background: LENNY_COLORS.card, borderColor: LENNY_COLORS.ink, borderWidth: 1, borderRadius: 12, shadow: 'none' }),
  ],
});

// A cartesian plate: a single 2px ink baseline, a solid horizontal grid, no side rules.
const cartesianPanel = {
  axes: {
    x: { ticks: { isVisible: false } },
    y: { position: 'left' },
  },
} as const;
const cartesianPlateStyles = styles({
  defaults: [
    style.gridLine({ lineType: 'solid', color: LENNY_COLORS.gridLine }),
    // The built-in tick line is 0 wide and 0 long, so a colour alone paints nothing.
    style.tickLine({ color: LENNY_COLORS.gridLine, strokeWidth: 1, length: 4 }),
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ lineType: 'solid', strokeWidth: 2, color: LENNY_COLORS.ink }),
  ],
});

// A polar plate: no baseline, no grid — the ring is its own ground.
const polarPanel = {
  axes: {
    x: { ticks: { isVisible: false } },
    y: { ticks: { isVisible: false }, grid: { isVisible: false } },
  },
} as const;
const polarPlateStyles = styles({ defaults: [style.panelBorder({ strokeWidth: 0 })] });
```

Each style entry merges property by property, so `style.tickLabel({ fontWeight: 600 })` bolds the tick text and leaves its size and family alone. An edge is taken off the plate with `strokeWidth: 0` — it draws nothing and reserves no space, which is what lets the polar plate float free of any rule. `borderRadius` on `style.graph` is a pixel number; on a bar it is a token (`'none'` through `'full'`). `style.graph({ fontFamily })` is the base family every stylesheet text target inherits — axis, ticks, labels, legend items, tooltip — while the theme's `fontFamilyHeading` / `fontFamilyDefault` carry the plain-string header and footer text and the title mark's `font` carries the rich-text title. Redefining the `textPrimary`/`textSecondary` *stylesheet* tokens re-inks every built-in default that reads them (direct labels, headline cards, tooltip text); they are independent of the theme tokens of the same name. `style.tooltip.primaryRow({ background })` and `style.headlineItem.label` / `.trend.up` / `.trend.down` / `.trend.flat` are not set, so they keep their built-in paint.

## Title helper

```ts
import type { RichTextContent } from '@graphysdk/viz-engine';

/**
 * Headline as a rich-text doc: sentence case with the key phrase carried in brand orange. Every
 * segment's mark names `font`, otherwise the rich-text title inherits the host page's family.
 */
export const createLennyTitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: segments.map(({ text, color }) => ({
        type: 'text',
        text,
        marks: [{ type: 'textStyle', attrs: { font: LENNY_FONT_FAMILY.body, ...(color ? { color } : {}) } }],
      })),
    },
  ],
});
```

## Example: columns, actual vs forecast

Slim columns via wider band padding; the forecast bar takes the paler tint of the same orange. The card and plate stylesheets pipe in after the `config()` that names their structure.

```tsx
import { config, createSpec, geom, mapping, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

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
  }),
  cardChromeStyles,
  cartesianPlateStyles
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

The lead series takes the full-strength orange, the follower the muted brown. Thick 6px strokes carry the newsletter's hand-drawn weight, and the traces stay bare — a line washes a gradient beneath it only where `fillAlpha` is declared. `style.directLabel` is not authored, so each end label keeps its series colour.

```tsx
import { config, createSpec, geom, mapping, pipe, scale, style, styles } from '@graphysdk/viz-engine';
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
  geom.line(),
  styles({ defaults: [style.geom.line({ strokeWidth: 6 })] }),
  scale.x(),
  scale.y.continuous({ domainMin: 100 }),
  scale.color.discrete({ domain: ['Product A', 'Product B'], range: [BRAND_ORANGE, LINE_FOLLOWER] }),
  config({ ...cartesianPanel, appearance: cardAppearance }),
  cardChromeStyles,
  cartesianPlateStyles,
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

`GraphProvider` takes `colorScheme="light" | "dark"` when a chart needs to be pinned to one scheme; these charts leave it at the default and rely on the card's own colours.

## Fonts

`style.graph({ fontFamily })` applies Plus Jakarta Sans to the chart text, `fontFamilyHeading` / `fontFamilyDefault` to the plain-string header and footer text, and the title mark's `font` to the rich-text title; none of them loads the font — the page must load it:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap" />
```

## Other charts in this style

Each pipes its `config({ ...cartesianPanel | ...polarPanel, appearance: cardAppearance })`, then `cardChromeStyles`, then the matching plate stylesheet.

- Stacked columns: `geom.bar({ position: 'stack' })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'none', borderColor: LENNY_COLORS.card, borderWidth: 1 })] })` with `scale.x({ padding: 0.3 })` — card-coloured hairlines cut the stack into slabs; segments in `[LENNY_COLORS.actual, ROSE_REST]`.
- Donut: the same bar entry at `borderWidth: 2` + `coord.polar({ theta: 'y', innerRadius: 0.55 })`, colours from `AUTUMN_RAMP`, percentage + category labels outside, `polarPanel` + `polarPlateStyles`.
- Rose (coxcomb): `geom.bar({ position: 'identity', params: { width: 1 } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'none', borderColor: LENNY_COLORS.card, borderWidth: 1 })] })` + `coord.polar({ theta: 'x' })`; golden-quarter months in `BRAND_ORANGE`, the rest in `ROSE_REST`.
- Racetrack: `geom.bar({ position: 'stack', params: { width: 0.9 } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'none' })] })` + `coord.polar({ theta: 'y', innerRadius: 0.25 })`; achieved in `BRAND_ORANGE`, remainder in `TRACK_REMAINING`.
