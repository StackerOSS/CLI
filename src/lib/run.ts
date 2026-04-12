import { spawn } from "node:child_process";
import type { PlanStep } from "./types.ts";

export function formatMs(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	const s = ms / 1000;
	if (s < 60) return `${s.toFixed(1)}s`;
	const m = Math.floor(s / 60);
	const rem = Math.round(s % 60);
	return `${m}m ${rem}s`;
}

export async function runStep(step: PlanStep): Promise<number> {
	const started = Date.now();
	await new Promise<void>((resolve, reject) => {
		const child = spawn(step.command, {
			stdio: "inherit",
			shell: true,
			cwd: step.cwd,
		});
		child.on("exit", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`Command exited with code ${code}`));
		});
		child.on("error", reject);
	});
	return Date.now() - started;
}
