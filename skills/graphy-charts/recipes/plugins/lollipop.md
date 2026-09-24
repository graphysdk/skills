# Lollipop

A dot on top of a stem dropped to the baseline, one per band. Use it as a lighter alternative to bars. The stem's baseline is a compiled position, so it stays on the axis under any y domain.

## Usage

```tsx
import { GraphRenderer, style, styles } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './lollipop-geom';

const data: Data = {
  columns: [{ key: 'product' }, { key: 'revenue' }],
  rows: [
    { product: 'Product A', revenue: 1200 },
    { product: 'Product B', revenue: 1800 },
    { product: 'Product C', revenue: 2400 },
    { product: 'Product D', revenue: 1600 },
    { product: 'Product E', revenue: 3200 },
    { product: 'Product F', revenue: 2800 },
  ],
};

// Colour by band through the colour scale.
const colouredSpec = kit.pipe(
  kit.createSpec({ x: 'product', y: 'revenue' }),
  kit.geom.lollipop({ aes: { color: 'product' }, params: { stemWidth: 3 } }),
  kit.scale.x(),
  kit.scale.y(),
  kit.scale.color.palette()
);

// One colour for every lollipop through the stylesheet.
const stylesheetSpec = kit.pipe(
  kit.createSpec({ x: 'product', y: 'revenue' }),
  kit.geom.lollipop({ params: { stemWidth: 3 } }),
  styles({ overrides: [style.geom({ fill: '#e5484d', stroke: '#e5484d' })] }),
  kit.scale.x(),
  kit.scale.y()
);

// No colour mapping and no override: the built-in geom colour.
const builtinSpec = kit.pipe(
  kit.createSpec({ x: 'product', y: 'revenue' }),
  kit.geom.lollipop({ params: { stemWidth: 3 } }),
  kit.scale.x(),
  kit.scale.y()
);

const specs = { coloured: colouredSpec, stylesheet: stylesheetSpec, builtin: builtinSpec };

export const LollipopGraph = ({ variant = 'coloured' }: { variant?: keyof typeof specs }) => (
  <kit.GraphProvider spec={specs[variant]} data={data}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `lollipop-geom.tsx`.

```tsx
import { useMemo } from 'react';

import type { GeomCompileResult, GeomCompilerInput, GeomStyleReaders, Observation, SceneLayer } from '@graphysdk/react';
import {
  createGraphyKit,
  defineGeomRenderer,
  Geom,
  getX,
  getYMax,
  getYMin,
  POSITION_VARIABLES,
  toPaintColor,
  toPercent,
  toViewBoxX,
  toViewBoxY,
} from '@graphysdk/react';

/**
 * The geom declares an x point plus a min/max y pair (like `area` and `bar`), a `color` aesthetic, and one
 * `stemWidth` param. `compile` writes `yMin = 0` in data units, the max role fills `yMax` from the `y`
 * aesthetic, both are scaled by the shared y scale, and the renderer reads them back. The renderer invents
 * no positions, so the stem stays anchored to the baseline under a zoomed or log y domain.
 *
 * Paint reads `styleReaders` from the render input, so stylesheet overrides, tokens, and the built-in geom
 * colour all reach the geom. `getColor` only sees the data-mapped colour.
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

  compile({ data }: GeomCompilerInput): GeomCompileResult {
    // The baseline is a position, not a render constant: write it in data units so the y scale maps it.
    const withBaseline = data.hasVariable(POSITION_VARIABLES.yMin)
      ? data
      : data.addConstantVariable(POSITION_VARIABLES.yMin, 'numeric', 0);
    return { data: withBaseline, mapping: {} };
  }
}

const LollipopRenderer = ({ layer, styleReaders }: { layer: SceneLayer; styleReaders: GeomStyleReaders }) => {
  const items = useMemo(() => [...layer.data], [layer.data]);

  return (
    <>
      {items.map((observation, index) => (
        <LollipopItem
          key={index}
          layer={layer}
          observation={observation}
          isHovered={false}
          styleReaders={styleReaders}
        />
      ))}
    </>
  );
};

/** One lollipop. When hovered it is redrawn with a bolder stem and a larger dot. */
const LollipopItem = ({
  layer,
  observation,
  isHovered,
  styleReaders,
}: {
  layer: SceneLayer;
  observation: Observation;
  isHovered: boolean;
  styleReaders: GeomStyleReaders;
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
      color: toPaintColor(styleReaders.get('fill', observation) ?? '#888888'),
    };
  }, [observation, styleReaders]);

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

// `defineGeomRenderer(definition, contract)` binds both halves. Passing the result to `createGraphyKit`
// derives the typed `kit.geom.lollipop` method and registers the geom with the bound compiler.
const lollipop = defineGeomRenderer(new LollipopGeom(), {
  coord: 'cartesian',
  render: ({ layer, styleReaders }) => <LollipopRenderer layer={layer} styleReaders={styleReaders} />,
  renderHover: ({ layer, primary, styleReaders }) => (
    <LollipopItem layer={layer} observation={primary.observation} isHovered styleReaders={styleReaders} />
  ),
  renderHoverCompanions: () => null,
});

export const kit = createGraphyKit({ plugins: [lollipop] });
```

## Notes

- No third-party dependency. Everything imports from `@graphysdk/react`.
- `kit.geom.lollipop` is typed from the definition: `aes` accepts `x`, `y`, and `color`; `params` accepts `{ stemWidth }`.
- Paint goes through `styleReaders.get('fill', observation)`, so `style.geom({ fill })` overrides and tokens apply. Without a colour mapping or override, the built-in geom colour is used.
- Cartesian only. Hover repaints the item in place.
