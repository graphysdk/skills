# Panel rect

A minimal custom geom whose paint reads `panelRect`, the panel's pixel size. Use it as the starting point for a geom that needs real pixels, such as a circle that must stay round when the frame is resized.

## Usage

```tsx
import { GraphRenderer } from '@graphysdk/react';
import type { Data } from '@graphysdk/react';

import { kit } from './panel-circle-geom';

const data: Data = {
  columns: [{ key: 'band' }, { key: 'value' }],
  rows: [
    { band: 'A', value: 10 },
    { band: 'B', value: 20 },
  ],
};

const spec = kit.pipe(
  kit.createSpec({ x: 'band', y: 'value' }),
  kit.geom.panelCircle(),
  kit.scale.x(),
  kit.scale.y()
);

export const InscribedCircle = () => (
  <kit.GraphProvider spec={spec} data={data}>
    <GraphRenderer />
  </kit.GraphProvider>
);
```

## Plugin

Save as `panel-circle-geom.tsx`.

```tsx
import type { GeomCompileResult, GeomCompilerInput } from '@graphysdk/react';
import { createGraphyKit, defineGeomRenderer, Geom } from '@graphysdk/react';

/** The paint reads `panelRect`, so the circle stays circular when the frame is resized. */
class PanelCircleGeom extends Geom {
  readonly type = 'panelCircle' as const;
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

const panelCircle = defineGeomRenderer(new PanelCircleGeom(), {
  coord: 'cartesian',
  render: ({ panelRect }) => {
    const radius = Math.min(panelRect.width, panelRect.height) / 4;
    return <circle cx={panelRect.width / 2} cy={panelRect.height / 2} r={radius} fill="#4e79a7" />;
  },
  renderHover: () => null,
  renderHoverCompanions: () => null,
});

export const kit = createGraphyKit({ plugins: [panelCircle] });
```

## Notes

- No third-party dependency. Everything imports from `@graphysdk/react`.
- The render input's `panelRect` is in pixels. The panel `<svg>` uses pixel user units, so `cx`, `cy`, and `r` are pixels too.
- The geom declares x and y point roles so the scales and axes compile, but the paint ignores the observations. Replace the `render` body to draw from `layer.data`.
- No hover: `renderHover` returns null and no `hitTest` is given.
