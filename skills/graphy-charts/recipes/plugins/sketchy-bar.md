# Sketchy bar

Replaces the paint of the built-in `bar` geom with hand-drawn, hatched rectangles from rough.js. The bar compile half stays: stacking, scales and axes are unchanged.

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

import { defineGeomRenderer, getBarRectBounds, toPaintColor } from '@graphysdk/react';
import type { CartesianCoordSystem, GeomStyleReaders, Observation, SceneLayer } from '@graphysdk/react';

// The bars paint into a nominal square canvas that the browser stretches to the panel through
// `preserveAspectRatio="none"`, so the renderer never needs the panel's pixel size. 100 keeps rough.js's
// pixel-scale settings (wobble, hachure gap) in their usual range.
const VIEWBOX_SIZE = 100;
/** Fill when no stylesheet entry answers. The bar's built-in default normally does. */
const FALLBACK_COLOR = '#4e79a7';
// One shared generator. `toPaths` produces path data and touches no DOM.
const generator = rough.generator();

type RoughPath = ReturnType<typeof generator.toPaths>[number];
type BarBounds = NonNullable<ReturnType<typeof getBarRectBounds>>;

interface BarStyle {
  strokeWidth: number;
  fillWeight: number;
  hachureGap: number;
}

const BASE_STYLE: BarStyle = { strokeWidth: 1.8, fillWeight: 1.2, hachureGap: 2.2 };
/** Hover: a bolder outline and a denser fill, drawn over the dimmed base bar. */
const HOVER_STYLE: BarStyle = { strokeWidth: 3.3, fillWeight: 2.4, hachureGap: 1.4 };

/** FNV-1a hash to a positive rough.js seed, so a bar's wobble is the same on every render. */
const hashSeed = (key: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483647 || 1;
};

// The seed comes from the bar's bounds, so the base paint and the hover paint of one bar share it and the
// heavier hover strokes land exactly over the base strokes.
const rectSeed = (bounds: BarBounds): number => hashSeed(`${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}`);

/** The rough.js paths for one bar. `bounds` is in [0, 1] with a top-left origin; it is scaled into the canvas. */
const buildBarPaths = (bounds: BarBounds, color: string, style: BarStyle): RoughPath[] =>
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

/** The canvas every bar and every hover paint goes into. */
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

/** `vectorEffect="non-scaling-stroke"` keeps the stroke width in pixels through the non-uniform stretch. */
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

/** The bar's fill from the style cascade: `style.geom.bar({ fill })` overrides, the color scale, then the built-in default. */
const readFill = (styleReaders: GeomStyleReaders, observation: Observation, state?: 'hovered'): string =>
  toPaintColor(styleReaders.get('fill', observation, state) ?? FALLBACK_COLOR);

interface SketchyBarsProps {
  layer: SceneLayer;
  coordSystem: CartesianCoordSystem;
  styleReaders: GeomStyleReaders;
}

interface SketchyBar {
  key: number;
  opacity: number | undefined;
  paths: RoughPath[];
}

/** Paints every bar of the layer. `getBarRectBounds` handles stacked, dodged and flipped bars. */
const SketchyBars = ({ layer, coordSystem, styleReaders }: SketchyBarsProps) => {
  const bars = useMemo<SketchyBar[]>(() => {
    const result: SketchyBar[] = [];
    let index = 0;
    for (const observation of layer.data) {
      const key = index;
      index += 1;
      const bounds = getBarRectBounds(coordSystem.mainAxis, observation);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) continue;

      result.push({
        key,
        opacity: styleReaders.get('alpha', observation),
        paths: buildBarPaths(bounds, readFill(styleReaders, observation), BASE_STYLE),
      });
    }
    return result;
  }, [layer.data, coordSystem.mainAxis, styleReaders]);

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

interface SketchyBarHoverProps {
  observation: Observation;
  coordSystem: CartesianCoordSystem;
  styleReaders: GeomStyleReaders;
}

/** The hovered bar redrawn bolder, in the same place through the shared seed. */
const SketchyBarHover = ({ observation, coordSystem, styleReaders }: SketchyBarHoverProps) => {
  const bounds = getBarRectBounds(coordSystem.mainAxis, observation);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  return (
    <SketchyCanvas>
      <RoughPathSet paths={buildBarPaths(bounds, readFill(styleReaders, observation, 'hovered'), HOVER_STYLE)} />
    </SketchyCanvas>
  );
};

/** A render-only override of the built-in `bar` geom, registered by name. Only the paint changes. */
export const sketchyBar = defineGeomRenderer('bar', {
  coord: 'cartesian',
  guideMode: 'band',
  render: ({ layer, coordSystem, styleReaders }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return <SketchyBars layer={layer} coordSystem={coordSystem} styleReaders={styleReaders} />;
  },
  renderHover: ({ primary, coordSystem, styleReaders }) => {
    if (coordSystem.type !== 'cartesian') return null;
    return <SketchyBarHover observation={primary.observation} coordSystem={coordSystem} styleReaders={styleReaders} />;
  },
  renderHoverCompanions: () => null,
});
```

## Notes

- Install `roughjs` (`npm install roughjs`). Everything else imports from `@graphysdk/react`.
- `defineGeomRenderer('bar', contract)` registers no compile definition, so there is no kit and no new geom name. The name is limited to the built-in geoms. Stacked, dodged and flipped bars keep working; polar bars keep the built-in paint, because this contract binds `coord: 'cartesian'` only.
- Paint reads `styleReaders.get('fill', observation)` and `styleReaders.get('alpha', observation)`, so `style.geom.bar({ fill })` overrides, the color scale and the bar's built-in default all reach the paint. `toPaintColor` reduces a gradient or pattern to one color, which is all rough.js can stroke.
- On hover the base layer dims through the stylesheet's `dimmed` state and the bolder hover paint is drawn above it.
