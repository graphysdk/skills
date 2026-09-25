#!/usr/bin/env node
// Verify the skill's code samples against the INSTALLED @graphysdk packages.
//
//   node scripts/check-samples.mjs [skillDir] [anchorDir] [tsDir]
//   skillDir   the skill folder to scan (default: this script's parent)
//   anchorDir  a folder whose node_modules resolve @graphysdk/react, @graphysdk/viz-engine,
//              @graphysdk/react-renderer and react (default: the current working directory;
//              in the monorepo use apps/storybook, which also resolves the d3 and roughjs types the
//              plugin recipes import)
//   tsDir      a folder whose node_modules resolve typescript (default: anchorDir)
//
//   Phase 1  Graphy entry-point names and named exports are recognised
//   Phase 2  each fenced ts/tsx block is typechecked
// Each fenced ts/tsx block is compiled on its own, prefixed with a preamble that
// binds every export of both packages and of the editable entry, so fragments
// still resolve their builders.
// Only API-shape diagnostics are reported; fragment noise is filtered out.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, resolve, relative, dirname } from 'node:path';

const require = createRequire(import.meta.url);
const SKILL = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const REPO = resolve(process.argv[3] ?? process.cwd());
const TS_DIR = resolve(process.argv[4] ?? REPO);
const ts = require(require.resolve('typescript', { paths: [TS_DIR] }));
// Must live INSIDE the repo: node module resolution for @graphysdk/* depends on it.
let TMP;

function dts(pkg, file) {
  try {
    return resolve(dirname(require.resolve(pkg, { paths: [REPO] })), file);
  } catch (error) {
    // Inside the monorepo the anchor IS the package (packages/react), which cannot resolve itself by name.
    const own = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    if (own.name === pkg.split('/').slice(0, 2).join('/')) return join(REPO, 'dist', file);
    throw error;
  }
}
function exportsOf(path, seen = new Set()) {
  if (seen.has(path)) return { values: new Set(), types: new Set() };
  seen.add(path);
  const sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const v = new Set(), t = new Set();
  (function visit(n) {
    // `export * from './authoring'` / from a package: an entry that is a barrel re-exports what it names.
    if (ts.isExportDeclaration(n) && !n.exportClause && n.moduleSpecifier) {
      const star = starExportsOf(path, n.moduleSpecifier.text, seen);
      for (const name of star.values) v.add(name);
      for (const name of star.types) t.add(name);
    }
    else if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause))
      for (const e of n.exportClause.elements) (n.isTypeOnly || e.isTypeOnly ? t : v).add(e.name.text);
    else if ((ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) &&
      n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) t.add(n.name.text);
    else if ((ts.isClassDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isEnumDeclaration(n)) &&
      n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) && n.name) v.add(n.name.text);
    else if (ts.isVariableStatement(n) && n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      for (const d of n.declarationList.declarations) if (ts.isIdentifier(d.name)) v.add(d.name.text);
    ts.forEachChild(n, visit);
  })(sf);
  return { values: v, types: t };
}

/** Resolve one `export * from` target to its `.d.ts` and read it, relative path or package alike. */
function starExportsOf(fromPath, specifier, seen) {
  const empty = { values: new Set(), types: new Set() };
  try {
    if (specifier.startsWith('.')) {
      const base = resolve(dirname(fromPath), specifier);
      return exportsOf(base.endsWith('.d.ts') ? base : `${base}.d.ts`, seen);
    }
    const entry = require.resolve(specifier, { paths: [REPO] });
    return exportsOf(resolve(dirname(entry), 'index.d.ts'), seen);
  } catch {
    return empty; // an unresolvable target is the resolver's problem, not a missing-export report
  }
}

const VE = exportsOf(dts('@graphysdk/viz-engine', 'index.d.ts'));
const RR = exportsOf(dts('@graphysdk/react-renderer', 'index.d.ts'));
const ED = exportsOf(dts('@graphysdk/react-renderer', 'editable.d.ts'));
const VEGC = exportsOf(dts('@graphysdk/viz-engine', 'graph-config.d.ts'));
const RRGC = exportsOf(dts('@graphysdk/react-renderer', 'graph-config.d.ts'));
const GR = exportsOf(dts('@graphysdk/react', 'index.d.ts'));
const GRE = exportsOf(dts('@graphysdk/react', 'editable.d.ts'));
// A name bound by the preamble must not be bound twice.
const seen = new Set();
const pick = (s) => [...s].filter((n) => !seen.has(n) && (seen.add(n), true));
const PREAMBLE = [
  `import * as React from 'react';`,
  `import { ${pick(VE.values).join(', ')} } from '@graphysdk/viz-engine';`,
  `import type { ${pick(VE.types).join(', ')} } from '@graphysdk/viz-engine';`,
  `import { ${pick(RR.values).join(', ')} } from '@graphysdk/react-renderer';`,
  `import type { ${pick(RR.types).join(', ')} } from '@graphysdk/react-renderer';`,
  `import { ${pick(ED.values).join(', ')} } from '@graphysdk/react-renderer/editable';`,
  `import type { ${pick(ED.types).join(', ')} } from '@graphysdk/react-renderer/editable';`,
  `// @ts-ignore unused preamble bindings`,
].join('\n');
const PREAMBLE_LINES = PREAMBLE.split('\n').length;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.md') && !readFileSync(p, 'utf8').startsWith('<!-- GENERATED FILE')) out.push(p);
  }
  return out;
}
function codeBlocks(text) {
  const lines = text.split('\n'); const blocks = []; let open = null;
  lines.forEach((line, i) => {
    const f = line.match(/^\s*```(\w+)?/); if (!f) return;
    if (open === null) {
      const lang = (f[1] ?? '').toLowerCase();
      open = { start: i, lang: ['ts','tsx','typescript'].includes(lang) ? lang : null };
    } else {
      if (open.lang) blocks.push({ offset: open.start + 1, code: lines.slice(open.start + 1, i).join('\n') });
      open = null;
    }
  });
  return blocks;
}

// Diagnostics that indicate a real API mismatch (not a fragment artefact).
const REPORT = new Set([
  2307, // cannot find module
  2305, // module has no exported member
  2724, // no exported member named X, did you mean Y
  2339, // property does not exist on type
  2353, // object literal may only specify known properties
  2551, // property does not exist, did you mean
  2554, // expected N arguments but got M
  2559, 2769, // no overload matches
  2322, // type not assignable (catches bad JSX props)
  2741, // missing required property
]);
// Never report: fragment artefacts. 2300/2440/2451 also cover blocks importing from @graphysdk/react,
// whose names the preamble already binds from the underlying packages.
const IGNORE = new Set([2304, 2552, 2451, 2440, 2300, 6133, 6196, 2686, 1155, 2693, 2749, 7027, 2578]);

const files = walk(SKILL).sort();

// ---------------------------------------------------------------------------
// Phase 1 — supported Graphy entry-point names and their named exports.
// ---------------------------------------------------------------------------
const DATA_IMPORT = ['', '/csv', '/tsv', '/json', '/xlsx', '/xls', '/ods', '/file', '/url', '/text', '/buffer'].map((sub) => `@graphysdk/data-import-utils${sub}`);
const VALID = new Set([...DATA_IMPORT, '@graphysdk/viz-engine', '@graphysdk/viz-engine/graph-config', '@graphysdk/react-renderer', '@graphysdk/react-renderer/graph-config', '@graphysdk/react-renderer/editable', '@graphysdk/react', '@graphysdk/react/editable']);
const NAMES = {
  '@graphysdk/viz-engine': new Set([...VE.values, ...VE.types]),
  '@graphysdk/react-renderer': new Set([...RR.values, ...RR.types]),
  '@graphysdk/react-renderer/editable': new Set([...ED.values, ...ED.types]),
  '@graphysdk/viz-engine/graph-config': new Set([...VEGC.values, ...VEGC.types]),
  '@graphysdk/react-renderer/graph-config': new Set([...RRGC.values, ...RRGC.types]),
  '@graphysdk/react': new Set([...GR.values, ...GR.types]),
  '@graphysdk/react/editable': new Set([...GRE.values, ...GRE.types]),
};
let importProblems = 0;
for (const file of files) {
  const found = [];
  for (const { offset, code } of codeBlocks(readFileSync(file, 'utf8'))) {
    const sf = ts.createSourceFile('s.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const spec = st.moduleSpecifier.text;
      if (!spec.startsWith('@graphysdk/')) continue;
      const line = offset + sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1;
      if (!VALID.has(spec)) { found.push([line, `unresolvable specifier '${spec}'`]); continue; }
      const b = st.importClause?.namedBindings;
      if (!b || !ts.isNamedImports(b) || !NAMES[spec]) continue; // data-import-utils: specifier check only
      for (const el of b.elements) {
        const n = (el.propertyName ?? el.name).text;
        if (!NAMES[spec].has(n)) found.push([line, `'${n}' is not exported by ${spec}`]);
      }
    }
  }
  if (found.length) {
    importProblems += found.length;
    console.log(`\n${relative(REPO, file)}`);
    for (const [ln, msg] of found.sort((a, b) => a[0] - b[0])) console.log(`  :${ln}  ${msg}`);
  }
}
console.log(`\nPhase 1 — imports: ${importProblems} problem(s).`);
console.log(`\nPhase 2 — types:`);

TMP = mkdtempSync(join(REPO, '.graphy-sample-typecheck-'));
try {
const units = [];
for (const file of files) {
  codeBlocks(readFileSync(file, 'utf8')).forEach((b, i) => {
    const name = join(TMP, `${relative(SKILL, file).replace(/[\/\.]/g, '_')}__${i}.tsx`);
    writeFileSync(name, `${PREAMBLE}\n${b.code}\n`);
    units.push({ name, file, offset: b.offset });
  });
}
const options = {
  jsx: ts.JsxEmit.ReactJSX, noEmit: true, skipLibCheck: true, strict: false,
  moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022, esModuleInterop: true, allowJs: true,
  baseUrl: REPO, typeRoots: [join(REPO, 'node_modules/@types'), join(TS_DIR, 'node_modules/@types')],
};
const program = ts.createProgram(units.map((u) => u.name), options);
const byFile = new Map();
const preambleErrors = new Set();
for (const d of ts.getPreEmitDiagnostics(program)) {
  if (!d.file) continue;
  const unit = units.find((u) => u.name === d.file.fileName);
  if (!unit) continue;
  if (IGNORE.has(d.code) || !REPORT.has(d.code)) continue;
  // Relative imports join separately saved recipe files; blocks are checked in isolation.
  // External package-resolution failures remain errors.
  if (d.code === 2307) {
    const message = ts.flattenDiagnosticMessageText(d.messageText, ' ');
    if (/Cannot find module ['"]\.{1,2}\//.test(message)) continue;
  }
  const { line } = d.file.getLineAndCharacterOfPosition(d.start);
  if (line < PREAMBLE_LINES) { preambleErrors.add(`TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText,' ').slice(0,160)}`); continue; }
  const mdLine = unit.offset + (line - PREAMBLE_LINES) + 1;
  const msg = ts.flattenDiagnosticMessageText(d.messageText, ' ').slice(0, 240);
  const key = relative(REPO, unit.file);
  if (!byFile.has(key)) byFile.set(key, []);
  byFile.get(key).push([mdLine, d.code, msg]);
}
let total = 0;
for (const [file, list] of [...byFile].sort()) {
  const uniq = [...new Map(list.map((x) => [`${x[0]}:${x[2]}`, x])).values()].sort((a, b) => a[0] - b[0]);
  total += uniq.length;
  console.log(`\n${file}`);
  for (const [ln, code, msg] of uniq) console.log(`  :${ln}  TS${code}  ${msg}`);
}
if (preambleErrors.size) {
  console.log(`\nHARNESS PREAMBLE ERRORS (results are unreliable until fixed):`);
  for (const e of preambleErrors) console.log(`  ${e}`);
}
console.log(`\n${units.length} sample blocks typechecked — ${total} API-shape error(s).`);
process.exitCode = importProblems + total + preambleErrors.size ? 1 : 0;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
