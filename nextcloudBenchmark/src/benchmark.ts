import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { desktopConfig, generateReport, startFlow, type FlowResult, type Result } from 'lighthouse/core/index.js';
import type { Page } from 'playwright';
import { loadBenchmarkConfig, validatePreflightSnapshot } from './config.js';
import {
  closePreview,
  collectPreflightSnapshot,
  loadPhotosGrid,
  loginToFiles,
  navigateToFilesLogin,
  openFolder,
  openImagePreview,
  openPdfPreview,
  searchWithinFolder,
  sortWithinFolder,
} from './nextcloud/actions.js';
import { createBrowserSession } from './session.js';
import { buildSummary, createInitialStepResults, writeSummaryArtifacts } from './reporting.js';
import type {
  BenchmarkConfig,
  BenchmarkRunResult,
  BenchmarkStepName,
  CliOptions,
  PreflightReport,
  StepExecutionResult,
  StepLighthouseMetrics,
} from './types.js';
import { STEP_NAMES } from './types.js';
import { nowIso, timestampForPath, toErrorMessage } from './utils.js';

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };

function createLighthouseDesktopConfig() {
  const config = structuredClone(desktopConfig) as typeof desktopConfig & {
    settings: Record<string, unknown>;
  };

  config.settings = {
    ...config.settings,
    formFactor: 'desktop',
    throttlingMethod: 'provided',
    screenEmulation: {
      mobile: false,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: VIEWPORT.deviceScaleFactor,
      disabled: false,
    },
  };

  return config;
}

function emptyMetrics(): StepLighthouseMetrics {
  return {
    performanceScore: null,
    totalBlockingTime: null,
    cumulativeLayoutShift: null,
    largestContentfulPaint: null,
    interactionToNextPaint: null,
  };
}

function extractStepMetrics(flowResult: FlowResult, stepName: BenchmarkStepName): StepLighthouseMetrics | null {
  const step = flowResult.steps.find((candidate) => candidate.name === stepName);
  if (!step) {
    return null;
  }

  const lhr = step.lhr as Result;

  return {
    performanceScore: lhr.categories.performance?.score ?? null,
    totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue ?? null,
    cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
    largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue ?? null,
    interactionToNextPaint: lhr.audits['interaction-to-next-paint']?.numericValue ?? null,
  };
}

async function captureFailureScreenshot(page: Page, targetPath: string): Promise<void> {
  await page.screenshot({ path: targetPath, fullPage: true }).catch(() => undefined);
}

function markFailedStep(
  steps: StepExecutionResult[],
  stepName: BenchmarkStepName,
  elapsedMs: number,
  finalUrl: string,
  error: unknown,
): void {
  const step = steps.find((candidate) => candidate.step === stepName);
  if (!step) {
    return;
  }

  step.status = 'failed';
  step.elapsedMs = elapsedMs;
  step.finalUrl = finalUrl;
  step.metrics = emptyMetrics();
  step.error = toErrorMessage(error);
}

async function measureStep(
  flow: Awaited<ReturnType<typeof startFlow>>,
  page: Page,
  steps: StepExecutionResult[],
  stepName: BenchmarkStepName,
  action: () => Promise<void>,
): Promise<void> {
  await flow.startTimespan({ name: stepName });
  const startedAt = performance.now();

  try {
    await action();
    await flow.endTimespan();
    const step = steps.find((candidate) => candidate.step === stepName);
    if (!step) {
      throw new Error(`Missing step slot for ${stepName}.`);
    }

    step.status = 'passed';
    step.elapsedMs = Math.round(performance.now() - startedAt);
    step.finalUrl = page.url();
    step.metrics = emptyMetrics();
  } catch (error) {
    try {
      await flow.endTimespan();
    } catch {
      // Best effort only.
    }

    markFailedStep(steps, stepName, Math.round(performance.now() - startedAt), page.url(), error);
    throw error;
  }
}

async function measureNavigationStep(
  flow: Awaited<ReturnType<typeof startFlow>>,
  page: Page,
  steps: StepExecutionResult[],
  stepName: BenchmarkStepName,
  action: () => Promise<unknown>,
): Promise<void> {
  await flow.startNavigation({ name: stepName });
  const startedAt = performance.now();

  try {
    const actionPromise = action();
    await Promise.all([actionPromise, flow.endNavigation()]);

    const step = steps.find((candidate) => candidate.step === stepName);
    if (!step) {
      throw new Error(`Missing step slot for ${stepName}.`);
    }

    step.status = 'passed';
    step.elapsedMs = Math.round(performance.now() - startedAt);
    step.finalUrl = page.url();
    step.metrics = emptyMetrics();
  } catch (error) {
    try {
      await flow.endNavigation();
    } catch {
      // Best effort only.
    }

    markFailedStep(steps, stepName, Math.round(performance.now() - startedAt), page.url(), error);
    throw error;
  }
}

function enrichStepsWithLighthouseMetrics(steps: StepExecutionResult[], flowResult: FlowResult): void {
  for (const step of steps) {
    const metrics = extractStepMetrics(flowResult, step.step);
    if (metrics) {
      step.metrics = metrics;
    }
  }
}

async function runSingleBenchmark(
  cli: CliOptions,
  config: BenchmarkConfig,
  outputRoot: string,
  runNumber: number,
): Promise<BenchmarkRunResult> {
  const runDirectory = path.join(outputRoot, `run-${String(runNumber).padStart(2, '0')}`);
  await mkdir(runDirectory, { recursive: true });

  const startedAt = nowIso();
  const stepResults = createInitialStepResults() as StepExecutionResult[];
  const session = await createBrowserSession(cli.headless);

  try {
    const { page, puppeteerPage } = session;
    const flow = await startFlow(puppeteerPage, {
      name: `Nextcloud UX benchmark run ${runNumber}`,
      config: createLighthouseDesktopConfig(),
    });

    let folderUrl = '';

    await navigateToFilesLogin(page, cli.baseUrl);

    await measureNavigationStep(flow, page, stepResults, 'login_to_files', async () => {
      await loginToFiles(page, cli.username, cli.password);
    });

    await measureStep(flow, page, stepResults, 'open_folder', async () => {
      folderUrl = await openFolder(page, config.folderName);
    });

    await measureStep(flow, page, stepResults, 'search_in_folder', async () => {
      await searchWithinFolder(page, config.searchQuery);
    });

    await measureStep(flow, page, stepResults, 'sort_in_folder', async () => {
      await sortWithinFolder(page, config.sortBy);
    });

    await measureStep(flow, page, stepResults, 'open_image_preview', async () => {
      await openImagePreview(page, config.imageName);
    });

    await closePreview(page, folderUrl);

    await measureStep(flow, page, stepResults, 'open_pdf_preview', async () => {
      await openPdfPreview(page, config.pdfName);
    });

    await closePreview(page, folderUrl);

    await measureNavigationStep(flow, page, stepResults, 'open_photos', async () => {
      await loadPhotosGrid(page, cli.baseUrl, config.minPhotosCount);
    });

    const flowResult = await flow.createFlowResult();
    enrichStepsWithLighthouseMetrics(stepResults, flowResult);

    const reportHtmlPath = path.join(runDirectory, 'flow.report.html');
    const reportJsonPath = path.join(runDirectory, 'flow.report.json');
    await Promise.all([
      writeFile(reportHtmlPath, generateReport(flowResult, 'html'), 'utf8'),
      writeFile(reportJsonPath, generateReport(flowResult, 'json'), 'utf8'),
    ]);

    const endedAt = nowIso();
    return {
      run: runNumber,
      status: 'passed',
      startedAt,
      endedAt,
      durationMs: Math.round(new Date(endedAt).getTime() - new Date(startedAt).getTime()),
      steps: stepResults,
      reportHtmlPath,
      reportJsonPath,
    };
  } catch (error) {
    const screenshotPath = path.join(runDirectory, 'failure.png');
    await captureFailureScreenshot(session.page, screenshotPath);

    const endedAt = nowIso();
    return {
      run: runNumber,
      status: 'failed',
      startedAt,
      endedAt,
      durationMs: Math.round(new Date(endedAt).getTime() - new Date(startedAt).getTime()),
      steps: stepResults,
      error: toErrorMessage(error),
      screenshotPath,
    };
  } finally {
    await session.close();
  }
}

export async function runPreflight(cli: CliOptions, config: BenchmarkConfig, outputRoot: string): Promise<PreflightReport> {
  const session = await createBrowserSession(cli.headless);
  const preflightDirectory = path.join(outputRoot, 'preflight');
  await mkdir(preflightDirectory, { recursive: true });

  try {
    const snapshot = await collectPreflightSnapshot(session.page, cli.baseUrl, cli.username, cli.password, config);
    const errors = validatePreflightSnapshot(snapshot, config);
    if (errors.length > 0) {
      throw new Error(errors.join(' '));
    }

    const report: PreflightReport = {
      checkedAt: nowIso(),
      status: 'passed',
      snapshot,
    };

    await writeFile(path.join(preflightDirectory, 'preflight.json'), JSON.stringify(report, null, 2), 'utf8');
    return report;
  } catch (error) {
    const screenshotPath = path.join(preflightDirectory, 'failure.png');
    await captureFailureScreenshot(session.page, screenshotPath);
    throw error;
  } finally {
    await session.close();
  }
}

export async function executeBenchmark(cli: CliOptions): Promise<{
  outputRoot: string;
  config: BenchmarkConfig;
  runs: BenchmarkRunResult[];
  preflight: PreflightReport;
}> {
  const config = await loadBenchmarkConfig(cli.configPath);
  const outputRoot = path.join(cli.outputDir, timestampForPath());
  await mkdir(outputRoot, { recursive: true });

  const preflight = await runPreflight(cli, config, outputRoot);
  const runs: BenchmarkRunResult[] = [];

  for (let runNumber = 1; runNumber <= cli.runs; runNumber += 1) {
    runs.push(await runSingleBenchmark(cli, config, outputRoot, runNumber));
  }

  const summary = buildSummary(cli.baseUrl, outputRoot, cli, runs, config);
  await writeSummaryArtifacts(outputRoot, summary);

  return {
    outputRoot,
    config,
    runs,
    preflight,
  };
}

export function plannedStepNames(): readonly BenchmarkStepName[] {
  return STEP_NAMES;
}
