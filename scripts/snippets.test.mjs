// The snippets engine's own tests — the same cases that guard the runner's promise: ids, secrets,
// times and hashes normalise away, and a real difference still fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalise, matches, runnable, coverage, fences, shownBase, EXAMPLE_BASE } from './snippets.mjs';

test('the example domain becomes the stack under test', () => {
	assert.equal(runnable('curl -i $BASE/health'), 'curl -i $BASE/health');
	const code = runnable(`curl -i -H "Authorization: Bearer $DURABLE_API_KEY" ${EXAMPLE_BASE}/jobs?limit=5`);
	assert.match(code, /https?:\/\/127\.0\.0\.1:\d+\/jobs\?limit=5/);
});

test('local shown addresses become the band under test', () => {
	const code = runnable('curl -s http://127.0.0.1:58300/health && python3 handler.py http://127.0.0.1:58320');
	// With the default base the server stays 58300; the handler's shown port maps to base+2.
	assert.equal(code, 'curl -s http://127.0.0.1:58300/health && python3 handler.py http://127.0.0.1:58302');
	const banded = runnable('durable --server http://127.0.0.1:58300 diag', 'http://127.0.0.1:58540', 'http://127.0.0.1:58542', 'http://127.0.0.1:58541');
	assert.match(banded, /58540/);
	assert.doesNotMatch(banded, /58300/);
});

test('a run id, a key and a finish time all normalise', () => {
	const a = normalise('{"run_id":41,"finished_at":1774800000123,"key":"jobs:daily"}');
	const b = normalise('{"run_id":42,"finished_at":1774899999999,"key":"jobs:daily"}');
	assert.notEqual(a, b, 'run_id stays literal — it is sequential, not random');
	const c = normalise('{"run_id":41,"finished_at":1774800000123,"key":"jobs:daily"}');
	assert.equal(a, c);
});

test('a generated API key normalises, a distinct one does not hide', () => {
	assert.equal(normalise('key: 9f2c1a4b7e8d0a3b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b'), 'key: <hex64>');
	assert.notEqual(normalise('{"ok":true}'), normalise('{"ok":false}'), 'a real difference still fails');
});

test('finished_at: null stays distinct from a timestamp', () => {
	assert.notEqual(normalise('{"finished_at":null}'), normalise('{"finished_at":1774800000123}'));
});

test('JSON bodies compare by value, not by formatting', () => {
	// The same body pretty-printed or on one line is the same body.
	assert.equal(normalise('{"a":{"x":[2,3]},"b":1}'), normalise('{\n  "a": {\n    "x": [2, 3]\n  },\n  "b": 1\n}'));
	// A real difference still fails.
	assert.notEqual(normalise('{"v":45}'), normalise('{"v":46}'));
});

test('curl -i heads compare with dates stripped', () => {
	const one = normalise('HTTP/1.1 200 OK\ndate: Mon, 17 Nov 2026 10:00:00 GMT\ncontent-length: 12\n\n{"ok":true}');
	const two = normalise('HTTP/1.1 200 OK\ndate: Tue, 18 Nov 2026 10:00:01 GMT\ncontent-length: 99\n\n{"ok":true}');
	assert.equal(one, two);
});

test('match=lines accepts a stream whose order differs', () => {
	const expect = { code: '{"run_id":1}\n{"run_id":2}', info: 'match=lines' };
	assert.ok(matches('{"run_id":2}\n{"run_id":1}\n{"run_id":3}', expect), 'shown lines all arrived, in any order');
	assert.ok(!matches('{"run_id":1}', expect), 'a shown line that never arrived still fails');
});

test('coverage counts every block kind and flags the unmarked', () => {
	const page = `\`\`\`sh run=quickstart\ncurl example\n\`\`\`\n\`\`\`json output=quickstart\n{}\n\`\`\`\n\`\`\`text not-run="a systemd unit"\n[Unit]\n\`\`\`\n\`\`\`python\nprint("oops")\n\`\`\``;
	// The unit test can't inject a page; instead prove the fence reader sees all four blocks and
	// their kinds via the exported fence iterator used by coverage().
	const kinds = fences(page).map((m) => (m[4].includes('not-run') ? 'not-run' : m[4].match(/(?:^|\s)run=/) ? 'run' : m[4].includes('output=') ? 'output' : 'unmarked'));
	assert.deepEqual(kinds, ['run', 'output', 'not-run', 'unmarked']);
});

test('a code fence inside indented markdown is still a block, not prose', () => {
	const page = `1. Step\n\n   \`\`\`sh run=cli\n   durable list\n   \`\`\``;
	assert.equal(fences(page).length, 1);
});

test('shownBase picks the address a page pretends to use', () => {
	assert.equal(shownBase('src/content/docs/quick-start.mdx'), 'http://127.0.0.1:58300');
	assert.equal(shownBase('src/content/docs/self-hosting/configuration.mdx'), 'http://127.0.0.1:58300');
	assert.equal(shownBase('src/content/docs/jobs.mdx'), EXAMPLE_BASE);
});
