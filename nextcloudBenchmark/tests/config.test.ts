import { describe, expect, it } from 'vitest';
import { validatePreflightSnapshot } from '../src/config.js';

describe('validatePreflightSnapshot', () => {
  const config = {
    folderName: 'benchmark-fixtures',
    searchQuery: 'invoice',
    sortBy: 'Modified',
    imageName: 'hero-image.jpg',
    pdfName: 'project-plan.pdf',
    minPhotosCount: 2,
  };

  it('returns no errors for a valid snapshot', () => {
    const errors = validatePreflightSnapshot(
      {
        hasSearchControl: true,
        hasSortControl: true,
        folderExists: true,
        imageExists: true,
        pdfExists: true,
        photosCount: 3,
      },
      config,
    );

    expect(errors).toEqual([]);
  });

  it('flags a missing folder immediately', () => {
    const errors = validatePreflightSnapshot(
      {
        hasSearchControl: false,
        hasSortControl: false,
        folderExists: false,
        imageExists: false,
        pdfExists: false,
        photosCount: 0,
      },
      config,
    );

    expect(errors[0]).toContain('folder');
    expect(errors[0]).toContain(config.folderName);
  });

  it('flags a missing image fixture', () => {
    const errors = validatePreflightSnapshot(
      {
        hasSearchControl: true,
        hasSortControl: true,
        folderExists: true,
        imageExists: false,
        pdfExists: true,
        photosCount: 3,
      },
      config,
    );

    expect(errors.some((error) => error.includes(config.imageName))).toBe(true);
  });
});
