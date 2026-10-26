# Point and edit with persistence

Let users edit a chart by clicking it. This example adds an edit toggle, undo and redo, reset, and local storage persistence without a panel.

```tsx
import { useCallback, useRef, useState } from 'react';
import {
  GraphProvider,
  config,
  createSpec,
  geom,
  pipe,
  scale,
  useGraphHistory,
  useGraphHistoryShortcuts,
  type Data,
  type GraphHandle,
  type Spec,
} from '@graphysdk/react';
import { EditableGraphRenderer } from '@graphysdk/react/editable';

const data: Data = {
  columns: [{ key: 'quarter' }, { key: 'region' }, { key: 'sales' }],
  rows: [
    { quarter: 'Q1', region: 'EU', sales: 1200 },
    { quarter: 'Q1', region: 'US', sales: 1500 },
    { quarter: 'Q2', region: 'EU', sales: 1800 },
    { quarter: 'Q2', region: 'US', sales: 1600 },
    { quarter: 'Q3', region: 'EU', sales: 2400 },
    { quarter: 'Q3', region: 'US', sales: 2200 },
    { quarter: 'Q4', region: 'EU', sales: 2800 },
    { quarter: 'Q4', region: 'US', sales: 3100 },
  ],
};

const DEFAULT_SPEC: Spec = pipe(
  createSpec({ x: 'quarter', y: 'sales', color: 'region' }),
  geom.bar({ position: 'dodge' }),
  scale.x(),
  scale.y(),
  config({ content: { title: 'Sales by quarter' } })
);

const STORAGE_KEY = 'sales-chart-spec';
const loadSpec = (): Spec => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? (JSON.parse(stored) as Spec) : DEFAULT_SPEC;
};

const PALETTES = {
  Warm: ['#E03030', '#E08A30', '#E0C030', '#B05020'],
  Cool: ['#2060E0', '#30A0E0', '#30D0C0', '#6040C0'],
};

// Render inside GraphProvider so useGraphHistory can read the chart history.
const HistoryButtons = () => {
  const { undo, redo, canUndo, canRedo, undoDescription } = useGraphHistory();
  return (
    <>
      <button disabled={!canUndo} title={undoDescription ?? undefined} onClick={undo}>
        Undo
      </button>
      <button disabled={!canRedo} onClick={redo}>
        Redo
      </button>
    </>
  );
};

export function SalesChartEditor() {
  const [spec, setSpec] = useState(loadSpec);
  const [isEditing, setIsEditing] = useState(true);
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef);

  const save = useCallback((next: Spec) => {
    setSpec(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  // Replacing the spec with an external object clears the edit history.
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSpec(DEFAULT_SPEC);
  };

  return (
    <GraphProvider spec={spec} data={data} handleRef={handleRef} onSpecChange={save}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 480 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setIsEditing((current) => !current)}>{isEditing ? 'Done' : 'Edit'}</button>
          <HistoryButtons />
          <button onClick={reset}>Reset</button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <EditableGraphRenderer mode={isEditing ? 'pointAndEdit' : 'readonly'} palettePresets={PALETTES} />
        </div>
      </div>
    </GraphProvider>
  );
}
```

Details:

- Clicking a bar opens its color controls and level selector. Clicking an axis shows the applicable title, labels, position, scale, start and end controls. Clicking the background opens the Chart menu with data labels and palettes from `palettePresets`.
- `onSpecChange` fires once per completed edit and receives a JSON-serializable `Spec`. Save it there.
- Passing an edited spec back through `spec={spec}` does not trigger another `onSpecChange` notification.
- Done changes `mode` to `readonly` without remounting or rebuilding the chart, preserving hover and animation. History stays in the provider, so undo works in either mode.
- Reset passes the default spec back to the provider and clears the edit history. Keep `spec` in state; creating a new spec object on each render would repeatedly clear history.
- `onSpecChange` updates only the spec; it does not change data.
- `useGraphHistoryShortcuts` binds shortcuts on the window. Pass `{ target }` to limit them to one element.
