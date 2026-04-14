import { log, spinner } from "@clack/prompts";
import path from "node:path";
import pc from "picocolors";
import { saveManifest } from "../lib/api.ts";
import type { StackerManifest } from "../lib/types.ts";

/**
 * Push an existing stacker.json to the server and return a shareable template ID.
 * Defaults to ./stacker.json in cwd.
 */
export async function saveCommand(filePath?: string, apiBase?: string) {
	const resolved = path.resolve(filePath ?? "stacker.json");

	// Read file — definite assignment via early exit on error
	let raw: string;
	try {
		raw = await Bun.file(resolved).text();
	} catch {
		log.error(`Cannot read ${pc.cyan(resolved)}`);
		log.info(
			`Run ${pc.cyan("stacker create")} first, or pass a path: ${pc.cyan("stacker save ./path/to/stacker.json")}`,
		);
		process.exit(1);
	}

	// Parse manifest — definite assignment via early exit on error
	let manifest: StackerManifest;
	try {
		manifest = JSON.parse(raw) as StackerManifest;
		if (manifest.version !== 1) throw new Error("Unexpected manifest version");
	} catch {
		log.error(`${pc.cyan(resolved)} is not a valid stacker.json`);
		process.exit(1);
	}

	// Save to API
	const s = spinner();
	s.start(`Saving ${pc.cyan(path.basename(resolved))}…`);

	let id: string;
	try {
		id = await saveManifest(manifest, apiBase);
		s.stop(pc.green("Saved!"));
	} catch (err) {
		s.stop(pc.red("Failed."));
		log.error(err instanceof Error ? err.message : String(err));
		process.exit(1);
	}

	// Write ID back into the local file so it's stored
	const updated: StackerManifest & { _templateId: string } = {
		...manifest,
		_templateId: id,
	};
	await Bun.write(resolved, JSON.stringify(updated, null, 2));

	log.success(
		[
			`Template ID: ${pc.bold(pc.cyan(id))}`,
			``,
			`${pc.bold("Scaffold anywhere:")}`,
			`  ${pc.cyan(`bunx @stacker/cli ${id}`)}`,
			``,
			`${pc.bold("Browser:")}`,
			`  ${pc.cyan(`https://stacker.ranveersoni.me/create?t=${id}`)}`,
		].join("\n"),
	);
}