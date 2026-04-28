import path from 'node:path';
import { Command } from 'commander';
import type { CliOptions } from './types.js';
import { normalizeBaseUrl } from './utils.js';

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received "${value}".`);
  }

  return parsed;
}

export function parseCliArgs(argv: string[]): CliOptions {
  const program = new Command();
  program
    .name('nextcloud-benchmark')
    .allowExcessArguments(false)
    .requiredOption('--base-url <url>', 'Nextcloud base URL')
    .requiredOption('--username <username>', 'Nextcloud username')
    .requiredOption('--password <password>', 'Nextcloud password')
    .requiredOption('--config <path>', 'Path to benchmark config JSON')
    .option('--runs <count>', 'Number of benchmark runs', parsePositiveInteger, 3)
    .option('--output-dir <path>', 'Directory for benchmark results', 'results')
    .option('--headless', 'Run Chromium in headless mode', false)
    .exitOverride()
    .configureOutput({
      writeErr: () => undefined,
      writeOut: () => undefined,
    });

  try {
    program.parse(argv, { from: 'user' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message);
  }

  const options = program.opts<{
    baseUrl: string;
    username: string;
    password: string;
    config: string;
    runs: number;
    outputDir: string;
    headless: boolean;
  }>();

  return {
    baseUrl: normalizeBaseUrl(options.baseUrl),
    username: options.username,
    password: options.password,
    configPath: path.resolve(options.config),
    runs: options.runs,
    outputDir: path.resolve(options.outputDir),
    headless: options.headless,
  };
}
