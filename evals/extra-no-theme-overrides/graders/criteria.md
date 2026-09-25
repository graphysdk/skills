---
type: llm
weight: 1
---

Pass only if both colours are set with `styles()` in the spec. The bar fill must come from `style.geom.bar({ fill })`, `style.geom({ fill })`, or the built-in `geom` token. The background must come from `style.graph({ fill })` or the built-in `graphBackground` token.

Fail if `themeOverrides` is passed to `GraphProvider`. Also fail if either colour is applied only through CSS on a wrapper element or through `ThemeProvider` props.
