# Braun

A theme is a stylesheet plus config. It is not a provider prop. Pipe it into the spec with `styles({ extends: [theme] })`. Fonts are loaded by the host page, not by the chart.

A warm-grey desk, dark linework, one font, and a single orange that marks one reading and never a whole group. No y axis, no grid, one baseline. Bars are fully rounded pills.

```ts
import { config, style, styles } from '@graphysdk/react';
import type { RichTextContent } from '@graphysdk/viz-engine';

export const BRAUN_COLORS = {
  dark: '#1D1D1B',
  indicator: '#F07E13',
  trace2: '#8E8C86',
  structure: '#C9C6BE',
  label: '#55534E',
  labelMuted: '#87857F',
  page: '#E3E1DB',
  panel: '#EFEDE8',
} as const;

// Donut ramp, darkest reads as the biggest slice.
export const BRAUN_RAMP = ['#A6A39B', '#B7B4AC', '#C8C5BD', '#D8D5CD'] as const;

// Load Archivo on the host page:
// https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap
export const BRAUN_FONT_FAMILY = "'Archivo', 'Inter', sans-serif";

export const braunConfig = config({
  legend: { position: 'none' },
  axes: {
    x: { position: 'bottom', grid: { isVisible: false }, ticks: { isVisible: false } },
    y: { position: 'left', isVisible: false, grid: { isVisible: false } },
  },
});

export const braunTheme = styles({
  defaults: [
    style.graph({ fill: BRAUN_COLORS.panel, fontFamily: BRAUN_FONT_FAMILY, padding: 32 }),
    style.header({ margin: { bottom: 36 } }),
    style.axisLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: BRAUN_COLORS.dark }),
    style.tickLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4, textColor: BRAUN_COLORS.labelMuted }),
    style.dataLabel({ fontSize: 13, fontWeight: 600, textColor: BRAUN_COLORS.dark }),
    style.dataLabel.observation.outside({ fill: BRAUN_COLORS.panel }),
    style.legendItem({
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.4,
      textColor: BRAUN_COLORS.labelMuted,
      fill: 'transparent',
      stroke: 'transparent',
    }),
    style.directLabel({ fontSize: 12, fontWeight: 500, lineHeight: 1.4 }),
    style.panelBorder({ strokeWidth: 0 }),
    style.panelBorder.bottom({ dashArray: [], strokeWidth: 1.2, stroke: BRAUN_COLORS.structure }),
  ],
});

// Polar graphs have no baseline.
export const braunPolarTheme = styles({ defaults: [style.panelBorder.bottom({ strokeWidth: 0 })] });

export const createBraunTitle = (text: string): RichTextContent => ({
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
            { type: 'textStyle', attrs: { color: BRAUN_COLORS.dark, fontFamily: BRAUN_FONT_FAMILY, fontSize: '16px' } },
          ],
        },
      ],
    },
  ],
});
```

Bars by quarter, with the forecast drawn as a hollow pill. Columns: `quarter`, `cpm`, `type` (`actual` or `forecast`).

```ts
import { config, createSpec, geom, pipe, scale, style, styles } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'cpm', color: 'type' }),
  geom.bar({
    position: 'identity',
    params: { width: 0.55 },
    dataLabels: { showDataLabels: true, position: 'outside', justify: 'end', align: 'center' },
  }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 8 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [BRAUN_COLORS.dark, 'transparent'] }),
  braunConfig,
  braunTheme,
  // Pills with a dark outline. The outline is invisible on the filled pills and draws the hollow one.
  styles({
    defaults: [
      style.geom.bar({ cornerRadius: 'full', stroke: BRAUN_COLORS.dark, strokeWidth: 1.5 }),
      // A top legend takes a tighter header.
      style.header({ margin: { bottom: 20 } }),
    ],
  }),
  config({
    legend: { position: 'top' },
    axes: { x: { label: 'Quarter' } },
    content: {
      title: createBraunTitle('CPM, € — actual vs forecast'),
      isTitleVisible: true,
      subtitle: 'Cost per mille by quarter, €. The hollow pill is a forecast',
      isSubtitleVisible: true,
    },
  })
);
```

Per graph:

- Stacked bars: `BRAUN_COLORS.dark` and `BRAUN_RAMP[1]`, a top legend with the 20px header margin, and `style.geom.bar({ cornerRadius: 'full', stroke: BRAUN_COLORS.panel, strokeWidth: 1.5 })` to cut a hairline gap between segments.
- Lines: two groups in `BRAUN_COLORS.dark` and `BRAUN_COLORS.trace2`, no points, `legend: { position: 'right', display: 'direct' }` for end labels or `{ position: 'bottom' }` for a key.
- Donut: `coord.polar({ theta: 'y', innerRadius: 0.55 })`, the leader slice takes `BRAUN_COLORS.indicator`, the rest `BRAUN_RAMP`, `style.geom.bar({ cornerRadius: 'none', stroke: BRAUN_COLORS.panel, strokeWidth: 2 })`, plus `braunPolarTheme`.
- Rose (`coord.polar({ theta: 'x' })`, `params: { width: 1 }`): `BRAUN_COLORS.dark` against `BRAUN_COLORS.structure`, `style.geom.bar({ cornerRadius: 'none', stroke: BRAUN_COLORS.panel, strokeWidth: 1 })`. Racetrack (stacked, `params: { width: 0.9 }`, `innerRadius: 0.25`): `BRAUN_COLORS.dark` against `BRAUN_RAMP[3]`, `style.geom.bar({ cornerRadius: 'none' })`. Both take `braunPolarTheme`.
