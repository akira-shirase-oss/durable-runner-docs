// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import { focusableCode } from './src/lib/focusable-code.mjs';

// The one place the public address lives: canonical URLs, the sitemap, llms.txt and the changelog feed derive from it.
const site = 'https://docs.durable-runner.404human.dev';
const repo = 'https://github.com/akira-shirase-oss/durable-runner-docs';
// Code blocks sit on the palette's soft surface (--c-code-bg in src/styles/theme.css). Literal here,
// because Expressive Code checks syntax-colour contrast against it at build time.
/** @param {{ theme: { type: string } }} context */
const codeBg = ({ theme }) => (theme.type === 'dark' ? '#16181b' : '#f6f7f9');
// Sharing: one image for every page, rendered by scripts/make-og.mjs into public/og.png.
const ogImage = `${site}/og.png`;
const ogAlt = 'Durable Runner Docs: the vermilion app icon and the line "The open-source job runner whose journal outlives its process."';

export default defineConfig({
	site,
	trailingSlash: 'always',
	output: 'static',
	integrations: [
		starlight({
			title: 'Durable Runner Docs',
			description:
				'Documentation for Durable Runner, the open-source durable workflow runner whose journal outlives its process: quick start, jobs and handlers, the HTTP API, the CLI and self-hosting.',
			favicon: '/favicon.svg',
			social: [
				{ icon: 'github', label: 'Durable Runner on GitHub', href: 'https://github.com/akira-shirase-oss/durable-runner' },
			],
			editLink: { baseUrl: `${repo}/edit/main/` },
			lastUpdated: true,
			pagination: true,
			credits: false,
			titleDelimiter: '·',
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			customCss: ['./src/styles/theme.css'],
			head: [
				{ tag: 'link', attrs: { rel: 'alternate', type: 'application/rss+xml', title: 'Durable Runner changelog', href: `${site}/changelog/rss.xml` } },
				// The one webfont (src/styles/theme.css), self-hosted: fetched early so text doesn't swap late.
				{ tag: 'link', attrs: { rel: 'preload', href: '/fonts/google-sans-flex-latin.woff2', as: 'font', type: 'font/woff2', crossorigin: '' } },
				// Link previews. Starlight writes og:title, og:description, og:url, og:site_name and
				// twitter:card (summary_large_image) per page; these add the image, the full locale and the
				// X account, and replace Starlight's tag where it writes the same one (og:locale "en").
				{ tag: 'meta', attrs: { property: 'og:image', content: ogImage } },
				{ tag: 'meta', attrs: { property: 'og:image:type', content: 'image/png' } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
				{ tag: 'meta', attrs: { property: 'og:image:alt', content: ogAlt } },
				{ tag: 'meta', attrs: { property: 'og:locale', content: 'en_US' } },
				{ tag: 'meta', attrs: { name: 'twitter:site', content: '@404humandev' } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: ogImage } },
				{ tag: 'meta', attrs: { name: 'twitter:image:alt', content: ogAlt } },
				// An accessibility fix to Starlight's output: the search button shows "Search" and its
				// shortcut (⌘K or Ctrl K), so its name says both, as speech input reads them (WCAG 2.5.3).
				// Starlight swaps ⌘ for Ctrl off a Mac, sometimes after this runs, so the name follows
				// the shortcut's text whenever it changes; and a space separates the visible words
				// ("Search Ctrl K", not "SearchCtrlK"), so the name contains what is shown.
				// (Wide tables and code blocks take keyboard focus from the build instead, WCAG 2.1.1:
				// src/lib/focusable-code.mjs and scripts/focusable-tables.mjs, so they do without JavaScript too.)
				{
					tag: 'script',
					content:
						"document.addEventListener('DOMContentLoaded',()=>{for(const b of document.querySelectorAll('button[data-open-modal]')){const n=()=>{const p=[b.querySelector('span'),...b.querySelectorAll('kbd kbd')];for(const e of p.slice(0,-1))if(e&&e.nextSibling?.nodeValue!==' ')e.after(' ');const k=[...b.querySelectorAll('kbd kbd')].map(e=>e.textContent.trim()).join(' ');if(k)b.setAttribute('aria-label','Search '+k)};n();const s=b.querySelector('kbd');if(s)new MutationObserver(n).observe(s,{subtree:true,childList:true,characterData:true})}});",
				},
			],
			expressiveCode: {
				plugins: [focusableCode()],
				themes: ['github-dark-default', 'github-light-default'],
				// Code blocks on the soft surface with the design system's 12 px radius and a hairline.
				styleOverrides: {
					borderRadius: '12px',
					borderColor: 'var(--sl-color-hairline)',
					codeBackground: codeBg,
					uiFontFamily: 'var(--__sl-font)',
					frames: {
						editorBackground: codeBg,
						terminalBackground: codeBg,
						frameBoxShadowCssValue: 'none',
						editorTabBarBackground: 'var(--c-code-bar)',
						editorActiveTabBackground: 'var(--c-code-bg)',
						editorTabBarBorderBottomColor: 'var(--sl-color-hairline)',
						terminalTitlebarBackground: 'var(--c-code-bar)',
						terminalTitlebarBorderBottomColor: 'var(--sl-color-hairline)',
						terminalTitlebarDotsForeground: 'var(--c-mark)',
						terminalTitlebarDotsOpacity: '0.45',
					},
				},
			},
			components: {
				SiteTitle: './src/components/SiteTitle.astro',
				SocialIcons: './src/components/SocialIcons.astro',
				PageTitle: './src/components/PageTitle.astro',
				Footer: './src/components/Footer.astro',
			},
			sidebar: [
				{
					label: 'Getting started',
					items: [
						{ label: 'Introduction', slug: 'index' },
						{ label: 'Quick start', slug: 'quick-start' },
						{ label: 'Concepts', slug: 'concepts' },
					],
				},
				{
					label: 'Using the runner',
					items: [
						{ label: 'Jobs', slug: 'jobs' },
						{ label: 'Step handlers', slug: 'handlers' },
						{ label: 'The CLI', slug: 'cli' },
						{ label: 'The Inspector', slug: 'inspector' },
					],
				},
				{
					label: 'HTTP API',
					items: [
						{ label: 'At a glance', slug: 'api' },
						{ label: 'Authentication and keys', slug: 'api/authentication' },
						{ label: 'Errors', slug: 'errors' },
					],
				},
				{
					label: 'Self-hosting',
					items: [
						{ label: 'Configuration', slug: 'self-hosting/configuration' },
						{ label: 'Deployment', slug: 'self-hosting/deployment' },
						{ label: 'Backups and restore', slug: 'self-hosting/backups' },
						{ label: 'Capacity', slug: 'self-hosting/capacity' },
						{ label: 'Monitoring and operations', slug: 'self-hosting/monitoring' },
						{ label: 'Security', slug: 'self-hosting/security' },
					],
				},
				{ label: 'API reference', link: '/api/reference/', attrs: { 'data-reference': '' } },
				{ label: 'Changelog', link: '/changelog/' },
			],
			plugins: [
				starlightLinksValidator({ errorOnLocalLinks: true, exclude: ['/api/reference/', '/changelog/', '/changelog/**'] }),
				starlightLlmsTxt({
					projectName: 'Durable Runner',
					description:
						'Durable Runner is an open-source durable workflow runner (a Rust server and CLI): a job is acknowledged only after it is durable in an append-only journal, so accepted work survives restarts. Steps run as allowlisted HTTP handlers, at least once, under one idempotency key.',
				}),
			],
		}),
	],
});
