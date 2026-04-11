import { confirm, log, note, spinner, text } from '@clack/prompts';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import pc from 'picocolors';

type PackageManager = 'bun' | 'pnpm' | 'npm' | 'yarn';

/** Mirrors the web manifest; extra fields are ignored by the runner. */
type StackerManifest = {
  version: 1;
  project: {
    name: string;
    packageManager: PackageManager;
    git: boolean;
    install: boolean;
  };
  starter: {
    framework: string;
    runtime: string;
    id: string;
  };
  frontend: {
    uiSystem: string;
    shadcn: null | {
      base: 'radix' | 'base';
      style?: string;
      baseColor?: string;
      borderRadius?: string;
      iconLibrary?: string;
      font?: string;
      tweakcnTheme?: string;
      components: string[];
    };
    tanstackAddons: string[];
  };
  backend?: {
    database?: string;
    orm?: string;
    auth?: string;
    apiLayer?: string;
  };
  addons?: {
    integrations?: string[];
    deployment?: string;
    monitoring?: string;
    i18n?: string;
    devTooling?: string[];
    typings?: string;
    animations?: string;
    packages?: string[];
  };
};

type PlanStep = {
  title: string;
  command: string;
  cwd?: string;
};

const TANSTACK_ADDON_PACKAGES: Record<string, string> = {
  query: '@tanstack/react-query',
  router: '@tanstack/react-router',
  form: '@tanstack/react-form',
  table: '@tanstack/react-table',
  store: '@tanstack/react-store',
  db: '@tanstack/react-db',
  devtools: '@tanstack/react-query-devtools',
};

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

function resolveTanstackCreateAddOns(manifest: StackerManifest): string[] {
  const addons: string[] = [];

  // TanStack package toggles from the builder
  const tanstackMap: Record<string, string> = {
    query: 'tanstack-query',
    form: 'form',
    table: 'table',
    store: 'store',
    db: 'db',
  };
  for (const id of manifest.frontend.tanstackAddons) {
    const mapped = tanstackMap[id];
    if (mapped) addons.push(mapped);
  }

  // Backend selections
  if (manifest.backend?.database === 'Convex') addons.push('convex');
  if (manifest.backend?.database === 'Neon') addons.push('neon');
  if (manifest.backend?.orm === 'Prisma') addons.push('prisma');
  if (manifest.backend?.orm === 'Drizzle') addons.push('drizzle');
  if (manifest.backend?.auth === 'Clerk') addons.push('clerk');
  if (manifest.backend?.auth === 'WorkOS') addons.push('workos');
  if (manifest.backend?.auth === 'BetterAuth') addons.push('better-auth');
  if (manifest.backend?.apiLayer === 'MCP') addons.push('mcp');
  if (manifest.backend?.apiLayer === 'ORPC') addons.push('oRPC');
  if (manifest.backend?.apiLayer === 'tRPC') addons.push('tRPC');
  if (manifest.backend?.apiLayer === 'Apollo Client') addons.push('apollo-client');

  // Addons selections
  for (const integration of manifest.addons?.integrations ?? []) {
    const lower = integration.toLowerCase();
    if (lower === 'cloudflare') addons.push('cloudflare');
    if (lower === 'netlify') addons.push('netlify');
    if (lower === 'railway') addons.push('railway');
    if (lower === 'sentry') addons.push('sentry');
    if (lower === 'strapi') addons.push('strapi');
    if (lower === 'clerk') addons.push('clerk');
    if (lower === 'workos') addons.push('workos');
    if (lower === 'neon') addons.push('neon');
    if (lower === 'prisma') addons.push('prisma');
  }

  const deployment = manifest.addons?.deployment?.toLowerCase();
  if (deployment === 'cloudflare') addons.push('cloudflare');
  if (deployment === 'netlify') addons.push('netlify');
  if (deployment === 'railway') addons.push('railway');
  if (deployment === 'nitro') addons.push('nitro');

  const monitoring = manifest.addons?.monitoring?.toLowerCase();
  if (monitoring === 'sentry') addons.push('sentry');
  if (monitoring === 'posthog') addons.push('posthog');

  const i18n = manifest.addons?.i18n?.toLowerCase();
  if (i18n === 'paraglide') addons.push('paraglide');

  for (const tool of manifest.addons?.devTooling ?? []) {
    const lower = tool.toLowerCase();
    if (lower === 'storybook') addons.push('storybook');
    if (lower === 'biome') addons.push('biome');
    if (lower === 'eslint') addons.push('eslint');
    if (lower === 't3env') addons.push('t3env');
    if (lower === 'compiler') addons.push('compiler');
  }

  if (manifest.frontend.uiSystem === 'shadcn/ui') addons.push('shadcn');

  return unique(addons);
}

function discoverSupportedTanstackAddOns(packageManager: PackageManager): Set<string> | null {
  const runner = getPackageRunner(packageManager);
  const result = spawnSync(`${runner} @tanstack/cli@latest create --list-add-ons`, {
    shell: true,
    encoding: 'utf8',
  });

  if (result.status !== 0) return null;
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const ids = [...output.matchAll(/^\s*\*?\s*([A-Za-z0-9-]+):/gm)].map((m) => m[1]!);
  if (ids.length === 0) return null;
  return new Set(ids);
}

function getPackageRunner(packageManager: PackageManager) {
  switch (packageManager) {
    case 'bun':
      return 'bunx';
    case 'pnpm':
      return 'pnpm dlx';
    case 'yarn':
      return 'yarn dlx';
    default:
      return 'npx';
  }
}

function getInstallCommand(packageManager: PackageManager) {
  switch (packageManager) {
    case 'bun':
      return 'bun add';
    case 'pnpm':
      return 'pnpm add';
    case 'yarn':
      return 'yarn add';
    default:
      return 'npm install';
  }
}

function getShadcnTemplate(framework: string) {
  switch (framework) {
    case 'Next.js':
      return 'next';
    case 'Vite':
      return 'vite';
    case 'TanStack Start':
      return 'start';
    case 'React Router':
      return 'react-router';
    case 'Astro':
      return 'astro';
    case 'Laravel':
      return 'laravel';
    default:
      return 'next';
  }
}

function resolveShadcnCliStyle(style?: string): 'new-york' | 'default' {
  return style === 'default' ? 'default' : 'new-york';
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

function buildPlan(
  manifest: StackerManifest,
  targetDir: string,
  supportedTanstackAddOns?: Set<string> | null,
): PlanStep[] {
  const runner = getPackageRunner(manifest.project.packageManager);
  const plan: PlanStep[] = [];
  const installFlag = manifest.project.install ? '' : ' --skip-install';
  const gitFlag = manifest.project.git ? '' : ' --disable-git';
  const requestedTanstackAddOns = resolveTanstackCreateAddOns(manifest);
  const tanstackCreateAddOns =
    supportedTanstackAddOns && supportedTanstackAddOns.size > 0
      ? requestedTanstackAddOns.filter((id) => supportedTanstackAddOns.has(id))
      : requestedTanstackAddOns;

  switch (manifest.starter.framework) {
    case 'Next.js':
      plan.push({
        title: 'Scaffold Next.js (App Router, TypeScript, Tailwind, ESLint)',
        command: `${runner} create-next-app@latest ${targetDir} --ts --tailwind --app --eslint --yes${installFlag}${gitFlag}`,
      });
      break;
    case 'Vite':
      plan.push({
        title: `Scaffold Vite + ${manifest.starter.runtime}`,
        command: `${runner} create-vite@latest ${targetDir} --template ${manifest.starter.runtime === 'Solid' ? 'solid-ts' : 'react-ts'}${manifest.project.install ? '' : ' --no-install'}`,
      });
      break;
    case 'TanStack Start':
      plan.push({
        title: 'Scaffold TanStack Start',
        command: `${runner} @tanstack/cli@latest create ${targetDir} --framework ${manifest.starter.runtime.toLowerCase()} --package-manager ${manifest.project.packageManager}${tanstackCreateAddOns.length > 0 ? ` --add-ons ${tanstackCreateAddOns.join(',')}` : ''}${manifest.project.install ? '' : ' --no-install'}${manifest.project.git ? '' : ' --no-git'} --yes`,
      });
      break;
    case 'React Router':
      plan.push({
        title: 'Scaffold React Router (framework mode)',
        command: `${runner} create-react-router@latest ${targetDir}${manifest.project.install ? '' : ' --no-install'} --yes`,
      });
      break;
    case 'Astro':
      plan.push({
        title: 'Scaffold Astro',
        command: `${runner} create astro@latest ${targetDir} --yes`,
      });
      break;
    case 'Laravel':
      plan.push({
        title: 'Scaffold Laravel',
        command: `laravel new ${targetDir}`,
      });
      break;
  }

  if (manifest.frontend.uiSystem === 'shadcn/ui') {
    const cliStyle = resolveShadcnCliStyle(manifest.frontend.shadcn?.style);
    const shadcnFlags = [
      '--yes',
      '--defaults',
      `--style ${cliStyle}`,
      manifest.frontend.shadcn?.base ? `--base ${manifest.frontend.shadcn.base}` : '',
      manifest.frontend.shadcn?.baseColor
        ? `--base-color ${manifest.frontend.shadcn.baseColor}`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    plan.push({
      title: 'Initialize shadcn/ui',
      command: `${runner} shadcn@latest init ${shadcnFlags}`,
      cwd: targetDir,
    });

    if (manifest.frontend.shadcn?.tweakcnTheme) {
      plan.push({
        title: `Apply tweakcn theme (${manifest.frontend.shadcn.tweakcnTheme})`,
        command: `${runner} tweakcn@latest add ${manifest.frontend.shadcn.tweakcnTheme}`,
        cwd: targetDir,
      });
    }

    const components = manifest.frontend.shadcn?.components ?? [];
    if (components.length > 0) {
      plan.push({
        title: `Add ${components.length} shadcn component(s)`,
        command: `${runner} shadcn@latest add ${components.join(' ')}`,
        cwd: targetDir,
      });
    }
  }

  const packages = manifest.addons?.packages ?? [];
  const tanstackPackages = manifest.frontend.tanstackAddons
    .map((id) => TANSTACK_ADDON_PACKAGES[id])
    .filter((v): v is string => Boolean(v));
  const allPackages = [...new Set([...tanstackPackages, ...packages])];
  if (allPackages.length > 0) {
    plan.push({
      title: `Install npm packages (${allPackages.length})`,
      command: `${getInstallCommand(manifest.project.packageManager)} ${allPackages.join(' ')}`,
      cwd: targetDir,
    });
  }

  return plan;
}

function wrapWords(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= width) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w.length > width ? w.slice(0, width) : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatOverview(
  manifest: StackerManifest,
  targetDir: string,
  stepCount: number,
  supportedTanstackAddOns?: Set<string> | null,
): string {
  const rows: string[] = [];
  const add = (label: string, value: string) => {
    rows.push(`${pc.dim(label.padEnd(14))} ${value}`);
  };

  add('Folder', pc.cyan(targetDir));
  add('Starter', `${manifest.starter.framework} · ${manifest.starter.runtime}`);
  add('Package mgr', manifest.project.packageManager);
  add('Git', manifest.project.git ? 'yes' : 'no');
  add('Install deps', manifest.project.install ? 'yes' : 'no');
  add('UI', manifest.frontend.uiSystem || 'None');

  const shadcn = manifest.frontend.shadcn;
  if (shadcn?.components?.length) {
    rows.push('');
    rows.push(pc.bold('shadcn/ui'));
    rows.push(pc.dim(`  Base: ${shadcn.base}`));
    if (shadcn.style) {
      rows.push(pc.dim(`  Style: ${shadcn.style}`));
      rows.push(pc.dim(`  CLI style applied: ${resolveShadcnCliStyle(shadcn.style)}`));
    }
    if (shadcn.baseColor) rows.push(pc.dim(`  Base color: ${shadcn.baseColor}`));
    if (shadcn.borderRadius) rows.push(pc.dim(`  Radius: ${shadcn.borderRadius}`));
    rows.push(pc.dim(`  Components (${shadcn.components.length}):`));
    const joined = shadcn.components.join(', ');
    for (const line of wrapWords(joined, 64)) {
      rows.push(`  ${pc.cyan(line)}`);
    }
  }

  if (manifest.frontend.tanstackAddons.length > 0) {
    rows.push('');
    rows.push(pc.bold('TanStack add-ons'));
    rows.push(`  ${pc.cyan(manifest.frontend.tanstackAddons.join(', '))}`);
    if (manifest.starter.framework === 'TanStack Start') {
      const requested = resolveTanstackCreateAddOns(manifest);
      const resolved =
        supportedTanstackAddOns && supportedTanstackAddOns.size > 0
          ? requested.filter((id) => supportedTanstackAddOns.has(id))
          : requested;
      rows.push(pc.dim(`  CLI add-ons: ${resolved.join(', ') || 'none'}`));
    }
  }

  const pkgs = manifest.addons?.packages ?? [];
  const tanstackPackages =
    manifest.starter.framework === 'TanStack Start'
      ? []
      : manifest.frontend.tanstackAddons
          .map((id) => TANSTACK_ADDON_PACKAGES[id])
          .filter((v): v is string => Boolean(v));
  const installPkgs = [...new Set([...tanstackPackages, ...pkgs])];
  if (installPkgs.length > 0) {
    rows.push('');
    rows.push(pc.bold('Extra packages'));
    rows.push(`  ${pc.cyan(installPkgs.join(', '))}`);
  }

  const b = manifest.backend;
  if (b && (b.database || b.orm || b.auth || b.apiLayer)) {
    rows.push('');
    rows.push(pc.bold('Backend (from your config)'));
    if (b.database) add('  Database', b.database);
    if (b.orm) add('  ORM', b.orm);
    if (b.auth) add('  Auth', b.auth);
    if (b.apiLayer) add('  API', b.apiLayer);
  }

  rows.push('');
  rows.push(pc.bold('Execution'));
  rows.push(`  ${pc.cyan(`${stepCount}`)} setup task(s) queued`);
  rows.push(pc.dim('  Detailed command output appears while tasks run.'));

  return rows.join('\n');
}

async function runStep(step: PlanStep) {
  const started = Date.now();
  await new Promise<void>((resolve, reject) => {
    const child = spawn(step.command, {
      stdio: 'inherit',
      shell: true,
      cwd: step.cwd,
    });

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });
    child.on('error', reject);
  });
  return Date.now() - started;
}

function normalizeApiBase(apiBase?: string): string {
  const base = (apiBase || process.env.STACKER_API_BASE || 'https://stacker.ranveersoni.me').trim();
  return base.replace(/\/+$/, '');
}

async function fetchManifest(templateId: string, apiBase?: string): Promise<StackerManifest> {
  const base = normalizeApiBase(apiBase);
  const response = await fetch(`${base}/api/templates/${templateId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch template ${templateId}`);
  }
  return (await response.json()) as StackerManifest;
}

export async function initCommand(
  initialTemplateId?: string,
  dir?: string,
  apiBase?: string,
  autoYes = false,
) {
  const nonInteractive = autoYes || !process.stdout.isTTY;
  let templateId = initialTemplateId;

  if (!templateId) {
    const response = await text({
      message: 'Template ID from the Stacker site',
      placeholder: 'e.g. xCjNK1',
      validate(value) {
        if (!value || value.length === 0) return 'Template ID is required.';
      },
    });

    if (typeof response === 'symbol') process.exit(0);
    templateId = response as string;
  }

  const s = nonInteractive ? null : spinner();
  if (s) s.start(`Loading template ${pc.cyan(templateId)}…`);
  else log.message(`Loading template ${templateId}...`);
  let manifest: StackerManifest;

  try {
    manifest = await fetchManifest(templateId, apiBase);
    if (s) s.stop('Template loaded.');
    else log.success('Template loaded.');
  } catch {
    const base = normalizeApiBase(apiBase);
    if (s) {
      s.stop(
        pc.red(`Could not load ${templateId}.`) +
          ` Generate one at ${pc.cyan(`${base}/create`)}`,
      );
    } else {
      log.error(`Could not load ${templateId}. Generate one at ${base}/create`);
    }
    process.exit(1);
  }

  let supportedTanstackAddOns: Set<string> | null | undefined = undefined;
  if (manifest.starter.framework === 'TanStack Start') {
    supportedTanstackAddOns = discoverSupportedTanstackAddOns(manifest.project.packageManager);
    if (!supportedTanstackAddOns || supportedTanstackAddOns.size === 0) {
      log.warn('Could not detect supported TanStack add-ons. Using requested add-ons as-is.');
    }
  }

  const targetDir = (dir?.trim() || manifest.project.name || 'my-stacker-app').trim();
  const steps = buildPlan(manifest, targetDir, supportedTanstackAddOns);

  if (!nonInteractive) {
    note(formatOverview(manifest, targetDir, steps.length, supportedTanstackAddOns), {
      title: pc.inverse(' Your scaffold '),
    });
  } else {
    log.message(formatOverview(manifest, targetDir, steps.length, supportedTanstackAddOns));
  }

  if (!autoYes && !nonInteractive) {
    const shouldRun = await confirm({
      message: 'Run these steps now? (This will execute the commands above.)',
      initialValue: true,
    });

    if (!shouldRun || typeof shouldRun === 'symbol') {
      log.warn('Cancelled — nothing was changed.');
      process.exit(0);
    }
  } else {
    log.message(pc.dim('Auto-confirmed with --yes'));
  }

  const startedAll = Date.now();
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const label = `[${i + 1}/${steps.length}] Running setup task...`;
    log.message(pc.bold(label));
    const run = nonInteractive ? null : spinner();
    if (run) run.start(pc.dim('Running…'));
    try {
      const elapsed = await runStep(step);
      if (run) run.stop(pc.green(`Done (${formatMs(elapsed)})`));
      else log.success(`Done (${formatMs(elapsed)})`);
    } catch (e) {
      if (run) run.stop(pc.red('Failed'));
      log.error(e instanceof Error ? e.message : 'Step failed');
      process.exit(1);
    }
  }

  await mkdir(targetDir, { recursive: true });
  await writeFile(
    path.join(targetDir, 'stacker.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );
  const elapsedAll = Date.now() - startedAll;
  log.success(`Saved ${pc.cyan('stacker.json')} in ${pc.cyan(targetDir)} (${formatMs(elapsedAll)})`);

  console.log('');
  log.message(`${pc.bold('Next:')}\n  ${pc.cyan(`cd ${targetDir}`)}\n  ${pc.cyan(`${manifest.project.packageManager} run dev`)}\n`);
}
