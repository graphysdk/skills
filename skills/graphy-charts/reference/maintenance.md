# Skill maintenance

Contents

- Check examples
- Refresh exact types
Use these helpers when updating this skill. Run them with Node 22.15+ from a project that has the relevant dependencies installed; the skill folder needs no `node_modules` of its own.

## Check examples

```bash
node /path/to/graphy-charts/scripts/check-samples.mjs /path/to/graphy-charts /path/to/project
```

The project must resolve `typescript`, `react`, `@graphysdk/react`, `@graphysdk/react-renderer`, and `@graphysdk/viz-engine`. Examples for file imports and advanced plugins also require their imported packages (such as `@graphysdk/data-import-utils`, D3, and Rough.js). A third positional argument can name a separate project that resolves TypeScript.

The checker validates Graphy import names and selected API-shape diagnostics in handwritten TypeScript fences. It skips generated type declarations, adds builder bindings for fragments, and ignores missing fragment variables and relative imports between separately saved recipe files. It is not a full application typecheck or a rendering test; check assembled components in their target project too. Temporary files are created under the dependency project and removed after the check.

## Refresh exact types

From a project that resolves TypeScript and the built SDK packages:

```bash
node /path/to/graphy-charts/scripts/generate-types-reference.mjs
node /path/to/graphy-charts/scripts/generate-types-reference.mjs --check
```

For a monorepo checkout, build the current branch's `viz-engine` and `react-renderer` packages first, then pass their parent directory:

```bash
node /path/to/graphy-charts/scripts/generate-types-reference.mjs --packages /path/to/monorepo/packages
```

The generator reads built declarations, not source files. It regenerates `reference/types.md`; `--check` exits nonzero if that snapshot differs. Keep behavioural guidance in the handwritten references and link to the generated file for signatures.
