# Lollipop

Technique: minimal fully custom geom — the smallest complete compile + paint pair.

Reach for this pattern as the template for any new mark kind: one `Geom` subclass (the compile half) plus one `defineGeomRenderer(definition, contract)` call (the paint half), registered together through `createGraphyKit` so `kit.geom.lollipop` exists as a fully typed builder method. The key discipline: the renderer invents no positions — every coordinate (including the stem's baseline) is written in data units at compile time and mapped by the shared scales, so the mark stays correct under any y domain.

```tsx
import { useMemo } from 'react';

import { createGraphyKit, defineGeomRenderer } from '@graphysdk/react-renderer';
import type { CompiledGeom, CompiledLayer, GeomCompilerInput, GeomStyleReaders, Observation } from '@graphysdk/viz-engine';
import { Geom, getX, getYMax, getYMin, POSITION_VARIABLES, toPercent, toViewBoxX, toViewBoxY } from '@graphysdk/viz-engine';

/**
 * A dot atop a stem dropped to the baseline. It declares a y *interval* — an `x` point plus a
 * `min`/`max` y pair (like `area`/`bar`) — and a `color` aesthetic, plus one `stemWidth` param.
 * `compile` writes `yMin = 0` in *data* units, the `max` role fills `yMax` from the `y` aesthetic,
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

  // `'buckets'`: nearest-x snapping anywhere over the panel. The bucket index needs both x and y
  // position columns — `y` survives from the root mapping, so nothing extra is injected here. The y
  // domain is collected from `yMin`/`yMax` only while `mapping.y` exists, so a geom that drops `y`
  // from its mapping loses both the axis domain and the bucket index.
  override readonly spatialKind = 'buckets';

  compile({ data }: GeomCompilerInput): CompiledGeom {
    // The baseline is a position, not a render constant: write it in data units so the y-scale maps it.
    const withBaseline = data.hasVariable(POSITION_VARIABLES.yMin)
      ? data
      : data.addConstantVariable(POSITION_VARIABLES.yMin, 'numeric', 0);
    return { data: withBaseline, mapping: {} };
  }
}

const LollipopRenderer = ({ layer, styleReaders }: { layer: CompiledLayer; styleReaders: GeomStyleReaders }) => {
  const items = useMemo(() => [...layer.data], [layer.data]);

  return (
    <>
      {items.map((observation, index) => (
        <LollipopItem key={index} layer={layer} observation={observation} styleReaders={styleReaders} isHovered={false} />
      ))}
    </>
  );
};

/** One lollipop; with `isHovered` it redraws with a bolder stem and a larger dot. */
const LollipopItem = ({
  layer,
  observation,
  styleReaders,
  isHovered,
}: {
  layer: CompiledLayer;
  observation: Observation;
  styleReaders: GeomStyleReaders;
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
      // Through the cascade: the `color` mapping, a user `style.geom` entry, the `geom` token and the
      // active scheme all land here. `color` and `alpha` always resolve.
      color: styleReaders.get('color', observation),
      alpha: styleReaders.get('alpha', observation),
    };
  }, [observation, styleReaders]);

  if (point === null) return null;

  return (
    <g opacity={point.alpha}>
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
  // Without this, legend/tooltip swatches fall back to `'square'`; a dot reads better.
  swatchShape: 'circle',
  // No `guideMode` → no hover guide; `guideMode: 'band'` would add a category band under the hovered x.
  render: ({ layer, styleReaders }) => <LollipopRenderer layer={layer} styleReaders={styleReaders} />,
  renderHover: ({ layer, primary, styleReaders }) => (
    <LollipopItem layer={layer} observation={primary.observation} styleReaders={styleReaders} isHovered />
  ),
  renderHoverCompanions: () => null,
});
```

The marks are `%`-positioned children of the panel SVG; `UnitSpaceSvg` (react-renderer) is the exported primitive for painting in raw `[0,1]` instead, and `input.panelRect` (the panel's layout-pixel `Rect`, x/y already applied — paint in local 0…width / 0…height) is the escape hatch when pixel sizes matter. `spatialKind: 'buckets'` also means `input.intro` offers a wipe plan; this renderer ignores it (plans are offered, never imposed), so the lollipops pop in while built-in layers animate.

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
- Extra visual channels go in `aesthetics` (e.g. `size`, `alpha`) and are read through the cascade — `styleReaders.get('size', observation)` / `get('alpha', observation)` — never bake per-observation styling into render constants. (`size` has no built-in default on a custom geom, so it may resolve `undefined`.)
- `positionRoles` is the geometry contract: keep `min`/`max` pairs for interval marks; a plain point mark declares only `point` roles and skips the baseline injection in `compile`.
- Paint is inside the style cascade: `styleReaders.get('color', observation)` / `get('alpha', observation)` honour a user's `style.geom` entries and dark-scheme tokens; `getColor`/`getAlpha` expose the encoding only. Reserve geom params for what the stylesheet has no vocabulary for (a stem width, a label's contrast colour). See `reference/styling.md`.
- The class declares no `highlightStrategy`, so it inherits the base default `'overlay-anchor'` — and declared or inherited, it is not read on a custom geom: `layer.highlight` is looked up by built-in geom name, so a spec `highlight()` never dims or re-renders lollipops. To recede while another layer is highlighted, paint `styleReaders.get('alpha', observation, 'dimmed')` yourself. (Sibling fading on hover is unrelated: the layer group's CSS hover-dim is driven by the hover store holding any primary hit — `useHoverDim` sets `data-hover-active` on the geom group — and the `renderHover` output escapes it only because it paints outside that group.)
- No `resolveAnchorPosition` is implemented, so annotations cannot anchor to lollipops; implement it returning the dot's `[0,1]` position to make them annotatable. The omission is silent for a `'buckets'` layer — `MISSING_ANCHOR_CAPABILITY` fires for render-hit-test layers only.
