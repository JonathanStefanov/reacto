#!/usr/bin/env node

/**
 * Reacto CLI — The manage.py equivalent
 *
 * Usage:
 *   reacto dev              Start dev server
 *   reacto migrate          Apply pending migrations
 *   reacto makemigrations   Generate migration files
 *   reacto createsuperuser  Create an admin user
 *   reacto generate model   Scaffold a new model
 *   reacto dbshell          Open database shell
 *   reacto test             Run tests
 */
import { Command } from 'commander';
import { devCommand } from './commands/dev.js';
import { migrateCommand } from './commands/migrate.js';
import { makemigrationsCommand } from './commands/makemigrations.js';
import { createsuperuserCommand } from './commands/createsuperuser.js';
import { generateCommand } from './commands/generate.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('reacto')
  .description('Reacto — Django for React')
  .version('0.1.0');

// ─── Commands ─────────────────────────────────────────────────────────────────

program
  .command('dev')
  .description('Start the development server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('--host <host>', 'Host to bind to', 'localhost')
  .action(devCommand);

program
  .command('migrate')
  .description('Apply pending migrations')
  .option('--fake', 'Mark migrations as applied without running them')
  .option('--status', 'Show migration status')
  .action(migrateCommand);

program
  .command('makemigrations')
  .description('Generate migration files from model changes')
  .option('--dry-run', 'Show SQL without applying')
  .action(makemigrationsCommand);

program
  .command('createsuperuser')
  .description('Create a superuser account')
  .action(createsuperuserCommand);

program
  .command('generate')
  .description('Generate code scaffolding')
  .argument('<type>', 'Type to generate (model, api, page)')
  .argument('<name>', 'Name of the item')
  .option('--fields <fields>', 'Field definitions (name:type,...)')
  .action(generateCommand);

program
  .command('status')
  .description('Show project status (models, migrations, database)')
  .action(statusCommand);

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
