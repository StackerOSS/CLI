import type { StackerManifest } from "../types";
import { DEFAULT_API_BASE } from "./constants.ts";

export function normalizeApiBase(apiBase?: string): string {
	const base = (
		apiBase ??
		process.env.STACKER_API_BASE ??
		DEFAULT_API_BASE
	).trim();
	return base.replace(/\/+$/, "");
}

export async function fetchManifest(
	templateId: string,
	apiBase?: string,
): Promise<StackerManifest> {
	const base = normalizeApiBase(apiBase);
	const response = await fetch(`${base}/api/templates/${templateId}`);
	if (!response.ok) {
		const status = response.status;
		if (status === 404) {
			throw new Error(
				`Template "${templateId}" not found.\n  Generate one at ${base}/create`,
			);
		}
		throw new Error(`Failed to fetch template "${templateId}" (HTTP ${status})`);
	}
	return (await response.json()) as StackerManifest;
}

export async function saveManifest(
	manifest: StackerManifest,
	apiBase?: string,
): Promise<string> {
	const base = normalizeApiBase(apiBase);
	const response = await fetch(`${base}/api/templates/`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(manifest),
	});
	if (!response.ok) {
		throw new Error(`Failed to save template (HTTP ${response.status})`);
	}
	const data = (await response.json()) as { id?: string };
	if (!data.id) throw new Error("Server returned no template ID");
	return data.id;
}
