# Annotations and editable mode

`mode="editable"` on `EditableGraphRenderer` enables annotation selection, dragging, resizing, inline text editing and the (+) menu on data points. See the graphy-charts storytelling reference for annotation builders and options.

Contents: what the mode adds, anchors, the model, commands, the (+) menu, inline text, keyboard.

## What editable mode adds

- Selection. Click a text, shape, image, arrow or difference arrow annotation to select it. Nothing else is click-selectable in this mode. Stickers, comments and pinned numbers are added and removed from the (+) menu.
- Drags. A drag shows a live preview and commits one command on drop. Text and shapes resize from their handles. Arrows redraw endpoint by endpoint. A difference arrow's ends drag onto other data points.
- Inline text. Edit the title, subtitle and caption directly on the chart, with a floating toolbar for color, font, size, bold, italic, underline, alignment and links. Double-click a text annotation or press Enter to edit it. The source line is panel-only.
- The (+) menu. Hovering a data point shows a (+) button. Its menu pins a number, adds a comment or a sticker, adds a highlight, or adds a difference arrow to the next point, and removes what is already there.
- Toolbars. A selected annotation shows a small toolbar for its kind: background, text color, font, size and alignment on text; fill, opacity and border on shapes; color, thickness, arrowheads, dash and a sticker outline on arrows; label kind, color, size and swap ends on difference arrows. Every toolbar has a remove button. Images have none.
- Keyboard. Escape cancels a drag or menu, then exits text editing, then moves focus back to the chart, then clears the selection. Delete or Backspace removes the selected annotation. Enter starts editing a selected text annotation. Tab moves through the handles and toolbar. Space or Enter picks up a handle and the arrow keys nudge it.

Gestures dispatch commands and share undo history with the menu, panel and your own commands.

## Anchors and dragging

Whether an annotation can be dragged depends on how it is anchored, not on its kind:

- `{ anchorType: 'panel', x, y }` is a fraction of the plot area from the top left. Free: draggable, and it keeps its relative place when the chart resizes.
- `{ anchorType: 'observation', anchorValue, layerId?, groupValue? }` is pinned to a data point. No drag moves it. It follows its data point through data and layout changes. Anchors to an axis, a selection or another annotation exist too and do not move either.

| Kind                                         | Moves when                   | What moves                              |
| -------------------------------------------- | ---------------------------- | --------------------------------------- |
| `text`, `sticker`                            | `at` is panel anchored       | `at`                                    |
| `shape`, `image`                             | `region` is panel anchored   | the region's origin, never its size     |
| `arrow`                                      | both ends are panel anchored | both ends together                      |
| `differenceArrow`, `pinnedNumber`, `comment` | never                        | placed by the data points they describe |

`isAnnotationMovable(kinded)` from `@graphysdk/react/editable` applies this rule to the spec. On the canvas only text, shapes, images and arrows have drag handles, so a panel-anchored sticker moves by `MoveAnnotationCommand` alone.

`zOrder: 'background'` draws a shape or image below chart marks, so a click on an overlapping bar selects the bar. `'foreground'` draws above the marks. Other annotation kinds always draw above them.

## The model

There are eight annotation kinds: `shape`, `arrow`, `text`, `image`, `sticker`, `pinnedNumber`, `comment`, `differenceArrow`, stored per kind on `spec.annotations`. IDs are unique across kinds, so every command addresses an annotation by id alone. `findAnnotation(annotations, id)` returns it with its kind.

Each data point supports at most one of `sticker`, `pinnedNumber`, `comment` (`OBSERVATION_ATTACHMENT_KINDS` lists `image` too, for later). Adding a comment by command to a bar that has a pinned number replaces the number, and one undo restores it. For a point with an attachment, the (+) menu offers removal instead of replacement. A sticker counts only when it is anchored to a data point.

A text annotation's `content` is a `RichTextContent`, a ProseMirror-shaped tree with no TipTap dependency. Titles and captions take `TextContent = string | RichTextContent`.

```ts
import type { RichTextContent } from '@graphysdk/react/editable';

const boldLine = (text: string): RichTextContent => ({
  type: 'doc',
  content: [
    { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text, marks: [{ type: 'bold' }] }] },
  ],
});
```

## Commands

```tsx
import {
  AddAnnotationCommand,
  MoveAnnotationCommand,
  RemoveAnnotationCommand,
  TEXT_ANNOTATION_DEFAULTS,
  UpdateAnnotationCommand,
} from '@graphysdk/react/editable';

// Add a resolved annotation. Spread the kind's defaults. The id is generated when omitted.
dispatch(
  new AddAnnotationCommand({
    kind: 'text',
    annotation: {
      ...TEXT_ANNOTATION_DEFAULTS,
      content: boldLine('Launch week'),
      at: { anchorType: 'panel', x: 0.72, y: 0.12 },
      width: 0.24,
    },
  })
);

// Patch any of the kind's fields.
dispatch(new UpdateAnnotationCommand({ kind: 'text', id: 'note-1', patch: { width: 0.3 } }));

// Move by a fraction of the plot area. +y is down. Clamped inside the plot.
dispatch(new MoveAnnotationCommand({ id: 'note-1', translation: { x: 0.1, y: 0 } }));

// Remove by id, whichever kind. Undo puts it back at its old paint position.
dispatch(new RemoveAnnotationCommand({ id: 'note-1' }));
```

- `UpdateAnnotationCommand` refuses a patch for another kind and does nothing when every patched field already holds its value.
- `MoveAnnotationCommand` is relative. Applying it twice moves twice. For a drag preview, `clampAnnotationTranslation(kinded, translation)` returns the move the annotation will actually make, or `null` when it cannot move.
- Defaults to spread: `SHAPE_DEFAULTS`, `TEXT_ANNOTATION_DEFAULTS`, `ARROW_DEFAULTS`, `DIFFERENCE_ARROW_DEFAULTS`. Images have no defaults constant; provide every required field.
- `SetDifferenceArrowStyleCommand({ annotationId, arrow?, label? })` restyles a difference arrow and its label.
- A text annotation's background, a shape's fill and border, and an arrow's stroke live in the stylesheet. Write them with `SetStyleRuleCommand` and `style.annotation.text(declarations, { annotation: id })` or the shape and arrow builders, as the toolbars do. Text color, font and size are stored in the rich text. Arrowheads are stored on the annotation.

To pin a new annotation to a data point, build its anchor with `createObservationAnchorBuilder(layer)`, where `layer` is a scene layer. The returned function maps an observation to an anchor, or returns `null` if the point has no stable anchor. `findObservationAttachment(annotations, anchor)` finds an existing attachment at that anchor. If an anchor stops resolving, its annotation is hidden. It remains in the spec and stays selected so it can be repaired.

## Highlights from the (+) menu

Highlight rows dispatch `AddHighlightCommand` with the scopes the geom supports: `observation`, `group` or `xValue`. They hide scopes already covering the point, as reported by `findHighlightsAtObservation({ layer, highlights, observation, parsingLocale })`. In a custom UI, use that check and `findEquivalentHighlight(highlights, candidate)` to offer removal instead of adding a duplicate highlight.
