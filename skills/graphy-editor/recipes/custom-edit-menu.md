# A custom edit menu

Replace the bar controls in Graphy's edit menu with your own. Graphy still provides the title, visibility button for guides, and level selector when multiple levels have rows. Read values from the chart and update them through commands so the controls reflect other edits and undo.

```tsx
import { useRef, useState } from 'react';
import {
  GraphProvider,
  createSpec,
  geom,
  pipe,
  scale,
  useGraphCommands,
  useGraphHistoryShortcuts,
  useSceneSelector,
  type Data,
  type GraphHandle,
  type Spec,
} from '@graphysdk/react';
import {
  EditableGraphRenderer,
  Row,
  SetBarWidthCommand,
  SetLayerPositionCommand,
  SetObservationsColorCommand,
  useControls,
  type EditMenus,
  type ObservationsTarget,
} from '@graphysdk/react/editable';

const data: Data = {
  columns: [{ key: 'quarter' }, { key: 'region' }, { key: 'sales' }],
  rows: [
    { quarter: 'Q1', region: 'EU', sales: 1200 },
    { quarter: 'Q1', region: 'US', sales: 1500 },
    { quarter: 'Q2', region: 'EU', sales: 1800 },
    { quarter: 'Q2', region: 'US', sales: 1600 },
    { quarter: 'Q3', region: 'EU', sales: 2400 },
    { quarter: 'Q3', region: 'US', sales: 2200 },
  ],
};

const initialSpec: Spec = pipe(
  createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ id: 'bars', position: 'dodge' }),
  scale.x(),
  scale.y()
);

const BRAND_COLORS = [
  { value: '#0f62fe', label: 'Blue' },
  { value: '#da1e28', label: 'Red' },
  { value: '#198038', label: 'Green' },
];

// These rows render inside GraphProvider and use the shared control registry.
const BrandBarsMenu = ({ target }: { target: ObservationsTarget }) => {
  const { dispatch, commit } = useGraphCommands();
  const { Slider, ToggleGroup } = useControls();
  // Read the selected layer from the resolved spec so the controls reflect other edits.
  const layer = useSceneSelector((scene) => scene.spec.layers.find((candidate) => candidate.id === target.layerId));
  const isPolar = useSceneSelector((scene) => scene.spec.coords.coordType === 'polar');
  if (!layer) return null;
  // The default bar thickness differs by coordinate system.
  const defaultWidth = isPolar ? 1 : 0.7;
  const width = 'width' in layer.params && typeof layer.params.width === 'number' ? layer.params.width : defaultWidth;

  return (
    <>
      <Row label="Brand color">
        <ToggleGroup
          value=""
          options={BRAND_COLORS}
          onChange={(color) => dispatch(new SetObservationsColorCommand({ target, color }))}
        />
      </Row>
      <Row label="Thickness">
        <Slider
          min={0.2}
          max={1}
          step={0.05}
          value={width}
          formatValue={(value) => `${Math.round(value * 100)}%`}
          onChange={(next) => dispatch(new SetBarWidthCommand({ layerId: layer.id, width: next }), { transient: true })}
          onCommit={commit}
        />
      </Row>
      <Row label="Layout">
        <ToggleGroup
          value={layer.position}
          options={[
            { value: 'dodge', label: 'Side by side' },
            { value: 'stack', label: 'Stacked' },
          ]}
          onChange={(position) => {
            if (position === 'dodge' || position === 'stack') {
              dispatch(new SetLayerPositionCommand({ layerId: layer.id, position }));
            }
          }}
        />
      </Row>
    </>
  );
};
// Only series have rows, so individual bars and bands cannot be selected.
BrandBarsMenu.hasRows = (target: ObservationsTarget) => target.scope === 'group';

// Keep component definitions outside render to avoid remounting the menu.
const editMenus: EditMenus = {
  geoms: { bar: BrandBarsMenu },
};

export function BrandedChartEditor() {
  const [spec, setSpec] = useState(initialSpec);
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef);

  return (
    <div style={{ height: 420 }}>
      <GraphProvider spec={spec} data={data} handleRef={handleRef} onSpecChange={setSpec}>
        <EditableGraphRenderer mode="edit" editMenus={editMenus} />
      </GraphProvider>
    </div>
  );
}
```

Details:

- Only the `bar` menu is replaced. Lines, axes, legend, grid lines and chart keep their built-in menus. Setting a menu entry to `null` disables selection for bars, lines and chart; axes, legend and grid lines remain selectable through their visibility button.
- `hasRows` runs before hover or selection. This example returns `true` only for a series, so the group is the only selection level. The menu shows its title and custom rows, with no level selector or visibility button for bars.
- `SetObservationsColorCommand` uses the selection as its target. Selecting a group creates a color rule for that group. These chips do not show the current color; use the style readers, as the built-in row does, to read the rendered color.
- The thickness slider sends transient changes and commits on release, creating one undo step per drag. Each layout toggle click creates one undo step.
- `useSceneSelector` reads the layer from `scene.spec`, so undo and panel edits update the controls.
- The `geoms` registry uses geom names, so this bar menu applies to all bar layouts. Use `layers`, keyed by geom, coordinate system and position, to give pie charts a different menu.
