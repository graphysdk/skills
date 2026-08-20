# Point-and-click: canvas editing and annotations

What `mode="editable"` turns on directly on the chart — no panel involved — and the annotation
model behind it. Annotations **as authored spec** (the `annotation.*` builders, every kind's
options) are `graphy-charts/reference/storytelling.md`; this file covers editing them, by gesture
and by command.

## What editable mode adds to the canvas

- **Selection.** Click an annotation to select it. Selection is `EditTarget[]`
  (`reference/commands.md`); in the current release only annotations are click-selectable on the
  canvas — everything else is selected from code via `handle.setSelection` if a host wants to.
- **Drags.** A drag shows a live preview and commits **exactly one command on drop** — one undo
  entry per gesture. Text and shapes also resize; arrows re-draw endpoint by endpoint; a
  difference arrow re-targets its endpoints one data point at a time.
- **In-place text editing.** Title, subtitle, caption and text annotations take a cursor directly
  on the chart. The panel's text fields, where mounted, are a second way in, not the only one.
- **The `(+)` menu.** Hovering a data point (a bar, a point) shows a small `(+)` button; its menu
  adds annotations anchored to that data point — comment, pinned number, sticker — and offers
  highlights and difference arrows, plus removing what's already there.
- **Floating toolbars.** A selected annotation shows a small toolbar for its kind: font
  family/size/color/alignment on text, fill and border on shapes, thickness and arrowheads on
  arrows. Color picking included.
- **Keyboard.** `Escape` steps back one level — it cancels an active drag or menu first, then
  clears focus, then clears the selection. `Delete` removes the selection; `Tab` moves focus
  through the on-canvas controls; arrow keys nudge or resize. Undo shortcuts are the host's job —
  bind them with `useGraphHistoryShortcuts`.

Every one of these gestures dispatches ordinary commands, so they interleave with panel edits and
your own dispatches on one history.

## Free-flowing vs pinned — the anchor decides

Whether an annotation can be dragged is decided by **how it is anchored, not what kind it is**:

- `{ anchorType: 'panel', x, y }` — fractions of the plot area, measured from the top-left.
  **Free-flowing**: draggable, and it keeps its relative place when the chart resizes.
- `{ anchorType: 'observation', anchorValue, layerId?, groupValue? }` — pinned to a data point.
  Selectable, deletable, restylable — but no drag can move it; it follows its data point through
  data and layout changes.

Which kinds move (the rule `isAnnotationMovable` applies):

| Kind | Moves when… | What moves |
|---|---|---|
| `text`, `sticker` | `at` is panel-anchored | `at` |
| `shape`, `image` | `region` is panel-anchored | the region's origin (never its size) |
| `arrow` | **both** ends are panel-anchored | both ends together (length and angle kept) |
| `differenceArrow`, `pinnedNumber`, `comment` | never | placed by the data points they describe |

Layering: `zOrder: 'background'` paints the annotation beneath the marks, so a click where a bar
covers it reaches the bar; `'foreground'` paints on top, and among foreground items the one
painted last receives the click.

## The annotation model

Eight kinds — `shape`, `arrow`, `text`, `image`, `sticker`, `pinnedNumber`, `comment`,
`differenceArrow` — stored per kind on `spec.annotations`. **Ids are unique across all kinds**, so
every command and helper addresses an annotation by id alone (`findAnnotation(annotations, id)`
returns it with its kind and position).

**One attachment per data point**: a data point carries at most one of
`OBSERVATION_ATTACHMENT_KINDS` (`sticker`, `pinnedNumber`, `comment`, `image`). Adding a comment
to a bar that already has a pinned number *replaces* the number — and a single undo restores both.

Text annotations (and titles/captions set by command) carry `TextContent = string |
RichTextContent` — a TipTap/ProseMirror-shaped tree, no TipTap dependency:

```ts
import type { RichTextContent } from '@graphysdk/viz-engine';

const boldLine = (text: string): RichTextContent => ({
  type: 'doc',
  content: [{ type: 'paragraph', attrs: { textAlign: 'center' },
              content: [{ type: 'text', text, marks: [{ type: 'bold' }] }] }],
});
```

## Editing annotations by command

The four commands (`reference/commands.md` for the shared contract):

```tsx
import {
  AddAnnotationCommand, UpdateAnnotationCommand, MoveAnnotationCommand, RemoveAnnotationCommand,
  TEXT_ANNOTATION_DEFAULTS,
} from '@graphysdk/viz-engine';

// Add: a fully resolved annotation — spread the per-kind defaults. Id generated when omitted.
dispatch(new AddAnnotationCommand({
  kind: 'text',
  annotation: {
    ...TEXT_ANNOTATION_DEFAULTS,
    content: boldLine('Launch week'),
    at: { anchorType: 'panel', x: 0.72, y: 0.12 },
    width: 0.24,
  },
}));

// Update: restyle and reposition through one command — a partial patch of the kind's fields.
dispatch(new UpdateAnnotationCommand({
  kind: 'text', id: 'note-1', patch: { backgroundColor: '#fff3bf', width: 0.3 },
}));

// Move: a relative move in plot-area fractions (+y is down); clamped inside the plot on apply.
dispatch(new MoveAnnotationCommand({ id: 'note-1', translation: { x: 0.1, y: 0 } }));

// Remove: by id, whichever kind. Revert re-inserts at the original index (paint order preserved).
dispatch(new RemoveAnnotationCommand({ id: 'note-1' }));
```

Details worth knowing:

- `UpdateAnnotationCommand` refuses a patch aimed at another kind, and does nothing when every
  patched field already holds its value. Its revert is captured when the command is applied, so a
  replayed command reverts to what it actually overwrote.
- `MoveAnnotationCommand` is relative — applying twice moves twice. For a drag preview, use
  `clampAnnotationTranslation(kinded, translation)` — it returns what the annotation would
  actually move by (or `null` when it can't move), so the preview and the drop travel the same
  distance.
- Defaults to spread on add: `SHAPE_DEFAULTS`, `TEXT_ANNOTATION_DEFAULTS`, `ARROW_DEFAULTS`,
  `DIFFERENCE_ARROW_DEFAULTS` (image has no defaults constant in the current release — give its
  fields explicitly).
- To pin a new annotation to a hovered data point, build its anchor with
  `buildObservationAnchor(layer, observation)`. It returns `null` when the data point has nothing
  stable to anchor to — respect that rather than creating an annotation the next compile will
  drop. `areObservationAnchorsEqual` / `areAnchorsEqual` compare anchors the way the compiler does
  (an ISO string and a `Date` of the same instant match), and `findObservationAttachment` finds
  what a data point already carries.

Anchors are recalculated on every compile: they follow resizes, and data-bound ones follow their
data. An anchor that no longer resolves simply hides its annotation (no error) — it stays in the
spec and stays selected, so it can be repaired.

## Highlights from the canvas

The `(+)` menu's highlight entries dispatch `AddHighlightCommand`s scoped `data-point`, `series`
or `x-value`. When adding highlights from your own UI, run the menu's two checks:
`findHighlightsAtObservation` to see what already covers the data point (offer removal instead),
and `findEquivalentHighlight` to avoid creating a second, invisible copy of an existing highlight.
Both use the compiler's own matching logic, so what you offer always agrees with what the chart
draws.
