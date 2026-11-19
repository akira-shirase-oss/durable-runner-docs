#!/usr/bin/env node
// Post-build: the tables that overflow sideways become focusable, so a keyboard can reach and
// scroll them (WCAG 2.1.1 / the axe "scrollable-region-focusable" rule). Runs after astro build on
// dist/.
//
// Starlight wraps each table in <div class="table-wrapper">; this gives the wrapper tabindex="0"
// plus a role and a name so a screen reader says what the focus is for. Only tables that can
// actually overflow get it, to avoid pointless tab stops on small ones. Code blocks need nothing
// here: the <pre> is the scroller and src/lib/focusable-code.mjs already stamps tabindex, role and
// the name "Code example" on it at build time — one region per block, never a wrapper region too.
// It then renumbers the named regions per page (each "Code example" pre, each "Scrollable table")
// so every landmark on a page has a unique accessible name (axe landmark-unique).
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.env.DIST ?? new URL('../dist', import.meta.url).pathname;
// A match is only a hint — the real decision is the width check below on the element's content.
const TABLE = /<div class="table-wrapper"([^>]*)>([\s\S]*?)<\/div>/g;

/** Would this overflow at roughly a laptop pane? A table with many columns or wide content. */
function canOverflow(inner) {
	const cells = (inner.match(/<(td|th)[^>]*>/g) ?? []).length;
	const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
	return cells >= 12 || text.length > 480;
}

function fix(html) {
	let touched = 0;
	let out = html.replace(TABLE, (whole, attrs, inner) => {
		if (attrs.includes('tabindex') || !canOverflow(inner)) return whole;
		touched++;
		return `<div class="table-wrapper"${attrs} tabindex="0" role="region" aria-label="Scrollable table">${inner}</div>`;
	});
	// Every named region on the page needs a unique accessible name (axe landmark-unique) — a page
	// with several code blocks or wide tables would otherwise announce them all identically.
	let code = 0;
	let table = 0;
	out = out.replace(/aria-label="Code example"/g, () => `aria-label="Code example ${++code}"`);
	out = out.replace(/aria-label="Scrollable table"/g, () => `aria-label="Scrollable table ${++table}"`);
	touched += code + table;
	return { html: out, touched };
}

let files = 0;
const walk = (dir) => {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path);
		else if (name.endsWith('.html')) {
			const before = readFileSync(path, 'utf8');
			const { html, touched } = fix(before);
			if (html !== before) {
				writeFileSync(path, html);
				files++;
				console.log(`focusable-tables: ${path.split('/dist/')[1]} (${touched})`);
			}
		}
	}
};
walk(DIST);
console.log(`focusable-tables: ${files} page(s) updated`);
