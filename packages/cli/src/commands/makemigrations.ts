/**
 * Reacto CLI — makemigrations command (generate migration files)
 */
import chalk from 'chalk';
import {
  autoConfigure,
  generateMigrations,
  operationToSql,
  closePool,
} from '@reacto/core';

export async function makemigrationsCommand(options: { dryRun?: boolean }): Promise<void> {
  console.log(chalk.blue.bold('\n📝 Reacto Makemigrations\n'));

  try {
    autoConfigure();

    const migrations = await generateMigrations();

    if (migrations.length === 0) {
      console.log(chalk.green('  ✓ No changes detected. Models match database.\n'));
      await closePool();
      return;
    }

    console.log(chalk.green(`  ✓ Generated ${migrations.length} migration(s):\n`));

    for (const migration of migrations) {
      console.log(chalk.cyan(`  ${migration.name}`));
      console.log(chalk.gray(`    ID: ${migration.id}`));
      console.log(chalk.gray(`    Operations: ${migration.operations.length}`));

      if (options.dryRun) {
        console.log(chalk.yellow('\n    SQL Preview:'));
        for (const op of migration.operations) {
          const sql = operationToSql(op);
          if (sql) {
            console.log(chalk.gray(`      ${sql};`));
          }
        }
      }

      console.log('');
    }

    if (!options.dryRun) {
      console.log(chalk.gray('  Run `reacto migrate` to apply.\n'));
    }

    await closePool();
  } catch (error) {
    console.error(chalk.red(`\n  ✗ Error generating migrations:`));
    console.error(chalk.red(`    ${error}\n`));
    await closePool();
    process.exit(1);
  }
}
