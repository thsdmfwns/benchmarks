export const STEP_NAMES = [
  'login_to_files',
  'open_folder',
  'search_in_folder',
  'sort_in_folder',
  'open_image_preview',
  'open_pdf_preview',
  'open_photos',
] as const;

export type BenchmarkStepName = (typeof STEP_NAMES)[number];

export interface BenchmarkConfig {
  folderName: string;
  searchQuery: string;
  sortBy: string;
  imageName: string;
  pdfName: string;
  minPhotosCount: number;
}

export interface CliOptions {
  baseUrl: string;
  username: string;
  password: string;
  configPath: string;
  runs: number;
  outputDir: string;
  headless: boolean;
}

export interface StepLighthouseMetrics {
  performanceScore: number | null;
  totalBlockingTime: number | null;
  cumulativeLayoutShift: number | null;
  largestContentfulPaint: number | null;
  interactionToNextPaint: number | null;
}

export interface StepExecutionResult {
  step: BenchmarkStepName;
  status: 'passed' | 'failed' | 'skipped';
  elapsedMs: number | null;
  finalUrl: string | null;
  metrics: StepLighthouseMetrics | null;
  error?: string;
}

export interface BenchmarkRunResult {
  run: number;
  status: 'passed' | 'failed';
  startedAt: string;
  endedAt: string;
  durationMs: number;
  steps: StepExecutionResult[];
  error?: string;
  reportHtmlPath?: string;
  reportJsonPath?: string;
  screenshotPath?: string;
}

export interface SummaryRow {
  run: number;
  step: BenchmarkStepName;
  status: StepExecutionResult['status'];
  elapsedMs: number | null;
  performanceScore: number | null;
  totalBlockingTime: number | null;
  cumulativeLayoutShift: number | null;
  largestContentfulPaint: number | null;
  interactionToNextPaint: number | null;
  finalUrl: string | null;
  error?: string;
}

export interface AggregatedStepStats {
  step: BenchmarkStepName;
  passedRuns: number;
  failedRuns: number;
  skippedRuns: number;
  avgElapsedMs: number | null;
  medianElapsedMs: number | null;
  avgPerformanceScore: number | null;
  avgTotalBlockingTime: number | null;
  avgCumulativeLayoutShift: number | null;
}

export interface BenchmarkSummary {
  generatedAt: string;
  baseUrl: string;
  runsRequested: number;
  outputRoot: string;
  config: BenchmarkConfig;
  rawRows: SummaryRow[];
  aggregate: AggregatedStepStats[];
  runs: BenchmarkRunResult[];
}

export interface PreflightSnapshot {
  hasSearchControl: boolean;
  hasSortControl: boolean;
  folderExists: boolean;
  imageExists: boolean;
  pdfExists: boolean;
  photosCount: number;
  visibleNames: string[];
}

export interface PreflightReport {
  checkedAt: string;
  status: 'passed';
  snapshot: PreflightSnapshot;
}
