# Annotation editing with no panel

Use `mode="annotate"` to let users drag free annotations and add annotations from the (+) menu. This example also adds and removes annotations through toolbar commands.

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
  style,
  styles,
  useGraphHistoryShortcuts,
  useGraphSelection,
  type Data,
  type GraphHandle,
  type Spec,
} from '@graphysdk/react';
import { EditableGraphRenderer } from '@graphysdk/react/editable';
import {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  TEXT_ANNOTATION_DEFAULTS,
  type RichTextContent,
} from '@graphysdk/react/editable';

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
  content: [
    { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text, marks: [{ type: 'bold' }] }] },
  ],
});

const annotatedSpec: Spec = pipe(
  createSpec({ x: 'quarter', y: 'revenue' }),
  geom.bar(),
  scale.x(),
  // Leave room above the bars for free annotations.
  scale.y({ domainMin: 0, domainMax: 3200 }),
  config({ content: { title: 'Revenue by quarter' } }),

  // Panel anchors use fractions of the plot area and allow dragging.
  annotation.shape({
    id: 'target-band',
    zOrder: 'background',
    region: { anchorType: 'panel', x: 0, y: 0, width: 1, height: 0.25 },
  }),
  styles({
    overrides: [
      style.annotation.shape({ fill: '#f4a261', fillAlpha: 0.2, strokeWidth: 0 }, { annotation: 'target-band' }),
    ],
  }),
  annotation.text({
    id: 'note',
    content: boldLine('Stretch zone'),
    at: { anchorType: 'panel', x: 0.8, y: 0.1 },
    width: 0.24,
  }),
  // A data anchor allows selection and styling but prevents dragging.
  annotation.text({
    id: 'q2-note',
    content: boldLine('Pricing change'),
    at: { anchorType: 'observation', anchorValue: 'Q2' },
    width: 0.2,
  }),
  annotation.sticker({ id: 'cheer', at: { anchorType: 'observation', anchorValue: 'Q4' }, sticker: 'rocket' })
);

// Render inside GraphProvider so useGraphSelection can read the selection.
const AnnotationToolbar = ({ handle }: { handle: React.RefObject<GraphHandle | null> }) => {
  const selection = useGraphSelection();
  const [first] = selection;
  const selected = selection.length === 1 && first?.kind === 'annotation' ? first : null;

  const addNote = () => {
    handle.current?.commands.dispatch(
      new AddAnnotationCommand({
        kind: 'text',
        annotation: {
          ...TEXT_ANNOTATION_DEFAULTS,
          content: boldLine('New note'),
          at: { anchorType: 'panel', x: 0.5, y: 0.08 },
          width: 0.2,
        },
      })
    );
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
    <GraphProvider spec={spec} data={data} handleRef={handleRef} onSpecChange={setSpec}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 480 }}>
        <AnnotationToolbar handle={handleRef} />
        <div style={{ flex: 1, minHeight: 0 }}>
          <EditableGraphRenderer mode="annotate" />
        </div>
      </div>
    </GraphProvider>
  );
}
```

Details:

- The anchor determines whether an annotation can move. `note` is draggable. `q2-note` can be selected and deleted but stays on Q2 through data and layout changes.
- A drag previews changes and commits one command on drop, creating one undo step.
- Hovering a bar shows the built-in (+) menu. Comments, pinned numbers, stickers, highlights and difference arrows use the same command history as the toolbar.
- `zOrder: 'background'` keeps the band behind the bars, so clicks reach the bars.
- Delete removes the selection, and Escape clears it. The toolbar's remove button demonstrates the command API.
- Annotations cannot be dragged in `readonly` or `edit` mode. `edit` mode does not draw annotations.
