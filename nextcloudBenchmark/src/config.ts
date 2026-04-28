import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { BenchmarkConfig } from './types.js';

const benchmarkConfigSchema = z.object({
  folderName: z.string().trim().min(1),
  searchQuery: z.string().trim().min(1),
  sortBy: z.string().trim().min(1),
  imageName: z.string().trim().min(1),
  pdfName: z.string().trim().min(1),
  minPhotosCount: z.number().int().positive(),
});

export async function loadBenchmarkConfig(configPath: string): Promise<BenchmarkConfig> {
  const resolvedPath = path.resolve(configPath);
  const raw = await readFile(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  return benchmarkConfigSchema.parse(parsed);
}

export function validatePreflightSnapshot(
  snapshot: {
    hasSearchControl: boolean;
    hasSortControl: boolean;
    folderExists: boolean;
    imageExists: boolean;
    pdfExists: boolean;
    photosCount: number;
  },
  config: BenchmarkConfig,
): string[] {
  const errors: string[] = [];

  if (!snapshot.folderExists) {
    errors.push(`Preflight failed: folder "${config.folderName}" was not found.`);
  }

  if (!snapshot.hasSearchControl) {
    errors.push('Preflight failed: folder search control was not found.');
  }

  if (!snapshot.hasSortControl) {
    errors.push('Preflight failed: sort control was not found.');
  }

  if (!snapshot.imageExists) {
    errors.push(`Preflight failed: image "${config.imageName}" was not found.`);
  }

  if (!snapshot.pdfExists) {
    errors.push(`Preflight failed: PDF "${config.pdfName}" was not found.`);
  }

  if (snapshot.photosCount < config.minPhotosCount) {
    errors.push(
      `Preflight failed: photos app exposes ${snapshot.photosCount} image(s), below minPhotosCount=${config.minPhotosCount}.`,
    );
  }

  return errors;
}
