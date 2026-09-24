# Sketchy bar

Replaces the paint of the built-in `bar` geom with hand-drawn, hatched rectangles from rough.js. Use it when a graph should look sketched while keeping the normal bar compile, stacking, scales, and axes.

## Usage

The plugin is a render-only override registered by geom name, so the spec uses the ordinary `geom.bar()`. Pass it through the `plugins` prop of `GraphProvider`.

```tsx
import { createSpec, geom, GraphProvider, GraphRenderer, mapping, pipe, scale, transform } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { sketchyBar } from './sketchy-bar';

const data: Data = {
  columns: [{ key: 'quarter' }, { key: 'North' }, { key: 'South' }, { key: 'West' }],
  rows: [
    { quarter: 'Q1', North: 350, South: 200, West: 500 },
    { quarter: 'Q2', North: 300, South: 250, West: 350 },
    { quarter: 'Q3', North: 400, South: 300, West: 300 },
    { quarter: 'Q4', North: 200, South: 150, West: 400 },
  ],
};

const spec = pipe(
  createSpec(),
  transform.reshape({ keep: ['quarter'], reshape: ['North', 'South', 'West'], keyName: 'region', valueName: 'sales' }),
  mapping({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'stack' }),
  scale.x(),
  scale.y(),
  scale.color.palette()
);

export const SketchyGraph = () => (
  <GraphProvider spec={spec} data={data} plugins={[sketchyBar]}>
    <GraphRenderer />
  </GraphProvider>
);
```

A single-group graph works the same way with `createSpec({ x: 'category', y: 'revenue' })` and `geom.bar()`.

## Plugin

Save as `sketchy-bar.tsx`.

```tsx
import { type ReactNode, useMemo } from 'react';
import rough from 'roughjs';

import { defineGeomRenderer, getAlpha, getBarRectBounds, getColor } from '@graphysdk/react';
import type { Observation, SceneLayer } from '@graphysdk/react';
import type { CartesianCoordSystem, MainAxis, Rect } from '@graphysdk/viz-engine';

// The nominal square canvas the bars paint into. The browser stretches it to the panel through
// `preserveAspectRatio="none"`, so the renderer never needs the panel's pixel size. 100 keeps rough.js's
// pixel-scale internals (wobble, hachure gap) in their intuitive range.
const VIEWBOX_SIZE = 100;
const DEFAULT_COLOR = '#4e79a7';
// One shared generator. `toPaths` is stateless: it produces path data and touches no DOM.
const generator = rough.generator();

type RoughPath = ReturnType<typeof generator.toPaths>[number];

interface BarStyle {
  strokeWidth: number;
  fillWeight: number;
  hachureGap: number;
}

const BASE_STYLE: BarStyle = { strokeWidth: 1.8, fillWeight: 1.2, hachureGap: 2.2 };
// Hover: a bolder outline and denser fill drawn over the dimmed base bar. Sharing the base bar's seed
// keeps the heavier strokes registered to the bar underneath.
const HOVER_STYLE: BarStyle = { strokeWidth: 3.3, fillWeight: 2.4, hachureGap: 1.4 };

/** FNV-1a hash to a stable positive rough.js seed, so a bar's wobble is the same across re-render and hover. */
const hashSeed = (key: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483647 || 1;
};

// Seed derived from the bar's geometry. Base paint and hover paint compute the same seed for the same
// observation, so the heavier hover wobble lands exactly over the base bar.
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

interface SketchyBarsProps {
  layer: SceneLayer;
  coordSystem: CartesianCoordSystem;
}

interface SketchyBar {
  key: number;
  opacity: number;
  paths: RoughPath[];
}

/**
 * Paints every bar of the layer. The geom renderer receives normalized [0,1] bounds, so the bars paint
 * into a nominal square `<svg>` that the browser stretches to the panel. `vectorEffect="non-scaling-stroke"`
 * keeps the stroke weight constant through that non-uniform stretch.
 */
const SketchyBars = ({ layer, coordSystem }: SketchyBarsProps) => {
  const bars = useMemo<SketchyBar[]>(() => {
    const result: SketchyBar[] = [];
    let index = 0;
    for (const observation of layer.data) {
      const key = index;
      index += 1;
      const bounds = getBarRectBounds(coordSystem.mainAxis, observation);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) continue;

      const color = getColor(observation) ?? DEFAULT_COLOR;
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

/** In-place hover paint: the same bar redrawn bolder, registered through the shared rect seed. */
const SketchyBarHighlight = ({ observation, mainAxis }: { observation: Observation; mainAxis: MainAxis }) => {
  const bounds = getBarRectBounds(mainAxis, observation);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const color = getColor(observation) ?? DEFAULT_COLOR;
  return (
    <SketchyCanvas>
      <RoughPathSet paths={buildBarPaths(bounds, color, HOVER_STYLE)} />
    </SketchyCanvas>
  );
};

/**
 * A render-only override of the built-in `bar` geom, registered by name. The built-in compile half stays
 * (positions, stacking, scales, axes all come from the compiled layer); only the paint changes.
 */
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

## Notes

- Install `roughjs` (`npm install roughjs`).
- This is the `defineGeomRenderer('bar', contract)` path: no compile definition is registered, so there is no kit and no new geom name. Stacked, dodged, and flipped bars all keep working.
- The `CartesianCoordSystem`, `MainAxis`, and `Rect` types come from `@graphysdk/viz-engine`; the rest comes from `@graphysdk/react`.
- Stylesheet paint (`style.geom.bar`) is not read here. Colour comes from the data-mapped colour scale through `getColor`, with a fixed fallback.
