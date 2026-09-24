---
type: llm
weight: 1
---

Pass only if the answer follows `recipes/plugins/lollipop.md`: a custom lollipop geom, a `Geom` subclass bound with `defineGeomRenderer`, registered with `createGraphyKit({ plugins })` or passed to the provider's `plugins` prop, and then used in the spec, for example `kit.geom.lollipop()`.

Fail if there is no plugin registration. Also fail if the lollipop is faked with `geom.bar`, `geom.point`, or a mix of built-in geoms, such as thin bars with points on top.
