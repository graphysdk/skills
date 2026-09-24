# Lenny's Newsletter

A theme is a stylesheet plus config. It is not a provider prop. Pipe it into the spec with `styles({ extends: [theme] })`. Fonts are loaded by the host page, not by the chart.

Cream cards with a hairline dark outline on a warm page, one full-strength orange leading a soft autumn ramp, larger text, a 2px dark baseline.

```ts
import { config, style, styles } from '@graphysdk/react';
import type { RichTextContent } from '@graphysdk/viz-engine';

export const LENNY_COLORS = {
  actual: '#F8A24B',
  forecast: '#FCD9B8',
  card: '#FFF3EA',
  page: '#FBECE2',
  dark: '#322E2C',
  inkSecondary: '#97836E',
  gridLine: '#D6B29A',
} as const;

export const BRAND_ORANGE = '#F5820D';
export const LINE_FOLLOWER = '#AE9070';
export const ROSE_REST = '#CBB499';
export const TRACK_REMAINING = '#E7DAC8';
export const AUTUMN_RAMP = ['#F5820D', '#F4B93F', '#AE9070', '#CBB499', '#E7DAC8'];

// Load Plus Jakarta Sans on the host page:
// https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap
export const LENNY_FONT_FAMILY = "'Plus Jakarta Sans', sans-serif";

// The card itself comes from the spec: cream ground, radius 28, hairline dark outline.
export const lennyTheme = styles({
  defaults: [
    style.graph({
      fill: LENNY_COLORS.card,
      stroke: LENNY_COLORS.dark,
      strokeWidth: 1,
      cornerRadius: 28,
      fontFamily: LENNY_FONT_FAMILY,
      textScale: 1.2,
    }),
    style.tickLabel({ fontWeight: 600, textColor: LENNY_COLORS.inkSecondary }),
    style.dataLabel({ fontSize: 13, fontWeight: 700, textColor: LENNY_COLORS.dark }),
    style.dataLabel.observation.outside({ fill: 'transparent' }),
    style.legendItem({ fill: 'transparent', stroke: 'transparent' }),
  ],
});

// Cartesian graphs: a solid horizontal grid and a 2px dark baseline, no side rules. Each graph sets its
// own legend position.
export const lennyCartesianConfig = config({
  axes: { x: { ticks: { isVisible: false } }, y: { position: 'left' } },
});
export const lennyCartesianTheme = styles({
  defaults: [
    style.gridLine({ dashArray: [] }),
    style.tickLine({ stroke: LENNY_COLORS.gridLine }),
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ dashArray: [], strokeWidth: 2, stroke: LENNY_COLORS.dark }),
  ],
});

// Polar graphs: no baseline, no grid.
export const lennyPolarConfig = config({
  legend: { position: 'none' },
  axes: { x: { ticks: { isVisible: false } }, y: { ticks: { isVisible: false }, grid: { isVisible: false } } },
});
export const lennyPolarTheme = styles({ defaults: [style.panelBorder({ strokeWidth: 0 })] });

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

Slim bars with wide gaps and a value above each one.

```ts
import { config, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'cpm', color: 'type' }),
  geom.bar({ position: 'identity', dataLabels: { showDataLabels: true, position: 'outside', offset: 8 } }),
  scale.x({ padding: 0.45 }),
  scale.y.continuous({ domainMax: 10 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [LENNY_COLORS.actual, LENNY_COLORS.forecast] }),
  lennyCartesianConfig,
  lennyTheme,
  lennyCartesianTheme,
  config({
    legend: { position: 'bottom' },
    content: {
      title: createLennyTitle([{ text: 'CPM is set to climb past ' }, { text: '€6', color: BRAND_ORANGE }, { text: '.' }]),
      subtitle: 'Cost per mille by quarter, €. Paler bars are forecasts.',
    },
  })
);
```

Per graph:

- Stacked bars: `scale.x({ padding: 0.3 })`, `LENNY_COLORS.actual` and `ROSE_REST`, `style.geom.bar({ cornerRadius: 'none', stroke: LENNY_COLORS.card, strokeWidth: 1 })`, legend at the bottom.
- Lines: `BRAND_ORANGE` leads, `LINE_FOLLOWER` follows, `style.geom.line({ strokeWidth: 6 })`. Legend `{ position: 'right', display: 'direct' }` for end labels, or `{ position: 'bottom' }` for a key.
- Donut: `AUTUMN_RAMP`, `innerRadius: 0.55`, `stroke: LENNY_COLORS.card, strokeWidth: 2`, with `lennyPolarConfig` and `lennyPolarTheme` instead of the cartesian pair.
- Rose (`coord.polar({ theta: 'x' })`, `params: { width: 1 }`): `BRAND_ORANGE` against `ROSE_REST`, `stroke: LENNY_COLORS.card, strokeWidth: 1`, same polar pair.
- Racetrack (stacked, `params: { width: 0.9 }`, `innerRadius: 0.25`): `BRAND_ORANGE` against `TRACK_REMAINING`, `cornerRadius: 'none'`, same polar pair.
