# AGENTS.md

Guidance for AI coding agents working in this repo.

## What this repo is

A collection of agent skills for integrating [Graphy](https://graphy.dev). Distributed through two channels — both back the same canonical `SKILL.md` files:

- **Vercel Labs `skills` CLI** — `npx skills add graphysdk/skills`. Cross-agent (Claude Code, Cursor, OpenCode, Cline, etc.). Installs each skill into the customer's `.<agent>/skills/` directory.
- **Claude Code plugin marketplace** — `/plugin marketplace add graphysdk/skills` then `/plugin install <plugin>@sdk`. Claude-Code-specific. Skills are namespaced under their plugin (e.g. `/graphy:sdk`).

You are writing for an agent on a different machine, with a different codebase. Don't reference this repo or the Graphy monorepo from inside a skill — refer only to public npm packages.

## Layout

```
skills/<skill-name>/SKILL.md   # canonical — what the Vercel `skills` CLI installs
plugin-skills/                 # symlinks for the Claude Code /plugin marketplace
README.md, AGENTS.md, LICENSE  # repo metadata, does not ship
```

`<skill-name>` under `skills/` is kebab-case and matches the `name` field in the SKILL's YAML frontmatter.

**Don't put real skill files under `plugin-skills/`.** It's plumbing for the `/plugin` channel: each entry symlinks to a canonical skill under `skills/`, with the symlink directory named to control how the plugin namespaces it (e.g. `plugin-skills/sdk → ../skills/graphy` makes the skill invokable as `/graphy:sdk` while staying `/graphy` via the Vercel CLI). When you add a new skill, update both: write the file under `skills/`, then add a symlink under `plugin-skills/` if you want it exposed via `/plugin` too.

## Authoring rules

- **Frontmatter `description` describes when to activate**, not what the skill does. Include trigger phrases.
- **Use "graph", not "chart"** — Graphy-wide convention.
- **Code blocks must be copy-pasteable and self-contained.**
- **Keep `SKILL.md` under ~500 lines.** Move long reference material into sibling files.

## Verify API claims before merging

Skills make factual claims that drift as the SDK evolves. Cross-check every prop, type, and value against the source of truth in [`graphysdk/monorepo`](https://github.com/graphysdk/monorepo):

- `packages/viz-engine/src/index.ts` — viz-engine public API
- `packages/react-canvas-renderer/src/index.ts` — renderer public API
- `packages/viz-engine/src/types/graph-config.ts` — `GraphConfig` type
- `packages/react-canvas-renderer/src/graph-renderer.tsx` — `GraphRenderer` props
- `packages/viz-engine/src/compiler/spec/converter/graph-type.converter.ts` — supported `GraphType` values (the `CONVERTERS` map)

If you can't access the monorepo, flag the uncertainty in the PR rather than guessing.
