---
type: llm
weight: 1
---

Pass only if `GraphProvider` receives `colorScheme="dark"`, or a `colorScheme` prop that evaluates to `'dark'` when the app is in dark mode.

Fail if there is no `colorScheme` on `GraphProvider` and dark mode comes only from a CSS class or dark background on a wrapper element, or only from hard-coded dark colours in the stylesheet.
