import type { Locator, Page } from 'playwright';
import { escapeRegExp, sleep } from '../utils.js';

const DEFAULT_TIMEOUT_MS = 12_000;

type LocatorFactory = () => Locator;

async function isVisible(locator: Locator, timeoutMs = 1_200): Promise<boolean> {
  try {
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

export async function resolveVisibleLocator(
  factories: LocatorFactory[],
  description: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Locator> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const factory of factories) {
      const locator = factory().first();
      if (await isVisible(locator)) {
        return locator;
      }
    }

    await sleep(200);
  }

  throw new Error(`Unable to resolve locator for ${description}.`);
}

export async function findOptionalVisibleLocator(
  factories: LocatorFactory[],
  timeoutMs = 2_500,
): Promise<Locator | null> {
  try {
    return await resolveVisibleLocator(factories, 'optional locator', timeoutMs);
  } catch {
    return null;
  }
}

export function loginUsernameInput(page: Page): LocatorFactory[] {
  return [
    () => page.locator('input[name="user"]'),
    () => page.locator('input#user'),
    () => page.locator('input[autocomplete="username"]'),
    () => page.getByLabel(/user(name)?|email/i),
  ];
}

export function loginPasswordInput(page: Page): LocatorFactory[] {
  return [
    () => page.locator('input[name="password"]'),
    () => page.locator('input#password'),
    () => page.locator('input[type="password"]'),
    () => page.getByLabel(/password/i),
  ];
}

export function loginSubmitButton(page: Page): LocatorFactory[] {
  return [
    () => page.getByRole('button', { name: /log ?in|sign ?in/i }),
    () => page.locator('button[type="submit"]'),
    () => page.locator('input[type="submit"]'),
  ];
}

export function filesAppRoot(page: Page): LocatorFactory[] {
  return [
    () => page.locator('#app-content-files'),
    () => page.locator('[data-cy-files-content]'),
    () => page.locator('#app-content-vue'),
    () => page.locator('main[role="main"]'),
  ];
}

export function fileRows(page: Page): Locator {
  return page.locator('[data-file]:visible, tr[data-file]:visible, [data-cy-files-list-row]:visible');
}

export function fileRowByName(page: Page, name: string): LocatorFactory[] {
  const nameRegex = new RegExp(escapeRegExp(name), 'i');
  const escapedName = name.replaceAll('"', '\\"');

  return [
    () => page.locator(`[data-file="${escapedName}"]`),
    () => page.locator(`tr[data-file="${escapedName}"]`),
    () => page.getByRole('row', { name: nameRegex }),
    () => page.locator('[data-file], tr[data-file], [data-cy-files-list-row], tbody tr').filter({ hasText: name }),
  ];
}

export function rowShareButton(row: Locator): LocatorFactory[] {
  return [
    () => row.getByRole('button', { name: /share/i }),
    () => row.locator('button[aria-label*="hare" i]'),
    () => row.locator('button.action-share, [data-action="Share"]'),
  ];
}

export function rowActionMenuButton(row: Locator): LocatorFactory[] {
  return [
    () => row.getByRole('button', { name: /actions|more/i }),
    () => row.locator('button[aria-label*="Actions" i]'),
    () => row.locator('button.action-menu, button.more-actions'),
  ];
}

export function actionMenuShareItem(page: Page): LocatorFactory[] {
  return [
    () => page.getByRole('menuitem', { name: /share/i }),
    () => page.getByRole('button', { name: /share/i }),
    () => page.locator('[role="menuitem"]').filter({ hasText: /share/i }),
  ];
}

export function folderSearchInput(page: Page): LocatorFactory[] {
  return [
    () => page.locator('input[type="search"]'),
    () => page.locator('input[placeholder*="Filter" i]'),
    () => page.locator('input[placeholder*="Search" i]'),
    () => page.locator('input[placeholder*="검색"]'),
    () => page.locator('input[aria-label*="Filter" i]'),
    () => page.locator('input[aria-label*="Search" i]'),
    () => page.locator('input[aria-label*="검색"]'),
    () => page.locator('[role="searchbox"]'),
    () => page.locator('.app-navigation-search input'),
    () => page.locator('#app-navigation-vue input[type="text"]'),
    () => page.locator('nav input[type="text"]'),
    () => page.locator('input[class*="search"]'),
  ];
}

export function folderSearchButton(page: Page): LocatorFactory[] {
  return [
    () => page.getByRole('button', { name: /search|find|검색/i }),
    () => page.locator('button[aria-label*="Search" i]'),
    () => page.locator('button[aria-label*="검색"]'),
    () => page.locator('.app-navigation-search button'),
    () => page.locator('button[class*="search"]'),
  ];
}

export function sortTrigger(page: Page): LocatorFactory[] {
  return [
    () => page.getByRole('button', { name: /sort/i }),
    () => page.locator('button[aria-label*="Sort" i]'),
    () => page.locator('[data-cy-sort-button]'),
  ];
}

export function sortChoice(page: Page, sortBy: string): LocatorFactory[] {
  const nameRegex = new RegExp(`^${escapeRegExp(sortBy)}$`, 'i');

  return [
    () => page.getByRole('menuitemradio', { name: nameRegex }),
    () => page.getByRole('option', { name: nameRegex }),
    () => page.getByRole('button', { name: nameRegex }),
    () => page.getByRole('columnheader', { name: nameRegex }),
    () => page.getByText(nameRegex, { exact: true }),
  ];
}

export function shareSidebarRoot(page: Page): LocatorFactory[] {
  return [
    () => page.locator('#app-sidebar-vue'),
    () => page.locator('[data-cy-sidebar]'),
    () => page.locator('[aria-label*="Share" i]'),
    () => page.locator('aside'),
  ];
}

export function createPublicLinkButton(page: Page): LocatorFactory[] {
  return [
    () => page.getByRole('button', { name: /create .*link|add .*link|new link|public link/i }),
    () => page.locator('button').filter({ hasText: /link/i }),
    () => page.locator('[data-cy-create-share-link]'),
  ];
}

export function publicLinkField(page: Page): LocatorFactory[] {
  return [
    () => page.locator('input[readonly][value^="http"]'),
    () => page.locator('input[type="url"]'),
    () => page.locator('[data-cy-share-link-url]'),
    () => page.getByRole('textbox', { name: /link/i }),
  ];
}

export function removePublicLinkButton(page: Page): LocatorFactory[] {
  return [
    () => page.getByRole('button', { name: /remove|delete/i }),
    () => page.locator('button[aria-label*="Remove" i], button[aria-label*="Delete" i]'),
    () => page.locator('[data-cy-remove-share-link]'),
  ];
}

export function closeSidebarButton(page: Page): LocatorFactory[] {
  return [
    () => page.getByRole('button', { name: /close/i }),
    () => page.locator('button[aria-label*="Close" i]'),
    () => page.locator('.app-sidebar__close, .icon-close'),
  ];
}

export function previewRoot(page: Page): LocatorFactory[] {
  return [
    () => page.locator('#viewer'),
    () => page.locator('[data-cy-viewer-root]'),
    () => page.locator('.viewer, .viewer__content'),
    () => page.locator('[aria-modal="true"]'),
  ];
}

export function previewImage(page: Page): LocatorFactory[] {
  return [
    () => page.locator('#viewer img'),
    () => page.locator('.viewer img'),
    () => page.locator('img[src*="preview"], img[alt]'),
  ];
}

export function previewPdf(page: Page): LocatorFactory[] {
  return [
    () => page.locator('#viewer canvas'),
    () => page.locator('#viewer iframe'),
    () => page.locator('canvas'),
    () => page.locator('iframe[src*="pdf"], embed[type="application/pdf"], object[type="application/pdf"]'),
  ];
}

export function previewCloseButton(page: Page): LocatorFactory[] {
  return [
    () => page.getByRole('button', { name: /close/i }),
    () => page.locator('button[aria-label*="Close" i]'),
    () => page.locator('.viewer .icon-close, .viewer button.close'),
  ];
}

export function photosTiles(page: Page): Locator {
  return page.locator(
    '[data-cy-photo-tile]:visible, [data-cy-photos-tile]:visible, [data-file-id]:visible, .photo-list__item:visible, .photos-grid__item:visible, .timeline-grid-item:visible, [class*="photo-wrapper"]:visible, [class*="timeline"] img:visible, main img:visible',
  );
}

export async function visibleFileNames(page: Page, limit = 10): Promise<string[]> {
  const rows = fileRows(page);
  const values = await rows.evaluateAll((elements, maxResults) => {
    const reserved = new Set(['이름', '크기', '수정됨', '종류', '사람', 'Name', 'Size', 'Modified', 'Type', 'People']);
    const seen = new Set<string>();
    const results: string[] = [];

    for (const element of elements) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }

      const dataFile = element.getAttribute('data-file')?.trim();
      const firstLine = (element.innerText || element.textContent || '')
        .split(/\r?\n/)
        .map((part) => part.trim())
        .find(Boolean);
      const candidate = dataFile || firstLine;

      if (!candidate || reserved.has(candidate) || seen.has(candidate)) {
        continue;
      }

      seen.add(candidate);
      results.push(candidate);

      if (results.length >= maxResults) {
        break;
      }
    }

    return results;
  }, limit);

  if (values.length > 0) {
    return values;
  }

  return await page
    .locator('tbody tr a, [data-cy-files-list-row] a')
    .evaluateAll((elements, maxResults) => {
      const results: string[] = [];
      for (const element of elements) {
        if (!(element instanceof HTMLElement)) {
          continue;
        }

        const value = (element.innerText || element.textContent || '').trim();
        if (!value || results.includes(value)) {
          continue;
        }

        results.push(value);
        if (results.length >= maxResults) {
          break;
        }
      }

      return results;
    }, limit)
    .catch(() => []);
}

export async function waitForFilesReady(page: Page, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (/\/apps\/files/i.test(page.url()) && (await fileRows(page).count()) > 0) {
      return;
    }

    const root = await findOptionalVisibleLocator(filesAppRoot(page), 800);
    if (root && (await fileRows(page).count()) > 0) {
      return;
    }

    await sleep(200);
  }

  throw new Error('Files app did not become ready in time.');
}

export async function waitForFolderOpen(page: Page, folderName: string, previousUrl: string): Promise<void> {
  const deadline = Date.now() + DEFAULT_TIMEOUT_MS;
  const nameRegex = new RegExp(escapeRegExp(folderName), 'i');

  while (Date.now() < deadline) {
    const urlChanged = page.url() !== previousUrl;
    const breadcrumbVisible = await isVisible(page.getByText(nameRegex, { exact: true }).first(), 500);
    const rowCount = await fileRows(page).count();

    if ((urlChanged || breadcrumbVisible) && rowCount > 0) {
      return;
    }

    await sleep(200);
  }

  throw new Error(`Folder "${folderName}" did not open in time.`);
}

export async function waitForPhotosReady(page: Page, minPhotosCount: number, timeoutMs = 30_000): Promise<number> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (/\/apps\/photos/i.test(page.url())) {
      const count = await photosTiles(page).count();
      if (count >= minPhotosCount) {
        return count;
      }
    }

    await sleep(250);
  }

  throw new Error(`Photos app did not expose at least ${minPhotosCount} image tile(s).`);
}

export async function waitForFileListStability(page: Page, stableDelayMs = 500): Promise<void> {
  const firstSnapshot = JSON.stringify(await visibleFileNames(page, 20));
  await sleep(stableDelayMs);
  const secondSnapshot = JSON.stringify(await visibleFileNames(page, 20));

  if (firstSnapshot !== secondSnapshot) {
    await sleep(stableDelayMs);
  }
}
