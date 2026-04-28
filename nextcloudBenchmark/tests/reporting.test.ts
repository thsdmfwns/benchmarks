import { describe, expect, it } from 'vitest';
import { aggregateRows, flattenRunResults } from '../src/reporting.js';
import type { BenchmarkRunResult } from '../src/types.js';

describe('reporting', () => {
  const runs: BenchmarkRunResult[] = [
    {
      run: 1,
      status: 'passed',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:00:05.000Z',
      durationMs: 5000,
      steps: [
        {
          step: 'login_to_files',
          status: 'passed',
          elapsedMs: 1000,
          finalUrl: 'http://localhost:8080/apps/files/',
          metrics: {
            performanceScore: 0.51,
            totalBlockingTime: 50,
            cumulativeLayoutShift: 0.02,
            largestContentfulPaint: 800,
            interactionToNextPaint: 110,
          },
        },
        {
          step: 'open_folder',
          status: 'failed',
          elapsedMs: 3000,
          finalUrl: 'http://localhost:8080/apps/files/',
          metrics: {
            performanceScore: null,
            totalBlockingTime: null,
            cumulativeLayoutShift: null,
            largestContentfulPaint: null,
            interactionToNextPaint: null,
          },
          error: 'Folder missing',
        },
        {
          step: 'search_in_folder',
          status: 'skipped',
          elapsedMs: null,
          finalUrl: null,
          metrics: null,
        },
        {
          step: 'sort_in_folder',
          status: 'skipped',
          elapsedMs: null,
          finalUrl: null,
          metrics: null,
        },
        {
          step: 'open_image_preview',
          status: 'skipped',
          elapsedMs: null,
          finalUrl: null,
          metrics: null,
        },
        {
          step: 'open_pdf_preview',
          status: 'skipped',
          elapsedMs: null,
          finalUrl: null,
          metrics: null,
        },
        {
          step: 'open_photos',
          status: 'skipped',
          elapsedMs: null,
          finalUrl: null,
          metrics: null,
        },
      ],
    },
    {
      run: 2,
      status: 'passed',
      startedAt: '2026-01-01T00:01:00.000Z',
      endedAt: '2026-01-01T00:01:06.000Z',
      durationMs: 6000,
      steps: [
        {
          step: 'login_to_files',
          status: 'passed',
          elapsedMs: 2000,
          finalUrl: 'http://localhost:8080/apps/files/',
          metrics: {
            performanceScore: 0.71,
            totalBlockingTime: 70,
            cumulativeLayoutShift: 0.03,
            largestContentfulPaint: 1000,
            interactionToNextPaint: 130,
          },
        },
        {
          step: 'open_folder',
          status: 'passed',
          elapsedMs: 1500,
          finalUrl: 'http://localhost:8080/apps/files/files/benchmark-fixtures',
          metrics: {
            performanceScore: 0.66,
            totalBlockingTime: 20,
            cumulativeLayoutShift: 0.01,
            largestContentfulPaint: 900,
            interactionToNextPaint: 90,
          },
        },
        {
          step: 'search_in_folder',
          status: 'skipped',
          elapsedMs: null,
          finalUrl: null,
          metrics: null,
        },
        {
          step: 'sort_in_folder',
          status: 'skipped',
          elapsedMs: null,
          finalUrl: null,
          metrics: null,
        },
        {
          step: 'open_image_preview',
          status: 'skipped',
          elapsedMs: null,
          finalUrl: null,
          metrics: null,
        },
        {
          step: 'open_pdf_preview',
          status: 'skipped',
          elapsedMs: null,
          finalUrl: null,
          metrics: null,
        },
        {
          step: 'open_photos',
          status: 'skipped',
          elapsedMs: null,
          finalUrl: null,
          metrics: null,
        },
      ],
    },
  ];

  it('flattens run results to summary rows', () => {
    const rows = flattenRunResults(runs);
    expect(rows).toHaveLength(14);
    expect(rows[0]?.step).toBe('login_to_files');
  });

  it('aggregates averages and medians across successful steps', () => {
    const aggregate = aggregateRows(flattenRunResults(runs));
    const loginRow = aggregate.find((item) => item.step === 'login_to_files');
    const openFolderRow = aggregate.find((item) => item.step === 'open_folder');

    expect(loginRow?.avgElapsedMs).toBe(1500);
    expect(loginRow?.medianElapsedMs).toBe(1500);
    expect(loginRow?.avgPerformanceScore).toBe(0.61);
    expect(openFolderRow?.failedRuns).toBe(1);
    expect(openFolderRow?.passedRuns).toBe(1);
  });
});
