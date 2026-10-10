import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { requireThat } from './errors.js';

export function safeURL(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    /* fail below */
  }
  requireThat(
    url &&
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      value.length <= 4096,
    'invalid_url',
    'Use an HTTP(S) URL without credentials.',
  );
  return url.href;
}
export class Browser {
  constructor(home, onEvent) {
    this.home = home;
    this.onEvent = onEvent;
    this.pages = new Map();
    this.nextId = 1;
    this.selected = null;
  }
  async init() {
    // This volume belongs to the sole owned container. Remove only stale
    // Chromium symlink locks before any agent/desktop process can use it.
    for (const name of [
      'SingletonLock',
      'SingletonCookie',
      'SingletonSocket',
    ]) {
      const file = `${this.home}/browser/${name}`;
      try {
        const stat = await fs.lstat(file);
        requireThat(
          stat.isSymbolicLink(),
          'profile_lock',
          'Unexpected profile lock file. Inspect the owned computer.',
        );
        await fs.unlink(file);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    this.context = await chromium.launchPersistentContext(
      `${this.home}/browser`,
      {
        executablePath: '/opt/computer-mcp/runtime/chromium-agent.sh',
        headless: false,
        timeout: 20000,
        viewport: null,
        chromiumSandbox: false,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--hide-crash-restore-bubble',
          '--window-size=1280,800',
          '--window-position=0,0',
        ],
        env: {
          PATH: '/usr/local/bin:/usr/bin:/bin',
          DISPLAY: ':1',
          HOME: this.home,
          LANG: 'C.UTF-8',
        },
        acceptDownloads: false,
      },
    );
    await this.context.exposeBinding('__computerTeach', ({ page }, event) =>
      this.onEvent?.(page, event),
    );
    await this.context.addInitScript({
      path: '/opt/computer-mcp/runtime/recorder.js',
    });
    this.context.on('page', (page) => this.track(page));
    for (const page of this.context.pages()) this.track(page);
    this.context.on('dialog', (dialog) => dialog.dismiss());
    if (!this.pages.size) this.track(await this.context.newPage());
    await this.page().goto('http://127.0.0.1:7070/demo');
  }
  track(page) {
    const id = String(this.nextId++);
    this.pages.set(id, page);
    this.selected = id;
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(15000);
    page.on('close', () => {
      this.pages.delete(id);
      if (this.selected === id) this.selected = this.pages.keys().next().value;
    });
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame())
        this.onEvent?.(page, { type: 'navigate', url: frame.url() });
    });
    page.on('dialog', (dialog) => dialog.dismiss());
  }
  page(id = this.selected) {
    const page = this.pages.get(id);
    requireThat(
      page && !page.isClosed(),
      'page_missing',
      'Choose an existing browser page.',
      409,
    );
    return page;
  }
  async snapshot(pageId) {
    const page = this.page(pageId);
    const data = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll(
          'a,button,input,textarea,select,[role="button"]',
        ),
      ).slice(0, 100);
      return {
        title: document.title,
        text: (document.body?.innerText || '').slice(0, 12000),
        elements: elements.map((el) => ({
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          text: (el.innerText || el.getAttribute('aria-label') || '').slice(
            0,
            120,
          ),
          selector: el.id
            ? `#${CSS.escape(el.id)}`
            : el.getAttribute('data-testid')
              ? `[data-testid="${CSS.escape(el.getAttribute('data-testid'))}"]`
              : null,
          inputType: el.getAttribute('type'),
        })),
      };
    });
    return {
      ...data,
      url: page.url(),
      pageId: [...this.pages].find(([, p]) => p === page)?.[0],
      pages: await Promise.all(
        [...this.pages].map(async ([id, p]) => ({
          id,
          url: p.url(),
          title: await p.title().catch(() => ''),
        })),
      ),
    };
  }
  async action(input, signal) {
    const page = this.page(input.pageId);
    this.selected = [...this.pages].find(([, p]) => p === page)[0];
    requireThat(!signal?.aborted, 'cancelled', 'Operation cancelled.');
    const abort = () => {
      void page.close().catch(() => {});
    };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      await page.bringToFront();
      switch (input.action) {
        case 'navigate':
          await page.goto(safeURL(input.url), {
            waitUntil: 'domcontentloaded',
          });
          break;
        case 'click':
          await page.locator(input.selector).click();
          break;
        case 'fill':
          await page.locator(input.selector).fill(input.text);
          break;
        case 'press':
          await page.locator(input.selector || 'body').press(input.key);
          break;
        default:
          requireThat(false, 'invalid_action', 'Unsupported browser action.');
      }
      return { url: page.url(), title: await page.title() };
    } finally {
      signal?.removeEventListener('abort', abort);
      if (!this.pages.size) this.track(await this.context.newPage());
    }
  }
}
