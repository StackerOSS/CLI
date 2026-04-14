import { log } from "@clack/prompts";
import { execSync } from "node:child_process";
import pc from "picocolors";

interface CheckResult {
	name: string;
	version?: string;
	ok: boolean;
	hint?: string;
}

function checkCommand(cmd: string, args: string[] = []): { version?: string; ok: boolean } {
	try {
		const output = execSync(`${cmd} ${args.join(" ")}`, {
			encoding: "utf-8",
			timeout: 10000,
			stdio: ["pipe", "pipe", "pipe"],
		});
		const version = output.trim().split("\n")[0] ?? "";
		return { version: version.replace(/^v/i, ""), ok: true };
	} catch {
		return { ok: false };
	}
}

function checkNode(): CheckResult {
	const result = checkCommand("node", ["--version"]);
	if (result.ok) {
		const major = parseInt(result.version?.split(".")[0] ?? "0", 10);
		const ok = major >= 18;
		return {
			name: "Node.js",
			version: result.version,
			ok,
			hint: ok ? undefined : "Node.js 18+ is required",
		};
	}
	return {
		name: "Node.js",
		ok: false,
		hint: "Node.js is not installed. Install from https://nodejs.org",
	};
}

function checkNpm(): CheckResult {
	const result = checkCommand("npm", ["--version"]);
	if (result.ok) {
		return {
			name: "npm",
			version: result.version,
			ok: true,
		};
	}
	return {
		name: "npm",
		ok: false,
		hint: "npm is not installed. It's bundled with Node.js.",
	};
}

function checkBun(): CheckResult {
	const result = checkCommand("bun", ["--version"]);
	if (result.ok) {
		return {
			name: "Bun",
			version: result.version,
			ok: true,
		};
	}
	return {
		name: "Bun",
		ok: false,
		hint: "Bun not installed. Install from https://bun.sh for faster installs",
	};
}

function checkPnpm(): CheckResult {
	const result = checkCommand("pnpm", ["--version"]);
	if (result.ok) {
		return {
			name: "pnpm",
			version: result.version,
			ok: true,
		};
	}
	return {
		name: "pnpm",
		ok: false,
		hint: "pnpm not installed. Install with: npm i -g pnpm",
	};
}

function checkYarn(): CheckResult {
	const result = checkCommand("yarn", ["--version"]);
	if (result.ok) {
		return {
			name: "Yarn",
			version: result.version,
			ok: true,
		};
	}
	return {
		name: "Yarn",
		ok: false,
		hint: "Yarn not installed. Install with: npm i -g yarn",
	};
}

function checkGit(): CheckResult {
	const result = checkCommand("git", ["--version"]);
	if (result.ok) {
		return {
			name: "Git",
			version: result.version?.replace("git version ", ""),
			ok: true,
		};
	}
	return {
		name: "Git",
		ok: false,
		hint: "Git is not installed. Install from https://git-scm.com",
	};
}

function checkPhp(): CheckResult {
	const result = checkCommand("php", ["--version"]);
	if (result.ok) {
		return {
			name: "PHP",
			version: result.version?.split(" ")[0],
			ok: true,
		};
	}
	return {
		name: "PHP",
		ok: false,
		hint: "PHP not installed (optional, only needed for Laravel projects)",
	};
}

function checkComposer(): CheckResult {
	const result = checkCommand("composer", ["--version"]);
	if (result.ok) {
		return {
			name: "Composer",
			version: result.version?.replace("Composer version ", "").split(" ")[0],
			ok: true,
		};
	}
	return {
		name: "Composer",
		ok: false,
		hint: "Composer not installed (optional, only needed for Laravel projects)",
	};
}

function printResult(result: CheckResult) {
	const icon = result.ok ? pc.green("✓") : pc.red("✗");
	const version = result.version ? pc.dim(` v${result.version}`) : "";
	const name = result.ok ? result.name : pc.red(result.name);

	log.message(`  ${icon} ${name}${version}`);

	if (!result.ok && result.hint) {
		log.message(pc.dim(`    ${result.hint}`));
	}
}

export async function doctorCommand() {
	log.message(pc.bold("\n🔍 Checking system dependencies...\n"));

	const checks: CheckResult[] = [
		checkNode(),
		checkNpm(),
		checkBun(),
		checkPnpm(),
		checkYarn(),
		checkGit(),
		checkPhp(),
		checkComposer(),
	];

	for (const check of checks) {
		printResult(check);
	}

	const allOk = checks.every((c) => c.ok);

	log.message("");

	if (allOk) {
		log.success(pc.green("✓ All checks passed!"));
	} else {
		log.warn(pc.yellow("⚠ Some dependencies are missing or outdated."));
		log.message(pc.dim("\nNote: Only Bun, npm, and Git are required. Others are optional."));

		const requiredOk = checks
			.filter((c) => ["Node.js", "npm", "Git", "Bun"].includes(c.name))
			.every((c) => c.ok);

		if (requiredOk) {
			log.success(pc.green("\n✓ Core dependencies are available. You're good to go!"));
		} else {
			log.error(pc.red("\n✗ Missing required dependencies. Please install them first."));
			process.exit(1);
		}
	}
}
