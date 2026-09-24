# Unit box

A custom geom that draws each observation as a stretched unit-space box with a pixel-radius circle at its centre. Use it to see how `UnitBoxSvg` keeps circles round while the box around them follows the panel's aspect ratio.

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './round-mark-geom';

const data: Data = {
  columns: [{ key: 'band' }, { key: 'value' }],
  rows: [
    { band: 'A', value: 2 },
    { band: 'B', value: 5 },
    { band: 'C', value: 3 },
    { band: 'D', value: 6 },
  ],
};

const spec = kit.pipe(
  kit.createSpec({ x: 'band', y: 'value' }),
  kit.geom.roundMark(),
  kit.scale.x(),
  kit.scale.y()
);

export const CirclesStayRound = () => (
  <kit.GraphProvider spec={spec} data={data}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `round-mark-geom.tsx`.

```tsx
import type { GeomCompileResult, GeomCompilerInput } from '@graphysdk/react';
import { createGraphyKit, defineGeomRenderer, Geom, getX, getY, toViewBoxY, UnitBoxSvg } from '@graphysdk/react';

const COLOR = '#4e79a7';
const BOX_HALF = 0.1;

/** Each observation is a stretched unit-space box with a pixel-radius circle at its centre. */
class RoundMarkGeom extends Geom {
  readonly type = 'roundMark' as const;
  override readonly defaultParams = {};
  override readonly positionRoles = [
    { axis: 'x', role: 'point', valueKind: 'value' },
    { axis: 'y', role: 'point', valueKind: 'value' },
  ] as const;
  override readonly supportedCoordTypes = ['cartesian'] as const;

  compile({ data }: GeomCompilerInput): GeomCompileResult {
    return { data, mapping: {} };
  }
}

export const kit = createGraphyKit({
  plugins: [
    defineGeomRenderer(new RoundMarkGeom(), {
      coord: 'cartesian',
      render: ({ layer }) => (
        <>
          {[...layer.data].map((observation, index) => {
            const x = getX(observation);
            const y = getY(observation);
            if (x === null || y === null) return null;
            // Unit boxes have a top-left origin; scaled y points up, so flip it.
            const top = toViewBoxY(y);
            return (
              <UnitBoxSvg key={index} box={{ x0: x - BOX_HALF, y0: top - BOX_HALF, x1: x + BOX_HALF, y1: top + BOX_HALF }}>
                <rect width="100%" height="100%" fill={COLOR} fillOpacity={0.18} />
                <circle cx="50%" cy="50%" r={16} fill={COLOR} />
              </UnitBoxSvg>
            );
          })}
        </>
      ),
      renderHover: () => null,
      renderHoverCompanions: () => null,
    }),
  ],
});
```

## Notes

- No third-party dependency. Everything imports from `@graphysdk/react`.
- `UnitBoxSvg` places a nested `<svg>` over a box given in unit space (`x0`, `y0`, `x1`, `y1` in [0, 1], top-left origin). Its children use pixel units, so a circle's `r={16}` stays 16 pixels under any panel size.
- Positions come from `getX` and `getY`, already scaled to [0, 1] with y pointing up. Unit boxes use a top-left origin, so pass y through `toViewBoxY` first.
- No hover: `renderHover` returns null and no `hitTest` is given.
