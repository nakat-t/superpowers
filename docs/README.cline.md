# Superpowers for Cline

Complete guide for using Superpowers with [Cline](https://cline.bot) — the
[Cline CLI](https://github.com/cline/cline/blob/main/apps/cli/README.md),
[Kanban](https://docs.cline.bot/usage/kanban), and any host built on the
[Cline SDK](https://docs.cline.bot/sdk/overview). All three share the same agent
core (ClineCore), so the same plugin works across every surface.

> Plugins currently apply to the Cline SDK, CLI, and Kanban. They are not yet
> supported on the VS Code or JetBrains extensions.

## Installation (CLI / Kanban)

Install Superpowers as a Cline plugin from this repository:

```bash
cline plugin install https://github.com/obra/superpowers.git
```

The installer clones the repo into Cline's plugin store, registers the bootstrap
injector declared in `package.json` (`cline.plugins`), and auto-discovers every
skill in the bundled `skills/` directory. Everything arrives through Cline's own
plugin manager — no symlinks, no edits to your global config.

Global installs (`~/.cline/plugins/`) are available in every session. To scope
Superpowers to a single project instead, run the command from the project root
with `--cwd .` (installs into `<project>/.cline/plugins/`):

```bash
cline plugin install https://github.com/obra/superpowers.git --cwd .
```

Pin a specific version with `@ref`:

```bash
cline plugin install https://github.com/obra/superpowers.git@v6.0.3
```

Verify by asking: "Tell me about your superpowers".

Cline uses its own plugin install. If you also use Claude Code, Codex, or another
harness, install Superpowers separately for each one.

## Installation (SDK)

When embedding Cline via `@cline/sdk`, load the plugin file with `pluginPaths`
(the bundled `skills/` directory is discovered relative to it):

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

## Usage

### Finding skills

Type `/` in chat to see each enabled skill as a slash command, or just describe
what you want — Cline matches your request against each skill's description and
activates the right one with the `use_skill` tool.

### Loading a skill explicitly

```
/brainstorming
```

or let Cline auto-trigger it from the bootstrap ("Let's build X" → brainstorming
first).

### Personal and project skills

Cline also reads skills from its own directories, which sit alongside the
Superpowers skills:

- **Global skills:** `~/.cline/data/skills/`
- **Project skills:** `.cline/skills/` in your project root

Each skill is a directory with a `SKILL.md` file (`name` + `description`
frontmatter) — the same format Superpowers uses.

## How it works

The plugin (`.cline/plugins/superpowers.ts`) does two things:

1. **Registers the skills directory.** The bundled `skills/` directory ships next
   to `package.json`, so Cline's plugin loader discovers all Superpowers skills
   automatically and exposes them to `use_skill` and `/<skill>` slash commands.
2. **Injects the bootstrap.** A `registerMessageBuilder` builder prepends the
   full `using-superpowers` SKILL.md (wrapped in `<EXTREMELY_IMPORTANT>`, with the
   Cline tool mapping appended) as the first user message of each session, so the
   model knows to check for a relevant skill before acting. A marker guards
   against double injection, and the bootstrap survives compaction (it is
   re-inserted after any compaction-summary messages).

The plugin imports `@cline/core` only as a TypeScript type, so it ships with zero
runtime dependencies — the host runtime provides `@cline/*`.

### Tool mapping

Skills speak in actions rather than naming any one runtime's tools. On Cline
(ClineCore built-ins) these resolve to:

- "Invoke a skill" → `use_skill` (or a `/<skill>` slash command)
- "Read a file" → `read_files`
- "Create a file" / "edit a file" → `editor` (or `apply_patch` for unified diffs)
- "Run a shell command" → `bash`
- "Search file contents" / "find files by name" → `search`
- "Fetch a URL" → `fetch_web`
- "Ask a structured question" → `ask_question`
- "Dispatch a read-only research/review subagent" (`Subagent (general-purpose):`
  template) → `use_subagents` (read-only agents; multiple entries run in parallel)
- "Dispatch a write-capable subagent" (edits files, runs tests, commits — e.g.
  `subagent-driven-development` implementers) → a teammate (`team_spawn_teammate`
  then `team_run_task`). Teammates have `editor`, mutating `run_commands`, and
  `skills`, and the bootstrap auto-injects so skills auto-trigger there too.
- "Create a todo" / "mark complete" → no todo tool; track work in a plan file or
  repo-local `TODO.md`

Older Cline docs use XML-style names (`read_file`, `replace_in_file`,
`execute_command`); these are aliases for the current built-ins above. Full table:
`skills/using-superpowers/references/cline-tools.md`.

## Updating

Reinstall with `--force` to pick up the newest commit:

```bash
cline plugin install https://github.com/obra/superpowers.git --force
```

## Troubleshooting

### Plugin not loading

1. Run `cline config` and check the plugin tab for `superpowers`.
2. Reinstall with `--force`.
3. Make sure you're running a recent version of the Cline CLI.

### Skills not found

1. Type `/` to see skill slash commands, or ask Cline to list its skills.
2. Confirm the plugin is loaded (see above).
3. Each skill needs a `SKILL.md` file with valid YAML frontmatter.

### Bootstrap not appearing

1. Confirm the plugin is loaded (`cline config`).
2. Reinstall with `--force` after pulling a newer Superpowers commit.

## Getting Help

- Report issues: https://github.com/obra/superpowers/issues
- Main documentation: https://github.com/obra/superpowers
- Cline docs: https://docs.cline.bot
