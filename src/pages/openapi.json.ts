import type { APIRoute } from 'astro';
import spec from '../data/openapi.json?raw';

/**
 * Durable Runner's OpenAPI document: a draft authored in this repository from the server's real
 * request and response shapes, kept in sync with its route table by scripts/check-openapi.mjs. It
 * moves into durable-runner once reviewed; this endpoint then serves that copy, byte for byte.
 */
export const GET: APIRoute = () =>
	new Response(spec, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
