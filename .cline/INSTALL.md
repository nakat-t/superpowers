# Installing Superpowers for Cline

## Prerequisites

- [Cline CLI](https://github.com/cline/cline/blob/main/apps/cli/README.md) installed (`npm install -g cline`), or any host built on the [Cline SDK](https://docs.cline.bot/sdk/overview) / Kanban.

## Installation (CLI / Kanban)

Install Superpowers as a Cline plugin from this repository:

```bash
cline plugin install https://github.com/obra/superpowers.git
```

This clones the repo into Cline's plugin store, registers the bootstrap injector
declared in `package.json` (`cline.plugins`), and auto-discovers every skill in
the bundled `skills/` directory. The plugin installs through Cline's own plugin
manager — no symlinks, no edits to your global config.

By default this installs globally (`~/.cline/plugins/`), available in every
session. To scope it to one project instead, run the command from the project
root with `--cwd .` (installs into `<project>/.cline/plugins/`):

```bash
cline plugin install https://github.com/obra/superpowers.git --cwd .
```

Pin a specific version with `@ref`:

```bash
cline plugin install https://github.com/obra/superpowers.git@v6.0.3
```

Verify by starting a session and asking: "Tell me about your superpowers". Cline
should report that it has skills available.

Cline uses its own plugin install. If you also use Claude Code, Codex, or another
harness, install Superpowers separately for each one.

## Installation (SDK)

When embedding Cline via `@cline/sdk`, point the session at the plugin file with
`pluginPaths` (the bundled `skills/` directory is discovered relative to it):

```ts
import { ClineCore } from "@cline/sdk";

const cline = await ClineCore.create({ clientName: "my-app" });

await cline.start({
  prompt: "Let's make a react todo list",
  config: {
    providerId: "anthropic",
    modelId: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
    pluginPaths: ["/absolute/path/to/superpowers/.cline/plugins/superpowers.ts"],
  },
});
```

The plugin's bootstrap injector runs as a registered message builder, so the
`using-superpowers` skill is injected at the start of every session the same way
it is in the CLI.

## How it works

The plugin does two things:

1. **Registers the skills directory.** The bundled `skills/` directory ships next
   to `package.json`, so Cline's plugin loader discovers all Superpowers skills
   automatically and exposes them to the `use_skill` tool and `/<skill>` slash
   commands.
2. **Injects the bootstrap.** A `registerMessageBuilder` builder prepends the
   full `using-superpowers` SKILL.md (wrapped in `<EXTREMELY_IMPORTANT>`, with the
   Cline tool mapping appended) as the first user message of each session, so the
   model knows to check for a relevant skill before acting.

## Usage

Use Cline's native skill mechanism:

- Let skills auto-trigger: Cline matches your request against each skill's
  description and activates the right one with `use_skill`.
- Or force one explicitly: type `/` in chat and pick the skill (e.g.
  `/brainstorming`).

## Tool mapping

Skills speak in actions ("create a todo", "dispatch a subagent", "read a file").
On Cline these resolve to ClineCore's built-in tools — see
`skills/using-superpowers/references/cline-tools.md` for the full table. Summary:

- "Invoke a skill" → `use_skill` (or `/<skill>` slash command)
- "Read a file" → `read_files`
- "Create / edit a file" → `editor` (or `apply_patch` for diffs)
- "Run a shell command" → `bash`
- "Search file contents / find files" → `search`
- "Fetch a URL" → `fetch_web`
- "Ask a structured question" → `ask_question`
- "Dispatch a read-only research/review subagent" → `use_subagents` (read-only agents)
- "Dispatch a write-capable subagent" (edits files, runs tests, commits) → a teammate (`team_spawn_teammate` + `team_run_task`)
- "Create a todo" → no todo tool; track work in a plan file or `TODO.md`

## Updating

Reinstall with `--force` to pick up the newest commit:

```bash
cline plugin install https://github.com/obra/superpowers.git --force
```

## Troubleshooting

### Plugin not loading

1. Run `cline config` and check the plugin tab for `superpowers`.
2. Reinstall with `--force`.
3. Make sure you are running a recent version of the Cline CLI.

### Skills not found

1. Ask Cline to list its skills, or type `/` to see skill slash commands.
2. Confirm the plugin is loaded (see above).

## Getting Help

- Report issues: https://github.com/obra/superpowers/issues
- Full documentation: https://github.com/obra/superpowers/blob/main/docs/README.cline.md
