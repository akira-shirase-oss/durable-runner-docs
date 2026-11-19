// Contrast, computed from the real resolved values — never from token names. Starlight inverts
// its scale in the light theme (--sl-color-black is near-WHITE there), so a mix that looks dark
// on paper can resolve light. This test parses the actual custom-property declarations the build
// ships — Starlight's props.css plus our theme.css — resolves var() chains and color-mix(), and
// checks every text/background pair the changelog and chips rely on, per theme, at WCAG levels.
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
const tokens = {
	dark: { ...starlight.dark, ...ours.dark },
	light: { ...starlight.dark, ...ours.dark, ...starlight.light, ...ours.light },
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
		const [a, wa] = parts[0].match(/^(.*?)\s+(\d+(?:\.\d+)?)%$/)?.slice(1) ?? [parts[0], '50'];
		const [b, wb] = parts[1]?.match(/^(.*?)\s+(\d+(?:\.\d+)?)%$/)?.slice(1) ?? [parts[1] ?? 'transparent', '50'];
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

// The pairs the changelog and chips actually use — fg token, bg token, minimum, where it shows.
const PAIRS = [
	['--sl-color-text', '--chip-bg', 4.5, 'type chips (every kind)'],
	['--c-warn-text', '--chip-bg', 4.5, 'security/breaking chip text'],
	['--c-warn', '--card-bg', 3.0, 'security/breaking icon (non-text)'],
	['--card-muted', '--card-bg', 4.5, 'muted text on a closed card'],
	['--card-muted', '--card-bg-hover', 4.5, 'muted text on a hovered card'],
	['--card-muted', '--card-bg-open', 4.5, 'muted text on an open card'],
	['--card-muted', '--sl-color-accent-low', 4.5, 'the count inside a pressed filter chip'],
	['--sl-color-gray-2', '--chip-bg', 4.5, 'the plain chip body text'],
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
