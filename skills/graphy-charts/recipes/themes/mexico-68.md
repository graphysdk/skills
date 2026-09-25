# Mexico 68

A theme is a stylesheet plus config. It is not a provider prop. Pipe it into the spec with `styles({ extends: [theme] })`. Fonts are loaded by the host page, not by the chart.

The custom marks for this look are in [the Mexico 68 plugin](../plugins/mexico-68.md). This file is the stylesheet and config.

Op-art magenta, orange, purple, cyan and green over white cards. Every geom is drawn as concentric outlines with no solid core. That drawing comes from the plugin in `recipes/plugins/mexico-68.md`; the theme below sets the chrome and the palette.

```ts
import { config, style, styles } from '@graphysdk/react';
import type { RichTextContent } from '@graphysdk/viz-engine';

export const MEXICO_COLORS = {
  page: '#F4F1EA',
  card: '#FFFFFF',
  dark: '#1A1A1A',
  pink: '#EC008C',
  orange: '#F7931E',
  purple: '#662D91',
  cyan: '#27AAE1',
  green: '#39B54A',
  axisGrey: '#9A968C',
} as const;

// Magenta leads, the rest follow in this order.
export const MEXICO_PALETTE = [
  MEXICO_COLORS.pink,
  MEXICO_COLORS.orange,
  MEXICO_COLORS.purple,
  MEXICO_COLORS.cyan,
  MEXICO_COLORS.green,
] as const;

// Load on the host page:
// https://fonts.googleapis.com/css2?family=Righteous&family=Rubik:wght@400;500;600;700&display=swap
export const MEXICO_FONT_FAMILY = {
  headings: "'Righteous', 'Rubik', sans-serif",
  body: "'Rubik', 'Helvetica Neue', Arial, sans-serif",
} as const;

export const mexicoConfig = config({
  legend: { position: 'none' },
  axes: {
    x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
    y: { position: 'left', grid: { isVisible: false } },
  },
});

export const mexicoTheme = styles({
  defaults: [
    style.graph({ fill: MEXICO_COLORS.card, fontFamily: MEXICO_FONT_FAMILY.body, padding: 32 }),
    style.heading({ fontFamily: MEXICO_FONT_FAMILY.headings }),
    // 40 without a top legend. A graph with a top legend overrides this to 24.
    style.header({ margin: { bottom: 40 } }),
    style.axisLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: MEXICO_COLORS.dark }),
    style.tickLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: MEXICO_COLORS.axisGrey }),
    style.dataLabel({ fontSize: 13, fontWeight: 600, textColor: MEXICO_COLORS.dark }),
    style.legendItem({
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.4,
      textColor: MEXICO_COLORS.dark,
      fill: 'transparent',
      stroke: 'transparent',
    }),
    style.directLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4 }),
    style.tickLine({ stroke: 'transparent' }),
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ dashArray: [], strokeWidth: 2, stroke: MEXICO_COLORS.dark }),
    // Every Mexico 68 graph sets this per spec; it sits here so one theme covers it.
    style.geom.bar({ cornerRadius: 'none' }),
  ],
});

// Polar graphs: no y axis and no baseline.
export const mexicoPolarConfig = config({ axes: { y: { isVisible: false } } });
export const mexicoPolarTheme = styles({ defaults: [style.panelBorder.bottom({ strokeWidth: 0 })] });

export const createMexicoTitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
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
            attrs: { color: color ?? MEXICO_COLORS.dark, fontFamily: MEXICO_FONT_FAMILY.headings, fontSize: '22px' },
          },
        ],
      })),
    },
  ],
});
```

The plugin replaces how the built-in bar, line and point geoms are painted, so specs use the normal builders. Pass the plugin array to the provider.

```tsx
import { config, createSpec, geom, GraphProvider, GraphRenderer, pipe, scale, style, styles, type Data } from '@graphysdk/react';

// The plugin from recipes/plugins/mexico-68.md.
import { mexicoPlugins } from './mexico-68-renderers';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'cpm', color: 'type' }),
  geom.bar({
    position: 'identity',
    params: { width: 0.5 },
    dataLabels: { showDataLabels: true, position: 'outside', justify: 'end', align: 'center' },
  }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 8 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [MEXICO_COLORS.pink, MEXICO_COLORS.orange] }),
  mexicoConfig,
  mexicoTheme,
  styles({ defaults: [style.header({ margin: { bottom: 24 } })] }),
  config({
    legend: { position: 'top' },
    content: {
      title: createMexicoTitle([
        { text: 'CPM, € — actual vs ' },
        { text: 'forecast', color: MEXICO_COLORS.orange },
        { text: '.' },
      ]),
      isTitleVisible: true,
      subtitle: 'Cost per mille by quarter, €. The orange arch is the forecast.',
      isSubtitleVisible: true,
    },
  })
);

export const MexicoGraph = ({ data }: { data: Data }) => (
  <GraphProvider data={data} spec={spec} plugins={mexicoPlugins}>
    <GraphRenderer />
  </GraphProvider>
);
```

Per graph:

- Stacked bars: `MEXICO_COLORS.pink` and `MEXICO_COLORS.cyan`, legend at the bottom; each segment keeps its own arch.
- Lines: `MEXICO_COLORS.pink` and `MEXICO_COLORS.purple`; the plugin draws three parallel echoes and a target at the end. The story applies `mexicoTheme` only to the keyed variant (legend at the bottom); the direct-label variant sets just `style.graph({ fontFamily: MEXICO_FONT_FAMILY.body })` and `style.heading({ fontFamily: MEXICO_FONT_FAMILY.headings })`.
- Polar graphs take `mexicoPolarConfig` and `mexicoPolarTheme` on top of the base pair. The donut (`innerRadius: 0.55`) uses `MEXICO_PALETTE` in order; the rose (`params: { width: 1 }`) uses `MEXICO_COLORS.pink` against `MEXICO_COLORS.purple`; the racetrack (stacked, `params: { width: 0.9 }`, `innerRadius: 0.25`) uses `MEXICO_COLORS.pink` against `MEXICO_COLORS.axisGrey`.
