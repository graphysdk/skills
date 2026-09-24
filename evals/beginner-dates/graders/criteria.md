---
type: llm
weight: 1
---

Pass only if the answer avoids day-first parsing. Accept a column `dateFormat` of `MM/dd/yyyy`, ISO date strings, or real `Date` objects.

Fail if the spec uses the original `02/01/2024` style strings with no `dateFormat` and no `Date` objects.
