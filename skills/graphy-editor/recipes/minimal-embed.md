# Minimal embed with persistence

The smallest real integration: an editable chart whose edits survive a reload. Canvas editing and
undo work with no panel; the host owns storage, the edit-mode toggle and a reset.

```tsx
import { useCallback, useRef, useState } from 'react';
import {
  GraphProvider, useGraphHistory, useGraphHistoryShortcuts, type GraphHandle,
} from '@graphysdk/react-renderer';
import { EditableGraphRenderer } from '@graphysdk/react-renderer/editable';
import { createSpec, pipe, mapping, geom, scale, config, type Data, type SpecInput } from '@graphysdk/viz-engine';

const data: Data = {
  columns: [{ key: 'quarter' }, { key: 'revenue' }],
  rows: [
    { quarter: 'Q1', revenue: 1200 },
    { quarter: 'Q2', revenue: 1850 },
    { quarter: 'Q3', revenue: 1600 },
    { quarter: 'Q4', revenue: 2400 },
  ],
};

const DEFAULT_SPEC: SpecInput = pipe(
  createSpec(),
  mapping({ x: 'quarter', y: 'revenue' }),
  geom.bar(),
  scale.x(),
  scale.y(),
  config({ content: { title: 'Revenue by quarter' } }),
);

const STORAGE_KEY = 'revenue-chart-spec';
const loadSpec = (): SpecInput => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? (JSON.parse(stored) as SpecInput) : DEFAULT_SPEC;
};

// Undo/redo buttons live inside the provider so the hook can reach the history.
const HistoryButtons = () => {
  const { undo, redo, canUndo, canRedo, undoDescription } = useGraphHistory();
  return (
    <div>
      <button disabled={!canUndo} title={undoDescription ?? undefined} onClick={undo}>Undo</button>
      <button disabled={!canRedo} onClick={redo}>Redo</button>
    </div>
  );
};

export function RevenueChartEditor() {
  const [spec, setSpec] = useState(loadSpec);
  const [isEditing, setIsEditing] = useState(true);
  // Remount key: bumping it resets the chart and starts a clean undo history.
  const [epoch, setEpoch] = useState(0);
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef);

  const handleChange = useCallback((next: SpecInput) => {
    setSpec(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSpec(DEFAULT_SPEC);
    setEpoch((n) => n + 1);
  };

  return (
    <GraphProvider key={epoch} input={spec} data={data} handleRef={handleRef} onChange={handleChange}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, blockSize: 480 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setIsEditing((v) => !v)}>{isEditing ? 'Done' : 'Edit'}</button>
          <HistoryButtons />
          <button onClick={reset}>Reset</button>
        </div>
        <div style={{ flex: 1, minBlockSize: 0 }}>
          <EditableGraphRenderer mode={isEditing ? 'editable' : 'readonly'} />
        </div>
      </div>
    </GraphProvider>
  );
}
```

What to notice:

- **`onChange` is the save point.** It fires once per finished gesture — a whole drag of an
  annotation, a whole burst of typing into the title — never per frame. Persisting inside it is
  exactly the right granularity; the stored `SpecInput` is plain JSON.
- **The round-trip is loop-safe.** `input={spec}` with `onChange={setSpec}` doesn't re-notify on
  its own echo; the provider diffs against what it last compiled.
- **`mode` toggles; the component stays.** "Done" flips to `readonly` without remounting, so the
  undo history survives — the user can come back and undo. The `Edit`/`Done` state is the host's.
- **Reset = remount.** Setting `input` back to `DEFAULT_SPEC` alone would restore the picture but
  keep the old history; bumping the provider `key` starts clean. Same trick to switch datasets.
- **Data is untouched.** Nothing the editor does writes `data`; only the spec travels through
  `onChange`.
