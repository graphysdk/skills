# @graphysdk/skills

Agent skills for building with [Graphy](https://graphy.dev). Install them into Claude Code, Cursor, OpenCode, Cline, Codex, or any other coding agent that supports the [Agent Skills format](https://agentskills.io), and your assistant knows how to set up the Graphy SDK and author graphs with it correctly the first time.

## Skills

| Skill | What it does |
|---|---|
| [`graphy-sdk-install`](./skills/graphy-sdk-install/SKILL.md) | Install the Graphy SDK (`@graphysdk/viz-engine` + `@graphysdk/react-renderer`) and render a first graph. Covers private-registry auth, installing the alpha versions, prerequisites (React 19, bundler CSS support), and troubleshooting. |
| [`graphy-charts`](./skills/graphy-charts/SKILL.md) | Author graphs with the Graphy viz stack: grammar-of-graphics spec building (geoms, scales, transforms, coords), theming, plugins, storytelling (highlights, annotations). Includes recipes for common graph types and themes, a full type reference, and a headless spec validator. |

## Install

Two channels, same source — pick whichever fits your tooling.

### Claude Code plugin marketplace

In Claude Code:

```
/plugin marketplace add graphysdk/skills
/plugin install graphy@graphysdk
/reload-plugins
```

Then prompt as you normally would (*"set up Graphy in this project"*, *"build a stacked bar graph of revenue by region"*) — Claude routes to the right skill. Explicit triggers: `/graphy:install`, `/graphy:charts`.

### Vercel Labs `skills` CLI (cross-agent)

In your terminal:

```bash
npx skills add graphysdk/skills
```

Supports 50+ agents (Cursor, OpenCode, Cline, Codex, Claude Code, etc.) — make sure your target agent is checked in the picker. Skills install into your project's `.<agent>/skills/` directory; pass `--global` for `~/<agent>/skills/`. Restart your agent session, then prompt as usual. Explicit triggers: `/graphy-sdk-install`, `/graphy-charts`.

## Repo layout

```
skills/<skill-name>/            # canonical skills — what both channels ship
plugin-skills/                  # symlinks that expose skills to the Claude Code plugin
.claude-plugin/marketplace.json # plugin marketplace manifest
apps/graph-codegen/             # dev bench: agent + live preview for testing graphy-charts
pnpm-workspace.yaml             # workspace + catalog pinning the SDK versions used repo-wide
package.json                    # deps for the skills' helper scripts
```

## Development

This repo is a pnpm workspace. The Graphy SDK versions everything builds against are defined once, in the `catalog:` block of `pnpm-workspace.yaml` — to move to a new SDK release, bump them there, run `pnpm install`, and regenerate the type reference.

```bash
pnpm install

# graphy-charts helper scripts (run from the repo root)
node skills/graphy-charts/scripts/validate-spec.mjs path/to/spec.mjs   # compile a spec, print diagnostics
node skills/graphy-charts/scripts/generate-types-reference.mjs        # regenerate reference/types.md (--check for CI)
```

### Try graph-codegen: describe a graph, watch an agent build it

`apps/graph-codegen` is the fastest way to see what these skills can do. It's a small chat bench where a Claude agent, given nothing but the `graphy-charts` skill, writes real `@graphysdk` chart code from your prompt and renders it in a live preview next to the conversation. Some things to try:

- **Upload a CSV** and ask it to visualize the data — it picks the chart type and the built-in theme that fit best.
- **Upload a screenshot of any chart** you've seen elsewhere and ask it to recreate it with Graphy.
- **Upload your data plus brand assets** (e.g. a screenshot of your product) and ask for a chart in your brand's theme.

```bash
pnpm install
pnpm --filter graph-codegen dev
cd apps/graph-codegen
pnpm dev
```

Then open http://localhost:5190 and start prompting.

You'll need Node 22+ and pnpm. For Claude access, set `ANTHROPIC_API_KEY` in your environment or in `apps/graph-codegen/.env`; if you're logged into the Claude Code CLI, no key is needed — the bench uses its credentials.

## License

MIT
