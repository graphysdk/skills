# Beeswarm

Every observation is a dot at its value on one axis, pushed off the center line just far enough to clear its neighbors. Use it to show a distribution of many observations, optionally colored by group. The dodge is a pixel-radius collision, so it runs in the render half from `panelRect`, and the render half answers the hover query.

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './beeswarm-geom';

const bodyMass: Data = {
  columns: [{ key: 'name' }, { key: 'species' }, { key: 'mass' }],
  rows: [
    { name: 'Adelie #1', species: 'Adelie', mass: 3750 },
    { name: 'Adelie #2', species: 'Adelie', mass: 3800 },
    { name: 'Adelie #3', species: 'Adelie', mass: 3250 },
    { name: 'Adelie #4', species: 'Adelie', mass: 3450 },
    { name: 'Chinstrap #1', species: 'Chinstrap', mass: 3500 },
    { name: 'Chinstrap #2', species: 'Chinstrap', mass: 3900 },
    { name: 'Chinstrap #3', species: 'Chinstrap', mass: 3650 },
    { name: 'Gentoo #1', species: 'Gentoo', mass: 4500 },
    { name: 'Gentoo #2', species: 'Gentoo', mass: 5700 },
    { name: 'Gentoo #3', species: 'Gentoo', mass: 5400 },
    { name: 'Gentoo #4', species: 'Gentoo', mass: 4875 },
  ],
};

// x is the only scaled position, so the graph has an x axis and no y axis. `color` maps a group column,
// so each dot takes its group's color and the legend lists the groups.
const spec = kit.pipe(
  kit.createSpec({ x: 'mass' }),
  kit.geom.beeswarm({ aes: { name: 'name', color: 'species' } }),
  kit.scale.x.continuous(),
  kit.scale.color.palette()
);

export const BeeswarmGraph = () => (
  <kit.GraphProvider spec={spec} data={bodyMass}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `beeswarm-layout.ts`.

```ts
/** One observation to place: its row index in the layer data and its scaled x in [0, 1]. */
export interface SwarmPoint {
  /** Row index into the layer data. The hit-test returns it as the `'index'` identity key. */
  index: number;
  /** The scaled x position in [0, 1]. */
  x01: number;
}

/** A placed point in panel pixels. */
export interface PlacedPoint extends SwarmPoint {
  cx: number;
  cy: number;
}

const EPSILON = 1e-6;

/**
 * Places every point at its scaled x and moves it off the center line just far enough to clear each
 * already-placed neighbor by one diameter. The radius is in pixels, so the result depends on the panel size.
 *
 * Points are placed left to right, so each one only has to clear the neighbors within one diameter on x.
 * The candidates are the center line and the two tangent ys of each near neighbor; the candidate nearest
 * the center line that clears them all is taken.
 */
export function computeSwarm(points: SwarmPoint[], width: number, height: number, radius: number): PlacedPoint[] {
  const baseline = height / 2;
  const diameter = radius * 2;
  const diameterSq = diameter * diameter;
  const ordered = points
    .map((point) => ({ ...point, cx: point.x01 * width }))
    .sort((left, right) => left.cx - right.cx);

  const placed: PlacedPoint[] = [];
  for (const point of ordered) {
    const neighbors = placed.filter((other) => Math.abs(other.cx - point.cx) < diameter);
    const cy = resolveCy(point.cx, baseline, height, radius, diameterSq, neighbors);
    placed.push({ ...point, cy });
  }
  return placed;
}

/** The y nearest the center line where a circle at `cx` clears every near neighbor. */
function resolveCy(
  cx: number,
  baseline: number,
  height: number,
  radius: number,
  diameterSq: number,
  neighbors: PlacedPoint[]
): number {
  if (neighbors.length === 0) return baseline;

  const candidates = [baseline];
  for (const neighbor of neighbors) {
    const dx = cx - neighbor.cx;
    const span = Math.sqrt(diameterSq - dx * dx);
    candidates.push(neighbor.cy + span, neighbor.cy - span);
  }

  let best = baseline;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const cy of candidates) {
    if (cy < radius || cy > height - radius) continue;
    const clears = neighbors.every((neighbor) => {
      const dx = cx - neighbor.cx;
      const dy = cy - neighbor.cy;
      return dx * dx + dy * dy >= diameterSq - EPSILON;
    });
    if (!clears) continue;
    const distance = Math.abs(cy - baseline);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = cy;
    }
  }
  return best;
}
```

Save as `beeswarm-geom.tsx`.

```tsx
import { useMemo } from 'react';

import { createGraphyKit, defineGeomRenderer, Geom, getX, toPaintColor } from '@graphysdk/react';
import type {
  Dataset,
  GeomCompileResult,
  GeomCompilerInput,
  GeomHoverRendererInput,
  GeomRendererInput,
  RenderHitTester,
} from '@graphysdk/react';

import { computeSwarm, type PlacedPoint, type SwarmPoint } from './beeswarm-layout';

/** Dot radius in pixels. The dodge clears one diameter between neighbors. */
const POINT_RADIUS = 3.5;
/** Hit radius, a little larger than the dot so dense points stay easy to target. */
const POINT_HIT_RADIUS = POINT_RADIUS + 2;
/** Fill when no color is mapped and no stylesheet entry answers. */
const FALLBACK_COLOR = '#888888';

class BeeswarmGeom extends Geom {
  readonly type = 'beeswarm' as const;
  override readonly defaultParams = {};
  // The hit-test returns a row index, so the identity is the row. The default `'x-group'` would leave
  // the hover lookup empty.
  override readonly identityKey = 'index' as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;
  // Only x is scaled. The dodge owns y, so there is no y role and the graph has no y axis.
  override readonly positionRoles = [{ axis: 'x', role: 'point', valueKind: 'value' }] as const;
  // `name` is read for the tooltip. `color` goes through the color scale.
  override readonly aesthetics = [
    { kind: 'data', name: 'name' },
    { kind: 'visual', name: 'color' },
  ] as const;
  override readonly tooltip = [
    { key: 'Name', aes: 'name' },
    { key: 'Group', aes: 'color' },
  ] as const;
  // The geometry exists only in the render half, so the render half answers the hover query.
  override readonly spatialKind = 'render-hit-test';

  // Row order is the identity, so the data passes through unchanged.
  compile({ data }: GeomCompilerInput): GeomCompileResult {
    return { data, mapping: {} };
  }
}

/** Each row's scaled x, keyed by row index. Rows without an x are skipped. */
function readPoints(data: Dataset): SwarmPoint[] {
  const points: SwarmPoint[] = [];
  let index = 0;
  for (const observation of data) {
    const x01 = getX(observation);
    if (x01 !== null) points.push({ index, x01 });
    index += 1;
  }
  return points;
}

/** The swarm in panel pixels. Paint, hit-test and hover all call this with the same inputs, so they agree. */
function layoutSwarm(data: Dataset, width: number, height: number): PlacedPoint[] {
  return computeSwarm(readPoints(data), width, height, POINT_RADIUS);
}

/** The cursor query. Later points paint on top, so they are tested first. */
function buildSwarmTester(placed: PlacedPoint[], width: number, height: number): RenderHitTester {
  const radiusSq = POINT_HIT_RADIUS * POINT_HIT_RADIUS;
  return (cursor) => {
    const px = cursor.x * width;
    const py = cursor.y * height;
    for (let index = placed.length - 1; index >= 0; index -= 1) {
      const point = placed[index];
      if (!point) continue;
      const dx = px - point.cx;
      const dy = py - point.cy;
      if (dx * dx + dy * dy <= radiusSq) return { key: String(point.index) };
    }
    return null;
  };
}

type BeeswarmLayerProps = Pick<GeomRendererInput, 'layer' | 'panelRect' | 'styleReaders'>;

/** Paints the swarm. The panel SVG uses pixel units, so the placed circles are drawn as they are. */
const BeeswarmLayer = ({ layer, panelRect, styleReaders }: BeeswarmLayerProps) => {
  const observations = useMemo(() => [...layer.data], [layer.data]);
  const placed = useMemo(
    () => layoutSwarm(layer.data, panelRect.width, panelRect.height),
    [layer.data, panelRect.width, panelRect.height]
  );

  return (
    <>
      {placed.map((point) => {
        const observation = observations[point.index];
        if (!observation) return null;
        return (
          <circle
            key={point.index}
            cx={point.cx}
            cy={point.cy}
            r={POINT_RADIUS}
            fill={toPaintColor(styleReaders.get('fill', observation) ?? FALLBACK_COLOR)}
            stroke="#fff"
            strokeWidth={0.5}
          />
        );
      })}
    </>
  );
};

type BeeswarmHoverProps = Pick<GeomHoverRendererInput, 'layer' | 'primary' | 'panelRect' | 'styleReaders'>;

/** The hovered dot repainted larger on top. `primary.pointIndex` is the row index the tester returned. */
const BeeswarmHover = ({ layer, primary, panelRect, styleReaders }: BeeswarmHoverProps) => {
  const placed = useMemo(
    () => layoutSwarm(layer.data, panelRect.width, panelRect.height),
    [layer.data, panelRect.width, panelRect.height]
  );
  const hovered = placed.find((point) => point.index === primary.pointIndex);
  if (!hovered) return null;

  return (
    <circle
      cx={hovered.cx}
      cy={hovered.cy}
      r={POINT_RADIUS + 2}
      fill={toPaintColor(styleReaders.get('fill', primary.observation, 'hovered') ?? FALLBACK_COLOR)}
      stroke="#1f2937"
      strokeWidth={1.5}
    />
  );
};

export const kit = createGraphyKit({
  plugins: [
    defineGeomRenderer(new BeeswarmGeom(), {
      coord: 'cartesian',
      swatchShape: 'circle',
      render: ({ layer, panelRect, styleReaders }) => (
        <BeeswarmLayer layer={layer} panelRect={panelRect} styleReaders={styleReaders} />
      ),
      // The factory runs once per data change or panel resize. The cursor arrives in panel-local
      // [0, 1] with a top-left origin, the same frame the paint uses.
      hitTest: ({ layer, panelRect }) =>
        buildSwarmTester(layoutSwarm(layer.data, panelRect.width, panelRect.height), panelRect.width, panelRect.height),
      renderHover: ({ layer, primary, panelRect, styleReaders }) => (
        <BeeswarmHover layer={layer} primary={primary} panelRect={panelRect} styleReaders={styleReaders} />
      ),
      renderHoverCompanions: () => null,
    }),
  ],
});
```

## Notes

- No third-party dependency. Everything imports from `@graphysdk/react`.
- The geom declares one x position role and no y, so only `kit.scale.x` is needed. Map `color` to a group column for per-group colors and a legend.
- `spatialKind: 'render-hit-test'` requires either a `hitTest` factory or an overlay render on the contract. Registering a tester with `useGeomHitTest` inside the layer instead reports `MISSING_RENDER_HIT_TEST`.
- The dodge uses a fixed pixel radius, so the layout changes with panel size. The neighbor search is quadratic in the number of points per column of x.
- Paint reads `styleReaders.get('fill', observation)`, so `style.geom({ fill })` overrides apply. On hover the base layer dims through the stylesheet's `dimmed` state and the hover dot is drawn above it at full strength.
