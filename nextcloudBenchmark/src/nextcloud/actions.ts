import type { Locator, Page } from 'playwright';
import type { BenchmarkConfig } from '../types.js';
import { joinUrl } from '../utils.js';
import {
  actionMenuShareItem,
  closeSidebarButton,
  createPublicLinkButton,
  fileRowByName,
  findOptionalVisibleLocator,
  folderSearchInput,
  loginPasswordInput,
  loginSubmitButton,
  loginUsernameInput,
  previewCloseButton,
  previewImage,
  previewPdf,
  previewRoot,
  publicLinkField,
  removePublicLinkButton,
  resolveVisibleLocator,
  rowActionMenuButton,
  rowShareButton,
  shareSidebarRoot,
  sortChoice,
  sortTrigger,
  visibleFileNames,
  waitForFileListStability,
  waitForFilesReady,
  waitForFolderOpen,
  waitForPhotosReady,
} from './selectors.js';

const ACTION_TIMEOUT_MS = 15_000;

async function visibleCandidate(factories: Array<() => Locator>): Promise<Locator | null> {
  return await findOptionalVisibleLocator(factories, 1_500);
}

async function resolveFolderSearchInput(page: Page): Promise<Locator> {
  return await resolveVisibleLocator(folderSearchInput(page), 'folder search input');
}

export async function navigateToFilesLogin(page: Page, baseUrl: string): Promise<void> {
  await page.goto(joinUrl(baseUrl, '/apps/files/'), { waitUntil: 'domcontentloaded' });
}

export async function navigateToPhotos(page: Page, baseUrl: string): Promise<void> {
  await page.goto(joinUrl(baseUrl, '/apps/photos/'), { waitUntil: 'domcontentloaded' });
}

export async function loginToFiles(page: Page, username: string, password: string): Promise<void> {
  const usernameInput = await resolveVisibleLocator(loginUsernameInput(page), 'login username input');
  const passwordInput = await resolveVisibleLocator(loginPasswordInput(page), 'login password input');
  const submitButton = await resolveVisibleLocator(loginSubmitButton(page), 'login submit button');

  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await submitButton.click();
  await waitForFilesReady(page, ACTION_TIMEOUT_MS);
  await dismissInterferingOverlays(page);
}

export async function dismissInterferingOverlays(page: Page): Promise<void> {
  const dismissable = [
    page.getByRole('button', { name: /close|dismiss|skip|later|got it/i }).first(),
    page.locator('button[aria-label*="Close" i]').first(),
  ];

  for (const locator of dismissable) {
    try {
      if (await locator.isVisible({ timeout: 600 })) {
        await locator.click({ timeout: 1_500 });
      }
    } catch {
      // Ignore optional overlays.
    }
  }
}

export async function resolveRow(page: Page, itemName: string): Promise<Locator> {
  return await resolveVisibleLocator(fileRowByName(page, itemName), `file row "${itemName}"`);
}

export async function openFolder(page: Page, folderName: string): Promise<string> {
  const row = await resolveRow(page, folderName);
  const previousUrl = page.url();
  await row.scrollIntoViewIfNeeded();

  const nameLink = await visibleCandidate([
    () => row.getByRole('link', { name: new RegExp(folderName, 'i') }),
    () => row.locator('a').filter({ hasText: folderName }),
  ]);

  if (nameLink) {
    await nameLink.click();
  } else {
    await row.dblclick();
  }

  await waitForFolderOpen(page, folderName, previousUrl);
  return page.url();
}

export async function ensureSearchControl(page: Page): Promise<void> {
  await resolveFolderSearchInput(page);
}

export async function ensureSortControl(page: Page, sortBy: string): Promise<void> {
  const trigger = await findOptionalVisibleLocator(sortTrigger(page), 2_000);
  if (trigger) {
    return;
  }

  await resolveVisibleLocator(sortChoice(page, sortBy), 'sort control fallback');
}

export async function searchWithinFolder(page: Page, searchQuery: string): Promise<void> {
  const before = JSON.stringify(await visibleFileNames(page, 10));
  const input = await resolveFolderSearchInput(page);
  await input.click();
  await input.fill(searchQuery);
  await input.press('Enter').catch(() => undefined);
  await waitForFileListStability(page);

  const visibleNames = await visibleFileNames(page, 10);
  const after = JSON.stringify(visibleNames);
  const hasVisibleMatches = visibleNames.some((name) => name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!hasVisibleMatches && visibleNames.length === 0) {
    throw new Error(`Search "${searchQuery}" returned no visible results.`);
  }

  if (!hasVisibleMatches && before === after) {
    throw new Error(`Search "${searchQuery}" did not produce a detectable UI state change.`);
  }

  await clearSearch(page);
}

export async function clearSearch(page: Page): Promise<void> {
  const input = await resolveFolderSearchInput(page);
  await input.fill('');
  await input.press('Escape').catch(() => undefined);
  await waitForFileListStability(page);
}

export async function sortWithinFolder(page: Page, sortBy: string): Promise<void> {
  const before = JSON.stringify(await visibleFileNames(page, 10));
  const trigger = await findOptionalVisibleLocator(sortTrigger(page), 1_500);

  if (trigger) {
    await trigger.click();
  }

  const option = await resolveVisibleLocator(sortChoice(page, sortBy), `sort option "${sortBy}"`);
  await option.click();
  await waitForFileListStability(page);

  const after = JSON.stringify(await visibleFileNames(page, 10));
  const ariaState =
    (await option.getAttribute('aria-checked')) ??
    (await option.getAttribute('aria-selected')) ??
    (await option.getAttribute('aria-pressed'));

  if (before === after && !['true', 'mixed'].includes(ariaState ?? '')) {
    throw new Error(`Sort "${sortBy}" did not produce a detectable UI state change.`);
  }
}

async function openSharePanelForRow(page: Page, row: Locator): Promise<void> {
  await row.scrollIntoViewIfNeeded();
  await row.hover();

  const shareButton = await visibleCandidate(rowShareButton(row));
  if (shareButton) {
    await shareButton.click();
    return;
  }

  const actionsButton = await resolveVisibleLocator(rowActionMenuButton(row), 'row actions menu');
  await actionsButton.click();

  const shareItem = await resolveVisibleLocator(actionMenuShareItem(page), 'share action menu item');
  await shareItem.click();
}

export async function ensureNoExistingPublicLink(page: Page, shareTargetName: string): Promise<void> {
  const row = await resolveRow(page, shareTargetName);
  await openSharePanelForRow(page, row);
  await resolveVisibleLocator(shareSidebarRoot(page), 'share sidebar');

  const linkField = await findOptionalVisibleLocator(publicLinkField(page), 1_000);
  if (!linkField) {
    return;
  }

  const removeButton = await findOptionalVisibleLocator(removePublicLinkButton(page), 2_000);
  if (removeButton) {
    await removeButton.click();
    await page.waitForTimeout(500);
  }
}

export async function createShareLink(page: Page, shareTargetName: string): Promise<void> {
  const row = await resolveRow(page, shareTargetName);
  await openSharePanelForRow(page, row);
  await resolveVisibleLocator(shareSidebarRoot(page), 'share sidebar');

  const existingLink = await findOptionalVisibleLocator(publicLinkField(page), 1_000);
  if (!existingLink) {
    const createLink = await resolveVisibleLocator(createPublicLinkButton(page), 'create public link button');
    await createLink.click();
  }

  await resolveVisibleLocator(publicLinkField(page), 'public link field', ACTION_TIMEOUT_MS);
}

export async function closeShareSidebar(page: Page): Promise<void> {
  const closeButton = await findOptionalVisibleLocator(closeSidebarButton(page), 1_500);
  if (closeButton) {
    await closeButton.click();
    await page.waitForTimeout(350);
  }
}

export async function openImagePreview(page: Page, imageName: string): Promise<void> {
  const row = await resolveRow(page, imageName);
  await row.scrollIntoViewIfNeeded();

  const link = await visibleCandidate([
    () => row.getByRole('link', { name: new RegExp(imageName, 'i') }),
    () => row.locator('a').filter({ hasText: imageName }),
  ]);

  if (link) {
    await link.click();
  } else {
    await row.dblclick();
  }

  await resolveVisibleLocator(previewRoot(page), 'viewer root');
  await resolveVisibleLocator(previewImage(page), 'image preview content', ACTION_TIMEOUT_MS);
}

export async function openPdfPreview(page: Page, pdfName: string): Promise<void> {
  const row = await resolveRow(page, pdfName);
  await row.scrollIntoViewIfNeeded();

  const link = await visibleCandidate([
    () => row.getByRole('link', { name: new RegExp(pdfName, 'i') }),
    () => row.locator('a').filter({ hasText: pdfName }),
  ]);

  if (link) {
    await link.click();
  } else {
    await row.dblclick();
  }

  await resolveVisibleLocator(previewRoot(page), 'viewer root');
  await resolveVisibleLocator(previewPdf(page), 'PDF preview content', ACTION_TIMEOUT_MS);
}

export async function closePreview(page: Page, fallbackUrl: string): Promise<void> {
  const closeButton = await findOptionalVisibleLocator(previewCloseButton(page), 1_000);
  if (closeButton) {
    await closeButton.click();
  } else {
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  const previewStillVisible = await findOptionalVisibleLocator(previewRoot(page), 1_500);
  if (previewStillVisible) {
    await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded' });
    await waitForFilesReady(page, ACTION_TIMEOUT_MS);
  }
}

export async function loadPhotosGrid(page: Page, baseUrl: string, minPhotosCount: number): Promise<number> {
  await navigateToPhotos(page, baseUrl);
  return await waitForPhotosReady(page, minPhotosCount, ACTION_TIMEOUT_MS);
}

export async function collectPreflightSnapshot(
  page: Page,
  baseUrl: string,
  username: string,
  password: string,
  config: BenchmarkConfig,
): Promise<{
  hasSearchControl: boolean;
  hasSortControl: boolean;
  folderExists: boolean;
  imageExists: boolean;
  pdfExists: boolean;
  photosCount: number;
  visibleNames: string[];
}> {
  await navigateToFilesLogin(page, baseUrl);
  await loginToFiles(page, username, password);

  const folderExists = Boolean(await findOptionalVisibleLocator(fileRowByName(page, config.folderName), 2_000));
  if (!folderExists) {
    return {
      hasSearchControl: false,
      hasSortControl: false,
      folderExists,
      imageExists: false,
      pdfExists: false,
      photosCount: 0,
      visibleNames: [],
    };
  }

  await openFolder(page, config.folderName);
  await waitForFileListStability(page);
  const visibleNames = await visibleFileNames(page, 25);
  const hasSearchControl = Boolean(await resolveFolderSearchInput(page).catch(() => null));
  const hasSortControl = Boolean(
    (await findOptionalVisibleLocator(sortTrigger(page), 2_000)) ??
      (await findOptionalVisibleLocator(sortChoice(page, config.sortBy), 2_000)),
  );
  const imageExists = Boolean(await findOptionalVisibleLocator(fileRowByName(page, config.imageName), 2_500));
  const pdfExists = Boolean(await findOptionalVisibleLocator(fileRowByName(page, config.pdfName), 2_500));
  const photosCount = await loadPhotosGrid(page, baseUrl, config.minPhotosCount).catch(() => 0);

  return {
    hasSearchControl,
    hasSortControl,
    folderExists,
    imageExists,
    pdfExists,
    photosCount,
    visibleNames,
  };
}
