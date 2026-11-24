#!/usr/bin/env node
// Renders the docs' share image, public/og.png (1200 × 630): the vermilion app tile, "Durable Runner
// Docs" and one line on a white page, in the design system's colours and its webfont (the copy in
// public/fonts, inlined, so nothing is fetched). Every page's og:image and twitter:image point at it
// (astro.config.mjs). Run it by hand when the design changes, and commit the PNG:
//
//   node scripts/make-og.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const root = new URL('..', import.meta.url);
const font = readFileSync(new URL('public/fonts/google-sans-flex-latin.woff2', root)).toString('base64');

// The tile is the favicon's (public/favicon.svg) at 120 px, with the header's inner glow.
const frames = `
	<rect x="9.6" y="4.2" width="10.2" height="10.2" rx="2.6" stroke-width="1.6" opacity="0.6"/>
	<rect x="6.9" y="6.9" width="10.2" height="10.2" rx="2.6" stroke-width="1.6" opacity="0.85"/>
	<rect x="4.2" y="9.6" width="10.2" height="10.2" rx="2.6" fill="currentColor" stroke-width="1.6"/>`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
	@font-face { font-family: 'Google Sans Flex'; font-weight: 100 1000; src: url(data:font/woff2;base64,${font}) format('woff2'); }
	* { box-sizing: border-box; margin: 0; }
	html, body { width: 1200px; height: 630px; }
	body {
		position: relative; overflow: hidden; background: #ffffff; color: #1e1e1e;
		font-family: 'Google Sans Flex', sans-serif; font-optical-sizing: auto; -webkit-font-smoothing: antialiased;
		padding: 88px 96px;
	}
	/* the journal frames again, large and faint, bleeding off the right edge */
	.mark { position: absolute; right: -150px; bottom: -170px; width: 640px; height: 640px; color: #ffe6da; }
	.tile {
		display: grid; place-items: center; width: 120px; height: 120px; border-radius: 32px; color: #ffffff;
		background: radial-gradient(120% 90% at 22% 8%, #ffd9c2 0%, transparent 48%), linear-gradient(150deg, #ff9a5c 0%, #f0501f 100%);
		box-shadow: inset 0 0 0 1px #ffffff40, inset 0 -10px 20px -10px #b8340f55, 0 18px 36px -18px #b8340f80;
	}
	.tile svg { width: 58%; height: 58%; }
	h1 { margin-top: 56px; font-size: 84px; font-weight: 480; letter-spacing: -0.03em; line-height: 1; }
	h1 span { color: #5c5c5c; font-weight: 420; }
	p { margin-top: 26px; max-width: 760px; font-size: 34px; line-height: 1.3; letter-spacing: -0.01em; color: #474747; }
	.url { position: absolute; left: 96px; bottom: 72px; font-size: 24px; letter-spacing: 0.005em; color: #8c8c8c; }
	.rule { position: absolute; left: 0; right: 0; top: 0; height: 10px; background: linear-gradient(90deg, #ff9a5c, #f0501f); }
</style></head><body>
	<div class="rule"></div>
	<svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linejoin="round">${frames}</svg>
	<div class="tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linejoin="round">${frames}</svg></div>
	<h1>Durable Runner <span>Docs</span></h1>
	<p>The open-source job runner whose journal outlives its process.</p>
	<div class="url">docs.durable-runner.404human.dev</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: 'png' });
await browser.close();

writeFileSync(new URL('public/og.png', root), png);
console.log(`make-og: wrote public/og.png (1200 × 630, ${Math.round(png.length / 1024)} kB)`);
