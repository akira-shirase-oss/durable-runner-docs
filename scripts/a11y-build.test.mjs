// The build's accessibility helpers, proven on fixture HTML — the same checks that run on dist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;

/** Run focusable-tables.mjs over a fake dist/ and return the resulting page. */
function processPage(html) {
	const dir = mkdtempSync(join(tmpdir(), 'docs-a11y-'));
	mkdirSync(join(dir, 'dist'), { recursive: true });
	writeFileSync(join(dir, 'dist', 'index.html'), html);
	execFileSync('node', [join(ROOT, 'scripts/focusable-tables.mjs')], { env: { ...process.env, DIST: join(dir, 'dist') } });
	const out = readFileSync(join(dir, 'dist', 'index.html'), 'utf8');
	rmSync(dir, { recursive: true, force: true });
	return out;
}

test('a wide table becomes focusable, a small one stays put', () => {
	const wide = `<div class="table-wrapper"><table>${'<tr><th>column</th>'.repeat(12)}</tr>${'<tr><td>value with quite a long cell text here</td>'.repeat(12)}</tr>'.repeat(6)}</table></div>`;
	const small = `<div class="table-wrapper"><table><tr><td>a</td><td>b</td></tr></table></div>`;
	const out = processPage(`<html><body>${wide}${small}</body></html>`);
	const tabbed = out.match(/tabindex="0" role="region" aria-label="Scrollable table \d+"/g) ?? [];
	assert.equal(tabbed.length, 1, 'exactly one table got the attributes');
	assert.ok(out.indexOf(tabbed[0]) < out.indexOf(small), 'it was the wide one');
});

test('a code block is one region, named uniquely per page', () => {
	// The <pre> carries tabindex+region+name from src/lib/focusable-code.mjs at build time; the
	// post-build pass must not add a second region on the wrapper, and several blocks on one page
	// must not share the accessible name (axe landmark-unique).
	const block = (n) =>
		`<div class="expressive-code"><figure class="frame"><pre data-language="sh" tabindex="0" role="region" aria-label="Code example"><div class="ec-line"><span>line ${n}</span></div></pre></figure></div>`;
	const out = processPage(`<html><body>${block(1)}${block(2)}</body></html>`);
	assert.match(out, /aria-label="Code example 1"/, 'first block numbered');
	assert.match(out, /aria-label="Code example 2"/, 'second block numbered');
	assert.ok(!out.includes('Scrollable code'), 'no second region on the wrapper');
	assert.ok(!out.includes('aria-label="Code example"'), 'no unnumbered name left');
});

test('inline scripts get hashed into the CSP', () => {
	const dir = mkdtempSync(join(tmpdir(), 'docs-csp-'));
	mkdirSync(join(dir, 'dist'), { recursive: true });
	writeFileSync(join(dir, 'dist', 'index.html'), `<html><body><script>console.log('hi')</script></body></html>`);
	writeFileSync(join(dir, 'dist', '_headers'), `/*\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' INLINE_SCRIPT_HASHES\n`);
	execFileSync('node', [join(ROOT, 'scripts/csp-hashes.mjs')], { env: { ...process.env, DIST: join(dir, 'dist') } });
	const headers = readFileSync(join(dir, 'dist', '_headers'), 'utf8');
	assert.match(headers, /script-src 'self' 'wasm-unsafe-eval' 'sha256-[A-Za-z0-9+/=]+'/);
	assert.ok(!headers.includes('INLINE_SCRIPT_HASHES'), 'the marker was replaced');
	rmSync(dir, { recursive: true, force: true });
});

// --- The dist audit: the three axe rules that bit this site, enforced on every built page ---

/** Audit one page's HTML; returns a list of violation strings (empty means clean). */
function audit(html) {
	const violations = [];
	const names = new Map();
	for (const m of html.matchAll(/<([a-z][a-z0-9-]*)[^>]*role="region"[^>]*>/g)) {
		const tag = m[0];
		const label = tag.match(/aria-label="([^"]*)"/)?.[1];
		const name = label ?? `unnamed <${m[1]}>`;
		names.set(name, (names.get(name) ?? 0) + 1);
	}
	for (const [name, count] of names) {
		if (count > 1) violations.push(`region name "${name}" used ${count} times (landmark-unique)`);
	}
	const labelledIds = new Set([...html.matchAll(/<label[^>]*\bfor="([^"]+)"/g)].map((m) => m[1]));
	for (const m of html.matchAll(/<input([^>]*)>/g)) {
		const attrs = m[1];
		if (/\btype="hidden"/.test(attrs)) continue;
		const named = /\baria-label(ledby)?="/.test(attrs) || /\btitle="/.test(attrs);
		const id = attrs.match(/\bid="([^"]+)"/)?.[1];
		if (!named && !(id && labelledIds.has(id))) violations.push(`<input${attrs}> has no accessible name`);
	}
	for (const m of html.matchAll(/<th([^>]*)>([\s\S]*?)<\/th>/g)) {
		const text = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, '').trim();
		if (text === '') violations.push('empty <th> — a header cell must name its row or column');
	}
	return violations;
}

test('the audit flags the three violations axe reported', () => {
	const dirty = [
		'<div role="region" aria-label="Scrollable code"></div>',
		'<div role="region" aria-label="Scrollable code"></div>',
		'<input type="checkbox" disabled>',
		'<table><tr><th></th><th>b</th></tr></table>',
	].join('');
	const violations = audit(dirty);
	assert.equal(violations.length, 3, violations.join('; '));

	const clean = [
		'<pre role="region" aria-label="Code example 1"></pre>',
		'<pre role="region" aria-label="Code example 2"></pre>',
		'<input type="checkbox" disabled aria-label="mark as done">',
		'<input type="search" id="q"><label for="q">search</label>',
		'<table><tr><th>when</th><th>what</th></tr></table>',
		'<table><tr><th><span class="visually-hidden">when</span></th></tr></table>',
	].join('');
	assert.deepEqual(audit(clean), [], audit(clean).join('; '));
});

test('the real dist has none of them', (t) => {
	const dist = join(ROOT, 'dist');
	let stat;
	try {
		stat = statSync(dist);
	} catch {
		t.skip('dist/ does not exist yet — run npm run build first');
		return;
	}
	if (!stat.isDirectory()) return;
	const pages = [];
	const walk = (dir) => {
		for (const name of readdirSync(dir)) {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) walk(path);
			else if (name.endsWith('.html')) pages.push(path);
		}
	};
	walk(dist);
	assert.ok(pages.length > 0, 'dist/ has no html — build first');
	const problems = [];
	for (const page of pages) {
		for (const v of audit(readFileSync(page, 'utf8'))) problems.push(`${page.split('/dist/')[1]}: ${v}`);
	}
	assert.deepEqual(problems, [], problems.join('\n'));
});
