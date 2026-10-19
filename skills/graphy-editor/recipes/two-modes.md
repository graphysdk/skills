# Both editing modes on one page

Use point and edit mode to change chart settings, and editable mode for annotations, highlights and inline text. This example switches between both editing modes and read-only mode.

```tsx
import { useRef, useState } from 'react';
import {
  GraphProvider,
  annotation,
  config,
  createSpec,
  geom,
  pipe,
  scale,
  useGraphHistoryShortcuts,
  type Data,
  type GraphHandle,
  type GraphMode,
  type Spec,
} from '@graphysdk/react';
import { EditableGraphRenderer } from '@graphysdk/react/editable';

const data: Data = {
  columns: [{ key: 'quarter' }, { key: 'revenue' }],
  rows: [
    { quarter: 'Q1', revenue: 1200 },
    { quarter: 'Q2', revenue: 1850 },
    { quarter: 'Q3', revenue: 1600 },
    { quarter: 'Q4', revenue: 2400 },
  ],
};

const initialSpec: Spec = pipe(
  createSpec({ x: 'quarter', y: 'revenue' }),
  geom.bar({ id: 'bars' }),
  scale.x(),
  scale.y({ domainMin: 0, domainMax: 3000 }),
  config({ content: { title: 'Revenue by quarter' } }),
  annotation.text({
    id: 'note',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Pricing change' }] }] },
    at: { anchorType: 'panel', x: 0.6, y: 0.1 },
    width: 0.3,
  })
);

const MODES: { value: GraphMode; label: string }[] = [
  { value: 'point-and-edit', label: 'Edit' },
  { value: 'editable', label: 'Annotate' },
  { value: 'readonly', label: 'Read only' },
];

export function TwoModeEditor() {
  const [spec, setSpec] = useState(initialSpec);
  const [mode, setMode] = useState<GraphMode>('point-and-edit');
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef);

  return (
    <GraphProvider spec={spec} data={data} handleRef={handleRef} onSpecChange={setSpec}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 480 }}>
        <div role="radiogroup" aria-label="Mode" style={{ display: 'flex', gap: 4 }}>
          {MODES.map((candidate) => (
            <button
              key={candidate.value}
              role="radio"
              aria-checked={candidate.value === mode}
              onClick={() => setMode(candidate.value)}
              style={{ fontWeight: candidate.value === mode ? 700 : 400 }}
            >
              {candidate.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <EditableGraphRenderer mode={mode} />
        </div>
      </div>
    </GraphProvider>
  );
}
```

Details:

- One component and provider share a history across modes. Changing modes preserves the chart's edits, and edits from either mode can be undone in the other.
- Edit: click bars, axes, legend, grid or background to open their settings. Annotations are hidden in this mode.
- Annotate: the note is visible, draggable and editable in place. The title supports inline editing. Hovering a bar shows the (+) menu for comments, stickers and highlights; clicking bars does not open chart settings.
- Read only: tooltips are available. Both editing modes hide them.
- Switching between editing modes clears the selection and closes menus because the next mode may hide the selected item.
- `GraphMode` is the exported union of the three mode strings. An unrecognized string falls back to `readonly`.
