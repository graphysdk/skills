---
type: llm
weight: 1
---

Pass if the Braun stylesheet from `recipes/themes/braun.md` is applied in either of these ways:

- Piped into the spec as `braunTheme`, which that recipe already builds with `styles()`.
- Passed with `styles({ extends: [braunTheme] })` or an equivalent `extends` call.

Fail if `themeOverrides` is passed to `GraphProvider`.
