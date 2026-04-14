import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";

import type { PlanStep } from "./types.ts";

export function formatMs(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	const s = ms / 1000;
	if (s < 60) return `${s.toFixed(1)}s`;
	const m = Math.floor(s / 60);
	const rem = Math.round(s % 60);
	return `${m}m ${rem}s`;
}

export function runStep(step: PlanStep): Promise<number> {
	// File write step
	if (step.writeFile) {
		return (async () => {
			const start = Date.now();

			const filePath = step.cwd
				? path.join(step.cwd, step.writeFile.path)
				: step.writeFile.path;

			await fs.mkdir(path.dirname(filePath), { recursive: true });
			await fs.writeFile(filePath, step.writeFile.content, "utf8");

			return Date.now() - start;
		})();
	}

	//  Command step
	return new Promise((resolve, reject) => {
		const start = Date.now();

		const logs: string[] = [];

		const child = spawn(step.command!, {
			shell: true,
			cwd: step.cwd,
			stdio: ["ignore", "pipe", "pipe"], // silent but capture logs
		});

		child.stdout?.on("data", (chunk: Buffer) => {
			logs.push(chunk.toString());
		});

		child.stderr?.on("data", (chunk: Buffer) => {
			logs.push(chunk.toString());
		});

		child.on("close", (code) => {
			if (code === 0) {
				resolve(Date.now() - start);
			} else {
				//  only show logs if it fails
				const output = logs.join("");
				const lines = output.split("\n").filter(Boolean);
				const tail = lines.slice(-10);

				console.log("\n❌ Command failed:\n");
				for (const line of tail) {
					console.log(line);
				}

				const errorLine =
					tail.find((l) => /error|failed|unknown/i.test(l)) ??
					tail.at(-1) ??
					"Unknown error";

				reject(new Error(errorLine.trim()));
			}
		});

		child.on("error", (err) => {
			reject(new Error(`Failed to start process: ${err.message}`));
		});
	});
}