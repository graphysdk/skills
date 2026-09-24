# Beeswarm

Every observation is a dot at its value on one axis, nudged off the centre line just far enough to clear its neighbours. Use it to show a distribution of many observations, optionally coloured by group. The dodge is a pixel-radius collision computed in the browser, so it lives in the render half and registers its own hit-test.

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

// x is the value axis the engine trains. The off-axis spread is a render-side pixel dodge, not a scaled
// dimension, so the graph has no y axis. `color` maps a group, so the colour scale colours each dot and
// the legend lists the groups.
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
/** One observation to place: its index into the layer data, its scaled x in [0, 1], and its resolved fill. */
export interface SwarmPoint {
  /** Row index into the compiled layer data, the `'index'` identity key the hit-test returns. */
  index: number;
  /** The engine-scaled x position in [0, 1]. */
  x01: number;
  /** The point's resolved fill, from the engine's colour scale. */
  color: string;
}

/** A placed point in panel pixel space: a true circle the renderer paints and the tester queries. */
export interface PlacedPoint extends SwarmPoint {
  cx: number;
  cy: number;
}

const EPSILON = 1e-6;

/**
 * The beeswarm dodge: every point sits at its scaled x and is nudged off the centre line just far enough
 * to clear each already-placed neighbour by one collision diameter. The radius is a fixed pixel count,
 * so the clearance depends on the panel's pixel size. That is why this runs render-side, not in the
 * DOM-free compiler that owns the scaled x.
 *
 * Points are placed left to right, so each only has to clear the neighbours already laid down within one
 * diameter on x. The candidate ys are the centre line plus the two tangent ys of every near neighbour; the
 * nearest-to-centre candidate that clears them all is taken.
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
    const neighbours = placed.filter((other) => Math.abs(other.cx - point.cx) < diameter);
    const cy = resolveCy(point.cx, baseline, height, radius, diameterSq, neighbours);
    placed.push({ ...point, cy });
  }
  return placed;
}

/** Finds the y nearest the centre line where a circle at `cx` clears every near neighbour. */
function resolveCy(
  cx: number,
  baseline: number,
  height: number,
  radius: number,
  diameterSq: number,
  neighbours: PlacedPoint[]
): number {
  if (neighbours.length === 0) return baseline;

  const candidates = [baseline];
  for (const neighbour of neighbours) {
    const dx = cx - neighbour.cx;
    const span = Math.sqrt(diameterSq - dx * dx);
    candidates.push(neighbour.cy + span, neighbour.cy - span);
  }

  let best = baseline;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const cy of candidates) {
    if (cy < radius || cy > height - radius) continue;
    const clears = neighbours.every((neighbour) => {
      const dx = cx - neighbour.cx;
      const dy = cy - neighbour.cy;
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

import {
  createGraphyKit,
  defineGeomRenderer,
  Geom,
  getColor,
  getX,
  type RenderHitTester,
  useElementScreenRect,
  useGeomHitTest,
  useHoverState,
} from '@graphysdk/react';
import type { Dataset, GeomCompileResult, GeomCompilerInput, SceneLayer } from '@graphysdk/react';
import type { IdentityKey } from '@graphysdk/viz-engine';

import { computeSwarm, type PlacedPoint, type SwarmPoint } from './beeswarm-layout';

/** Circle radius in pixels, the collision diameter the dodge clears. Small enough for a dense swarm. */
const POINT_RADIUS = 3.5;
/** Hover hit radius, a touch larger than the drawn dot so dense points stay easy to target. */
const POINT_HIT_RADIUS = POINT_RADIUS + 2;
/** Fill used only if the colour scale is absent. */
const FALLBACK_COLOR = '#888888';

/**
 * Only x is a position the engine scales onto an axis. y is owned by the render-side dodge, so the geom
 * declares a single x role and no y mapping (the graph gets no y axis). `name` is a free data input
 * carried for the tooltip; `color` is author-mapped, so the engine's categorical scale assigns the hues.
 * The geom registers its spatial query through `useGeomHitTest` rather than the `hitTest` factory,
 * because the placed geometry only exists once the panel has been measured.
 */
class BeeswarmGeom extends Geom {
  readonly type = 'beeswarm';
  override readonly defaultParams = {};
  override readonly identityKey: IdentityKey = 'index';
  override readonly supportedCoordTypes = ['cartesian'] as const;
  override readonly highlightStrategy = null;
  override readonly positionRoles = [{ axis: 'x', role: 'point', valueKind: 'value' }] as const;
  override readonly aesthetics = [
    { kind: 'data', name: 'name' },
    { kind: 'visual', name: 'color' },
  ] as const;
  override readonly tooltip = [
    { key: 'Name', aes: 'name' },
    { key: 'Group', aes: 'color' },
  ] as const;

  override readonly spatialKind = 'render-hit-test';

  // Passing the data through keeps row order, so the `'index'` identity the hit-test returns lines up.
  compile({ data }: GeomCompilerInput): GeomCompileResult {
    return { data, mapping: {} };
  }
}

/** Reads each row's scaled x and resolved colour, preserving the row index as the identity key. */
function readPoints(data: Dataset): SwarmPoint[] {
  const points: SwarmPoint[] = [];
  let index = 0;
  for (const observation of data) {
    const x01 = getX(observation);
    if (x01 !== null) {
      points.push({ index, x01, color: getColor(observation) ?? FALLBACK_COLOR });
    }
    index += 1;
  }
  return points;
}

/** The cursor query over the placed circles, nearest-first from the top so the drawn-last point is found. */
function buildSwarmTester(placed: PlacedPoint[], width: number, height: number, radius: number): RenderHitTester {
  const radiusSq = radius * radius;
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

/**
 * Paints the swarm and owns its hover. The dodge needs the panel's pixel size, so the layer measures
 * the panel with `useElementScreenRect`, lays the circles out in pixel space, and registers the spatial
 * query with `useGeomHitTest`. The hovered point is read from the shared hover store and repainted on
 * top, so the geom gets the central tooltip and needs no `renderHover` overlay.
 */
const BeeswarmLayer = ({ layer }: { layer: SceneLayer }) => {
  const { measureRef, screenRect } = useElementScreenRect();
  const points = useMemo(() => readPoints(layer.data), [layer.data]);
  const placed = useMemo(
    () => (screenRect ? computeSwarm(points, screenRect.width, screenRect.height, POINT_RADIUS) : []),
    [points, screenRect]
  );
  const tester = useMemo<RenderHitTester>(
    () => (screenRect ? buildSwarmTester(placed, screenRect.width, screenRect.height, POINT_HIT_RADIUS) : () => null),
    [placed, screenRect]
  );
  useGeomHitTest(layer.id, tester);

  const hoveredIndex = useHoverState((state) =>
    state.hover.primary && state.hover.primary.layerId === layer.id ? state.hover.primary.pointIndex : null
  );
  const hovered = hoveredIndex === null ? null : (placed.find((point) => point.index === hoveredIndex) ?? null);

  return (
    <>
      <rect ref={measureRef} width="100%" height="100%" fill="transparent" pointerEvents="none" />
      {placed.map((point) => (
        <circle
          key={point.index}
          cx={point.cx}
          cy={point.cy}
          r={POINT_RADIUS}
          fill={point.color}
          stroke="#fff"
          strokeWidth={0.5}
        />
      ))}
      {hovered && (
        <circle
          cx={hovered.cx}
          cy={hovered.cy}
          r={POINT_RADIUS + 2}
          fill={hovered.color}
          stroke="#1f2937"
          strokeWidth={1.5}
        />
      )}
    </>
  );
};

export const kit = createGraphyKit({
  plugins: [
    defineGeomRenderer(new BeeswarmGeom(), {
      coord: 'cartesian',
      swatchShape: 'circle',
      // No `hitTest` factory: the tester is registered through `useGeomHitTest` inside the layer.
      // Hover paint is inline, so `renderHover` contributes nothing.
      render: ({ layer }) => <BeeswarmLayer layer={layer} />,
      renderHover: () => null,
      renderHoverCompanions: () => null,
    }),
  ],
});
```

## Notes

- No third-party dependency. The `IdentityKey` type comes from `@graphysdk/viz-engine`; everything else from `@graphysdk/react`.
- The geom declares one x position role and no y, so only `kit.scale.x` is needed. Map `color` to a group column for per-group hues and a legend.
- The dodge uses a fixed pixel radius, so the layout changes with panel size. Very large datasets pay a quadratic cost in the neighbour search.
- Hover and tooltip work through the hit-test registered inside the layer. There is no `renderHover` overlay.
