# Braun

Technique: spec `config()` + a stylesheet + a few theme tokens for the header/footer (no slots, no plugins).

Dieter Rams applied to data: a warm-grey desk, charts as rounded plates in a warm panel tone, ink linework, and one orange (`indicator`) reserved for a single reading per chart — never a series. Bars are fully rounded pills at 55% band width resting on a single structure-grey baseline; there is no y axis and no grid — printed readings (data labels) carry the values. One typeface (Archivo) at one 12px cut for all engine text, with readings slightly heavier.

The split: `config()` decides what exists (legend, axes, padding), the **stylesheet** paints it — plate, baseline, label type, and the tooltip, legend key and headline cards — and `themeOverrides` dresses only the header/footer type around the plot. See `reference/styling.md`.

## Constants

```ts
export const BRAUN_COLORS = {
  ink: '#1D1D1B', // bars, traces, printed readings
  indicator: '#F07E13', // orange — one reading per chart, never a series
  trace2: '#8E8C86', // second line series
  structure: '#C9C6BE', // baseline rule and hairlines
  label: '#55534E', // spare mid grey — wedge names print in the reading's ink (see dataLabel)
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

Four tokens for the HTML header and footer. `fontFamilyHeading` is the family a plain-string title takes; `fontFamilyDefault` is what a plain-string subtitle, caption and the source line take (and the measurement fallback). A rich-text title like `createBraunTitle` inherits the host page's font unless its `textStyle` mark names `font` (it does, via the `fontFamily` alias). `textPrimary` inks the title, subtitle and caption; `textSecondary` only the source line. These are theme tokens, not the stylesheet tokens of the same name — the plot's own text, the legend key, the tooltip and the headline take their colour from the stylesheet below, which names it per target. The legend overflow "+N" pill and its popover still read theme tokens (`legendBackground`, `legendBorderColor`, `legendTextColor`, `fontLegendLabel`, `tooltip*`), so a narrow legend collapses into an unstyled pill unless those are set too.

```ts
import type { ThemeOverrides } from '@graphysdk/react-renderer';

export const braunTheme: ThemeOverrides = {
  fontFamilyDefault: BRAUN_FONT_FAMILY.body, // plain-string subtitle, caption, source line, and the measurement fallback
  fontFamilyHeading: BRAUN_FONT_FAMILY.body, // plain-string title
  textPrimary: BRAUN_COLORS.ink, // title, subtitle, caption
  textSecondary: BRAUN_COLORS.labelMuted, // source line
};
```

## Shared plate stylesheet

```ts
import { style, styles } from '@graphysdk/viz-engine';

// The plate paint: a warm panel ground with a single structure-grey baseline the
// geoms rest on, and one 12px Archivo cut across the engine's text — readings
// heavier. `style.graph({ fontFamily })` puts Archivo on every text target.
// `borderWidth: 0` retires the built-in 1px frame ring, so the plate runs edge to edge.
const braunChromeStyles = styles({
  defaults: [
    style.graph({ background: BRAUN_COLORS.panel, borderWidth: 0, fontFamily: BRAUN_FONT_FAMILY.body }),
    // `strokeWidth: 0` hides an edge and reserves no space for it.
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ lineType: 'solid', strokeWidth: 1.2, color: BRAUN_COLORS.structure }),

    style.axisLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: BRAUN_COLORS.ink }),
    style.tickLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: BRAUN_COLORS.labelMuted }),
    // Printed readings sit heavier and slightly larger — the one number you read off a dial.
    style.dataLabel({ fontSize: 13, fontWeight: 600, textColor: BRAUN_COLORS.ink }),
    // Outside readings sit on a panel-coloured plate (radius 4, padding 6×2): invisible against the
    // panel, but opaque — it occludes whatever it overlaps.
    style.dataLabel.observation.outside({ background: BRAUN_COLORS.panel }),
    // Pie labels are observation labels: on polar, `showCategoryLabels` merges the category into the
    // same label, so the entry above covers wedges. `dataLabel.category` exists only for cartesian bars.
    // Series end labels (direct legend) take the plain 12px cut. No `textColor`: an authored one
    // replaces the series colour on every end label, and the line race keys them by colour.
    style.directLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4 }),

    // Legend key: the built-in item is already bare text (no background, no border), so only
    // the type, the muted tick grey and the padding are set.
    style.legendItem({
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.4,
      textColor: BRAUN_COLORS.labelMuted,
      paddingInline: 0,
    }),
    style.legendItem.swatch({ size: 10 }),
    style.legend({ gap: 16 }),

    // Tooltip: a panel-coloured card with a structure hairline and no shadow.
    style.tooltip({ background: BRAUN_COLORS.panel, borderColor: BRAUN_COLORS.structure, borderWidth: 1, borderRadius: 6, shadow: 'none' }),
    style.tooltip.heading({ textColor: BRAUN_COLORS.ink }),
    style.tooltip.label({ textColor: BRAUN_COLORS.labelMuted }),
    style.tooltip.value({ textColor: BRAUN_COLORS.ink }),
    // Headline cards: ink numbers over muted captions.
    style.headlineItem.number({ textColor: BRAUN_COLORS.ink }),
    style.headlineItem.caption({ textColor: BRAUN_COLORS.labelMuted }),
  ],
});

// Polar plates carry no cartesian baseline, so the bottom rule is suppressed.
const braunPolarStyles = styles({ defaults: [style.panelBorder.bottom({ strokeWidth: 0 })] });
```

`style.tooltip.primaryRow({ background })` and `style.headlineItem.label` / `.trend.up` / `.trend.down` / `.trend.flat` are not set here, so they keep their built-in paint.

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

// Chart title: Archivo in ink. A mark `fontSize` is n/10 em of its parent, so 16 is
// 1.6em of the h1 (itself 2em of the 10px root), not 16px; the mark sets no weight,
// so the h1's 700 stands. Rams-plain — no accent phrase, since orange belongs to the data.
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
              attrs: { color: BRAUN_COLORS.ink, fontFamily: BRAUN_FONT_FAMILY.body, fontSize: 16 },
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

`style.graph({ fontFamily })` puts Archivo on the chart text, `fontFamilyHeading` / `fontFamilyDefault` on the plain-string header and footer text, and the title mark's `fontFamily` on the rich-text title; none of them loads it. Archivo must be loaded by the host page (the theme falls back to Inter/sans-serif):

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap"
/>
```

## Other charts in this style

Each pipes `createBraunConfig()` + `braunChromeStyles`, then its own one-line geom stylesheet.

- Stacked pills: `geom.bar({ position: 'stack', params: { width: BAR_WIDTH } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'full', borderColor: BRAUN_COLORS.panel, borderWidth: 1.5 })] })` — panel-coloured borders cut a hairline gap between segments; series colours `[BRAUN_COLORS.ink, BRAUN_RAMP[1]]`.
- Line race: `geom.line()` + `styles({ defaults: [style.geom.line({ strokeWidth: LINE_WIDTH })] })`, lead series in `ink`, follower in `trace2`; direct end labels via `config({ legend: { position: 'right', display: 'direct' } })`, typed by the plate's `style.directLabel` entry. There is no gradient wash unless you declare `fillAlpha`.
- Rose (coxcomb): `geom.bar({ position: 'identity', params: { width: 1 } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'none', borderColor: BRAUN_COLORS.panel, borderWidth: 1 })] })` + `coord.polar({ theta: 'x' })` + `braunPolarStyles`; emphasised months in `ink`, the rest in `structure`.
- Racetrack: `geom.bar({ position: 'stack', params: { width: 0.9 } })` + `styles({ defaults: [style.geom.bar({ borderRadius: 'none' })] })` + `coord.polar({ theta: 'y', innerRadius: 0.25 })` + `braunPolarStyles`; achieved in `ink`, remainder in `BRAUN_RAMP[3]`.
