import { cac } from 'cac';
import pc from 'picocolors';
import { intro, outro, cancel } from '@clack/prompts';
import { initCommand } from './commands/init';

const cli = cac('stacker');

cli
  .command('[templateId]', 'Initialize a new project from a Stacker template')
  .option('-d, --dir <dir>', 'Directory to initialize in')
  .option('--api <url>', 'Override Stacker API base URL')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (templateId, options) => {
    intro(pc.bgCyan(pc.black(' Stacker CLI ')));
    await initCommand(templateId, options.dir, options.api, Boolean(options.yes));
    outro(pc.green('Done.'));
  });

cli.help();
cli.version('0.1.0');

try {
  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
} catch (error) {
  cancel(pc.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
  process.exit(1);
}
