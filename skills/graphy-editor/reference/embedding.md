# Embedding an editable chart

Embed an editable chart, save edits, and keep editing dependencies out of read-only pages. Use the graphy-charts skill to build the chart.

Contents: install, import and mode, props, CSS, read-only pages, saving and restoring, errors, what each surface reaches.

## Install

Use the standard install from the graphy-charts skill, with these details:

- The `@tiptap/*@^3` peers are optional, so no package manager installs them for you. Install them when you import `/editable`. The main entry needs none of them. The list is in the graphy-charts setup reference.
- Command classes and the editing helpers come from `@graphysdk/react/editable`, the same entry as the renderer. Nothing else to install.

## Renderer and mode

```tsx
import { EditableGraphRenderer } from '@graphysdk/react/editable';
```

`EditableGraphRenderer` adds an editing layer to `GraphRenderer`. Choose its behavior with `mode`:

- `'readonly'` (default): view only. Commands from code still work.
- `'pointAndEdit'`: click a part of the chart and change it from a menu. See [point and edit](point-and-edit.md).
- `'editable'`: annotations, drags, inline text, the (+) menu. See [annotations](annotations.md).

A plain `GraphRenderer` with `mode="editable"` renders no editing layer, though the mode still hides tooltips. Switch modes through the `mode` prop:

```tsx
<EditableGraphRenderer mode={isEditing ? 'pointAndEdit' : 'readonly'} />
```

Hover, animation and the editor's own state survive a mode change. Swapping components remounts the chart and loses them. The undo history lives in `GraphProvider`, so it survives both. Switching between the two editing modes clears the selection.

`GraphProvider` needs no extra props for editing. The advanced install uses the same components from `@graphysdk/react-renderer` and `@graphysdk/react-renderer/editable`.

## Props

`EditableGraphRenderer` takes every `GraphRenderer` prop (`sizing`, `animation`, `showTooltips`, `slots`, `onResize`, `mode`) plus two of its own:

- `palettePresets`: named color lists, `{ Warm: ['#E03030', '#E08A30'] }`. The Chart menu in point and edit offers them after the theme's colors. Without it the Palette row is hidden.
- `editMenus`: your own point and edit menus, searched before Graphy's. `null` removes a menu. See [point and edit](point-and-edit.md).

`EditableGraphRenderer` supplies the `EditorSurface` slot. Override it through `slots` to replace the editing layer. Use `EditorSurfaceSlotProps` from `@graphysdk/react` for your component.

Both editing modes hide tooltips regardless of `showTooltips`. Point and edit also hides annotations and the chart's normal hover styling. Inline text editing and the (+) menu are available only in editable mode.

## CSS

No CSS import is needed. Each entry includes its stylesheet for bundlers, and CDN bundles inject styles at runtime. Neither package exports `editable.css`; importing `@graphysdk/react-renderer/editable.css` fails.

## Keep read-only pages light

A page that only shows charts imports from `@graphysdk/react` alone. The `/editable` entry adds TipTap, the panel and their styles. If the editor is only sometimes shown, put the `/editable` imports behind a code-split boundary.

Without a bundler the same split exists on the CDN: `dist/editable.browser.mjs` is a superset of `dist/index.browser.mjs`. A page loads one of the two, never both. The import map and the URLs are in the graphy-charts skill's setup reference.

## Saving and restoring

Save edits through `GraphProvider`:

```ts
onSpecChange?: (next: Spec) => void;
```

- It fires once per completed edit: a drag, a typing session, a menu click, an undo or a redo.
- The `Spec` is plain JSON. Store it. Pass it back as `spec` to restore the chart.
- The round trip `spec={spec} onSpecChange={setSpec}` does not loop. The provider compares against what it last compiled.
- Data never changes. Commands change the spec only.
- The theme stays out of the spec. A chart restored from a stored spec needs the same `theme` on `GraphProvider` again.

```tsx
const [spec, setSpec] = useState(() => loadSpec() ?? defaultSpec);
const save = (next: Spec) => {
  setSpec(next);
  localStorage.setItem('chart', JSON.stringify(next));
};
<GraphProvider spec={spec} data={data} onSpecChange={save}>
  …
</GraphProvider>;
```

A `spec` you pass from outside replaces the edited state and clears the undo history once it compiles. Always feed back what `onSpecChange` gave you, and keep the object stable between renders. The provider compares by reference: the same object is left alone, a different one replaces the edits. A spec rebuilt on every render leaves nothing undoable, and passing the original spec object again after an edit drops the user's edits.

History behavior:

- New `data` and a `colorScheme` change keep it. The steps still address the spec they were built from.
- A `spec` that fails to compile keeps it. The chart behind the error panel is still the last good one.
- `theme` and `plugins` are read once at mount. Change them by remounting `GraphProvider` with a new React `key`, which also starts a clean history.
- History holds 100 steps. Additional steps remove the oldest entries.

## Errors

A command whose result fails to compile is reported through `onError` on the provider, the last good chart stays up and the history is untouched. The error panel replaces the chart only for inputs from outside: a `spec`, `data` or `colorScheme` that fails to compile, a plugin that fails to register, or a render that throws.

## Editing options

Each option supports a broader set of edits:

1. The point and edit menu: colors, line style, axis title and range, grid style, legend position, data labels, palette.
2. The pre-built panel: the supplied sections. The list in [panel](panel.md) is complete.
3. Commands: everything the menu and the panel do, plus layers, mapping, scales, styles, annotations and highlights. See [commands](commands.md).
4. A new spec built with the authoring API, passed as `spec`. This clears the undo history, so prefer a command when one exists.
