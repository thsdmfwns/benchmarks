import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  AggregatedStepStats,
  BenchmarkRunResult,
  BenchmarkSummary,
  BenchmarkStepName,
  CliOptions,
  SummaryRow,
} from './types.js';
import { STEP_NAMES } from './types.js';
import { escapeCsvField, mean, median, roundNumber } from './utils.js';

function valuesForMetric(rows: SummaryRow[], selector: (row: SummaryRow) => number | null): number[] {
  return rows
    .filter((row) => row.status === 'passed')
    .map(selector)
    .filter((value): value is number => value !== null);
}

export function flattenRunResults(runs: BenchmarkRunResult[]): SummaryRow[] {
  return runs.flatMap((run) =>
    run.steps.map((step) => {
      const row: SummaryRow = {
        run: run.run,
        step: step.step,
        status: step.status,
        elapsedMs: step.elapsedMs,
        performanceScore: step.metrics?.performanceScore ?? null,
        totalBlockingTime: step.metrics?.totalBlockingTime ?? null,
        cumulativeLayoutShift: step.metrics?.cumulativeLayoutShift ?? null,
        largestContentfulPaint: step.metrics?.largestContentfulPaint ?? null,
        interactionToNextPaint: step.metrics?.interactionToNextPaint ?? null,
        finalUrl: step.finalUrl,
      };

      if (step.error) {
        row.error = step.error;
      }

      return row;
    }),
  );
}

export function aggregateRows(rows: SummaryRow[]): AggregatedStepStats[] {
  return STEP_NAMES.map((step) => {
    const stepRows = rows.filter((row) => row.step === step);
    const passedRuns = stepRows.filter((row) => row.status === 'passed').length;
    const failedRuns = stepRows.filter((row) => row.status === 'failed').length;
    const skippedRuns = stepRows.filter((row) => row.status === 'skipped').length;

    return {
      step,
      passedRuns,
      failedRuns,
      skippedRuns,
      avgElapsedMs: roundNumber(mean(valuesForMetric(stepRows, (row) => row.elapsedMs)), 2),
      medianElapsedMs: roundNumber(median(valuesForMetric(stepRows, (row) => row.elapsedMs)), 2),
      avgPerformanceScore: roundNumber(mean(valuesForMetric(stepRows, (row) => row.performanceScore)), 4),
      avgTotalBlockingTime: roundNumber(mean(valuesForMetric(stepRows, (row) => row.totalBlockingTime)), 2),
      avgCumulativeLayoutShift: roundNumber(mean(valuesForMetric(stepRows, (row) => row.cumulativeLayoutShift)), 4),
    };
  });
}

export function buildSummary(
  baseUrl: string,
  outputRoot: string,
  cli: CliOptions,
  runs: BenchmarkRunResult[],
  config: BenchmarkSummary['config'],
): BenchmarkSummary {
  const rawRows = flattenRunResults(runs);
  const aggregate = aggregateRows(rawRows);

  return {
    generatedAt: new Date().toISOString(),
    baseUrl,
    runsRequested: cli.runs,
    outputRoot,
    config,
    rawRows,
    aggregate,
    runs,
  };
}

export function summaryToCsv(rows: SummaryRow[]): string {
  const header = [
    'run',
    'step',
    'status',
    'elapsedMs',
    'performanceScore',
    'totalBlockingTime',
    'cumulativeLayoutShift',
    'largestContentfulPaint',
    'interactionToNextPaint',
    'finalUrl',
    'error',
  ];

  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.run,
        row.step,
        row.status,
        row.elapsedMs,
        row.performanceScore,
        row.totalBlockingTime,
        row.cumulativeLayoutShift,
        row.largestContentfulPaint,
        row.interactionToNextPaint,
        row.finalUrl,
        row.error,
      ]
        .map(escapeCsvField)
        .join(','),
    );
  }

  return lines.join('\n');
}

function formatMetric(value: number | null): string {
  return value === null ? '-' : String(value);
}

function aggregateTableRows(aggregate: AggregatedStepStats[]): string[] {
  return aggregate.map(
    (item) =>
      `| ${item.step} | ${item.passedRuns} | ${item.failedRuns} | ${item.skippedRuns} | ${formatMetric(item.avgElapsedMs)} | ${formatMetric(item.medianElapsedMs)} | ${formatMetric(item.avgPerformanceScore)} | ${formatMetric(item.avgTotalBlockingTime)} | ${formatMetric(item.avgCumulativeLayoutShift)} |`,
  );
}

function rawTableRows(rows: SummaryRow[]): string[] {
  return rows.map(
    (row) =>
      `| ${row.run} | ${row.step} | ${row.status} | ${formatMetric(row.elapsedMs)} | ${formatMetric(row.performanceScore)} | ${formatMetric(row.totalBlockingTime)} | ${formatMetric(row.cumulativeLayoutShift)} | ${row.finalUrl ?? '-'} |`,
  );
}

export function summaryToMarkdown(summary: BenchmarkSummary): string {
  return [
    '# Nextcloud UX Benchmark Summary',
    '',
    `- Generated at: ${summary.generatedAt}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Output root: ${summary.outputRoot}`,
    `- Runs requested: ${summary.runsRequested}`,
    '',
    '## Aggregate',
    '',
    '| Step | Passed | Failed | Skipped | Avg elapsed (ms) | Median elapsed (ms) | Avg perf score | Avg TBT | Avg CLS |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...aggregateTableRows(summary.aggregate),
    '',
    '## Raw Rows',
    '',
    '| Run | Step | Status | Elapsed (ms) | Perf score | TBT | CLS | Final URL |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
    ...rawTableRows(summary.rawRows),
    '',
  ].join('\n');
}

export async function writeSummaryArtifacts(outputRoot: string, summary: BenchmarkSummary): Promise<void> {
  await mkdir(outputRoot, { recursive: true });

  await Promise.all([
    writeFile(path.join(outputRoot, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8'),
    writeFile(path.join(outputRoot, 'summary.csv'), summaryToCsv(summary.rawRows), 'utf8'),
    writeFile(path.join(outputRoot, 'summary.md'), summaryToMarkdown(summary), 'utf8'),
  ]);
}

export function createInitialStepResults(): Array<{
  step: BenchmarkStepName;
  status: 'skipped';
  elapsedMs: null;
  finalUrl: null;
  metrics: null;
}> {
  return STEP_NAMES.map((step) => ({
    step,
    status: 'skipped' as const,
    elapsedMs: null,
    finalUrl: null,
    metrics: null,
  }));
}
