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
skills/<skill-name>/           # canonical skills — what both channels ship
plugin-skills/                 # symlinks that expose skills to the Claude Code plugin
.claude-plugin/marketplace.json # plugin marketplace manifest
package.json                   # deps for the skills' helper scripts (pnpm)
```

## License

MIT
