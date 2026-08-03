/**
 * Reacto CLI — migrate command (apply migrations)
 */
import chalk from 'chalk';
import {
  autoConfigure,
  generateMigrations,
  applyMigrations,
  fakeMigrations,
  showMigrationStatus,
  closePool,
} from '@reacto-org/core';

export async function migrateCommand(options: { fake?: boolean; status?: boolean }): Promise<void> {
  console.log(chalk.blue.bold('\n📦 Reacto Migrations\n'));

  try {
    autoConfigure();

    const migrations = await generateMigrations();

    if (options.status) {
      await showMigrationStatus(migrations);
      await closePool();
      return;
    }

    if (migrations.length === 0) {
      console.log(chalk.green('  ✓ No pending migrations.\n'));
      await closePool();
      return;
    }

    console.log(chalk.gray(`  Found ${migrations.length} migration(s):\n`));
    for (const m of migrations) {
      console.log(chalk.gray(`    • ${m.name} (${m.operations.length} operation(s))`));
    }
    console.log('');

    if (options.fake) {
      await fakeMigrations(migrations);
      console.log(chalk.yellow('\n  ⚠ Migrations faked (not actually applied).\n'));
    } else {
      await applyMigrations(migrations);
      console.log(chalk.green('\n  ✓ All migrations applied successfully.\n'));
    }

    await closePool();
  } catch (error) {
    console.error(chalk.red(`\n  ✗ Migration error:`));
    console.error(chalk.red(`    ${error}\n`));
    await closePool();
    process.exit(1);
  }
}
