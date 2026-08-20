# Embedding an editable chart

How to get a chart on screen that can be edited — by the user pointing and clicking, by a panel,
or by your own code. Chart *building* (authoring the spec this file assumes you have) is the
`graphy-charts` skill.

## Importing enables, `mode` activates

Editing lives behind one entry point:

```tsx
import { EditableGraphRenderer } from '@graphysdk/react-renderer/editable';
```

`EditableGraphRenderer` is a `GraphRenderer` with the editing layer wired in: selection and
dragging on the canvas, and in-place text editing for the title, subtitle, caption and text
annotations. Its props are exactly `GraphRendererProps`; there is nothing editor-specific to
configure on it.

Two switches, deliberately separate:

- **The import decides whether editing *can* happen.** A plain `GraphRenderer` — even with
  `mode="editable"` — renders no editing layer and stays read-only.
- **`mode` decides whether editing currently *is* happening.** `mode: 'readonly' | 'editable'`,
  default `'readonly'`.

Toggle `mode`, never swap components:

```tsx
<EditableGraphRenderer mode={isEditing ? 'editable' : 'readonly'} />
```

Hover state, animation and the undo history all survive the toggle; swapping
`EditableGraphRenderer` for `GraphRenderer` would remount the chart and lose them.

`GraphProvider` is the same provider in both modes — it needs **no extra props for editing**; only
the renderer differs. A complete editable chart:

```tsx
import { useRef, useState } from 'react';
import { GraphProvider, useGraphHistoryShortcuts, type GraphHandle } from '@graphysdk/react-renderer';
import { EditableGraphRenderer } from '@graphysdk/react-renderer/editable';
import type { SpecInput, Data } from '@graphysdk/viz-engine';

function EditableChart({ data, initialSpec }: { data: Data; initialSpec: SpecInput }) {
  const [spec, setSpec] = useState(initialSpec);
  const handleRef = useRef<GraphHandle>(null);
  useGraphHistoryShortcuts(handleRef); // ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z, Ctrl+Y

  return (
    <GraphProvider input={spec} data={data} handleRef={handleRef} onChange={setSpec}>
      <EditableGraphRenderer mode="editable" />
    </GraphProvider>
  );
}
```

That alone gives point-and-click editing on the canvas (selection, drags, the `(+)` menu, in-place
text editing — `reference/canvas.md`) and working undo. No panel required; the pre-built panel is
one optional add-on (`reference/panel.md`). `handleRef` fills a `GraphHandle` — the way toolbars
and code outside the provider reach the chart (`reference/commands.md`); leave it off if you only
need the canvas.

## What extra to install

Nothing. The base install — React 19, the 15 `@tiptap/*@^3` peer packages — is covered in
`graphy-charts/reference/install.md` and already includes everything editing needs. Two details
worth knowing:

- The `@tiptap/*` packages are only *loaded* when `./editable` is imported. npm 7+ and pnpm install
  them automatically; Yarn users add them by hand.
- `@base-ui/react`, `motion`, `react-colorful` and `zustand` are regular dependencies of the
  renderer — installed automatically, nothing to do.

## CSS: nothing to import

Each entry point injects its own stylesheet. Do **not** import
`'@graphysdk/react-renderer/editable.css'` — an outdated comment in the SDK still shows it, but the
path does not exist and the import fails.

## Keep read-only pages read-only

A page that only displays charts should import from the package root alone — `./editable` adds
TipTap, the panel and its styles to the bundle. If the editor is only sometimes shown, load the
`./editable` imports behind your own code-split boundary.

The same split exists with no bundler: the SDK's CDN build ships a read-only bundle and an
editable one, loaded from a jsDelivr URL — `graphy-charts/reference/cdn.md` has the URLs and the
import map.

## Saving and restoring

The save surface is one callback on `GraphProvider`:

```ts
onChange?: (next: SpecInput) => void;
```

- It fires **once per finished gesture** — a whole drag, a whole burst of typing into a title — not
  per frame. Persist what it hands you (the `SpecInput` is plain JSON) and restore the chart later
  by passing it back as `input`.
- The round-trip `input={spec} onChange={setSpec}` does not loop: the provider compares against
  what it last compiled, so its own change never re-triggers the callback.
- Data is never edited. Commands change the spec only; `data` stays whatever you pass.

**Reset or switch datasets by remounting**: give `GraphProvider` a React `key`. A remount starts
the history clean rather than offering to undo into the previous chart. Note that an `input` you
pass from outside *replaces* the edited state — a host that wants to keep the user's edits must
feed back what `onChange` gave it, not the original spec.

## What each surface can reach

Editing surfaces reach the spec unevenly. From narrowest to widest:

1. **Canvas gestures** — what a click or drag can reach: annotations, in-place text, the `(+)` menu
   (`reference/canvas.md`).
2. **The pre-built panel** — a curated subset of chart settings, one section per topic
   (`reference/panel.md`; the catalog there says exactly what each section edits).
3. **Commands** — the full catalogue, including per-layer control the panel does not expose
   (`reference/commands.md`). Everything the canvas and panel do is commands underneath, so your
   code can do anything they can.
4. **Rebuild the `SpecInput`** — anything no command covers yet. Build a new input with the
   authoring API (the `graphy-charts` skill) and pass it as `input`. This bypasses the undo
   history, so prefer a command when one exists.
