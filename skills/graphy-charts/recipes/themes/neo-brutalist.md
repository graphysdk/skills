# Neo Brutalist

A theme is a stylesheet plus config. It is not a provider prop. Pipe it into the spec with `styles({ extends: [theme] })`. Fonts are loaded by the host page, not by the chart.

Near-black sheets, square corners, a dashed chrome-grey frame, Space Grotesk, and acid green kept for data only. Render with `colorScheme="dark"`.

```tsx
import { config, style, styles, type GraphSlots, type SwatchSlotProps } from '@graphysdk/react';
import type { RichTextContent } from '@graphysdk/viz-engine';

export const NB_COLORS = {
  background: '#0B0B0B',
  surface: '#171717',
  body: '#F0F0F0',
  secondary: '#8A8A8A',
  acid: '#C8FF00',
  acidDim: '#9AB800',
  greyMid: '#4A4A4A',
  greyDeep: '#2E2E2E',
  chrome: '#333333',
} as const;

export const NB_DONUT_RAMP = [NB_COLORS.acid, NB_COLORS.body, NB_COLORS.secondary, NB_COLORS.greyMid, NB_COLORS.greyDeep];

// Load Space Grotesk on the host page:
// https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap
export const NB_FONT_FAMILY = {
  heading: '"Space Grotesk", Inter, sans-serif',
  body: 'Inter, "Helvetica Neue", Arial, sans-serif',
} as const;

export const nbConfig = config({
  legend: { position: 'none' },
  axes: {
    x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
    y: { position: 'left', grid: { isVisible: true } },
  },
});

export const nbTheme = styles({
  defaults: [
    style.graph({ fill: NB_COLORS.surface, cornerRadius: 0, fontFamily: NB_FONT_FAMILY.heading, padding: 32 }),
    style.axisLabel({ fontSize: 10, fontWeight: 500, lineHeight: 1.4, textColor: NB_COLORS.body }),
    style.tickLabel({ fontSize: 10, fontWeight: 500, lineHeight: 1.4, textColor: NB_COLORS.secondary }),
    style.dataLabel({ fontSize: 10, fontWeight: 500, textColor: NB_COLORS.body }),
    style.legendItem({
      fontFamily: NB_FONT_FAMILY.heading,
      fontSize: 10,
      fontWeight: 500,
      lineHeight: 1.4,
      textColor: NB_COLORS.body,
      fill: 'transparent',
      stroke: 'transparent',
    }),
    style.directLabel({ fontFamily: NB_FONT_FAMILY.heading, fontSize: 10, fontWeight: 500, lineHeight: 1.4 }),
    style.gridLine({ dashArray: [], strokeWidth: 1 }),
    style.tickLine({ stroke: NB_COLORS.chrome }),
    style.panelBorder({ dashArray: [2, 3], strokeWidth: 1, stroke: NB_COLORS.chrome, cornerRadius: 0 }),
    // Every Neo Brutalist graph sets this per spec; it sits here so one theme covers it.
    style.geom.bar({ cornerRadius: 'none' }),
  ],
});

// Bar graphs trade the dashed bottom edge for a solid acid baseline.
export const nbBaselineTheme = styles({
  defaults: [style.panelBorder.bottom({ dashArray: [], strokeWidth: 2, stroke: NB_COLORS.acid })],
});

export const createNbTitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
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

export const createNbSubtitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
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

// A hollow forecast bar has a transparent colour, so the default swatch would paint nothing.
// This swatch draws a square, acid-outlined for the forecast.
const NbSwatch = (props: SwatchSlotProps) => {
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

export const nbSlots: GraphSlots = { Swatch: NbSwatch };
```

Bars with a hollow forecast: its colour is transparent and every bar carries an acid stroke, so only the empty one shows an outline.

```tsx
import { config, createSpec, geom, GraphProvider, GraphRenderer, pipe, scale, style, styles, type Data } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'cpm', color: 'type' }),
  geom.bar({ position: 'identity', params: { width: 0.6 } }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 8 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [NB_COLORS.acid, 'transparent'] }),
  nbConfig,
  nbTheme,
  nbBaselineTheme,
  styles({ defaults: [style.geom.bar({ stroke: NB_COLORS.acid, strokeWidth: 1.5 })] }),
  config({
    legend: { position: 'top' },
    content: {
      title: createNbTitle([{ text: 'CPM rips ' }, { text: 'past €6.', color: NB_COLORS.acid }]),
      isTitleVisible: true,
    },
  })
);

export const NbGraph = ({ data }: { data: Data }) => (
  <GraphProvider data={data} spec={spec} colorScheme="dark">
    <GraphRenderer slots={nbSlots} />
  </GraphProvider>
);
```

Per graph:

- Stacked bars: `NB_COLORS.acid` and `NB_COLORS.greyMid`, `style.geom.bar({ stroke: NB_COLORS.surface, strokeWidth: 1 })`, a top legend, `nbBaselineTheme`, and `nbSlots` on the renderer. The story uses the swatch slot on both bar graphs.
- Lines: map `strokeWidth: 'product'` as well as colour, then `scale.strokeWidth.discrete({ domain: ['Product A', 'Product B'], range: [2.5, 1.5] })` so the lead line is bolder.
- Donut: `NB_DONUT_RAMP`, `innerRadius: 0.55`, `stroke: NB_COLORS.surface, strokeWidth: 3` between slices, no baseline theme.
- Rose (`coord.polar({ theta: 'x' })`, `params: { width: 1 }`): `NB_COLORS.acid` against `NB_COLORS.greyDeep`, `stroke: NB_COLORS.surface, strokeWidth: 1`.
- Racetrack (stacked, `params: { width: 0.9 }`, `innerRadius: 0.25`): `NB_COLORS.acid` against `NB_COLORS.greyDeep`, plus `style.header({ margin: { bottom: 20 } })`.
- Subtitles are rich text through `createNbSubtitle`, drawn small in the heading font.
