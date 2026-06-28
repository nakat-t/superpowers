/**
 * Superpowers plugin for Cline (CLI, SDK, and Kanban — anything built on ClineCore).
 *
 * Two responsibilities, mirroring the OpenCode and pi integrations:
 *
 *   1. Skill discovery — the bundled `skills/` directory ships next to this
 *      package's `package.json`, so Cline's plugin loader discovers every
 *      Superpowers skill automatically. No code is needed here for that.
 *
 *   2. Bootstrap injection — at the start of each session we inject the full
 *      `using-superpowers` SKILL.md (wrapped in <EXTREMELY_IMPORTANT>, with the
 *      Cline tool mapping appended) as the first user message, so the model
 *      learns that skills exist and must be checked before acting. Without this
 *      the skills are inert: present on disk, never invoked.
 *
 * The injection uses `registerMessageBuilder`, which rewrites the
 * provider-bound message list before each model call — the same shape OpenCode
 * uses with `experimental.chat.messages.transform`. A guard prevents double
 * injection, and the bootstrap text is read from disk once and cached.
 *
 * Single-file plugins may only import Node built-ins and `@cline/*`, which keeps
 * Superpowers a zero-dependency install.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentPlugin, Message } from "@cline/core";

const BOOTSTRAP_MARKER = "superpowers:using-superpowers bootstrap for cline";

const pluginDir = dirname(fileURLToPath(import.meta.url));
// package root is two levels up: <root>/.cline/plugins/superpowers.ts
const packageRoot = resolve(pluginDir, "../..");
const skillsDir = resolve(packageRoot, "skills");
const bootstrapSkillPath = resolve(skillsDir, "using-superpowers", "SKILL.md");

// undefined = not yet loaded, null = file missing/unreadable, string = cached.
let cachedBootstrap: string | null | undefined;

function stripFrontmatter(content: string): string {
	const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
	return (match ? match[1] : content).trim();
}

function clineToolMapping(): string {
	return `## Cline tool mapping

Skills speak in actions ("read a file", "run a shell command", "dispatch a subagent"). On Cline these resolve to ClineCore's built-in tools:

- Invoke a skill → the \`use_skill\` tool (or a \`/<skill-name>\` slash command). Never read a SKILL.md with \`read_files\` just to follow it — activate it with \`use_skill\`.
- Read a file → \`read_files\`
- Create or edit a file → \`editor\` (or \`apply_patch\` for unified diffs)
- Run a shell command → \`bash\`
- Search file contents / find files → \`search\`
- Fetch a URL → \`fetch_web\`
- Ask your human partner a structured question → \`ask_question\`
- Dispatch a read-only research/review subagent (\`Subagent (general-purpose):\` template) → \`use_subagents\` (read-only agents; multiple entries run in parallel; cannot write files).
- Dispatch a write-capable subagent that edits files, runs tests, and commits (e.g. \`subagent-driven-development\` implementers) → a teammate: \`team_spawn_teammate\` then \`team_run_task\`. Teammates have \`editor\`, mutating \`run_commands\`, and \`skills\`; the bootstrap auto-injects so skills auto-trigger there too. Use \`runMode: sync\` + fresh context per task for the sequential implementer; \`runMode: async\` + \`team_await_runs\` for parallel write work.
- Task tracking ("create a todo", "mark complete") → Cline has no todo tool; track work in a plan file or repo-local \`TODO.md\`.

Legacy Cline tool names (\`read_file\`, \`replace_in_file\`, \`execute_command\`) are aliases for the current built-ins above. Full reference: skills/using-superpowers/references/cline-tools.md.`;
}

function getBootstrapContent(): string | null {
	if (cachedBootstrap !== undefined) return cachedBootstrap;

	try {
		const skillContent = readFileSync(bootstrapSkillPath, "utf8");
		const body = stripFrontmatter(skillContent);
		cachedBootstrap = `<EXTREMELY_IMPORTANT>
${BOOTSTRAP_MARKER}

You have superpowers.

The using-superpowers skill content is included below and is ALREADY LOADED for this Cline session. Follow it now. Do NOT use the use_skill tool to load "using-superpowers" again — that would be redundant. For all OTHER skills, activate them with the use_skill tool.

${body}

${clineToolMapping()}
</EXTREMELY_IMPORTANT>`;
		return cachedBootstrap;
	} catch {
		cachedBootstrap = null;
		return null;
	}
}

function messageText(message: Message): string {
	const content = (message as { content?: unknown }).content;
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.map((part) =>
			part && typeof part === "object" && (part as { type?: unknown }).type === "text"
				? String((part as { text?: unknown }).text ?? "")
				: "",
		)
		.join("\n");
}

function messagesContainBootstrap(messages: Message[]): boolean {
	return messages.some((message) => messageText(message).includes(BOOTSTRAP_MARKER));
}

// Insert the bootstrap immediately before the first real user message, after any
// leading compaction-summary messages so it survives compaction the same way it
// does in the pi integration.
function firstInjectionIndex(messages: Message[]): number {
	let index = 0;
	while (
		index < messages.length &&
		(messages[index] as { role?: unknown }).role === "compactionSummary"
	) {
		index += 1;
	}
	return index;
}

export const plugin: AgentPlugin = {
	name: "superpowers",
	manifest: {
		capabilities: ["messageBuilders"],
	},

	setup(api) {
		api.registerMessageBuilder({
			name: "superpowers-bootstrap",
			build(messages: Message[]): Message[] {
				if (!messages.length) return messages;
				if (messagesContainBootstrap(messages)) return messages;

				const bootstrap = getBootstrapContent();
				if (!bootstrap) return messages;

				const bootstrapMessage: Message = {
					role: "user",
					content: bootstrap,
				};

				const insertAt = firstInjectionIndex(messages);
				return [
					...messages.slice(0, insertAt),
					bootstrapMessage,
					...messages.slice(insertAt),
				];
			},
		});
	},
};

export default plugin;
