# Neo Brutalist

Technique: config + theme tokens (no plugins). One optional `Swatch` slot for hollow-forecast legend keys — everything else is spec config and theme.

Near-black sheets (`#171717`, corner radius 0) framed by a 1px dashed border, with acid `#C8FF00` reserved strictly for data — chrome stays grey. Cartesian bar charts trade the dashed bottom edge for a solid 2px acid baseline the bars sit on; gridlines are dashed `4 4` grey rows. All engine text is Space Grotesk 500 at 10px; titles are uppercase rich text with acid accent words.

## Constants

```ts
export const NB_COLORS = {
  background: '#0B0B0B', // page (outside the chart)
  surface: '#171717', // sheets, radius 0
  body: '#F0F0F0', // primary text and the white series
  secondary: '#8A8A8A', // secondary text and the grey series
  acid: '#C8FF00', // the accent — data only
  acidDim: '#9AB800', // overflow series slot
  greyMid: '#4A4A4A', // muted series
  greyDeep: '#2E2E2E', // ghost series / remainder tracks
  chrome: '#333333', // grid rows + dashed frame; the engine has a single grid-line color token
  metaRule: '#3A3A3A', // dashed rule (page chrome)
} as const;

export const NB_FONT_FAMILY = {
  heading: '"Space Grotesk", Inter, sans-serif', // headings and engine text
  body: 'Inter, "Helvetica Neue", Arial, sans-serif', // the shared base
} as const;

export const NB_DONUT_RAMP = [
  NB_COLORS.acid,
  NB_COLORS.body,
  NB_COLORS.secondary,
  NB_COLORS.greyMid,
  NB_COLORS.greyDeep,
];
```

## Theme

Measured font tokens (`fontTickLabel`, `fontAxisLabel`, `fontLegendLabel`, `fontDataLabel`) take structured `FontTokenOverride` objects; `fontPieLabel` and `fontSeriesLabel` take CSS shorthand strings.

```ts
import { type FontTokenOverride, type ThemeOverrides } from '@graphysdk/react-renderer';

// Engine text is Space Grotesk 500.
const engineText: FontTokenOverride = {
  family: NB_FONT_FAMILY.heading,
  size: { value: 10, unit: 'px' },
  lineHeight: 1.4,
  weight: 500,
};

export const neoBrutalistTheme: ThemeOverrides = {
  textPrimary: NB_COLORS.body,
  textSecondary: NB_COLORS.secondary,
  gridLineColor: NB_COLORS.chrome,
  gridLineDash: '4 4',
  legendBackground: 'transparent',
  legendBorderColor: 'transparent',
  legendTextColor: NB_COLORS.body,
  dataLabelOutsideBackground: NB_COLORS.surface,
  fontFamilyDefault: NB_FONT_FAMILY.body,
  fontFamilyHeading: NB_FONT_FAMILY.heading,
  fontTickLabel: engineText,
  fontAxisLabel: engineText,
  fontLegendLabel: engineText,
  fontDataLabel: engineText,
  fontPieLabel: `500 10px/14px ${NB_FONT_FAMILY.heading}`,
  fontSeriesLabel: `500 11px/14px ${NB_FONT_FAMILY.heading}`,
};
```

## Shared config builder

```ts
import { config } from '@graphysdk/viz-engine';
import type { RichTextContent } from '@graphysdk/viz-engine';

// Shared container grammar: acid-free chrome on a #171717 sheet, framed by a
// square 1px dashed border. Cartesian bar charts trade the dashed bottom edge
// for a solid acid baseline the bars sit on.
const createNeoBrutalistConfig = (
  options: { legendPosition?: 'none' | 'top' | 'right'; hasAcidBaseline?: boolean } = {}
) =>
  config({
    legend: { position: options.legendPosition ?? 'none' },
    appearance: { background: { type: 'solid', color: NB_COLORS.surface }, cornerRadius: 0 },
    layout: {
      padding: 32,
    },
    panel: {
      cornerRadius: 0,
      border: {
        top: { isVisible: true, lineStyle: 'dashed', lineWidth: 1 },
        left: { isVisible: true, lineStyle: 'dashed', lineWidth: 1 },
        right: { isVisible: true, lineStyle: 'dashed', lineWidth: 1 },
        bottom: options.hasAcidBaseline
          ? { isVisible: true, lineStyle: 'solid', lineWidth: 2, color: NB_COLORS.acid }
          : { isVisible: true, lineStyle: 'dashed', lineWidth: 1 },
      },
    },
    axes: {
      x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
      y: { position: 'left', grid: { isVisible: true, lineStyle: 'solid', lineWidth: 1 } },
    },
  });

// Uppercase title with per-segment acid accents.
const createNeoBrutalistTitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: segments.map(({ text, color }) => ({
        type: 'text',
        text: text.toUpperCase(),
        marks: [
          {
            type: 'textStyle',
            attrs: { color: color ?? NB_COLORS.body, fontFamily: NB_FONT_FAMILY.heading, fontSize: '24px' },
          },
        ],
      })),
    },
  ],
});

// Sub line rendered by the engine at spec-line size.
const createNeoBrutalistSubtitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: segments.map(({ text, color }) => ({
        type: 'text',
        text: text.toUpperCase(),
        marks: [
          {
            type: 'textStyle',
            attrs: { color: color ?? NB_COLORS.secondary, fontFamily: NB_FONT_FAMILY.heading, fontSize: '10px' },
          },
        ],
      })),
    },
  ],
});
```

## Example: stacked bars on an acid baseline

Surface-coloured 1px borders cut hairline gaps between segments; the acid series carries the emphasis.

```tsx
import { config, createSpec, geom, mapping, pipe, scale } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';
import '@graphysdk/react-renderer/styles.css';

const listingsData = {
  columns: [{ key: 'year' }, { key: 'segment' }, { key: 'listings' }],
  rows: [
    { year: '2021', segment: 'UK', listings: 1060 },
    { year: '2021', segment: 'International', listings: 330 },
    { year: '2022', segment: 'UK', listings: 1000 },
    { year: '2022', segment: 'International', listings: 310 },
    { year: '2023', segment: 'UK', listings: 970 },
    { year: '2023', segment: 'International', listings: 300 },
    { year: '2024', segment: 'UK', listings: 930 },
    { year: '2024', segment: 'International', listings: 280 },
  ],
};

const listingsSpec = pipe(
  createSpec(),
  mapping({ x: 'year', y: 'listings', color: 'segment' }),
  geom.bar({ position: 'stack', params: { borderRadius: 0, borderColor: NB_COLORS.surface, borderWidth: 1 } }),
  scale.x(),
  scale.y(),
  scale.color.discrete({ domain: ['UK', 'International'], range: [NB_COLORS.acid, NB_COLORS.greyMid] }),
  createNeoBrutalistConfig({ legendPosition: 'top', hasAcidBaseline: true }),
  config({
    content: {
      title: createNeoBrutalistTitle([
        { text: 'Long-term ' },
        { text: 'decline', color: NB_COLORS.acid },
        { text: ' in listings.' },
      ]),
      isTitleVisible: true,
      subtitle: createNeoBrutalistSubtitle([{ text: 'Listed companies by segment' }]),
      isSubtitleVisible: true,
    },
  })
);

export function NeoBrutalistListingsChart() {
  return (
    <GraphProvider data={listingsData} input={listingsSpec} theme="dark" themeOverrides={neoBrutalistTheme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## Example: line race with weighted strokes and direct labels

The lead series takes the acid 2.5px stroke, the follower the white 1.5px one: `lineWidth: 'auto'` reads the `strokeWidth` aesthetic, scaled per product.

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
  mapping({ x: 'month', y: 'value', color: 'product', strokeWidth: 'product' }),
  geom.line({ params: { lineWidth: 'auto', showFill: false } }),
  scale.x(),
  scale.y.continuous({ domainMin: 100 }),
  scale.color.discrete({ domain: ['Product A', 'Product B'], range: [NB_COLORS.acid, NB_COLORS.body] }),
  scale.strokeWidth.discrete({ domain: ['Product A', 'Product B'], range: [2.5, 1.5] }),
  createNeoBrutalistConfig(),
  config({
    legend: { position: 'right', display: 'direct' },
    content: {
      title: createNeoBrutalistTitle([{ text: 'Product A', color: NB_COLORS.acid }, { text: ' pulls ahead.' }]),
      isTitleVisible: true,
      subtitle: createNeoBrutalistSubtitle([{ text: 'Monthly value by product · index, Jan = 100' }]),
      isSubtitleVisible: true,
    },
  })
);

export function NeoBrutalistProductRace() {
  return (
    <GraphProvider data={productValueData} input={productRaceSpec} theme="dark" themeOverrides={neoBrutalistTheme}>
      <GraphRenderer sizing={{ mode: 'responsive' }} />
    </GraphProvider>
  );
}
```

## The hollow forecast bar and its Swatch slot

Signature pattern: a forecast bar is a `transparent` fill behind an acid 1.5px border — invisible on solid acid bars, a crisp outline on the empty one:

```ts
geom.bar({
  position: 'identity',
  params: { width: 0.6, borderRadius: 0, borderColor: NB_COLORS.acid, borderWidth: 1.5 },
}),
scale.color.discrete({ domain: ['actual', 'forecast'], range: [NB_COLORS.acid, 'transparent'] }),
```

Because the forecast series colour is `transparent`, the default legend swatch would paint nothing. Fix with a `Swatch` slot (see `reference/slots.md`) that draws a hollow acid outline for that series:

```tsx
import { type GraphSlots, type SwatchSlotProps } from '@graphysdk/react-renderer';

const NeoBrutalistSwatch = (props: SwatchSlotProps) => {
  const width = props.width ?? 12;
  const height = props.height ?? 12;
  const isHollow = props.label === 'forecast';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        fill={isHollow ? 'none' : props.color}
        stroke={isHollow ? NB_COLORS.acid : 'none'}
        strokeWidth={1.5}
      />
    </svg>
  );
};

const neoBrutalistSwatchSlots: GraphSlots = { Swatch: NeoBrutalistSwatch };
// <GraphRenderer sizing={{ mode: 'responsive' }} slots={neoBrutalistSwatchSlots} />
```

Only needed when a series colour is `transparent` and the legend is visible.

## Fonts

Space Grotesk must be loaded by the host page (Inter is the fallback base):

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap"
/>
```

## Other charts in this style

- Donut: `geom.bar({ position: 'fill', params: { borderRadius: 0, borderColor: NB_COLORS.surface, borderWidth: 3 } })` + `coord.polar({ theta: 'y', innerRadius: 0.55 })`; colours from `NB_DONUT_RAMP`; percentage + category data labels outside.
- Rose (coxcomb): `geom.bar({ position: 'identity', params: { width: 1, borderRadius: 0, borderColor: NB_COLORS.surface, borderWidth: 1 } })` + `coord.polar({ theta: 'x' })`; emphasised wedges in `acid`, the rest in `greyDeep`.
- Racetrack: `geom.bar({ position: 'stack', params: { width: 0.9, borderRadius: 0 } })` + `coord.polar({ theta: 'y', innerRadius: 0.25 })`; achieved in `acid`, remainder in `greyDeep`; add `config({ layout: { gaps: { header: 20 } } })`.
