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
  async init(signal) {
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
        // The control server owns shutdown ordering and lease/checkpoint cleanup.
        // Playwright's default process signal handlers can exit before it finishes.
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
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
    const context = this.context;
    context.on('close', () => {
      if (this.context !== context) return;
      this.context = undefined;
      this.pages.clear();
      this.selected = null;
    });
    const abort = () => {
      void context.close().catch(() => {});
    };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      if (signal?.aborted) abort();
      requireThat(!signal?.aborted, 'cancelled', 'Operation cancelled.');
      await context.exposeBinding('__computerTeach', ({ page }, event) => {
        if (!this.desktopRecording) return this.onEvent?.(page, event);
      });
      await context.addInitScript({
        path: '/opt/computer-mcp/runtime/recorder.js',
      });
      context.on('page', (page) => this.track(page));
      for (const page of context.pages()) this.track(page);
      context.on('dialog', (dialog) => dialog.dismiss());
      if (!this.pages.size) this.track(await context.newPage());
      await this.page().goto('http://127.0.0.1:7070/demo');
    } catch (error) {
      await context.close().catch(() => {});
      throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
    }
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
      if (frame === page.mainFrame() && !this.desktopRecording)
        this.onEvent?.(page, { type: 'navigate', url: frame.url() });
    });
    page.on('dialog', (dialog) => dialog.dismiss());
  }
  async withDesktopRecording(perform, onIncomplete = () => {}) {
    const mark = async (value) => {
      let timer;
      try {
        await Promise.race([
          Promise.all(
            [...this.pages.values()]
              .filter((p) => !p.isClosed())
              .map(async (page) => {
                const apply = () =>
                  page.evaluate(async (muted) => {
                    if (!muted)
                      await new Promise((resolve) => setTimeout(resolve, 0));
                    window.__computerDesktopInput = muted;
                  }, value);
                try {
                  await apply();
                } catch (error) {
                  if (page.isClosed()) return;
                  // Navigation destroys the old document and its marker.
                  // Clear the replacement context once; all attempts share
                  // the same bounded deadline. Other failures are incomplete.
                  if (
                    !value &&
                    /Execution context was destroyed/.test(error.message || '')
                  )
                    await apply();
                  else throw error;
                }
              }),
          ),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error('recorder unavailable')),
              1000,
            );
          }),
        ]);
      } catch {
        requireThat(
          false,
          'recording_unavailable',
          'Could not correlate browser recording. Save Teach before continuing desktop input.',
          409,
        );
      } finally {
        clearTimeout(timer);
      }
    };
    this.desktopRecording = true;
    try {
      await mark(true);
      return await perform();
    } finally {
      try {
        await mark(false);
      } catch {
        // Input may already have been sent. Preserve its outcome and recorded
        // step; the caller must save Teach as interrupted before allowing export.
        onIncomplete();
      } finally {
        this.desktopRecording = false;
      }
    }
  }
  page(id = this.selected) {
    requireThat(
      this.context && this.pages.size,
      'browser_closed',
      'The browser was closed. Acquire control and navigate without a pageId to reopen it.',
      409,
    );
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
      const selectorFor = (el) => {
        const parts = [];
        for (let node = el; node?.nodeType === 1; node = node.parentElement) {
          if (
            node.id &&
            document.querySelectorAll('#' + CSS.escape(node.id)).length === 1
          ) {
            parts.unshift('#' + CSS.escape(node.id));
            break;
          }
          const tag = node.tagName.toLowerCase();
          const siblings = node.parentElement
            ? [...node.parentElement.children].filter(
                (item) => item.tagName === node.tagName,
              )
            : [];
          parts.unshift(
            tag +
              (siblings.length > 1
                ? `:nth-of-type(${siblings.indexOf(node) + 1})`
                : ''),
          );
          if (tag === 'body') break;
        }
        return parts.join(' > ');
      };
      const elements = [];
      let bytes = 0;
      for (const el of [
        ...document.querySelectorAll(
          'a[href],button,input,textarea,select,[role="button"]',
        ),
      ].slice(0, 600)) {
        const rect = el.getBoundingClientRect(),
          style = getComputedStyle(el);
        if (
          !rect.width ||
          !rect.height ||
          style.visibility === 'hidden' ||
          style.display === 'none' ||
          el.matches(
            'input[type="password"],input[type="hidden"],input[type="file"]',
          )
        )
          continue;
        const selector = selectorFor(el);
        if (!selector || selector.length > 500) continue;
        const item = {
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          text: (
            el.getAttribute('aria-label') ||
            (el.labels &&
              [...el.labels].map((label) => label.innerText).join(' ')) ||
            el.innerText ||
            el.getAttribute('placeholder') ||
            ''
          )
            .trim()
            .slice(0, 160),
          selector,
          inputType: el.getAttribute('type'),
        };
        if (el.tagName === 'A') {
          try {
            const url = new URL(el.href, location.href);
            if (
              ['http:', 'https:'].includes(url.protocol) &&
              !url.username &&
              !url.password
            )
              item.url = url.href;
          } catch {
            /* malformed links are not usable navigation targets */
          }
        }
        bytes += JSON.stringify(item).length;
        if (bytes > 16000) break;
        elements.push(item);
        if (elements.length === 80) break;
      }
      return {
        title: document.title,
        text: (document.body?.innerText || '').slice(0, 12000),
        elements,
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
    requireThat(!signal?.aborted, 'cancelled', 'Operation cancelled.');
    if (!this.context || !this.pages.size) {
      requireThat(
        input.action === 'navigate' && !input.pageId,
        'browser_closed',
        'The browser was closed. Navigate without a pageId to reopen it.',
        409,
      );
      if (!this.context) await this.init(signal);
      else this.track(await this.context.newPage());
      if (signal?.aborted) await this.context?.close();
      requireThat(!signal?.aborted, 'cancelled', 'Operation cancelled.');
    }
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
      if (this.context && !this.pages.size && !signal?.aborted)
        this.track(await this.context.newPage());
    }
  }
}
