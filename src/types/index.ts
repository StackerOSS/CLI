export type {
	PackageManager,
	Framework,
	Runtime,
	UiSystem,
	ShadcnBase,
	ShadcnStyle,
	ShadcnBorderRadius,
	NextJsLinter,
	NextJsBundler,
	NextJsOptions,
	TanStackToolchain,
	TanStackDeployment,
	TanStackCliOptions,
	Database,
	Orm,
	Auth,
	ApiLayer,
	Typings,
	Animations,
	StackerManifest,
} from "./schemas.ts";

export type PlanStep = {
	title: string;
	cwd?: string;
} & (
	| { command: string; writeFile?: never }
	| { writeFile: { path: string; content: string }; command?: never }
);