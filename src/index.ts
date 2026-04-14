import { cac } from "cac";
import pc from "picocolors";
import { intro, outro, cancel } from "@clack/prompts";
import { initCommand } from "./commands/init.ts";
import { createCommand } from "./commands/create.ts";
import { saveCommand } from "./commands/save.ts";
import { openCommand } from "./commands/open.ts";
import { helpCommand } from "./commands/help.ts";
import { validateCommand } from "./commands/validate.ts";
import { doctorCommand } from "./commands/doctor.ts";

const cli = cac("stacker");

// ── stacker [templateId] ──────────────────────────────────────────────────────
cli
	.command("[templateId]", "Scaffold a project from a Stacker template ID")
	.option("-d, --dir <dir>", "Target directory")
	.option("--api <url>", "Override the Stacker API base URL")
	.option("-y, --yes", "Skip confirmation prompt")
	.action(async (templateId: string | undefined, options: { dir?: string; api?: string; yes?: boolean }) => {
		intro(pc.bgCyan(pc.black(" Stacker — Build your stack. Instantly. ")));
		await initCommand(templateId, options.dir, options.api, Boolean(options.yes));
		outro(pc.green("Done."));
	});

// ── stacker create ────────────────────────────────────────────────────────────
cli
	.command("create", "Interactively configure a stack and save it as a template")
	.option("--api <url>", "Override the Stacker API base URL")
	.action(async (options: { api?: string }) => {
		intro(pc.bgCyan(pc.black(" Stacker — Create ")));
		await createCommand(options.api);
		outro(pc.green("Done."));
	});

// ── stacker validate [file] ───────────────────────────────────────────────────
cli
	.command("validate [file]", "Validate a stacker.json manifest")
	.option("-f, --file <path>", "Path to the manifest file (default: stacker.json in cwd)")
	.action(async (file: string | undefined, options: { file?: string }) => {
		await validateCommand({ file: options.file ?? file });
	});

// ── stacker doctor ────────────────────────────────────────────────────────────
cli
	.command("doctor", "Check system dependencies and environment")
	.action(async () => {
		await doctorCommand();
	});

// ── stacker save [file] ───────────────────────────────────────────────────────
cli
	.command("save [file]", "Push a local stacker.json to the server and get a shareable template ID")
	.option("--api <url>", "Override the Stacker API base URL")
	.action(async (file: string | undefined, options: { api?: string }) => {
		intro(pc.bgCyan(pc.black(" Stacker — Save ")));
		await saveCommand(file, options.api);
		outro(pc.green("Done."));
	});

// ── stacker open [page] ───────────────────────────────────────────────────────
cli
	.command("open [page]", "Open stacker.ranveersoni.me in your browser")
	.action(async (page: string | undefined) => {
		openCommand((page as "create" | "docs" | "home") ?? "home");
	});

// ── stacker help ─────────────────────────────────────────────────────────────
cli
	.command("help", "Show help")
	.action(() => helpCommand());

cli.help();
cli.version("0.1.0");

try {
	cli.parse(process.argv, { run: false });
	await cli.runMatchedCommand();
} catch (error) {
	cancel(pc.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
	process.exit(1);
}
