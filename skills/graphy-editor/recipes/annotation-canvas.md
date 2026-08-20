# Canvas-only annotation editing

Direct manipulation with no panel at all: seed a chart with annotations, let the user drag the
free-flowing ones and use the `(+)` menu, and add your own annotations by command.

```tsx
import { useRef, useState } from 'react';
import {
  GraphProvider, useGraphSelection, useGraphHistoryShortcuts, type GraphHandle,
} from '@graphysdk/react-renderer';
import { EditableGraphRenderer } from '@graphysdk/react-renderer/editable';
import {
  createSpec, pipe, mapping, geom, scale, config, annotation,
  AddAnnotationCommand, RemoveAnnotationCommand, TEXT_ANNOTATION_DEFAULTS,
  type Data, type SpecInput, type RichTextContent,
} from '@graphysdk/viz-engine';

const data: Data = {
  columns: [{ key: 'quarter' }, { key: 'revenue' }],
  rows: [
    { quarter: 'Q1', revenue: 1200 },
    { quarter: 'Q2', revenue: 1850 },
    { quarter: 'Q3', revenue: 1600 },
    { quarter: 'Q4', revenue: 2400 },
  ],
};

const boldLine = (text: string): RichTextContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', attrs: { textAlign: 'center' },
              content: [{ type: 'text', text, marks: [{ type: 'bold' }] }] }],
});

const annotatedSpec: SpecInput = pipe(
  createSpec(),
  mapping({ x: 'quarter', y: 'revenue' }),
  geom.bar({ position: 'identity' }),
  scale.x(),
  // Headroom above the bars gives free-flowing annotations room to live in.
  scale.y({ domainMin: 0, domainMax: 3200 }),
  config({ content: { title: 'Revenue by quarter' } }),

  // Free-flowing: anchored at fractions of the plot area (from the top-left) — draggable.
  annotation.shape({
    id: 'target-band', zOrder: 'background',
    region: { anchorType: 'panel', x: 0, y: 0, width: 1, height: 0.25 },
    fillColor: '#f4a261', fillOpacity: 0.2, strokeWidth: 0,
  }),
  annotation.text({
    id: 'note', content: boldLine('Stretch zone'),
    at: { anchorType: 'panel', x: 0.8, y: 0.1 }, width: 0.24,
  }),
  // Pinned: an observation anchor — selectable and restylable, but no drag moves it.
  annotation.text({
    id: 'q2-note', content: boldLine('Pricing change'),
    at: { anchorType: 'observation', anchorValue: 'Q2' }, width: 0.2,
  }),
  annotation.sticker({ id: 'cheer', at: { anchorType: 'observation', anchorValue: 'Q4' }, sticker: 'rocket' }),
);

// Inside the provider: show what's selected, offer removal, add by command.
const AnnotationToolbar = ({ handle }: { handle: React.RefObject<GraphHandle | null> }) => {
  const selection = useGraphSelection();
  const selected = selection.length === 1 && selection[0].kind === 'annotation' ? selection[0] : null;

  const addNote = () => {
    handle.current?.commands.dispatch(new AddAnnotationCommand({
      kind: 'text',
      annotation: {
        ...TEXT_ANNOTATION_DEFAULTS,
        content: boldLine('New note'),
        at: { anchorType: 'panel', x: 0.5, y: 0.08 },
        width: 0.2,
      },
    }));
  };
  const removeSelected = () => {
    if (selected) handle.current?.commands.dispatch(new RemoveAnnotationCommand({ id: selected.id }));
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={addNote}>Add note</button>
      <button disabled={!selected} onClick={removeSelected}>
        {selected ? `Remove ${selected.id}` : 'Nothing selected'}
      </button>
    </div>
  );
};

export function AnnotationCanvas() {
  const [spec, setSpec] = useState(annotatedSpec);
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef);

  return (
    <GraphProvider input={spec} data={data} handleRef={handleRef} onChange={setSpec}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, blockSize: 480 }}>
        <AnnotationToolbar handle={handleRef} />
        <div style={{ flex: 1, minBlockSize: 0 }}>
          <EditableGraphRenderer mode="editable" />
        </div>
      </div>
    </GraphProvider>
  );
}
```

What to notice:

- **The anchor decides mobility, not the kind.** `note` (panel anchor) drags; `q2-note`
  (observation anchor) is selectable and deletable but immovable — it tracks Q2 through data and
  layout changes. Same `text` kind, opposite behavior. The full per-kind table is
  `reference/canvas.md`.
- **One drag, one undo entry.** A drag previews in the overlay and commits a single command on
  drop, so the ⌘Z the shortcuts hook binds steps whole gestures.
- **The `(+)` menu needs no code.** Hovering a bar in editable mode shows the `(+)` button;
  comments, pinned numbers, stickers, highlights and difference arrows land as commands on the same
  history your toolbar uses.
- **`zOrder: 'background'`** keeps the band behind the bars, so a click where a bar covers it
  reaches the bar, not the shape.
- **Delete and Escape** already work: `Delete` removes the selection; `Escape` cancels an active
  drag first, then clears the selection. Your toolbar duplicates removal only to show the command
  path.
- **Read-only really is inert.** Drop `mode` (or set `'readonly'`) and nothing is selectable or
  draggable — same seeded annotations, at rest.
