import pc from "picocolors";
import { DEFAULT_API_BASE } from "../lib/constants.ts";

const CMD = "stacker";
const SITE = DEFAULT_API_BASE;

function line(cmd: string, desc: string) {
	return `  ${pc.cyan(cmd.padEnd(36))} ${pc.dim(desc)}`;
}

function section(title: string, lines: string[]) {
	return [pc.bold(title), ...lines].join("\n");
}

export function helpCommand() {
	const output = [
		"",
		`  ${pc.bgCyan(pc.black(" Stacker — Build your stack. Instantly. "))}`,
		"",
		section("USAGE", [
			`  ${pc.cyan(CMD)} ${pc.dim("[command] [options]")}`,
		]),
		"",
		section("COMMANDS", [
			line(`${CMD} <templateId>`, "Scaffold a project from a Stacker template ID"),
			line(`${CMD} create`, "Interactive wizard — configure and save a new stack"),
			line(`${CMD} save [file]`, "Push a local stacker.json to the server, get a shareable ID"),
			line(`${CMD} open [page]`, "Open the Stacker site in your browser (home | create | docs)"),
			line(`${CMD} help`, "Show this help message"),
		]),
		"",
		section("OPTIONS (stacker <templateId>)", [
			line(`-d, --dir <dir>`, "Target directory to scaffold into"),
			line(`--api <url>`, "Override the Stacker API base URL"),
			line(`-y, --yes`, "Skip the confirmation prompt"),
		]),
		"",
		section("EXAMPLES", [
			`  ${pc.dim("# Scaffold from the web builder")}`,
			`  ${pc.cyan(`${CMD} xCjNK1`)}`,
			"",
			`  ${pc.dim("# Configure interactively in the terminal")}`,
			`  ${pc.cyan(`${CMD} create`)}`,
			"",
			`  ${pc.dim("# Push an existing stacker.json and get a shareable ID")}`,
			`  ${pc.cyan(`${CMD} save ./stacker.json`)}`,
			"",
			`  ${pc.dim("# Scaffold into a specific folder, skip confirmation")}`,
			`  ${pc.cyan(`${CMD} xCjNK1 --dir my-app --yes`)}`,
			"",
			`  ${pc.dim("# Open the builder in your browser")}`,
			`  ${pc.cyan(`${CMD} open create`)}`,
		]),
		"",
		section("ENV VARS", [
			line("STACKER_API_BASE", `Override the API URL (default: ${SITE})`),
		]),
		"",
		`  ${pc.dim(`Docs & web builder → ${pc.underline(SITE + "/create")}`)}`,
		"",
	].join("\n");

	console.log(output);
}
