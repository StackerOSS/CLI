import type { PackageManager } from "./types.ts";
import { PM_RUNNERS, PM_INSTALL } from "./constants.ts";

export function getPackageRunner(pm: PackageManager): string {
	return PM_RUNNERS[pm];
}

export function getInstallCommand(pm: PackageManager): string {
	return PM_INSTALL[pm];
}

export function getShadcnTemplate(framework: string): string {
	const map: Record<string, string> = {
		"Next.js": "next",
		"Vite": "vite",
		"TanStack Start": "start",
		"React Router": "react-router",
		"Astro": "astro",
		"Laravel": "laravel",
	};
	return map[framework] ?? "next";
}

export function resolveShadcnCliStyle(style?: string): "new-york" | "default" {
	return style === "default" ? "default" : "new-york";
}
