# Cline Tool Mapping

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file"). On Cline (CLI, SDK, and Kanban — anything built on ClineCore) these resolve to the tools below.

## Tools

| Action skills request | Cline tool |
|----------------------|------------|
| Read a file | `read_files` (batch-reads one or more files) |
| Create a new file | `editor` |
| Edit a file | `editor`, or `apply_patch` for unified diffs |
| Run a shell command | `bash` |
| Search file contents | `search` (ripgrep-powered) |
| Find files by name / list a directory | `search` (use it to locate files; combine with `bash` `ls` when you need a plain listing) |
| Fetch a URL | `fetch_web` |
| Search the web | no dedicated built-in; use `fetch_web` against a known URL, or an MCP/plugin web-search tool if one is installed |
| Pose a structured question to your human partner | `ask_question` |
| Invoke a skill | `use_skill` |
| Dispatch a subagent (`Subagent (general-purpose):` template) | `use_subagents` (see [Subagent support](#subagent-support)) |
| Multiple parallel dispatches | multiple entries in one `use_subagents` call |
| Task tracking ("create a todo", "mark complete") | no dedicated todo tool — track work in a plan file or a repo-local `TODO.md` (see [Task tracking](#task-tracking)) |

> Some older Cline docs and examples use XML-style names like `read_file`, `replace_in_file`, or `execute_command`. The current ClineCore runtime uses the built-in names above (`read_files`, `apply_patch`, `bash`, etc.). Treat the legacy names as aliases for these actions.

## Invoking a skill

Cline surfaces every enabled skill's `name` + `description` at the start of each session. When a description matches what you are about to do, activate the skill with the `use_skill` tool — this loads the full `SKILL.md` instructions. You can also trigger an enabled skill explicitly with a `/<skill-name>` slash command. **Never read a `SKILL.md` manually with `read_files` to follow it** — use `use_skill` so the skill is properly activated.

## Subagent support

Cline dispatches read-only research subagents with the `use_subagents` tool. Each subagent gets its own prompt and context window and runs in parallel. Subagents can read files (`read_files`), search (`search`/`search_files`), list directories, run read-only commands (`bash`), and load skills (`use_skill`). They **cannot** write files, apply patches, access MCP servers, or spawn nested subagents.

Because Cline subagents are read-only, map the Superpowers subagent templates as follows:

| Skill dispatch form | Cline equivalent |
|---------------------|------------------|
| A read-only reviewer template (`task-reviewer`, `code-reviewer`, `requesting-code-review`'s `./code-reviewer.md`) | Fill the template, then dispatch it with `use_subagents` |
| An investigation / exploration dispatch (`dispatching-parallel-agents`) | One `use_subagents` call with one entry per focused research question |
| An implementer-style `*-prompt.md` template that writes code and runs tests (`subagent-driven-development`) | Cline subagents are read-only and cannot write. Do the implementation work in this session, or have a subagent gather the context read-only and then implement inline. Do not invent a write-capable subagent. |

If the `use_subagents` tool is disabled in the current configuration, do the work inline in this session rather than inventing a dispatch tool.

### Prompt filling

Skills provide prompt templates with placeholders like `{WHAT_WAS_IMPLEMENTED}` or `[FULL TEXT of task]`. Fill every placeholder before passing the complete prompt to `use_subagents`. The template itself carries the agent's role, criteria, and expected output format.

## Task tracking

Cline has no dedicated todo/checklist tool. When a skill says to create a todo list or track tasks, maintain a markdown checklist in a plan file or a repo-local `TODO.md`: create it with `editor` at the start of a multi-step task, listing every step, and edit it (`editor`/`apply_patch`) to mark steps done (`- [x]`) as you go. Keep it current — it is your source of truth for what remains. Treat older `TodoWrite` references as this task-tracking action.

## Instructions file

When a skill mentions "your instructions file", on Cline this is a rules file. Cline reads project rules from `.clinerules/` (all `.md`/`.txt` files in that directory, at the project root) and `AGENTS.md`, plus global rules from the Cline Rules directory (`~/Documents/Cline/Rules` on macOS/Linux, `Documents\\Cline\\Rules` on Windows) and `~/.agents/AGENTS.md`. Workspace rules take precedence over global rules when they conflict.
