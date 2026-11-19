// Inspector screenshots for the docs. Run in an unrestricted shell (needs Chromium):
//   node scripts/inspector-shots.mjs [base-url] [out-dir]
// Base defaults to the local shot server from snippets/shot-server.sh.
// The read key is seeded into sessionStorage exactly as the Inspector would —
// the "key" shot is taken with an empty session.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:58541';
const OUT = process.argv[3] || 'public/shots';
const READ_KEY = process.env.SHOT_READ_KEY || 'shotread-0123456789abcdef0123456789ab';
const KEY_SLOT = 'durable-api-key';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

async function shot(name, width, height, withKey) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  if (withKey) await ctx.addInitScript(([k, v]) => sessionStorage.setItem(k, v), [KEY_SLOT, READ_KEY]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/inspector/`, { waitUntil: 'networkidle' });
  if (withKey) await page.waitForSelector('tbody tr', { timeout: 10_000 });
  else await page.waitForSelector('.key-field input', { timeout: 10_000 });
  await page.screenshot({ path: path.join(OUT, name) });
  console.log(`wrote ${name}`);
  await ctx.close();
}

await shot('inspector-key-1440.png', 1440, 900, false);
await shot('inspector-runs-1440.png', 1440, 900, true);
await shot('inspector-runs-390.png', 390, 844, true);
await browser.close();
