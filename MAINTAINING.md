# Maintaining the skills

`skills/graphy-charts` and `skills/graphy-editor` are published copies. Edit them in the Graphy monorepo (`skills/` at the repo root). Sample checks, type-reference generation, and evals run there. This repo's skill folders and SDK catalog pins are written by the monorepo release when an npm publish succeeds.

`apps/graph-codegen` stays here. It loads `skills/graphy-charts` from this checkout and installs the SDK version pinned in `pnpm-workspace.yaml`.
