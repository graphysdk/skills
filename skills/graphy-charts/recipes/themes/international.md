# International

**Tier: config + stylesheet + a few theme tokens for the header/footer.** No slots, no plugins — the look is spec `config()` for structure, a `styles()` stylesheet for paint (plot, tooltip, legend and headline alike), and `themeOverrides` for the header/footer type around the plot.

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
  gridLine: '#E9E9E9', // horizontal major grid and tick marks
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

The theme dresses only the HTML header and footer. `fontFamilyDefault` is what a plain-string subtitle, caption and the source line take (and the measurement fallback); `fontFamilyHeading` what a plain-string title takes — the rich-text title from `createInternationalTitle` inherits the host page's font unless its `textStyle` mark names `font` (it does, via the `fontFamily` alias). `textPrimary` inks the title, subtitle and caption; `textSecondary` only the source line. These are theme tokens, not the stylesheet tokens of the same name — everything the chart draws, legend key, tooltip and headline included, takes its colour from the stylesheet below. The legend overflow "+N" pill and its popover still read theme tokens (`legendBackground`, `legendBorderColor`, `legendTextColor`, `fontLegendLabel`, `tooltip*`), so a narrow legend collapses into an unstyled pill unless those are set too.

```ts
import type { ThemeOverrides } from '@graphysdk/react-renderer';

export const theme: ThemeOverrides = {
  fontFamilyDefault: INTL_FONT_FAMILY.body, // plain-string subtitle, caption, source line, and the measurement fallback
  fontFamilyHeading: INTL_FONT_FAMILY.heading, // plain-string title
  textPrimary: INTL_COLORS.body, // title, subtitle, caption
  textSecondary: INTL_COLORS.grey, // source line
};
```

## Shared plate stylesheet

White paper with the built-in 1px frame ring retired, a solid horizontal grid in the faint grey, and one solid ink bottom border as the axis baseline. Every text target carries the same 10.5px cut — ink for labels that name things, grey for tick values and the legend key — and `style.graph({ fontFamily })` is what puts Inter on all of them.

```ts
import { style, styles } from '@graphysdk/viz-engine';

const internationalChromeStyles = styles({
  defaults: [
    style.graph({ background: INTL_COLORS.paper, borderWidth: 0, fontFamily: INTL_FONT_FAMILY.body }),
    style.gridLine({ lineType: 'solid', strokeWidth: 1, color: INTL_COLORS.gridLine }),
    // The built-in tick line is 0 wide and 0 long, so a colour alone paints nothing.
    style.tickLine({ color: INTL_COLORS.gridLine, strokeWidth: 1, length: 4 }),
    // `strokeWidth: 0` takes an edge off the plate: no stroke, no reserved space.
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ lineType: 'solid', strokeWidth: 1, color: INTL_COLORS.ink }),

    style.axisLabel({ fontSize: 10.5, fontWeight: 500, lineHeight: 1.5, textColor: INTL_COLORS.body }),
    style.tickLabel({ fontSize: 10.5, fontWeight: 500, lineHeight: 1.5, textColor: INTL_COLORS.grey }),
    // Pie labels are data labels too, so this one entry covers bars and wedges.
    style.dataLabel({ fontSize: 10.5, fontWeight: 500, textColor: INTL_COLORS.body }),
    // No `textColor`: an authored one replaces the series colour on every end label, and the
    // red accent is meant to reach the key series' label.
    style.directLabel({ fontSize: 10.5, fontWeight: 500, lineHeight: 1.5 }),

    // Legend key: the built-in item is already bare text (no background, no border), so only
    // the axis cut, the grey and the padding are set.
    style.legendItem({
      fontSize: 10.5,
      fontWeight: 500,
      lineHeight: 1.5,
      textColor: INTL_COLORS.grey,
      paddingInline: 0,
    }),
    // `size` is the box; a line/area swatch keeps the built-in `strokeWidth: 2` unless declared.
    style.legendItem.swatch({ size: 9 }),
    style.legend({ gap: 16 }),

    // Tooltip: a flat white card with a hairline in the grid grey; headline in heading black over grey captions.
    style.tooltip({ background: INTL_COLORS.paper, borderColor: INTL_COLORS.gridLine, borderWidth: 1, borderRadius: 2, shadow: 'none' }),
    style.tooltip.heading({ textColor: INTL_COLORS.body }),
    style.tooltip.label({ textColor: INTL_COLORS.grey }),
    style.tooltip.value({ textColor: INTL_COLORS.body }),
    style.headlineItem.number({ textColor: INTL_COLORS.heading }),
    style.headlineItem.caption({ textColor: INTL_COLORS.grey }),
  ],
});
```

`style.tooltip.primaryRow({ background })` and `style.headlineItem.label` / `.trend.up` / `.trend.down` / `.trend.flat` are not set, so they keep their built-in paint.

## Shared config builder

```ts
import { config } from '@graphysdk/viz-engine';

// Shared frame: which guides exist. Horizontal major grid only, no x ticks.
const createInternationalConfig = (options: { legendPosition?: 'none' | 'top' | 'bottom' } = {}) =>
  config({
    legend: { position: options.legendPosition ?? 'none' },
    layout: {
      padding: 32,
      gaps: { header: options.legendPosition === 'top' ? 24 : 40 },
    },
    axes: {
      x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
      y: { position: 'left', grid: { isVisible: true } },
    },
  });
```

## Title helper

Headlines are rich-text docs: Golos Text, sentence case with a full stop, key phrase in red. A mark `fontSize` is n/10 em of its parent, so 20 is 2em of the h1 (itself 2em of the 10px root), not 20px; the mark sets no weight, so the h1's 700 stands.

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
            attrs: { color: color ?? INTL_COLORS.heading, fontFamily: INTL_FONT_FAMILY.heading, fontSize: 20 },
          },
        ],
      })),
    },
  ],
});
```

## Example: bar chart, actual vs forecast

Actual quarters take the ink; the red is spent on the single forecast bar. Bars run at 66% of the band with square corners — `borderRadius` on a geom is a token, and square is `'none'`.

```tsx
import { config, createSpec, geom, mapping, pipe, scale, style, styles } from '@graphysdk/viz-engine';
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
  geom.bar({ position: 'identity', params: { width: 0.66 } }),
  styles({ defaults: [style.geom.bar({ borderRadius: 'none' })] }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 8 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [INTL_COLORS.ink, INTL_COLORS.accent] }),
  createInternationalConfig(),
  internationalChromeStyles,
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
    <GraphProvider data={cpmData} input={cpmSpec} colorScheme="light" themeOverrides={theme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

Band width is geometry and belongs to the geom's `params`; corner shape, border and fill are paint and belong to the stylesheet. The bar entry lives in `defaults`, so the colour scale still decides which bar is red.

## Example: donut

Ring at 0.55 inner radius with a 2px white separation between wedges; the red is spent on the leader wedge, the rest run down the ink-and-grey palette.

```tsx
import { config, coord, createSpec, geom, pipe, scale, style, styles } from '@graphysdk/viz-engine';
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
    dataLabels: {
      showDataLabels: true,
      format: 'percentage',
      showCategoryLabels: true,
      position: 'outside',
      justify: 'end',
      align: 'center',
    },
  }),
  styles({ defaults: [style.geom.bar({ borderRadius: 'none', borderColor: INTL_COLORS.paper, borderWidth: 2 })] }),
  coord.polar({ theta: 'y', innerRadius: 0.55 }),
  scale.x(),
  scale.y(),
  scale.color.discrete({ domain: ['North', 'East', 'Central', 'South', 'West'], range: [...INTL_PALETTE] }),
  createInternationalConfig(),
  internationalChromeStyles,
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
    <GraphProvider data={revenueData} input={revenueDonutSpec} colorScheme="light" themeOverrides={theme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Fonts

`style.graph({ fontFamily })` puts Inter on the chart text and `fontFamilyDefault` on the plain-string subtitle, caption and source line; the title mark's `fontFamily` (with `fontFamilyHeading` for a plain-string title) puts Golos Text on the headline. None of them loads a font — the page must:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Golos+Text:wght@400..900&display=swap" />
```

## Other charts in this style

Each pipes `createInternationalConfig()` + `internationalChromeStyles`, then its own geom stylesheet.

- Stacked bars: `geom.bar({ position: 'stack', params: { width: 0.66 } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'none' })] })`; segments in `[INTL_COLORS.ink, INTL_COLORS.accent]`, legend below.
- Line race: `geom.line()` + `geom.point({ interactive: false })` for a dot on every vertex, with `styles({ defaults: [style.geom.line({ strokeWidth: 1.75 }), style.geom.point({ size: 6.5 })] })`; direct end labels via `config({ legend: { position: 'right', display: 'direct' } })`, typed by the plate's `style.directLabel` entry and coloured by their series.
- Rose (coxcomb): `geom.bar({ position: 'identity', params: { width: 1 } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'none', borderColor: INTL_COLORS.paper, borderWidth: 1 })] })` + `coord.polar({ theta: 'x' })`; the accent marks the emphasised months, the rest stay ink.
- Racetrack: `geom.bar({ position: 'stack', params: { width: 0.9 } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'none' })] })` + `coord.polar({ theta: 'y', innerRadius: 0.25 })`; achieved in `ink`, remainder in `greyFaint`, and the red stays in the headline.
