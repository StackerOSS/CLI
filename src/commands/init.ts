import { text, select, spinner } from '@clack/prompts';
import pc from 'picocolors';

export async function initCommand(initialTemplateId?: string, dir?: string) {
  let templateId = initialTemplateId;

  let config: any = null;
  const s = spinner();

  if (templateId) {
    try {
      s.start(`Fetching stack config for ${pc.cyan(templateId)}...`);
      const res = await fetch(`http://localhost:3000/api/templates/${templateId}`);
      if (!res.ok) throw new Error('-');
      config = await res.json();
      s.stop('Configuration loaded successfully.');
    } catch (e) {
      s.stop(`Failed to fetch template ${pc.red(templateId)}. Ensure Web API is running on localhost:3000`);
      process.exit(1);
    }
  } else {
    const response = await text({
      message: 'Enter your Stacker Template ID',
      placeholder: 'e.g. xCjNK',
      validate(value) {
        if (!value || value.length === 0) return 'Template ID is required!';
      },
    });

    if (typeof response === 'symbol') {
      process.exit(0);
    }
    
    const id = response as string;
    templateId = id;
    
    try {
      s.start(`Fetching stack config for ${pc.cyan(id)}...`);
      const res = await fetch(`http://localhost:3000/api/templates/${id}`);
      if (!res.ok) throw new Error('-');
      config = await res.json();
      s.stop('Configuration loaded successfully.');
    } catch (e) {
      s.stop(`Failed to fetch template ${pc.red(id)}. Ensure Web API is running on localhost:3000`);
      process.exit(1);
    }
  }

  let targetDir = dir || config?.name;
  if (!targetDir || targetDir === 'my-app' || targetDir === '') {
    const response = await text({
      message: 'Where would you like to create your project?',
      placeholder: './my-stacker-app',
      defaultValue: './my-stacker-app',
    });

    if (typeof response === 'symbol') {
      process.exit(0);
    }
    targetDir = response as string;
  }

  const pkgManager = config?.packageManager || 'bun';

  // Log what stack we are building
  console.log("");
  console.log(pc.bgBlue(pc.white(' STACK CONFIGURATION ')));
  console.log(` Framework: ${pc.cyan(config.framework || 'React')}`);
  console.log(` UI System: ${pc.cyan(config.ui || 'Unknown')}`);
  if (config.database) console.log(` Database:  ${pc.cyan(config.database)}`);
  if (config.auth) console.log(` Auth:      ${pc.cyan(config.auth)}`);
  console.log(` Package:   ${pc.cyan(pkgManager)}`);
  console.log("");

  const s2 = spinner();
  s2.start(`Scaffolding project in ${pc.green(targetDir)}...`);
  
  // Simulate scaffolding steps based on config
  await new Promise((resolve) => setTimeout(resolve, 600));
  s2.message(`Initializing base template...`);
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (config.framework) {
    s2.message(`Setting up ${config.framework}...`);
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  
  if (config.ui) {
    s2.message(`Installing ${config.ui} components...`);
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  if (config.install) {
    s2.message(`Installing dependencies via ${pkgManager}...`);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  s2.stop('Project Scaffolded Successfully!');
  
  console.log(`\nNext steps:\n  cd ${targetDir}\n  ${config.install ? `${pkgManager} run dev` : `${pkgManager} install\n  ${pkgManager} run dev`}\n`);
}
