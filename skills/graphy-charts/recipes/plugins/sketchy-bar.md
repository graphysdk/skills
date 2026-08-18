# Sketchy bar

Technique: render-only paint override of a built-in geom.

Reach for this when the chart's *structure* is already a built-in geom and only its look must change — here every bar keeps the built-in `bar` compile half (positions, stacking, scales, axes), and `defineGeomRenderer('bar', contract)` swaps in a rough.js hand-drawn paint. Because no compile definition is registered, the ordinary spec builders (`geom.bar()`) keep working; only the render registry changes. Works with any bar spec, including stacked/dodged multi-series.

Requires the `roughjs` package.

```tsx
import { type ReactNode, useMemo } from 'react';
import rough from 'roughjs';

import { defineGeomRenderer } from '@graphysdk/react-renderer';
import type { CartesianCoordSystem, CompiledLayer, MainAxis, Observation, Rect } from '@graphysdk/viz-engine';
import { getAlpha, getBarRectBounds, getColor } from '@graphysdk/viz-engine';

// The nominal square canvas the bars paint into; the browser stretches it to the panel via
// `preserveAspectRatio="none"`, so the renderer never needs the panel's pixel size. 100 (not 1) keeps
// rough.js's pixel-scale internals (wobble, hachure gap) in their intuitive range.
const VIEWBOX_SIZE = 100;
const DEFAULT_INK = '#4e79a7';
// One shared generator — `toPaths` is stateless (produces path data, touches no DOM).
const generator = rough.generator();

type RoughPath = ReturnType<typeof generator.toPaths>[number];

interface BarStyle {
  strokeWidth: number;
  fillWeight: number;
  hachureGap: number;
}

const BASE_STYLE: BarStyle = { strokeWidth: 1.8, fillWeight: 1.2, hachureGap: 2.2 };
// Hover: a bolder outline and denser fill, drawn over the dimmed base bar so the focused one reads as
// inked-in. Sharing the base bar's seed keeps the heavier strokes registered to the bar underneath.
const HOVER_STYLE: BarStyle = { strokeWidth: 3.3, fillWeight: 2.4, hachureGap: 1.4 };

/** FNV-1a hash → a stable positive rough.js seed, so a bar's wobble is deterministic across re-render/hover. */
const hashSeed = (key: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483647 || 1;
};

// Seed derived from the bar's geometry — base paint and hover highlight independently compute the same
// one for the same observation, so the heavier hover wobble lands exactly over the base bar.
const rectSeed = (bounds: Rect): number => hashSeed(`${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}`);

/** rough.js path set for one normalized [0,1] bar rect, scaled into the nominal viewBox. */
const buildBarPaths = (bounds: Rect, color: string, style: BarStyle): RoughPath[] =>
  generator.toPaths(
    generator.rectangle(
      bounds.x * VIEWBOX_SIZE,
      bounds.y * VIEWBOX_SIZE,
      bounds.width * VIEWBOX_SIZE,
      bounds.height * VIEWBOX_SIZE,
      {
        seed: rectSeed(bounds),
        roughness: 0.8,
        bowing: 1.2,
        stroke: color,
        fill: color,
        fillStyle: 'hachure',
        ...style,
      }
    )
  );

/** The nominal-viewBox canvas every sketchy bar (and its hover overlay) paints into. */
const SketchyCanvas = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
    preserveAspectRatio="none"
    width="100%"
    height="100%"
    style={{ overflow: 'visible' }}
    data-geom="sketchy-bar"
  >
    {children}
  </svg>
);

const RoughPathSet = ({ paths }: { paths: RoughPath[] }) => (
  <>
    {paths.map((path, index) => (
      <path
        key={index}
        d={path.d}
        stroke={path.stroke}
        strokeWidth={path.strokeWidth}
        fill={path.fill ?? 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    ))}
  </>
);

interface SketchyBar {
  key: number;
  opacity: number;
  paths: RoughPath[];
}

// The geom renderer receives normalized [0,1] bounds, so the bars paint into the nominal viewBox
// square that the browser stretches to the panel. `vectorEffect="non-scaling-stroke"` keeps the ink
// weight constant through that non-uniform stretch — no panel measurement needed.
const SketchyBars = ({ layer, coordSystem }: { layer: CompiledLayer; coordSystem: CartesianCoordSystem }) => {
  const bars = useMemo<SketchyBar[]>(() => {
    const result: SketchyBar[] = [];
    let index = 0;
    for (const observation of layer.data) {
      const key = index;
      index += 1;
      const bounds = getBarRectBounds(coordSystem.mainAxis, observation);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) continue;

      const color = getColor(observation) ?? DEFAULT_INK;
      result.push({ key, opacity: getAlpha(observation) ?? 1, paths: buildBarPaths(bounds, color, BASE_STYLE) });
    }
    return result;
  }, [layer.data, coordSystem.mainAxis]);

  return (
    <SketchyCanvas>
      {bars.map((bar) => (
        <g key={bar.key} opacity={bar.opacity}>
          <RoughPathSet paths={bar.paths} />
        </g>
      ))}
    </SketchyCanvas>
  );
};

/** In-place hover highlight: the same bar redrawn bolder, registered via the shared rect seed. */
const SketchyBarHighlight = ({ observation, mainAxis }: { observation: Observation; mainAxis: MainAxis }) => {
  const bounds = getBarRectBounds(mainAxis, observation);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const color = getColor(observation) ?? DEFAULT_INK;
  return (
    <SketchyCanvas>
      <RoughPathSet paths={buildBarPaths(bounds, color, HOVER_STYLE)} />
    </SketchyCanvas>
  );
};

export const sketchyBar = defineGeomRenderer('bar', {
  coord: 'cartesian',
  guideMode: 'band',
  render: ({ layer, coordSystem }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return <SketchyBars layer={layer} coordSystem={coordSystem} />;
  },
  renderHover: ({ primary, coordSystem }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return <SketchyBarHighlight observation={primary.observation} mainAxis={coordSystem.mainAxis} />;
  },
  renderHoverCompanions: () => null,
});
```

## Usage

A render-only override needs no `createGraphyKit` — author the spec with the ordinary builders and pass the renderer via `plugins` (frozen at mount; remount with a React `key` to change it):

```tsx
import { createSpec, geom, mapping, pipe, scale, type Data } from '@graphysdk/viz-engine';
import { GraphProvider, GraphRenderer } from '@graphysdk/react-renderer';

const data: Data = {
  columns: [{ key: 'category' }, { key: 'revenue' }],
  rows: [
    { category: 'Product A', revenue: 1200 },
    { category: 'Product B', revenue: 1800 },
    { category: 'Product C', revenue: 2400 },
  ],
};

const input = pipe(createSpec(), mapping({ x: 'category', y: 'revenue' }), geom.bar(), scale.x(), scale.y());

export const SketchyChart = () => (
  <GraphProvider input={input} data={data} plugins={[sketchyBar]}>
    <GraphRenderer />
  </GraphProvider>
);
```

Stacked bars need no plugin changes — `geom.bar({ position: 'stack' })` plus a `color` mapping and `scale.color.palette()` just works, because stacking happens in the untouched compile half.

## Adapting

- `DEFAULT_INK` is the no-color-scale fallback; mapped colors come from the spec's color scale via `getColor`, which reads the encoding.
- A render-only override owns the whole paint, including the properties the style cascade resolves for the built-in bar (`borderRadius`, `borderWidth`, `borderColor`): a user's `styles` entries reach the built-in renderer, not this one. Expose the equivalents as constants or params here. See `reference/styling.md`.
- Tune the hand-drawn look via `roughness`, `bowing`, `fillStyle` (e.g. `'cross-hatch'`, `'zigzag'`) and the `BASE_STYLE`/`HOVER_STYLE` weights.
- The same pattern overrides any built-in geom name (`'point'`, `'line'`, `'area'`, `'rule'`) — pass a different name to `defineGeomRenderer` and read the geometry with that geom's accessors. A later `plugins` entry wins on a shared `(geom, coord)` key.
