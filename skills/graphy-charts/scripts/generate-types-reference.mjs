// Generates reference/types.md from the published dist/index.d.ts of the two
// viz packages: the exact public shape of the chart-authoring surface, with
// JSDoc, so a codegen agent never has to grep the bundles.
//
// How it works:
// - GROUPS lists curated ROOT symbols per section. Only roots are maintained by
//   hand; a renamed/removed root fails generation loudly.
// - Every type a root's declaration references is pulled in automatically
//   (transitive closure) and emitted in a per-package "Supporting types"
//   appendix — the doc never contains a dangling type name.
// - EXPAND_STOP names types that are deliberately NOT expanded (internal or
//   output-side graphs); they appear in the doc as opaque references.
// - dts-bundler renames (`Plugin` -> `Plugin_2`) are resolved through the
//   d.ts export aliases and mapped back everywhere they appear.
//
// Usage:  node scripts/generate-types-reference.mjs [--check]
//         (reads dist/index.d.ts from the packages installed in this repo's node_modules)
//         --check: exit 1 if reference/types.md is out of date instead of writing.

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(scriptDir, "../reference/types.md");
const checkMode = process.argv.includes("--check");

// The published packages don't export package.json, so resolve the entry point
// and take the sibling index.d.ts in dist/ (and package.json one level up).
function findPackage(pkg) {
  const entry = createRequire(import.meta.url).resolve(`@graphysdk/${pkg}`);
  const dts = resolve(dirname(entry), "index.d.ts");
  const { version } = JSON.parse(
    readFileSync(resolve(dirname(entry), "../package.json"), "utf8"),
  );
  return { dts, version };
}

const PACKAGES = {
  "viz-engine": findPackage("viz-engine"),
  "react-renderer": findPackage("react-renderer"),
};

// Each group becomes a `##` section; `symbols` are the curated roots. Order is
// preserved. Types the roots reference are appended automatically.
const GROUPS = [
  {
    title: "Core & data",
    pkg: "viz-engine",
    symbols: [
      "Data",
      "DataValue",
      "DataType",
      "VariableName",
      "Locale",
      "SpecInput",
      "ColorScheme",
      "ColorSchemeName",
    ],
  },
  {
    // The builder consts carry the full option types inline — this is the
    // exact signature surface of the authoring API.
    title: "Spec builders",
    pkg: "viz-engine",
    symbols: [
      "pipe",
      "createSpec",
      "mapping",
      "geom",
      "scale",
      "coord",
      "stat",
      "transform",
      "highlight",
      "annotation",
      "config",
    ],
  },
  {
    title: "Mapping & layers",
    pkg: "viz-engine",
    symbols: [
      "AesMapping",
      "AestheticKey",
      "LayerInput",
      "CustomGeomLayerInput",
    ],
  },
  {
    title: "Transforms & stats",
    pkg: "viz-engine",
    symbols: [
      "TransformInput",
      "CustomTransformInput",
      "StatName",
      "SmoothMethod",
      "CustomStatInput",
    ],
  },
  {
    title: "Config",
    pkg: "viz-engine",
    symbols: ["ConfigSpec"],
  },
  {
    // The stylesheet is where nearly all chart paint lives since the style
    // cascade landed; `styles`/`style`/`token` carry the option types inline.
    title: "Styling API",
    pkg: "viz-engine",
    symbols: [
      "styles",
      "style",
      "token",
      "Stylesheet",
      "StylesheetInput",
      "StyleRule",
      "StyleDeclarations",
      "StyleProperty",
      "StyleSelect",
      "ChromeStyleSelect",
      "StyleEntryOptions",
      "StyleState",
      "StyleTokenRef",
      "StyleTokenTable",
      "LightDarkColor",
      "BUILTIN_STYLES",
    ],
  },
  {
    title: "Highlights",
    pkg: "viz-engine",
    symbols: ["HighlightInput"],
  },
  {
    title: "Annotations",
    pkg: "viz-engine",
    symbols: ["AnnotationsInput"],
  },
  {
    title: "Scales & palettes",
    pkg: "viz-engine",
    symbols: [
      "PaletteOverridesInput",
      "CustomPalettesInput",
      "MONO_BASES",
      "NEON_BASES",
      "DEFAULT_COLOR_PALETTE",
      "ColorRamp",
      "SequentialSchemeName",
      "DivergingSchemeName",
      "sampleColorScheme",
    ],
  },
  {
    title: "Diagnostics",
    pkg: "viz-engine",
    symbols: ["VizDiagnostic", "UserInputIssue"],
  },
  {
    title: "Provider & renderer",
    pkg: "react-renderer",
    symbols: ["GraphProviderProps", "GraphRendererProps", "GraphSizing"],
  },
  {
    title: "Theme tokens",
    pkg: "react-renderer",
    symbols: [
      "ThemeOverrides",
      "ThemeValues",
      "MeasuredFontTokenKey",
      "FontTokenOverride",
    ],
  },
  {
    title: "Animation",
    pkg: "react-renderer",
    symbols: ["GraphAnimation", "GraphAnimationProps"],
  },
  {
    title: "Slots",
    pkg: "react-renderer",
    symbols: [
      "GraphSlots",
      "HeaderSlotProps",
      "FooterSlotProps",
      "TooltipSlotProps",
      "GridSlotProps",
      "LegendSlotProps",
      "HeadlineSlotProps",
      "AxisTicksSlotProps",
      "AxisLabelSlotProps",
      "SwatchSlotProps",
      "EditorSurfaceSlotProps",
    ],
  },
  {
    title: "Plugins — engine side",
    pkg: "viz-engine",
    symbols: [
      "Plugin",
      "RenderOnlyPlugin",
      "Geom",
      "StatDefinition",
      "TransformDefinition",
    ],
  },
  {
    title: "Plugins — renderer side",
    pkg: "react-renderer",
    symbols: [
      "defineGeomRenderer",
      "GeomRendererDefinition",
      "createGraphyKit",
      "GraphyKit",
    ],
  },
];

const SKIPPED = new Set(["GraphConfig"]);

function removeSkipped(text) {
  if (![...SKIPPED].some((name) => text.includes(name))) return text;
  for (const name of SKIPPED) {
    text = text
      .replace(new RegExp(`\\s*\\|\\s*${name}\\b`, "g"), "")
      .replace(new RegExp(`\\b${name}\\s*\\|\\s*`, "g"), "");
  }
  // Remaining mentions sit in JSDoc: drop the sentences that contain them.
  return text
    .replace(/\/\*\*[\s\S]*?\*\/\n?/g, (comment) => {
      if (![...SKIPPED].some((name) => comment.includes(name))) return comment;
      const flattened = comment
        .trim()
        .slice(3, -2)
        .split("\n")
        .map((line) => line.replace(/^\s*\*\s?/, ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const kept = flattened
        .split(/(?<=\.)\s+/)
        .filter(
          (sentence) => ![...SKIPPED].some((name) => sentence.includes(name)),
        );
      return kept.length > 0 ? `/** ${kept.join(" ")} */\n` : "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "");
}

// References that are deliberately not expanded: compiled/output-side and
// engine-internal graphs. They render as opaque names; the skill's prose docs
// cover what an author needs of them.
const EXPAND_STOP = new Set([
  // Output side of the compile pipeline — consumed by renderers, not authored.
  "CompiledSpec",
  "CompiledLayer",
  "CompiledGeom",
  "CompiledStat",
  "CompiledScales",
  "CompiledGuides",
  "CompiledPanel",
  "CompiledAxisGuide",
  "CompiledLegendGuide",
  "CompiledLayerHighlight",
  "CompiledAnnotations",
  "CompileResult",
  "Compiler",
  "LastCompileSnapshot",
  "RendererContext",
  // Resolved spec: an input the resolver produces, not authored directly.
  "Spec",
  // Engine internals reachable from plugin/authoring types.
  "Dataset",
  "Observation",
  "Command",
  "GeomCompilerInput",
  "StatCompilerInput",
  "GeomSummaries",
  "TransformStrategy",
  "LayoutCompileResult",
  "TextMeasurer",
  "HeadlineMeasurer",
  // Diagnostics plumbing reachable from the plugin compile contract.
  "DiagnosticsCollector",
  "DrainedDiagnostics",
  // Type-level machinery behind createGraphyBuilder/Plugin generics — pure
  // inference helpers, useless to read.
  "GraphyBuilder",
  "CreateGraphyBuilderOptions",
  "DefinitionOf",
  "DefsOf",
  "GeomDefsOf",
  "StatDefsOf",
  "TransformDefsOf",
  "CustomGeomBuilders",
  "CustomStatBuilders",
  "CustomTransformBuilders",
  "AesFromDef",
  "AesFromRole",
  "AesFromRoles",
  "AesKeysOf",
  "DeclaredAesKeys",
  "IsWidenedTuple",
  "LayerInputOf",
  "LayerSpecOf",
  "CompiledLayerOf",
  "CompiledLayerFor",
]);

// Type names never looked up (TS/DOM/React lib space).
const AMBIENT_NAMES = new Set([
  "Array",
  "ReadonlyArray",
  "Record",
  "Partial",
  "Required",
  "Readonly",
  "Pick",
  "Omit",
  "Exclude",
  "Extract",
  "NonNullable",
  "Parameters",
  "ReturnType",
  "Map",
  "Set",
  "Promise",
  "Date",
  "Error",
  "RegExp",
  "String",
  "Number",
  "Boolean",
  "Object",
  "Function",
  "Symbol",
  "Iterable",
  "IterableIterator",
  "ArrayLike",
  "React",
  "ReactNode",
  "ReactElement",
  "ComponentType",
  "CSSProperties",
  "JSX",
  "HTMLElement",
  "SVGElement",
  "MouseEvent",
  "PointerEvent",
  "KeyboardEvent",
  "Element",
  "Node",
  "globalThis",
  "ThisType",
  "PropsWithChildren",
  "ReadonlySet",
  "ReadonlyMap",
  "HTMLDivElement",
  "HTMLCanvasElement",
  "SVGSVGElement",
]);

/**
 * Parse one package's d.ts into:
 * - declarations: canonical name -> { text, refs } (overloads merged, bundler
 *   rename suffixes mapped back to the exported names everywhere)
 * - importedFrom: local name -> package specifier (for cross-package references)
 */
function parsePackage(filePath) {
  const text = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
  );

  const statementsByName = new Map(); // local name -> statement[]
  const exportedToLocal = new Map(); // `export { X_2 as X }` -> X: X_2
  const importedFrom = new Map(); // local name -> module specifier

  const record = (name, statement) => {
    if (!name) return;
    const list = statementsByName.get(name) ?? [];
    list.push(statement);
    statementsByName.set(name, list);
  };

  for (const statement of sourceFile.statements) {
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      record(statement.name.text, statement);
    } else if (
      ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement)
    ) {
      record(statement.name?.text, statement);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name))
          record(declaration.name.text, statement);
      }
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const specifier of statement.exportClause.elements) {
        if (specifier.propertyName)
          exportedToLocal.set(specifier.name.text, specifier.propertyName.text);
      }
    } else if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings
    ) {
      const bindings = statement.importClause.namedBindings;
      const module = statement.moduleSpecifier.text;
      if (ts.isNamedImports(bindings)) {
        for (const specifier of bindings.elements)
          importedFrom.set(specifier.name.text, module);
      }
    }
  }

  // local -> exported rename map, applied to every emitted block and reference.
  const localToExported = new Map(
    [...exportedToLocal].map(([exported, local]) => [local, exported]),
  );
  const canonical = (name) => localToExported.get(name) ?? name;
  const renameAll = (blockText) => {
    let result = blockText;
    for (const [local, exported] of localToExported) {
      result = result.replaceAll(new RegExp(`\\b${local}\\b`, "g"), exported);
    }
    return result;
  };

  // Collect the type names a statement references (type refs, heritage,
  // typeof), excluding the generic parameters the statement itself declares.
  const collectRefs = (statement) => {
    const refs = new Set();
    const typeParameters = new Set();
    const visit = (node) => {
      if (ts.isTypeParameterDeclaration(node)) {
        typeParameters.add(node.name.text);
      } else if (ts.isTypeReferenceNode(node)) {
        const root = ts.isQualifiedName(node.typeName)
          ? leftmost(node.typeName)
          : node.typeName.text;
        refs.add(root);
      } else if (
        ts.isExpressionWithTypeArguments(node) &&
        ts.isIdentifier(node.expression)
      ) {
        refs.add(node.expression.text);
      } else if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName)) {
        refs.add(node.exprName.text);
      }
      node.forEachChild(visit);
    };
    visit(statement);
    for (const parameter of typeParameters) refs.delete(parameter);
    return refs;
  };
  const leftmost = (qualifiedName) =>
    ts.isQualifiedName(qualifiedName.left)
      ? leftmost(qualifiedName.left)
      : qualifiedName.left.text;

  const declarations = new Map();
  for (const [localName, statements] of statementsByName) {
    const blocks = [];
    const refs = new Set();
    for (const statement of statements) {
      const fullText = statement.getFullText(sourceFile);
      const declText = statement.getText(sourceFile);
      // Leading trivia (JSDoc) sits between fullText start and the declaration;
      // keep it, then drop the `export declare` / `declare` modifier prefix.
      const jsDoc = fullText
        .slice(0, fullText.length - declText.length)
        .replace(/^\s+/, "")
        .trimEnd();
      const declaration = declText.replace(/^(export )?declare /, "");
      blocks.push(jsDoc ? `${jsDoc}\n${declaration}` : declaration);
      for (const ref of collectRefs(statement)) {
        if (ref !== localName) refs.add(canonical(ref));
      }
    }
    const entry = { text: removeSkipped(renameAll(blocks.join("\n"))), refs };
    declarations.set(canonical(localName), entry);
    if (!declarations.has(localName)) declarations.set(localName, entry);
  }

  return { declarations, importedFrom };
}

const packages = Object.fromEntries(
  Object.entries(PACKAGES).map(([pkg, { dts }]) => [pkg, parsePackage(dts)]),
);
const siblingOf = {
  "viz-engine": "react-renderer",
  "react-renderer": "viz-engine",
};

/** Resolve a name to its declaring package, following cross-package imports. */
function resolveSymbol(pkg, name) {
  if (packages[pkg].declarations.has(name))
    return { pkg, entry: packages[pkg].declarations.get(name) };
  const importedModule = packages[pkg].importedFrom.get(name);
  const sibling = siblingOf[pkg];
  if (
    importedModule?.includes(sibling) &&
    packages[sibling].declarations.has(name)
  ) {
    return { pkg: sibling, entry: packages[sibling].declarations.get(name) };
  }
  return null;
}

// Validate roots: unique across groups, all resolvable.
const rootNames = new Set();
const missing = [];
const duplicates = [];
for (const group of GROUPS) {
  for (const name of group.symbols) {
    if (rootNames.has(name)) duplicates.push(name);
    rootNames.add(name);
    if (!resolveSymbol(group.pkg, name))
      missing.push(`${name} (@graphysdk/${group.pkg})`);
  }
}
if (duplicates.length > 0 || missing.length > 0) {
  for (const name of duplicates)
    console.error(`ERROR: root symbol listed twice: ${name}`);
  if (missing.length > 0) {
    console.error(
      "ERROR: root symbols not found in dist (renamed or removed?):",
    );
    for (const name of missing) console.error(`  - ${name}`);
  }
  process.exit(1);
}

// Transitive closure: BFS from the roots; referenced types not already emitted
// as roots land in the per-package supporting sets.
const emitted = new Set(
  [...rootNames].map((name) => `${resolveForClosure(name)}`),
);
function resolveForClosure(name) {
  for (const group of GROUPS) {
    if (group.symbols.includes(name))
      return `${resolveSymbol(group.pkg, name).pkg}:${name}`;
  }
  return name;
}

const supporting = { "viz-engine": new Map(), "react-renderer": new Map() };
const unresolved = new Set();
const stopped = new Set();

const queue = GROUPS.flatMap((group) =>
  group.symbols.map((name) => ({
    pkg: resolveSymbol(group.pkg, name).pkg,
    name,
  })),
);
const seen = new Set(queue.map(({ pkg, name }) => `${pkg}:${name}`));

while (queue.length > 0) {
  const { pkg, name } = queue.shift();
  const resolved = resolveSymbol(pkg, name);
  if (!resolved) continue;
  for (const ref of resolved.entry.refs) {
    if (AMBIENT_NAMES.has(ref) || SKIPPED.has(ref)) continue;
    if (EXPAND_STOP.has(ref)) {
      stopped.add(ref);
      continue;
    }
    const refResolved = resolveSymbol(resolved.pkg, ref);
    if (!refResolved) {
      unresolved.add(ref);
      continue;
    }
    const key = `${refResolved.pkg}:${ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!rootNames.has(ref))
      supporting[refResolved.pkg].set(ref, refResolved.entry);
    queue.push({ pkg: refResolved.pkg, name: ref });
  }
}

// Render.
const sections = [];
for (const group of GROUPS) {
  const blocks = group.symbols.map(
    (name) => resolveSymbol(group.pkg, name).entry.text,
  );
  sections.push(
    `## ${group.title}\n\n\`\`\`ts\n${blocks.join("\n\n")}\n\`\`\``,
  );
}
for (const [pkg, entries] of Object.entries(supporting)) {
  if (entries.size === 0) continue;
  const blocks = [...entries.keys()]
    .sort()
    .map((name) => entries.get(name).text);
  sections.push(
    `## Supporting types — @graphysdk/${pkg}\n\nTypes referenced by the sections above, included so no name dangles.\n\n\`\`\`ts\n${blocks.join("\n\n")}\n\`\`\``,
  );
}

const stoppedNote =
  stopped.size > 0
    ? ` The only opaque names are compiled/internal shapes an author never constructs: ${[...stopped].sort().join(", ")}.`
    : "";

const versions = Object.entries(PACKAGES)
  .map(([pkg, { version }]) => `\`@graphysdk/${pkg}@${version}\``)
  .join(" and ");

const header = `<!-- GENERATED FILE — do not edit. -->

# Type reference

Generated from ${versions}.

> The exact public chart-authoring API, extracted verbatim (with JSDoc) from the
> built \`.d.ts\` of \`@graphysdk/viz-engine\` and \`@graphysdk/react-renderer\`.
> Check precise signatures, option keys, and accepted values here; see
> \`spec-api.md\` for how the pieces compose. Every type these declarations
> reference is defined in this file, most under "Supporting types" at the
> end.${stoppedNote}
`;

const output = `${header}\n${sections.join("\n\n")}\n`;
const supportingCount = Object.values(supporting).reduce(
  (total, entries) => total + entries.size,
  0,
);
const summary = `${GROUPS.length} groups, ${rootNames.size} roots, ${supportingCount} supporting types, ${stopped.size} stopped, ${unresolved.size} unresolved external names`;

if (checkMode) {
  let current = null;
  try {
    current = readFileSync(outPath, "utf8");
  } catch {
    // Missing file counts as stale.
  }
  if (current !== output) {
    console.error(
      `STALE: ${outPath} does not match the built packages — regenerate it. (${summary})`,
    );
    process.exit(1);
  }
  console.log(`Fresh: ${outPath} (${summary})`);
} else {
  writeFileSync(outPath, output);
  console.log(`Wrote ${outPath} — ${summary}`);
  if (unresolved.size > 0)
    console.log(
      `Unresolved (lib/external, left opaque): ${[...unresolved].sort().join(", ")}`,
    );
}
