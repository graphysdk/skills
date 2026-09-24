---
type: llm
weight: 1
---

Pass if the Alpha bars are red in either of these ways:

- `style.geom.bar({ fill: '#e5484d' }, { where: ... })` in `styles()` `overrides`, with `where` testing the product column for Alpha (`eq: 'Alpha'` or `oneOf: ['Alpha']`).
- `scale.color.palette({ overrides })` setting the Alpha group's hex to `#e5484d`. The skill numbers groups from 1.

Fail if the answer uses `borderColor`, `background`, or passes `themeOverrides`. Also fail if a `where` entry is only in `defaults` while `color` is mapped, and there is no palette override either.
