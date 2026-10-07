// Smoke test of the production build in headless Chromium (CDP). Run after `pnpm build`: `pnpm smoke`.
// Checks what reading the code can't: third-party requests, exports, the Chinese HUD, and the 375 px layout.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preview } from 'vite';

const CHROME = process.env.CHROME ?? 'chromium';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok, detail }); };

const server = await preview({ preview: { port: 4300, strictPort: false, open: false }, logLevel: 'silent' });
const origin = server.resolvedUrls.local[0].replace(/\/$/, '');
const profile = mkdtempSync(join(tmpdir(), 'paket-smoke-'));
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', `--remote-debugging-port=${port}`, '--enable-unsafe-swiftshader', '--use-angle=swiftshader', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

async function page(width, height, mobile) {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { /* not up yet */ }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map(), requests = [], errors = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const run = async expr => {
    const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description ?? 'evaluate failed');
    return res.result?.result?.value;
  };
  await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url: `${origin}/?lang=en` });
  await sleep(3000);
  return { run, requests, errors, close: () => ws.close() };
}

const clickText = text => `[...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)}))?.click()`;

try {
  /* ---- desktop: requests, exports, language ---- */
  const d = await page(1440, 900, false);
  await d.run(`document.querySelectorAll('.hud [aria-expanded="false"]').forEach(b => b.click())`);

  const exports = await d.run(`(async () => {
    const blobs = [];
    const create = URL.createObjectURL;
    URL.createObjectURL = b => { blobs.push(b); return create.call(URL, b); };
    for (const f of ['STL', 'GLB', 'PNG']) { [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(f)).click(); await new Promise(r => setTimeout(r, 2500)); }
    URL.createObjectURL = create;
    const [stl, glb, png] = blobs;
    const v = new DataView(await stl.arrayBuffer());
    const tris = v.getUint32(80, true), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let t = 0; t < tris; t++) for (let p = 0; p < 3; p++) for (let a = 0; a < 3; a++) {
      const x = v.getFloat32(84 + t * 50 + 12 + p * 12 + a * 4, true); lo[a] = Math.min(lo[a], x); hi[a] = Math.max(hi[a], x);
    }
    return { sizes: blobs.map(b => b.size), stlSize: hi.map((h, a) => Math.round((h - lo[a]) * 10) / 10), tris };
  })()`);
  check('exports are non-empty', exports.sizes.length === 3 && exports.sizes.every(n => n > 0), exports.sizes);
  // pitch 5 mm: 14 × 14 × 10 voxels (x, y, z)
  check('STL is the rest pose in mm', JSON.stringify(exports.stlSize) === JSON.stringify([70, 70, 50]), exports.stlSize);

  await d.run(clickText('中文'));
  await sleep(400);
  // Latin words left on screen in Chinese; key caps, codes, units, materials and names stay Latin by design
  const KEEP = /^(PAKET|Paket|EN|mm|cm|Shift|Esc|Space|src|core|ts|ABS|PLA|ISO|STL|GLB|PNG|MIT|Senda|Matias|Lapolla|WASD)$/;
  const latin = await d.run(`(() => {
    const out = new Set();
    const walk = document.createTreeWalker(document.querySelector('.hud'), NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) {
      const el = n.parentElement;
      if (!el || !el.checkVisibility({ checkVisibilityCSS: true }) || el.closest('[aria-hidden="true"], kbd, code, .tabular')) continue;
      for (const w of n.textContent.match(/[A-Za-z]{2,}/g) ?? []) out.add(w);
    }
    return [...out];
  })()`);
  const untranslated = latin.filter(w => !KEEP.test(w));
  check('Chinese HUD has no untranslated words', untranslated.length === 0, untranslated);
  check('desktop has no runtime errors', d.errors.length === 0, d.errors);
  const foreign = [...new Set(d.requests.filter(u => !u.startsWith(origin) && !/^(data|blob):/.test(u)))];
  check('no third-party requests', foreign.length === 0, foreign);
  d.close();

  /* ---- 375 px: no horizontal scroll on any tab, every control reachable ---- */
  const m = await page(375, 812, true);
  const tabs = await m.run(`(async () => {
    const out = [];
    for (const tab of document.querySelectorAll('.sheet-tab')) {
      tab.click();
      await new Promise(r => setTimeout(r, 400));
      const body = document.querySelector('.sheet-body');
      const sheet = document.querySelector('.sheet').getBoundingClientRect();
      const controls = [...body.querySelectorAll('button, input, select')];
      const unreachable = controls.filter(c => {
        c.scrollIntoView({ block: 'nearest' });
        const r = c.getBoundingClientRect();
        return r.width < 24 || r.height < 24 || r.left < -1 || r.right > innerWidth + 1 || r.top < sheet.top - 1 || r.bottom > sheet.bottom + 1;
      }).map(c => c.textContent.trim() || c.getAttribute('aria-label') || c.type);
      out.push({ tab: tab.textContent.trim(), overflow: document.documentElement.scrollWidth - innerWidth, controls: controls.length, unreachable });
    }
    return out;
  })()`);
  check('375 px: no horizontal scroll', tabs.every(t => t.overflow <= 0), tabs.map(t => `${t.tab}:${t.overflow}`));
  check('375 px: every control reachable and at least 24 px', tabs.every(t => t.controls > 0 && t.unreachable.length === 0), tabs.map(t => ({ tab: t.tab, controls: t.controls, unreachable: t.unreachable })));
  check('mobile has no runtime errors', m.errors.length === 0, m.errors);
  m.close();
} catch (e) {
  check('smoke run', false, String(e));
} finally {
  chrome.kill();
  await server.close();
  rmSync(profile, { recursive: true, force: true });
}

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `  ${JSON.stringify(r.detail)}`}`);
process.exit(results.every(r => r.ok) ? 0 : 1);
