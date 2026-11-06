// Renders the guest desktop wallpaper and dock icons from the Sendtry brand
// mark. Run after changing the artwork: node scripts/render-desktop-art.mjs
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url);
const mark = (await fs.readFile(new URL('ui/assets/sendtry.svg', root), 'utf8'))
  .replace(/<text[\s\S]*?<\/text>/, '')
  .replace('viewBox="0 0 104 32"', 'viewBox="6 6 20 20"');
const out = new URL('runtime/shell/', root);

const wallpaper = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:1280px;height:800px;overflow:hidden;font-family:"Helvetica Neue",Inter,system-ui,sans-serif}
body{background:
 radial-gradient(60% 70% at 80% 12%, rgba(208,106,84,.42), transparent 70%),
 radial-gradient(55% 60% at 8% 100%, rgba(52,84,160,.38), transparent 70%),
 linear-gradient(180deg,#1f1d24 0%,#121419 100%)}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:60px}
.m{width:150px;height:150px;filter:drop-shadow(0 0 28px rgba(208,106,84,.55))}
.m svg{width:100%;height:100%}
h1{margin:26px 0 8px;color:#f4f2f0;font-size:46px;font-weight:700;letter-spacing:-.02em}
p{margin:0;color:#aaa3a6;font-size:20px}
</style><div class="c"><div class="m">${mark}</div><h1>Sendtry Computer</h1><p>Your agent's Linux desktop · browser, files and terminal</p></div>`;

const glyph = {
  home: `<path d="M5 11.5 12 5l7 6.5V19a1 1 0 0 1-1 1h-4v-5h-4v5H6a1 1 0 0 1-1-1z" fill="#fff"/>`,
  browser: `<circle cx="12" cy="12" r="7.5" stroke="#fff" stroke-width="1.8" fill="none"/><ellipse cx="12" cy="12" rx="3.2" ry="7.5" stroke="#fff" stroke-width="1.6" fill="none"/><path d="M4.8 9.5h14.4M4.8 14.5h14.4" stroke="#fff" stroke-width="1.6"/>`,
  files: `<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h4l1.6 1.8h7.4A1.5 1.5 0 0 1 20 9.3v8.2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" fill="#fff"/><path d="M4 10h16" stroke="#e0973a" stroke-width="1.4"/>`,
  terminal: `<path d="m6.5 8.5 3.5 3.5-3.5 3.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16h5.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
};
const tint = {
  home: 'linear-gradient(160deg,#e07a63,#c25a44)',
  browser: 'linear-gradient(160deg,#4f8ff0,#2f63c9)',
  files: 'linear-gradient(160deg,#f2b552,#db8d2c)',
  terminal: 'linear-gradient(160deg,#454b57,#262a32)',
};
const icon = (
  name,
) => `<!doctype html><style>html,body{margin:0;background:transparent}
div{width:88px;height:88px;margin:4px;border-radius:22px;background:${tint[name]};box-shadow:inset 0 1px 0 rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center}
svg{width:56px;height:56px}</style><div><svg viewBox="0 0 24 24">${glyph[name]}</svg></div>`;

const browser = await chromium.launch(
  process.env.ART_CHANNEL ? { channel: process.env.ART_CHANNEL } : {},
);
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await page.setContent(wallpaper);
  await page.screenshot({ path: new URL('wallpaper.png', out).pathname });
  const small = await browser.newPage({ viewport: { width: 96, height: 96 } });
  for (const name of Object.keys(glyph)) {
    await small.setContent(icon(name));
    await small.screenshot({
      path: new URL(`icons/${name}.png`, out).pathname,
      omitBackground: true,
    });
  }
} finally {
  await browser.close();
}
