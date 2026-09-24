---
type: llm
weight: 1
---

Pass only if the component file begins with the `'use client'` directive, imports the chart components from `@graphysdk/react`, and imports no Graphy stylesheet. The skill says there is no stylesheet to import.

Fail if `'use client'` is missing from the file that renders `GraphProvider` and `GraphRenderer`. Also fail if the answer imports any Graphy CSS file, such as `@graphysdk/react/styles.css` or any `.css` path under `@graphysdk/`.
