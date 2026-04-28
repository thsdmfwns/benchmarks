import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import puppeteer, { type Browser as PuppeteerBrowser, type Page as PuppeteerPage } from 'puppeteer';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { sleep } from './utils.js';

type PersistentLaunchOptions = NonNullable<Parameters<typeof chromium.launchPersistentContext>[1]>;

export interface BrowserSession {
  context: BrowserContext;
  page: Page;
  puppeteerBrowser: PuppeteerBrowser;
  puppeteerPage: PuppeteerPage;
  close(): Promise<void>;
}

async function getAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to acquire a debugging port.'));
        return;
      }

      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

async function waitForDebugEndpoint(port: number, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const endpoint = `http://127.0.0.1:${port}/json/version`;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore startup failures and keep polling.
    }

    await sleep(250);
  }

  throw new Error(`Timed out waiting for Chrome DevTools endpoint on port ${port}.`);
}

async function resolvePuppeteerPage(browser: PuppeteerBrowser, timeoutMs = 15_000): Promise<PuppeteerPage> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const pages = await browser.pages();
    const page = pages.find((candidate) => !candidate.url().startsWith('chrome-extension://'));

    if (page) {
      return page;
    }

    await sleep(250);
  }

  throw new Error('Timed out waiting for a Puppeteer page attached to the Playwright browser.');
}

function baseLaunchOptions(port: number, headless: boolean): PersistentLaunchOptions {
  return {
    headless,
    viewport: { width: 1440, height: 900 },
    args: [
      `--remote-debugging-port=${port}`,
      '--disable-gpu',
      '--disable-extensions',
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion,RendererCodeIntegrity',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  };
}

function detectInstalledBrowserExecutables(): Array<{ name: string; executablePath: string }> {
  const candidates = [
    {
      name: 'system-chrome',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    },
    {
      name: 'system-chrome-x86',
      executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    },
    {
      name: 'system-edge',
      executablePath: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    },
    {
      name: 'system-edge-x86',
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    },
  ];

  return candidates.filter((candidate) => {
    try {
      return existsSync(candidate.executablePath);
    } catch {
      return false;
    }
  });
}

async function launchWithFallback(
  userDataDir: string,
  port: number,
  headless: boolean,
): Promise<BrowserContext> {
  const installedExecutables = detectInstalledBrowserExecutables();
  const profiles: Array<{ name: string; options: PersistentLaunchOptions }> = [
    ...installedExecutables.map((browser) => ({
      name: browser.name,
      options: {
        ...baseLaunchOptions(port, headless),
        executablePath: browser.executablePath,
      },
    })),
    {
      name: 'chrome-channel',
      options: {
        ...baseLaunchOptions(port, headless),
        channel: 'chrome',
      },
    },
    {
      name: 'edge-channel',
      options: {
        ...baseLaunchOptions(port, headless),
        channel: 'msedge',
      },
    },
    {
      name: 'chromium-bundled',
      options: baseLaunchOptions(port, headless),
    },
  ];

  let lastError: unknown;
  for (const profile of profiles) {
    try {
      return await chromium.launchPersistentContext(userDataDir, profile.options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function createBrowserSession(headless: boolean): Promise<BrowserSession> {
  const port = await getAvailablePort();
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'nextcloud-benchmark-'));
  const context = await launchWithFallback(userDataDir, port, headless);

  context.setDefaultTimeout(20_000);
  context.setDefaultNavigationTimeout(30_000);

  const page = context.pages()[0] ?? (await context.newPage());
  await waitForDebugEndpoint(port);

  const puppeteerBrowser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${port}`,
    defaultViewport: null,
  });
  const puppeteerPage = await resolvePuppeteerPage(puppeteerBrowser);

  return {
    context,
    page,
    puppeteerBrowser,
    puppeteerPage,
    async close() {
      puppeteerBrowser.disconnect();
      await context.close();
      await rm(userDataDir, { recursive: true, force: true });
    },
  };
}
