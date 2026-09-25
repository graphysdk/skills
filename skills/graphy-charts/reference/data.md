# Data

Contents

- Data shape
- Column types and value formats
- Declaring a column's value format
- Numbers
- Dates
- Parsing locale and formatting locale
- Missing values
- Wide and long data
- From data type to scale
- Loading files with data-import-utils
- Pitfalls

## Data shape

Data is a table: a list of columns and a list of rows. Every row is an object keyed by column key.

```ts
import type { Data } from '@graphysdk/react';

const data: Data = {
  columns: [
    { key: 'month', label: 'Month' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'region' },
  ],
  rows: [
    { month: '2024-01', revenue: 1200, region: 'North' },
    { month: '2024-02', revenue: 1350, region: 'North' },
    { month: '2024-01', revenue: 980, region: 'South' },
  ],
};
```

A cell is a `number`, a `string`, a `Date`, or `null`. `label` is the column's display name in legends, tooltips, and axis titles. Without it, legends and tooltips show the key, and the axis has no title unless `config({ axes: { x: { label: 'Month' } } })` sets one. A column's `key` is what the spec maps: `createSpec({ x: 'month', y: 'revenue', color: 'region' })`.

Only columns listed in `columns` are read. Extra keys on a row are ignored.

Exact types: types.md § Core & data.

## Column types and value formats

Every column gets one of three data types: numeric, temporal, or categorical. The type comes from the column's value format, and the value format is inferred from the first non-empty cell in the column. The whole column is then parsed with that format.

Inference checks, in order:

1. A number, or a string that reads as a number (`'1,234.5'`, `'12k'`): `decimal`.
2. A string that matches a date format for the parsing locale: `date`, `month_year`, `quarter`, `day_month`, `month`, `year`, or `datetime`.
3. A weekly range such as `'Jan 1 – Jan 7'`: `weekly_date_range`, or `weekly_date_range_with_year` when both parts carry a year.
4. A `Date` object: `date`.
5. A string ending in `%`: `percentage`.
6. A string starting with a currency symbol (`'$1,200'`, `'€45'`): `currency`.
7. Anything else: `text`.

One special case runs before the cascade. The first column with no declared format whose cells in the first five non-empty rows are all four-digit years (1800 to 2199) becomes a `year` column, so `2021, 2022, 2023` reads as time rather than as a number. It needs at least two non-empty cells among those rows, and it is skipped when any column declares `{ type: 'year' }`. A column with no non-empty cell at all is dropped from the dataset.

```ts
import type { Data } from '@graphysdk/react';

const data: Data = {
  columns: [{ key: 'year' }, { key: 'growth' }, { key: 'sales' }, { key: 'team' }],
  rows: [
    { year: 2022, growth: '4.5%', sales: '$1,200', team: 'Ops' },
    { year: 2023, growth: '5.1%', sales: '$1,450', team: 'Ops' },
  ],
};
// year: temporal (year), growth: numeric (percentage, stored as 0.045),
// sales: numeric (currency usd, stored as 1200), team: categorical (text)
```

The data type decides how the column is placed and scaled. The value format decides how its values are written in axes, tooltips, and labels (`0.045` shows as `4.5%`, `1200` as `$1,200`).

## Declaring a column's value format

Set `valueFormat` on a column to skip inference for it. Use this when the first cell is misleading or when a plain number should be shown in a specific way.

```ts
import type { Data } from '@graphysdk/react';

const data: Data = {
  columns: [
    { key: 'code', valueFormat: { type: 'text' } },
    { key: 'price', valueFormat: { type: 'currency', iso: 'eur' } },
    { key: 'share', valueFormat: { type: 'percentage' } },
    { key: 'day', valueFormat: { type: 'date', dateFormat: 'MM/dd/yyyy' } },
  ],
  rows: [
    { code: '0042', price: 19.9, share: 0.31, day: '02/01/2024' },
    { code: '0043', price: 24.5, share: 0.12, day: '02/15/2024' },
  ],
};
```

- `{ type: 'text' }` keeps digit strings such as postcodes or IDs categorical.
- `{ type: 'currency', iso }` formats bare numbers as money. `iso` is a lower-case three-letter code (`'usd'`, `'gbp'`, `'eur'`, ...).
- `{ type: 'percentage' }` takes fractions: `0.31` shows as `31%`.
- A temporal format takes an optional `dateFormat`, a date-fns pattern the strings are parsed with. This is the way to read dates whose order the parsing locale would get wrong.
- `{ type: 'integer' }`, `{ type: 'decimal' }`, `{ type: 'duration' }` (milliseconds) are the other numeric formats. `{ type: 'time' }` is the temporal format for a time of day.

The format list is `ExplicitValueFormat` in types.md § Supporting types.

## Numbers

Numeric cells can be numbers or strings. Strings may carry thousands separators, a sign, and a `k`, `m`, `b`, or `t` suffix: `'1,250'`, `'-3.5'`, `'12k'` become `1250`, `-3.5`, `12000`. A percentage string `'12.5%'` becomes `0.125`. A currency string `'$1,200'` becomes `1200` with the symbol recorded as the column's currency. The symbol may sit at the start or the end of the string.

Prefer real numbers in rows when you control the data. Strings exist for data that arrives from files and spreadsheets.

## Dates

Temporal cells can be `Date` objects, ISO strings (`'2024-02-01T00:00:00Z'` reads as `datetime`), or dates written the way people write them. Recognised string shapes, with `/`, `-`, `.`, or a space as separator:

- Day, month, and year in the parsing locale's order: `'01/02/2024'`, `'1 February 2024'`, `'February 1, 2024'`.
- Month and year: `'February 2024'`, `'2024-02'`.
- Quarter: `'Q1 2024'`.
- Day and month without a year: `'1 February'`, `'February 1'`.
- Month only: `'February'` or `'Feb'`.
- Bare years: `'2024'` or `2024` (see the year rule above).

Short month names (`Feb`) and long ones (`February`) both work. Dates are parsed to UTC.

When a format has no year (`month`, `day_month`, `weekly_date_range`), the graph shows the value without a year as well. Values that fail to parse under the column's format become `null`.

## Parsing locale and formatting locale

Two locales are involved, and they default differently.

The parsing locale decides how ambiguous strings are read. `'01/02/2024'` is 1 February in `en-GB` and 2 January in `en-US`. Data is parsed with `en-GB` order (day first) unless the data carries a parsing locale in its metadata. That metadata field is not part of the public `Data` type, so when your dates are month-first strings, do one of these instead:

- Pass `Date` objects or ISO strings. They are read the same way in every locale.
- Declare the column with a `dateFormat`: `{ type: 'date', dateFormat: 'MM/dd/yyyy' }`.

The formatting locale decides how axis ticks, tooltips, legends, and labels are written: decimal and thousands separators, month names, currency symbols. It is `formattingLocale` on `GraphProvider` when set, otherwise `config({ parsingLocale })` in the spec, which defaults to `'en-US'`.

```tsx
import { GraphProvider, GraphRenderer, config, createSpec, geom, pipe, scale } from '@graphysdk/react';

const data = {
  columns: [{ key: 'month' }, { key: 'revenue' }],
  rows: [
    { month: '2024-01', revenue: 1200.5 },
    { month: '2024-02', revenue: 1350.25 },
  ],
};

const spec = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.line(),
  scale.x(),
  scale.y(),
  config({ parsingLocale: 'pt-PT' })
);

export function PortugueseGraph() {
  return (
    <GraphProvider data={data} spec={spec} formattingLocale="pt-PT">
      <GraphRenderer />
    </GraphProvider>
  );
}
```

`config({ parsingLocale })` is also the locale used to read values written inside the spec, such as a date in a highlight predicate or an annotation anchor. Set it to match the data when the two differ.

Supported locales: `'en-GB'`, `'en-US'`, `'pt-PT'`, `'ar'`. Durations always format in English.

## Missing values

`null`, `undefined`, an empty string, and `'-'` all read as missing. A row where every cell is missing is dropped. Everything else stays and becomes `null` for that cell.

How a missing value is drawn depends on the geom. Lines and areas take a `missingValues` param:

```ts
import { createSpec, geom, pipe, scale } from '@graphysdk/react';

const gapLine = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.line({ params: { missingValues: 'gap' } }),
  scale.x(),
  scale.y()
);

const bridgedLine = pipe(
  createSpec({ x: 'month', y: 'revenue' }),
  geom.line({ params: { missingValues: 'connect' } }),
  scale.x(),
  scale.y()
);
```

- `'gap'` breaks the line at the missing observation. Default for lines.
- `'connect'` skips the missing observation and joins its neighbours.
- `'zero'` draws the missing observation as zero. Default for areas, which cannot show a gap inside a stack; an area asked for `'gap'` draws `'zero'`.

Bars and points have no `missingValues` param.

## Wide and long data

A graph with one group per column (one column per region, per year, per product) is wide data. The mapping works on long data, where one column holds the group name and one holds the value. `transform.reshape` folds wide numeric columns into two long ones.

```ts
import { createSpec, geom, mapping, pipe, scale, transform } from '@graphysdk/react';

const wide = {
  columns: [{ key: 'month' }, { key: 'North' }, { key: 'South' }],
  rows: [
    { month: 'Jan', North: 120, South: 95 },
    { month: 'Feb', North: 150, South: 110 },
  ],
};

const spec = pipe(
  createSpec(),
  transform.reshape({ keep: ['month'], reshape: ['North', 'South'], keyName: 'region', valueName: 'revenue' }),
  mapping({ x: 'month', y: 'revenue', color: 'region' }),
  geom.bar({ position: 'dodge' }),
  scale.x(),
  scale.y()
);
```

Every option is optional. By default all categorical and temporal columns are kept and all numeric columns are folded; the new columns are named `key` and `value`. When the folded columns had different value formats (one currency, one percentage), the value column keeps them per observation, so tooltips still format each group its own way.

`mapping(...)` is another way to add the mapping; `createSpec({ x: 'month', y: 'revenue', color: 'region' })` followed by the transform builds the same spec. Item order does not matter. The transform throws an `INVALID_DATA_SHAPE` error when a folded column is not numeric, or when `keep` contains `keyName` or `valueName`.

## From data type to scale

`scale.x()`, `scale.y()`, and `scale.ySecondary()` with no arguments infer the scale kind from the mapped column's data type. A colour scale is added for you when none is declared: a palette by default, or one inferred from the column under a tile. Declare `scale.color.continuous()`, `scale.color.discrete()`, or `scale.color.palette()` to choose.

- numeric position: continuous.
- categorical position: band (one slot per distinct value).
- temporal position: datetime, with date-aware ticks.

Geoms can override this. A bar's main axis is always a band, even for numbers or dates, so `geom.bar()` with a numeric `x` places one bar per distinct value. Declaring `scale.x.continuous()` under a bar is reported as a warning and replaced by a band. A tile also needs bands on both axes. A bar or area holds zero on its value axis, so a `domainMin` above zero is overruled there with a warning. An undeclared `x` or `y` scale raises no diagnostic; the geom is simply not placed.

To force a kind, call the typed builder: `scale.x.datetime()`, `scale.x.discrete()`, `scale.y.log()`. Options such as `domainMin` and `reverse` can be passed to the inferred form as well: `scale.y({ domainMin: 0 })`. See spec.md § Scales.

## Loading files with data-import-utils

`@graphysdk/data-import-utils` turns CSV, TSV, JSON, and spreadsheet files into the `{ columns, rows }` shape. The delimited and spreadsheet parsers generate column keys `c1`, `c2`, ... and put the header text into `label`, so a spec maps the generated keys, or looks a key up by label. `hasHeader` (default `true`) says whether the first row is the header.

```ts
import { fromCSV } from '@graphysdk/data-import-utils/csv';
import { createSpec, geom, pipe, scale } from '@graphysdk/react';

const data = fromCSV('Month,Revenue\nJan,120\nFeb,150');
// data.columns: [{ key: 'c1', label: 'Month' }, { key: 'c2', label: 'Revenue' }]

const revenueKey = data.columns.find((column) => column.label === 'Revenue')?.key ?? 'c2';
const spec = pipe(createSpec({ x: 'c1', y: revenueKey }), geom.bar(), scale.x(), scale.y());
```

In those parsers numeric strings become numbers at import, using the `locale` option (`'EN_US'`, `'EN_GB'`, `'PT_PT'`, `'AR'`, default `'EN_US'`) to read thousands and decimal separators. Spreadsheet dates come back as ISO strings and booleans as `1` or `0`. Everything else stays a string, and the graph infers types from there as described above.

`fromJSON` is different. It accepts a JSON string, an array of row objects (columns are the union of keys, in first-seen order), or a `{ columns, rows }` table. Keys are kept as they are, `locale` is ignored, strings and numbers pass through, booleans become `'true'` or `'false'`, and nested values are stringified.

Imported columns are typed `{ key, label? }` and carry no `valueFormat`. To add one, map them into new column objects typed as the graph's `Data`:

```ts
import { fromCSV } from '@graphysdk/data-import-utils/csv';
import type { Data } from '@graphysdk/react';

const imported = fromCSV('Code,Price\n0042,19.9\n0043,24.5');

const data: Data = {
  columns: imported.columns.map((column) =>
    column.label === 'Code' ? { ...column, valueFormat: { type: 'text' } } : column
  ),
  rows: imported.rows,
};
```

Each format has its own subpath so only its parser is bundled. The root entry exports types only.

```ts
import { fromXLSX } from '@graphysdk/data-import-utils/xlsx';
import { fromJSON } from '@graphysdk/data-import-utils/json';
import { fromText } from '@graphysdk/data-import-utils/text';
import { fromBuffer } from '@graphysdk/data-import-utils/buffer';
import { fromFile } from '@graphysdk/data-import-utils/file';
import { fromURL } from '@graphysdk/data-import-utils/url';

const fromSheet = await fromXLSX(buffer, { sheet: 'Revenue' });
const fromJsonText = fromJSON('[{ "month": "Jan", "revenue": 120 }]');
const fromAnyText = fromText(csvString, 'csv', { locale: 'EN_GB', hasHeader: true });
const fromAnyBuffer = await fromBuffer(buffer, 'xlsx');
const fromDisk = await fromFile('sales.csv');
const fromWeb = await fromURL('https://example.com/sales.csv', {
  headers: { Authorization: 'Bearer token' },
  timeout: 10_000,
  signal: controller.signal,
});
```

`fromFile` reads from disk and needs Node. In the browser read the file with the File API and hand the text to `fromCSV` or `fromTSV`, or the `ArrayBuffer` to `fromXLSX`, `fromXLS`, or `fromODS`. Spreadsheet parsers read the first sheet unless `sheet` is given, by name or index. `fromURL` takes fetch `headers`, a `timeout` in milliseconds (default 30 seconds), and an abort `signal`. The `maxFileSize`, `maxRows`, and `maxCells` limits throw when exceeded.

## Pitfalls

- A column whose first cell is a number but whose later cells are text is numeric, and the text cells become `null`. Declare `{ type: 'text' }` when a column mixes.
- IDs, postcodes, and product codes made of digits are read as numbers. Declare `{ type: 'text' }`.
- Month-first date strings (`'02/01/2024'` meaning 1 February) are read day-first. Use `Date` objects, ISO strings, or a column `dateFormat`.
- Percentages are fractions. A `percentage` column with the value `45` shows as `4500%`. Store `0.45`, or use `'45%'` strings.
- One column per group is wide data. Reshape it, or map the column directly to `y` when you only need one group.
- Row keys must match column keys exactly, including case. Mappings name the column `key`, never the `label`.
