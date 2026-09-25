---
type: llm
weight: 1
---

Pass only if the answer says waterfall is not a chart type in this SDK and does not invent a waterfall geom. The skill lists waterfall as unsupported. Offering a supported alternative, such as a plain bar chart of the quarterly changes, is fine.

Fail if the answer uses `geom.waterfall`, any other geom or chart type named waterfall, or a waterfall plugin it made up. Also fail if it presents `variant: 'waterfall'` on a colour palette as building a waterfall chart. The skill says that variant only swaps in positive, negative, and total colours.
