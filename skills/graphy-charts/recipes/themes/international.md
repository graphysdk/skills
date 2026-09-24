# International

A theme is a stylesheet plus config. It is not a provider prop. Pipe it into the spec with `styles({ extends: [theme] })`. Fonts are loaded by the host page, not by the chart.

White paper on a grey canvas, an dark-and-grey palette with one red kept for the key observation, horizontal grid only, a single bottom border as the baseline.

```ts
import { config, style, styles } from '@graphysdk/react';
import type { RichTextContent } from '@graphysdk/viz-engine';

export const INTL_COLORS = {
  surface: '#F4F4F4',
  paper: '#FFFFFF',
  heading: '#000000',
  body: '#1A1A1A',
  accent: '#D72B1C',
  dark: '#111111',
  grey: '#8F8F8F',
  greyLight: '#C9C9C9',
  greyDark: '#4A4A4A',
  greyFaint: '#E3E3E3',
  gridLine: '#E9E9E9',
} as const;

// Red only ever paints the key observation.
export const INTL_PALETTE = [
  INTL_COLORS.accent,
  INTL_COLORS.dark,
  INTL_COLORS.grey,
  INTL_COLORS.greyLight,
  INTL_COLORS.greyDark,
] as const;

// Load Golos Text on the host page:
// https://fonts.googleapis.com/css2?family=Golos+Text:wght@400..900&display=swap
export const INTL_FONT_FAMILY = {
  heading: "'Golos Text', 'Inter', sans-serif",
  body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
} as const;

export const intlConfig = config({
  legend: { position: 'none' },
  axes: {
    x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
    y: { position: 'left', grid: { isVisible: true } },
  },
});

export const intlTheme = styles({
  defaults: [
    style.graph({ fill: INTL_COLORS.paper, fontFamily: INTL_FONT_FAMILY.body, padding: 32 }),
    style.heading({ fontFamily: INTL_FONT_FAMILY.heading }),
    // 40 without a top legend. A graph with a top legend overrides this to 24.
    style.header({ margin: { bottom: 40 } }),
    style.axisLabel({ fontSize: 10.5, fontWeight: 500, lineHeight: 1.5, textColor: INTL_COLORS.body }),
    style.tickLabel({ fontSize: 10.5, fontWeight: 500, lineHeight: 1.5, textColor: INTL_COLORS.grey }),
    style.dataLabel({ fontSize: 10.5, fontWeight: 500, textColor: INTL_COLORS.body }),
    style.legendItem({
      fontSize: 10.5,
      fontWeight: 500,
      lineHeight: 1.5,
      textColor: INTL_COLORS.grey,
      fill: 'transparent',
      stroke: 'transparent',
    }),
    style.directLabel({ fontSize: 10.5, fontWeight: 500, lineHeight: 1.5 }),
    style.gridLine({ dashArray: [], strokeWidth: 1 }),
    style.tickLine({ stroke: INTL_COLORS.gridLine }),
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ dashArray: [], strokeWidth: 1 }),
    // The stories set these three per spec; they sit here so one theme covers them.
    style.geom.bar({ cornerRadius: 'none' }),
    style.geom.line({ strokeWidth: 1.75 }),
    style.geom.point({ size: 6.5 }),
  ],
});

export const createIntlTitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
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

Two lines with a dot on every vertex and a legend below. The point layer shares the mapping and is not interactive, so hover stays on the lines.

```ts
import { config, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'month', y: 'value', color: 'product' }),
  geom.line(),
  geom.point({ interactive: false }),
  scale.x(),
  scale.y.continuous({ domainMin: 100 }),
  scale.color.discrete({ domain: ['Product A', 'Product B'], range: [INTL_COLORS.accent, INTL_COLORS.dark] }),
  intlConfig,
  intlTheme,
  config({
    legend: { position: 'bottom' },
    content: {
      title: createIntlTitle([
        { text: 'On value, the products tell ' },
        { text: 'different stories', color: INTL_COLORS.accent },
        { text: '.' },
      ]),
      isTitleVisible: true,
    },
  })
);
```

Per graph:

- Direct end labels: the same spec with `legend: { position: 'right', display: 'direct' }`. The story applies only the config to that variant, not the chrome stylesheet.
- Bars: `params: { width: 0.66 }`, actual quarters in `INTL_COLORS.dark`, the forecast in `INTL_COLORS.accent`.
- Stacked bars: `params: { width: 0.66 }`, `INTL_COLORS.dark` and `INTL_COLORS.accent`, legend at the bottom.
- Donut: `INTL_PALETTE` in order, `innerRadius: 0.55`, `stroke: INTL_COLORS.paper, strokeWidth: 2` between slices.
- Rose (`coord.polar({ theta: 'x' })`, `params: { width: 1 }`): `INTL_COLORS.accent` against `INTL_COLORS.dark`, `stroke: INTL_COLORS.paper, strokeWidth: 1`. Racetrack (stacked, `params: { width: 0.9 }`, `innerRadius: 0.25`): `INTL_COLORS.dark` against `INTL_COLORS.greyFaint`.
- Headlines end with a full stop and carry the key phrase in red.
