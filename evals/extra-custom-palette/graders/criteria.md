---
type: llm
weight: 1
---

Pass only if the three hex colours are registered under an id in the `customPalettes` prop on `GraphProvider`, and the spec picks that palette with `scale.color.palette({ palette: { type: 'custom', id: '<that id>' } })`. The id in the spec must match the key in `customPalettes`.

Fail if the colours appear only as inline `fill` values in `styles()` with no registered palette. Also fail if the palette id in the spec is not registered on the provider.
