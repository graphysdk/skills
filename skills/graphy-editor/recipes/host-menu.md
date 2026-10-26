# A host-built menu

Build a menu beside the selection using its bounds and dispatch commands from your controls. Graphy's menu still opens with its title, visibility button for axes, legend and grid lines, and level selector for observations with multiple levels. Keeping that menu allows targets without a visibility button to remain selectable.

```tsx
import { useRef, useState } from 'react';
import {
  GraphProvider,
  createSpec,
  geom,
  pipe,
  scale,
  useGraphCommands,
  useGraphHandle,
  useGraphHistoryShortcuts,
  useGraphSelection,
  useTargetBoundary,
  type Data,
  type GraphHandle,
  type Spec,
} from '@graphysdk/react';
import {
  EditableGraphRenderer,
  SetAxisVisibilityCommand,
  SetGridVisibilityCommand,
  SetLegendPositionCommand,
  SetObservationsColorCommand,
  type EditMenus,
  type EditTarget,
} from '@graphysdk/react/editable';

const data: Data = {
  columns: [{ key: 'quarter' }, { key: 'region' }, { key: 'sales' }],
  rows: [
    { quarter: 'Q1', region: 'EU', sales: 1200 },
    { quarter: 'Q1', region: 'US', sales: 1500 },
    { quarter: 'Q2', region: 'EU', sales: 1800 },
    { quarter: 'Q2', region: 'US', sales: 1600 },
  ],
};

const initialSpec: Spec = pipe(
  createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ id: 'bars', position: 'dodge' }),
  scale.x(),
  scale.y()
);

// Return true from hasRows to keep targets selectable while rendering no built-in rows.
const TitleOnly = () => null;
TitleOnly.hasRows = () => true;
const editMenus: EditMenus = {
  geoms: { bar: TitleOnly, line: TitleOnly, area: TitleOnly, point: TitleOnly },
  legend: TitleOnly,
  axis: TitleOnly,
  grid: TitleOnly,
  graph: TitleOnly,
};

const COLORS = ['#0f62fe', '#da1e28', '#198038'];

// Use the same hide commands as Graphy's visibility button.
const Rows = ({ target }: { target: EditTarget }) => {
  const { dispatch } = useGraphCommands();
  switch (target.kind) {
    case 'observations':
      return (
        <>
          {COLORS.map((color) => (
            <button key={color} onClick={() => dispatch(new SetObservationsColorCommand({ target, color }))}>
              <span style={{ background: color, display: 'inline-block', width: 12, height: 12 }} /> {color}
            </button>
          ))}
        </>
      );
    case 'legend':
      return <button onClick={() => dispatch(new SetLegendPositionCommand({ position: 'none' }))}>Hide legend</button>;
    case 'axis':
      return (
        <button
          onClick={() =>
            dispatch(new SetAxisVisibilityCommand({ axis: target.axis, visible: false, keepSecondaryAxis: true }))
          }
        >
          Hide axis
        </button>
      );
    case 'grid': {
      // Store the axis so TypeScript preserves its narrowed type in the click handler.
      const axis = target.axis;
      if (axis === 'both') return null;
      return (
        <button onClick={() => dispatch(new SetGridVisibilityCommand({ axis, visible: false }))}>
          Hide grid lines
        </button>
      );
    }
    default:
      return <span>Nothing to edit here</span>;
  }
};

// These hooks require GraphProvider.
const HostMenu = () => {
  const [target] = useGraphSelection();
  const boundary = useTargetBoundary();
  const handle = useGraphHandle();
  if (!target || !boundary || !handle) return null;

  // Use viewport coordinates to align the menu with the selected shape at its right edge.
  const left = boundary.client.x + boundary.client.width + 8;
  const top = boundary.clientSpans.right.from;

  return (
    <div
      role="dialog"
      aria-label="Edit"
      onKeyDown={(event) => {
        if (event.key === 'Escape') handle.setSelection([]);
      }}
      style={{
        position: 'fixed',
        left,
        top,
        display: 'grid',
        gap: 4,
        padding: 8,
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
      }}
    >
      <Rows target={target} />
      <button onClick={() => handle.setSelection([])}>Close</button>
    </div>
  );
};

export function ChartWithHostMenu() {
  const [spec, setSpec] = useState(initialSpec);
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef);

  return (
    <div style={{ height: 420 }}>
      <GraphProvider spec={spec} data={data} handleRef={handleRef} onSpecChange={setSpec}>
        <EditableGraphRenderer mode="pointAndEdit" editMenus={editMenus} />
        <HostMenu />
      </GraphProvider>
    </div>
  );
}
```

Details:

- `useTargetBoundary` returns `null` when nothing is selected, which unmounts this menu. `client` uses viewport pixels for `position: fixed`. `clientSpans.right` describes the part of the right edge reached by the selection, aligning the menu with the bar at that edge rather than the top of the full bounding box.
- Bounds update on every recompile and resize. `client` also follows page movement.
- Graphy's overlay still opens without rows. Targets without a menu or visibility button cannot be selected, and no prop hides the entire overlay. Use the `EditorSurface` slot to replace the whole editing layer.
- `Rows` switches on `target.kind`. Add a `never` check for exhaustive handling of the `EditTarget` union; TypeScript will then report missing cases.
- Read selected values with `readObservationsTargetData({ scene, target })`, using `useSceneSelector((compiled) => compiled)`. It returns `Data` after the layer's transforms and stat, before stacking, with each mapped variable once. Reshaped variables keep their assigned names; a sum of `sales` uses `sales`, and a count uses `count`. On a key collision, stat outputs use their own names, with a numeric suffix if needed (`count_2`).
- The payload includes source column labels and value formats, except lookup formats that vary by observation. Dates and formats are copied. The function returns `null` if the layer is missing or cannot evaluate the predicate. A valid predicate matching nothing returns columns with `rows: []`.
- The hide buttons use the same commands as Graphy's visibility button, which can show the target again.
- The chart handles Escape while focus is in the chart or Graphy's menu. This menu handles Escape itself because its buttons are outside the chart. Clear the selection with `handle.setSelection([])`.
