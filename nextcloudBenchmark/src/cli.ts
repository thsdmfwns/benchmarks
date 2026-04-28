import { parseCliArgs } from './cli-options.js';
import { executeBenchmark, plannedStepNames } from './benchmark.js';
import { toErrorMessage } from './utils.js';

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv.slice(2));

  console.log(`Benchmark target: ${cli.baseUrl}`);
  console.log(`Steps: ${plannedStepNames().join(', ')}`);
  console.log(`Runs: ${cli.runs}`);
  console.log(`Config: ${cli.configPath}`);
  console.log('');

  const result = await executeBenchmark(cli);
  const failedRuns = result.runs.filter((run) => run.status === 'failed').length;

  console.log(`Preflight: ${result.preflight.status}`);
  console.log(`Output root: ${result.outputRoot}`);
  console.log(`Completed runs: ${result.runs.length}`);
  console.log(`Failed runs: ${failedRuns}`);
}

main().catch((error) => {
  console.error(`Benchmark failed: ${toErrorMessage(error)}`);
  process.exitCode = 1;
});
