/**
 * Reacto CLI — runserver command (Django-style zero-config server)
 *
 * Usage:
 *   reacto runserver                  # Start on :3000
 *   reacto runserver --port 8080      # Custom port
 *   reacto runserver --streaming      # Enable streaming SSR
 *   reacto runserver --no-cache       # Disable response cache
 *   reacto runserver --no-compress    # Disable gzip
 *
 * Auto-discovers: models/, views/, routes/, tasks/
 * Config from env: DATABASE_URL, PORT, HOST, SECRET
 */
import chalk from 'chalk';

interface RunserverOptions {
  port: string;
  host: string;
  streaming: boolean;
  cache: boolean;
  compress: boolean;
  secret?: string;
}

export async function runserverCommand(options: RunserverOptions): Promise<void> {
  const port = parseInt(options.port, 10) || parseInt(process.env.PORT || '3000', 10);
  const host = options.host || process.env.HOST || 'localhost';
  const secret = options.secret || process.env.SECRET;

  console.log(chalk.blue.bold('\n🎬 Reacto SSR Server\n'));

  try {
    // Import SSR package
    const { createSSRApp } = await import('@reacto-org/ssr');

    // Parse DATABASE_URL if present
    const dbUrl = process.env.DATABASE_URL;
    let database: { host: string; port: number; database: string; user: string; password: string } | undefined;

    if (dbUrl) {
      try {
        const url = new URL(dbUrl);
        database = {
          host: url.hostname,
          port: parseInt(url.port || '5432', 10),
          database: url.pathname.slice(1),
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
        };
        console.log(chalk.gray(`  Database: ${database.host}:${database.port}/${database.database}`));
      } catch {
        console.log(chalk.yellow(`  ⚠ Invalid DATABASE_URL, ignoring`));
      }
    }

    // Create the SSR app — zero config from user
    const app = await createSSRApp({
      port,
      secret,
      database,
      streaming: options.streaming ?? (process.env.SSR_STREAMING === 'true'),
      cacheTtl: options.cache === false ? 0 : parseInt(process.env.SSR_CACHE_TTL || '60', 10),
      compress: options.compress ?? (process.env.SSR_COMPRESS !== 'false'),
    });

    // Discover what was found
    console.log(chalk.gray(`  Streaming: ${options.streaming ? 'ON' : 'OFF'}`));
    console.log(chalk.gray(`  Cache: ${options.cache === false ? 'OFF' : 'ON'}`));
    console.log(chalk.gray(`  Compression: ${options.compress === false ? 'OFF' : 'ON'}`));
    console.log('');

    await app.start(port);

    console.log(chalk.green(`  ✓ Server running at http://${host}:${port}`));
    console.log(chalk.gray(`  ✓ API at http://${host}:${port}/api`));
    console.log(chalk.gray(`  ✓ Cache stats at http://${host}:${port}/api/_ssr/cache-stats`));
    console.log('');
    console.log(chalk.gray('  Press Ctrl+C to stop\n'));

  } catch (error) {
    console.error(chalk.red(`\n  ✗ Failed to start server:\n`));
    console.error(chalk.red(`    ${(error as Error).message}\n`));

    if ((error as Error).message.includes('Cannot find module')) {
      console.log(chalk.yellow('  💡 Make sure you have @reacto-org/ssr installed:'));
      console.log(chalk.gray('     npm install @reacto-org/ssr\n'));
    }

    process.exit(1);
  }
}
