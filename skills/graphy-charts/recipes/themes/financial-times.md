# Financial Times

A theme is a stylesheet plus config. It is not a provider prop. Pipe it into the spec with `styles({ extends: [theme] })`. Fonts are loaded by the host page, not by the chart.

Salmon paper, solid rules above and below the panel, a solid grid, claret and Oxford blue. Annotations sit in flat boxes ruled like the grid.

```ts
import { config, style, styles } from '@graphysdk/react';
import type { RichTextContent } from '@graphysdk/viz-engine';

export const FT_COLORS = {
  paper: '#FFF1E5',
  claret: '#990F3D',
  claretBar: '#A8324A',
  forecastBar: '#E2A6BB',
  oxford: '#0F5499',
  steel: '#5D7C95',
  steelLight: '#C3DDF0',
  black: '#33302E',
  slate: '#66605C',
  rule: '#E4D5C5',
} as const;

export const FT_CLARET_RAMP = ['#990F3D', '#BE4B75', '#D486A3', '#E5B0C4', '#F2D4DE'];

// Load on the host page:
// https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap
export const FT_FONT_FAMILY = {
  body: 'Figtree, "Helvetica Neue", Arial, sans-serif',
  display: '"Source Serif 4", Georgia, "Times New Roman", serif',
} as const;

export const ftConfig = config({
  legend: { position: 'none' },
  axes: {
    x: { position: 'bottom', grid: { isVisible: false } },
    y: { position: 'left', grid: { isVisible: true } },
  },
});

export const ftTheme = styles({
  defaults: [
    style.graph({ fill: FT_COLORS.paper, fontFamily: FT_FONT_FAMILY.body, padding: 32 }),
    // 64 without a legend. A graph with a top legend overrides this to 24.
    style.header({ margin: { bottom: 64 } }),
    style.legend.top({ margin: { bottom: 32 } }),
    style.gridLine({ dashArray: [] }),
    style.tickLine({ stroke: FT_COLORS.rule }),
    style.panelBorder({ dashArray: [] }),
    style.panelBorder.bottom({ strokeWidth: 1.5 }),
    style.panelBorder.left({ strokeWidth: 0 }),
    style.panelBorder.right({ strokeWidth: 0 }),
    style.legendItem({ fill: 'transparent', stroke: 'transparent' }),
    // Every FT graph sets these two per spec; they sit here so one theme covers them.
    style.geom.bar({ cornerRadius: 'none' }),
    style.geom.line({ strokeWidth: 2.5 }),
    style.annotation.differenceArrow({ stroke: FT_COLORS.black }),
    style.annotation.differenceArrow.label({ fill: FT_COLORS.paper, stroke: FT_COLORS.rule, textColor: FT_COLORS.black }),
    style.annotation.pinnedNumber({ stroke: FT_COLORS.paper }),
    style.annotation.pinnedNumber.label({
      fill: FT_COLORS.paper,
      stroke: FT_COLORS.rule,
      textColor: FT_COLORS.black,
      shadow: 'none',
    }),
  ],
});

export const createFtTitle = (segments: Array<{ text: string; color?: string }>): RichTextContent => ({
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
            attrs: { color: color ?? FT_COLORS.black, fontFamily: FT_FONT_FAMILY.body, fontSize: '18px' },
          },
        ],
      })),
    },
  ],
});
```

Bars with a paler forecast and a difference arrow between the last two quarters.

```ts
import { annotation, config, createSpec, geom, pipe, scale } from '@graphysdk/react';

const spec = pipe(
  createSpec({ x: 'quarter', y: 'cpm', color: 'type' }),
  geom.bar({ position: 'identity' }),
  scale.x(),
  scale.y.continuous({ domainMin: 0, domainMax: 10 }),
  scale.color.discrete({ domain: ['actual', 'forecast'], range: [FT_COLORS.claretBar, FT_COLORS.forecastBar] }),
  annotation.differenceArrow({
    id: 'forecast-jump',
    start: { anchorValue: "Q1 '25" },
    end: { anchorValue: "Q2 '25" },
    label: 'relative-difference',
  }),
  ftConfig,
  ftTheme,
  config({
    content: {
      title: createFtTitle([{ text: 'CPM' }, { text: ' set to climb past €6', color: FT_COLORS.claret }]),
      isTitleVisible: true,
      subtitle: 'Cost per mille by quarter, €. Paler bars are forecasts',
      isSubtitleVisible: true,
    },
  })
);
```

Per graph:

- Top legend: add `config({ legend: { position: 'top' } })` and `styles({ defaults: [style.header({ margin: { bottom: 24 } })] })` after the theme.
- Stacked bars: `FT_COLORS.steel` and `FT_COLORS.steelLight`, `style.geom.bar({ stroke: '#000', strokeWidth: 1 })`, a top legend, and `annotation.pinnedNumber({ at: { anchorValue: '2024', groupValue: 'UK' } })` on the latest value.
- Lines: `FT_COLORS.oxford` and `FT_COLORS.claret`, with the group names coloured to match in the title.
- Polar graphs: all three set `style.header({ margin: { bottom: 24 } })`. The donut uses `coord.polar({ theta: 'y', innerRadius: 0.3 })`, `FT_CLARET_RAMP`, and `stroke: FT_COLORS.paper, strokeWidth: 2` between slices. The rose uses `FT_COLORS.claretBar` against `FT_COLORS.forecastBar` with `stroke: FT_COLORS.paper, strokeWidth: 1`. The racetrack (stacked, `params: { width: 0.9 }`, `innerRadius: 0.25`) uses `FT_COLORS.claretBar` against `FT_COLORS.rule` and only `cornerRadius: 'none'`.
