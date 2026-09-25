---
type: llm
weight: 1
---

Pass only if the answer remounts the provider with a new React `key` when the plugin set changes, for example `<GraphProvider key={pluginSetId} plugins={plugins}>`. Remounting a kit's `GraphProvider` with a new `key` also passes. The React and plugins references say `plugins` is read once at mount.

Fail if the answer says that passing a different array to the `plugins` prop is enough on its own.
