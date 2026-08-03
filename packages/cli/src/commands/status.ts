/**
 * Reacto CLI — status command (project overview)
 */
import chalk from 'chalk';
import { autoConfigure, getAllModels, generateMigrations, getAppliedMigrations, closePool } from '@reacto-org/core';

export async function statusCommand(): Promise<void> {
  console.log(chalk.blue.bold('\n📊 Reacto Project Status\n'));

  try {
    autoConfigure();

    // Models
    const models = getAllModels();
    console.log(chalk.cyan('  Models:'));
    if (models.size === 0) {
      console.log(chalk.gray('    No models registered.'));
    } else {
      for (const [name, modelClass] of models) {
        const fieldCount = modelClass.fields.size;
        console.log(chalk.green(`    ✓ ${name}`) + chalk.gray(` (${fieldCount} fields → "${modelClass.tableName}")`));
      }
    }

    console.log('');

    // Migrations
    console.log(chalk.cyan('  Migrations:'));
    try {
      const migrations = await generateMigrations();
      const applied = await getAppliedMigrations();
      console.log(chalk.gray(`    Applied: ${applied.length}`));
      console.log(chalk.gray(`    Pending: ${migrations.length}`));
    } catch {
      console.log(chalk.gray('    Database not connected.'));
    }

    console.log('');
    await closePool();
  } catch (error) {
    console.error(chalk.red(`\n  ✗ Error:`));
    console.error(chalk.red(`    ${error}\n`));
    await closePool();
    process.exit(1);
  }
}
