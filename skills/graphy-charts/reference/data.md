# Data

The `Data` object is the only data input. The engine parses it once into a typed dataset (type inference + value parsing), and re-parses only when you pass a **new object reference** — mutate-in-place is invisible.

## Shape

```ts
import type { Data } from '@graphysdk/viz-engine';

const data: Data = {
  columns: [
    { key: 'month' }, // key must match the row keys exactly
    { key: 'revenue', label: 'Revenue ($)' }, // label is the display name in guides/tooltips
  ],
  rows: [
    { month: 'Jan', revenue: 1200 },
    { month: 'Feb', revenue: null }, // null = missing value
  ],
  _metadata: { parsingLocale: 'en-US' }, // optional
};
```

| Field | Type | Notes |
|---|---|---|
| `columns[].key` | `string` | Unique, stable identifier; the name you use in `mapping()` and transforms. |
| `columns[].label` | `string?` | Friendly display name. Falls back to `key`. |
| `rows` | `Array<Record<string, DataValue>>` | One object per row; keys match `columns[].key`. |
| `_metadata.parsingLocale` | `'en-US' \| 'en-GB' \| 'ar' \| 'pt-PT'` | Locale for parsing. Defaults to `'en-GB'`. |

**Reference columns by `key`, never by `label`.** Every `mapping()`, transform and aesthetic takes the key; a label used as a variable name fails compilation with `UNKNOWN_VARIABLE`. When you didn't author the dataset yourself, read its `columns` array first and take the keys from there.

`DataValue = number | string | Date | null`. Strings are fine everywhere — parsing turns `'$1,200'`, `'12%'`, `'01/02/2022'`, `'2.5k'` into typed values. Cells that are `null`, `undefined`, `''` (or whitespace), or `'-'` count as empty. Rows whose every cell is empty are dropped.

## parsingLocale

Controls how ambiguous values are read, most importantly numeric date order: `'en-US'` reads `01/02/2022` as Jan 2 (month-day-year); `'en-GB'`, `'pt-PT'`, `'ar'` read it as Feb 1 (day-month-year). It is also the fallback display locale when no `formattingLocale` is given to `GraphProvider`. If your dates are numeric-separated, set it explicitly.

## Type and format inference

Per column, the engine:

1. Skips the column if `_metadata.isHidden` is set, or if it has no non-empty cell (the column is dropped).
2. **Year pass** — scans the first 5 non-empty rows; the first column where ≥ 2 non-empty values are all years 1900–2199 (e.g. `2021`, `'2022'`) becomes `{ type: 'year' }` (temporal).
3. Otherwise, the **first non-empty cell alone** decides the column's `ValueFormat`, tried in order: number → date string (locale-aware format list) → weekly date range (`'Jan 1 – Jan 7'`) → `Date` object / unix timestamp → percentage (`'12%'`) → currency (`'$5'`, `'€5'`, …) → `text` (catch-all).
4. Every cell in the column is then parsed with that one format. **Cells that don't fit become `null` silently** — no error.

Parsing details:

- Numbers accept thousands separators and magnitude suffixes: `'1,200'` → 1200, `'2.5k'` → 2500, also `m`, `b`, `t`.
- Percentages are stored as fractions: `'12%'` → `0.12`. Only percent **strings** infer the percentage format — a column of bare fractions (0.12) infers `decimal` and renders as plain numbers. And inside a percentage column a bare numeric cell passes through unscaled: `12` stays `12` (renders "1200%"), so don't mix bare numbers into a percent-string column.
- Currency strings are stripped to a number; the symbol sets the format's `iso` (e.g. `'usd'`).
- Dates become UTC `Date` objects. `'2022-02'` parses as month + year; `'Q1 2022'` as a quarter; `'February 2022'` as month + year; bare `'February'`/`'Feb'` as a month with no year.

## ValueFormat

The inferred (per-column) format descriptor. It travels with the variable through the whole pipeline: the compiler tags axes, legends, tooltips, and headline figures with it, and the renderer turns value + format + locale into the display string. You never format values yourself — control display by controlling what the data parses as.

| `type` | Data type | Rendered example (en-US) |
|---|---|---|
| `decimal` | numeric | `1,234.5` |
| `integer` | numeric | `1,235` |
| `percentage` | numeric | `0.12` → `12%` |
| `currency` (+ `iso`) | numeric | `$1,234.50` |
| `duration` | numeric (ms) | `1h 5m` |
| `text` | categorical | passed through |
| `date` | temporal | `Jan 5, 2025` |
| `datetime` | temporal | `Jan 5, 2025 • 14:30:00` |
| `time` | temporal | `14:30` |
| `year` | temporal | `2025` |
| `quarter` | temporal | `Q1 2025` |
| `month` | temporal | `January` |
| `month_year` | temporal | `Jan 2025` |
| `day_month` | temporal | `January 5` |
| `weekly_date_range` | temporal | `January 5 – 11` |
| `weekly_date_range_with_year` | temporal | `Jan 5 – 11, 2025` |

So: a revenue column supplied as `'$1,200'` strings gets a currency-formatted y-axis and tooltip for free; the same column supplied as bare numbers renders as plain decimals.

## Long data vs `transform.reshape`

Geoms want **long** data: one observation per row, with a categorical column to split series on. Two ways to get there.

**Already long — map the series column directly:**

```ts
const data = {
  columns: [{ key: 'month' }, { key: 'region' }, { key: 'sales' }],
  rows: [
    { month: 'Jan', region: 'North', sales: 120 },
    { month: 'Jan', region: 'South', sales: 90 },
    { month: 'Feb', region: 'North', sales: 140 },
    { month: 'Feb', region: 'South', sales: 100 },
  ],
};
const input = pipe(createSpec(), mapping({ x: 'month', y: 'sales', color: 'region' }), geom.line(), scale.x(), scale.y());
```

**Wide (one column per series) — reshape first:**

```ts
import { createSpec, pipe, mapping, geom, scale, transform } from '@graphysdk/viz-engine';

const data = {
  columns: [{ key: 'month' }, { key: 'north' }, { key: 'south' }],
  rows: [
    { month: 'Jan', north: 120, south: 90 },
    { month: 'Feb', north: 140, south: 100 },
  ],
};

const input = pipe(
  createSpec(),
  transform.reshape({ reshape: ['north', 'south'], keyName: 'region', valueName: 'sales' }),
  mapping({ x: 'month', y: 'sales', color: 'region' }),
  geom.line(),
  scale.x(),
  scale.y()
);
```

`transform.reshape(options)` collapses numeric columns into two new variables:

| Option | Default | Meaning |
|---|---|---|
| `reshape` | all numeric variables | Columns to collapse into rows. Numeric only — reshaping a categorical/temporal column is an error. |
| `keep` | all categorical/temporal variables | Columns carried through unchanged. |
| `keyName` | `'key'` | New categorical column holding the source column names. |
| `valueName` | `'value'` | New numeric column holding the values. |

With all defaults, `transform.reshape()` melts every numeric column and keeps the rest — often exactly right for a wide table. If the source columns share a format (all currency), the value column keeps it; if they differ, the value column gets a per-observation `lookup` format so each series still displays in its own format.

## Gotchas

- **Month names are dates, not categories.** A column of `'Jan'`, `'Feb'`, … infers as temporal `month` and each cell parses to a real date. A stray non-month cell like `'Total'` or `'Avg'` becomes `null` — filter summary rows out before charting. Short and long forms (`'Feb'`/`'February'`) can be mixed.
- **Mixed-type columns fail silently.** Only the first non-empty cell picks the format; every later cell that doesn't parse under it becomes `null`. `['12', 'n/a', '15']` keeps two values; `['n/a', '12', '15']` makes the whole column `text`.
- **Bare 4-digit numbers are decimals, not years** — unless the whole column passes the year pass (≥ 2 values, all 1900–2199). One `'2022'` in a decimal column is the number 2022, and a y-axis over years like 2020–2023 will show `2,020`.
- **Numeric dates depend on locale.** `'01/02/2022'` flips month/day between `'en-US'` and the `'en-GB'` default. Unambiguous forms (`'2022-02-01'`, `'Feb 1, 2022'`, `Date` objects) are locale-proof.
- **Column keys must match row keys exactly.** A `columns` entry whose key appears in no row is dropped (no non-empty cell), and mapping to it fails downstream.
- **`'-'` means empty**, not a minus sign or a category.
