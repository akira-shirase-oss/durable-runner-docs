// Contrast, computed from the real resolved values — never from token names. Starlight inverts
// its scale in the light theme (--sl-color-black is the page there, white), so a mix that looks dark
// on paper can resolve light. This test parses the actual custom-property declarations the build
// ships — Starlight's props.css plus our theme.css — resolves var() chains and color-mix(), and
// checks every text/background pair the pages rely on, per theme, at WCAG levels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

/** Collect `--name: value` declarations per scope ('dark' = plain :root, 'light' = the override). */
function scopes(file) {
	const css = readFileSync(file, 'utf8');
	const found = { dark: {}, light: {} };
	// Split into rule blocks; order matters — later declarations win within a scope.
	for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const selectors = m[1];
		const body = m[2];
		const light = /data-theme='light'/.test(selectors);
		if (!/:root/.test(selectors)) continue;
		for (const d of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
			found[light ? 'light' : 'dark'][d[1]] = d[2].trim();
		}
	}
	return found;
}

const starlight = scopes(join(ROOT, 'node_modules/@astrojs/starlight/dist/style/props.css'));
const ours = scopes(join(ROOT, 'src/styles/theme.css'));
// The cascade, as the browser runs it: Starlight's props live in `@layer starlight.base` and theme.css
// is unlayered, so ANY of our declarations beats any of Starlight's, whatever the selector. Only
// then does specificity apply, inside each origin: the light override beats plain :root.
const tokens = {
	dark: { ...starlight.dark, ...ours.dark },
	light: { ...starlight.dark, ...starlight.light, ...ours.dark, ...ours.light },
};

// --- a tiny CSS colour resolver: hex, hsl(), var(), color-mix(in srgb, a% b) -------------------

const hslToRgb = (h, s, l) => {
	s /= 100;
	l /= 100;
	const k = (n) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	return [f(0) * 255, f(8) * 255, f(4) * 255];
};

function resolveColor(raw, scope, depth = 0) {
	assert.ok(depth < 12, `var() cycle resolving ${raw}`);
	let v = raw.trim();
	const varMatch = v.match(/^var\(\s*--([a-z0-9-]+)\s*(?:,\s*(.+))?\)$/);
	if (varMatch) {
		const value = tokens[scope][varMatch[1]] ?? varMatch[2];
		assert.ok(value !== undefined, `unknown token --${varMatch[1]} in "${raw}"`);
		return resolveColor(value, scope, depth + 1);
	}
	if (v.startsWith('color-mix')) {
		const inner = v.slice(v.indexOf('(') + 1, v.lastIndexOf(')')).replace(/^in\s+srgb\s*,?\s*/i, '');
		const parts = inner.split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);
		const [a, pa] = parts[0].match(/^(.*?)\s+(\d+(?:\.\d+)?)%$/)?.slice(1) ?? [parts[0], undefined];
		const [b, pb] = parts[1]?.match(/^(.*?)\s+(\d+(?:\.\d+)?)%$/)?.slice(1) ?? [parts[1] ?? 'transparent', undefined];
		// CSS color-mix(): a missing percentage is 100% minus the other one; neither means 50/50.
		const wa = pa ?? (pb === undefined ? 50 : 100 - +pb);
		const wb = pb ?? 100 - +wa;
		const ca = resolveColor(a, scope, depth + 1);
		const cb = resolveColor(b, scope, depth + 1);
		const sa = +wa / (+wa + +wb);
		return ca.map((x, i) => x * sa + cb[i] * (1 - sa));
	}
	const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (hex) {
		const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
		return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
	}
	const hsl = v.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+[\d.]+)?\s*\)$/);
	if (hsl) return hslToRgb(+hsl[1], +hsl[2], +hsl[3]);
	// hsl(var(--sl-hue-x), s%, l%) — the hue itself can be a var
	const hslVar = v.match(/^hsla?\(\s*var\(--([a-z0-9-]+)\)[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/);
	if (hslVar) {
		const hue = parseFloat(tokens[scope][hslVar[1]] ?? '');
		assert.ok(!Number.isNaN(hue), `unknown hue token --${hslVar[1]}`);
		return hslToRgb(hue, +hslVar[2], +hslVar[3]);
	}
	if (v === 'transparent') return [0, 0, 0]; // only used as a mix partner; the base is opaque
	assert.fail(`cannot resolve colour: ${raw}`);
}

const luminance = ([r, g, b]) => {
	const lin = (c) => {
		c /= 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const ratio = (fg, bg) => {
	const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

// The pairs the pages actually use — fg token, bg token, minimum, where it shows.
const PAIRS = [
	// the changelog and its chips
	['--sl-color-text', '--chip-bg', 4.5, 'type chips (every kind)'],
	['--c-warn-text', '--chip-bg', 4.5, 'security/breaking chip text'],
	['--c-warn', '--card-bg', 3.0, 'security/breaking icon (non-text)'],
	['--card-muted', '--card-bg', 4.5, 'muted text on a closed card'],
	['--card-muted', '--card-bg-hover', 4.5, 'muted text on a hovered card'],
	['--card-muted', '--card-bg-open', 4.5, 'muted text on an open card'],
	['--card-muted', '--sl-color-accent-low', 4.5, 'the count inside a pressed filter chip'],
	['--sl-color-accent-high', '--sl-color-accent-low', 4.5, 'a pressed filter chip; the sidebar\'s current page'],
	['--sl-color-gray-2', '--chip-bg', 4.5, 'the plain chip body text'],
	['--sl-color-text-accent', '--card-bg-open', 4.5, 'a link inside an open card'],
	// every page
	['--sl-color-text', '--sl-color-bg', 4.5, 'body text'],
	['--sl-color-white', '--sl-color-bg', 4.5, 'headings and strong text'],
	['--sl-color-gray-2', '--sl-color-bg', 4.5, 'sidebar links'],
	['--sl-color-gray-3', '--sl-color-bg', 4.5, 'muted text: group labels, the table of contents, card descriptions'],
	['--sl-color-gray-3', '--c-surface', 4.5, 'card descriptions on a hovered card'],
	['--sl-color-text-accent', '--sl-color-bg', 4.5, 'links'],
	['--sl-color-text-accent', '--sl-color-bg-inline-code', 4.5, 'a link that is inline code'],
	['--sl-color-text', '--sl-color-bg-inline-code', 4.5, 'inline code'],
	['--c-focus', '--sl-color-bg', 3.0, 'the focus ring (non-text)'],
	['--c-on-cta', '--c-cta', 4.5, 'the brand button label'],
	['--c-on-cta', '--c-cta-hover', 4.5, 'the brand button label, hovered'],
	// asides: the kind's ink (title, links) and the body text on each tint
	...['note', 'tip', 'caution', 'danger'].flatMap((kind) => [
		[`--c-${kind}-ink`, `--c-${kind}-bg`, 4.5, `${kind} aside title and links`],
		['--sl-color-white', `--c-${kind}-bg`, 4.5, `${kind} aside body text`],
	]),
];

for (const theme of ['dark', 'light']) {
	test(`contrast: ${theme} theme pairs hold`, () => {
		const misses = [];
		for (const [fgTok, bgTok, min, where] of PAIRS) {
			const fg = resolveColor(fgTok.startsWith('--') ? `var(${fgTok})` : fgTok, theme);
			const bg = resolveColor(`var(${bgTok})`, theme);
			const r = ratio(fg, bg);
			if (r < min) misses.push(`${where}: ${fgTok} on ${bgTok} = ${r.toFixed(2)}:1 < ${min}:1`);
		}
		assert.deepEqual(misses, [], misses.join('\n'));
	});
}
