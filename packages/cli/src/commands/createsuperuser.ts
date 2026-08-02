/**
 * Reacto CLI — createsuperuser command
 */
import chalk from 'chalk';
import { autoConfigure, closePool, ModelManager } from '@reacto/core';
import * as readline from 'readline';

export async function createsuperuserCommand(): Promise<void> {
  console.log(chalk.blue.bold('\n👤 Reacto Create Superuser\n'));

  try {
    autoConfigure();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const ask = (question: string): Promise<string> =>
      new Promise((resolve) => rl.question(chalk.gray(`  ${question}: `), resolve));

    const username = await ask('Username');
    const email = await ask('Email');
    const password = await ask('Password');

    rl.close();

    if (!username || !email || !password) {
      console.log(chalk.red('\n  ✗ All fields are required.\n'));
      await closePool();
      process.exit(1);
    }

    // Look for User model
    const { getModel } = await import('@reacto/core');
    const UserModel = getModel('User');

    if (!UserModel) {
      console.log(chalk.red('\n  ✗ No User model found. Define a User model first.\n'));
      await closePool();
      process.exit(1);
    }

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await ModelManager.create(UserModel, {
      username,
      email,
      password: hashedPassword,
      isStaff: true,
      isAdmin: true,
      isActive: true,
    } as any);

    console.log(chalk.green(`\n  ✓ Superuser created: ${username} (id: ${user.id})\n`));
    await closePool();
  } catch (error) {
    console.error(chalk.red(`\n  ✗ Error creating superuser:`));
    console.error(chalk.red(`    ${error}\n`));
    await closePool();
    process.exit(1);
  }
}
