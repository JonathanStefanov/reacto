/**
 * Reacto CLI — dev command (start development server)
 */
import chalk from 'chalk';

export async function devCommand(options: { port: string; host: string }): Promise<void> {
  const port = parseInt(options.port, 10);

  console.log(chalk.blue.bold('\n⚡ Reacto Dev Server\n'));
  console.log(chalk.gray(`  Port: ${port}`));
  console.log(chalk.gray(`  Host: ${options.host}`));
  console.log('');

  try {
    // Dynamically import the user's app
    const appPath = process.cwd() + '/app.ts';
    const { default: app } = await import(appPath);

    if (app?.listen) {
      app.listen(port, options.host, () => {
        console.log(chalk.green(`  ✓ Server running at http://${options.host}:${port}`));
        console.log(chalk.gray(`  ✓ API available at http://${options.host}:${port}/api`));
        console.log('');
        console.log(chalk.gray('  Press Ctrl+C to stop'));
      });
    } else {
      console.log(chalk.yellow('  No app.ts found. Starting with auto-discovery...'));

      // Auto-discover and start
      const { startServer } = await import('@reacto/server');
      await startServer(port, {});
    }
  } catch (error) {
    console.error(chalk.red(`\n  ✗ Error starting server:`));
    console.error(chalk.red(`    ${error}\n`));
    process.exit(1);
  }
}
