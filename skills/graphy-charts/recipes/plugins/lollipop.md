# Lollipop

Technique: minimal fully custom geom — the smallest complete compile + paint pair.

Reach for this pattern as the template for any new mark kind: one `Geom` subclass (the compile half) plus one `defineGeomRenderer(definition, contract)` call (the paint half), registered together through `createGraphyKit` so `kit.geom.lollipop` exists as a fully typed builder method. The key discipline: the renderer invents no positions — every coordinate (including the stem's baseline) is written in data units at compile time and mapped by the shared scales, so the mark stays correct under any y domain.

```tsx
import { useMemo } from 'react';

import { createGraphyKit, defineGeomRenderer } from '@graphysdk/react-renderer';
import type { CompiledGeom, CompiledLayer, GeomCompilerInput, Observation } from '@graphysdk/viz-engine';
import { Geom, getColor, getX, getYMax, getYMin, POSITION_VARIABLES, toPercent, toViewBoxX, toViewBoxY } from '@graphysdk/viz-engine';

const DEFAULT_INK = '#4e79a7';

/**
 * A dot atop a stem dropped to the baseline. It declares a y *interval* — an `x` point plus a
 * `lower`/`upper` y pair (like `area`/`bar`) — and a `color` aesthetic, plus one `stemWidth` param.
 * `compile` writes `yMin = 0` in *data* units, the `upper` role fills `yMax` from the `y` aesthetic,
 * both are scaled by the shared y-scale, and the renderer reads them via `getYMin`/`getYMax`.
 */
class LollipopGeom extends Geom<{ stemWidth: number }> {
  readonly type = 'lollipop' as const;
  override readonly defaultParams = { stemWidth: 2 };
  override readonly positionRoles = [
    { axis: 'x', role: 'point', valueKind: 'value' },
    { axis: 'y', role: 'min', valueKind: 'value' },
    { axis: 'y', role: 'max', valueKind: 'value', aes: 'y' },
  ] as const;
  override readonly aesthetics = [{ kind: 'visual', name: 'color' }] as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;

  override readonly spatialKind = 'buckets';

  compile({ data }: GeomCompilerInput): CompiledGeom {
    // The baseline is a position, not a render constant: write it in data units so the y-scale maps it.
    const withBaseline = data.hasVariable(POSITION_VARIABLES.yMin)
      ? data
      : data.addConstantVariable(POSITION_VARIABLES.yMin, 'numeric', 0);
    return { data: withBaseline, mapping: {} };
  }
}

const LollipopRenderer = ({ layer }: { layer: CompiledLayer }) => {
  const items = useMemo(() => [...layer.data], [layer.data]);

  return (
    <>
      {items.map((observation, index) => (
        <LollipopItem key={index} layer={layer} observation={observation} isHovered={false} />
      ))}
    </>
  );
};

/** One lollipop; with `isHovered` it redraws with a bolder stem and a larger dot. */
const LollipopItem = ({
  layer,
  observation,
  isHovered,
}: {
  layer: CompiledLayer;
  observation: Observation;
  isHovered: boolean;
}) => {
  const { stemWidth } = layer.params as { stemWidth: number };
  const point = useMemo(() => {
    const x = getX(observation);
    const yBase = getYMin(observation);
    const yTop = getYMax(observation);
    if (x === null || yBase === null || yTop === null) return null;
    return {
      cx: toPercent(toViewBoxX(x)),
      baseY: toPercent(toViewBoxY(yBase)),
      topY: toPercent(toViewBoxY(yTop)),
      color: getColor(observation) ?? DEFAULT_INK,
    };
  }, [observation]);

  if (point === null) return null;

  return (
    <g>
      <line
        x1={point.cx}
        x2={point.cx}
        y1={point.baseY}
        y2={point.topY}
        stroke={point.color}
        strokeWidth={isHovered ? stemWidth + 2 : stemWidth}
      />
      <circle cx={point.cx} cy={point.topY} r={isHovered ? 8 : 5} fill={point.color} strokeWidth={isHovered ? 2 : 0} />
    </g>
  );
};

// `defineGeomRenderer(definition, contract)` binds both halves; passing the result to `createGraphyKit`
// derives the typed `kit.geom.lollipop` method AND registers the geom with the bound compiler.
export const lollipop = defineGeomRenderer(new LollipopGeom(), {
  coord: 'cartesian',
  render: ({ layer }) => <LollipopRenderer layer={layer} />,
  renderHover: ({ layer, primary }) => <LollipopItem layer={layer} observation={primary.observation} isHovered />,
  renderHoverCompanions: () => null,
});
```

## Usage

Custom geoms are authored through a kit — `createGraphyKit({ plugins })` returns the typed builders plus a `GraphProvider` pre-bound to the same plugins, so spec authoring and rendering cannot diverge:

```tsx
import { GraphRenderer } from '@graphysdk/react-renderer';
import type { Data } from '@graphysdk/viz-engine';

const kit = createGraphyKit({ plugins: [lollipop] });

const data: Data = {
  columns: [{ key: 'category' }, { key: 'revenue' }],
  rows: [
    { category: 'Product A', revenue: 1200 },
    { category: 'Product B', revenue: 1800 },
    { category: 'Product C', revenue: 2400 },
  ],
};

// `kit.geom.lollipop` is typed from the registered definition: `aes` is constrained to x/y/color and
// `params` to `{ stemWidth }`, with no cast anywhere.
const spec = kit.pipe(
  kit.createSpec({ x: 'category', y: 'revenue' }),
  kit.geom.lollipop({ aes: { color: 'category' }, params: { stemWidth: 3 } }),
  kit.scale.x(),
  kit.scale.y(),
  kit.scale.color.palette()
);

export const LollipopChart = () => (
  <kit.GraphProvider input={spec} data={data}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Adapting

- Add tunables as typed params: extend the `Geom<Params>` type parameter and `defaultParams` (e.g. dot radius), then read them from `layer.params` in the renderer.
- Extra visual channels go in `aesthetics` (e.g. `size`, `alpha`) and are read with the matching accessor (`getSize`, `getAlpha`) — never bake per-observation styling into render constants.
- `positionRoles` is the geometry contract: keep `min`/`max` pairs for interval marks; a plain point mark declares only `point` roles and skips the baseline injection in `compile`.
