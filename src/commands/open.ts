import { log } from "@clack/prompts";
import { spawn } from "node:child_process";
import pc from "picocolors";
import { DEFAULT_API_BASE } from "../lib/constants.ts";

const SITE_URL = DEFAULT_API_BASE;

function openBrowser(url: string) {
	const platform = process.platform;
	const cmd =
		platform === "win32" ? "start" :
		platform === "darwin" ? "open" :
		"xdg-open";

	spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
}

export function openCommand(page: "create" | "docs" | "home" = "home") {
	const urls: Record<string, string> = {
		home: SITE_URL,
		create: `${SITE_URL}/create`,
		docs: `${SITE_URL}/docs`,
	};

	const url = urls[page] ?? SITE_URL;
	openBrowser(url);
	log.success(`Opened ${pc.cyan(url)}`);
}
