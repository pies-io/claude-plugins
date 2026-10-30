#!/usr/bin/env node
// HOB08 "agent via MCP": connect to the Studio MCP sidecar, list tools, then
// (unless --list-only) run the Job Tracker prompt headlessly with `claude -p`.
// PIES_MCP_URL overrides http://127.0.0.1:19085/sse (offset ports, Enterprise).
import { spawnSync } from 'node:child_process';

const url = process.env.PIES_MCP_URL || 'http://127.0.0.1:19085/sse';
const listOnly = process.argv.includes('--list-only');
const PROMPT = 'Use /pies-build: a job tracker with customers, jobs with status and due date, and a dashboard';

async function listTools() {
  const ctl = new AbortController();
  const res = await fetch(url, { headers: { Accept: 'text/event-stream' }, signal: ctl.signal });
  if (!res.ok) throw new Error(`SSE ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', endpoint = null;
  const pending = new Map();
  (async () => {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const ev = buf.slice(0, i); buf = buf.slice(i + 2);
        const type = /^event: *(.*)$/m.exec(ev)?.[1];
        const data = ev.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
        if (type === 'endpoint') endpoint = new URL(data, url).toString();
        else if (data) { try { const m = JSON.parse(data); pending.get(m.id)?.(m); } catch {} }
      }
    }
  })().catch(() => {});
  for (let t = 0; !endpoint && t < 100; t++) await new Promise(r => setTimeout(r, 100));
  if (!endpoint) throw new Error('no endpoint event');
  const call = (id, method, params) => new Promise((resolve, reject) => {
    pending.set(id, resolve);
    setTimeout(() => reject(new Error(`${method} timeout`)), 30000);
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) });
  });
  await call(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'hob08', version: '1' } });
  fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
  const r = await call(2, 'tools/list', {});
  ctl.abort();
  return r.result?.tools?.map(t => t.name) || [];
}

const tools = await listTools();
const need = ['create_app', 'compile_data_spec', 'save_generated_tables', 'compile_screen_spec', 'save_generated_menu', 'get_app_summary'];
const missing = need.filter(n => !tools.includes(n));
console.log(`HOB08 tools=${tools.length} missing=${missing.join(',') || 'none'}`);
if (missing.length) process.exit(1);
if (listOnly) process.exit(0);
const r = spawnSync('claude', ['-p', PROMPT, '--output-format', 'json', '--allowedTools', 'mcp__pies'], { encoding: 'utf8', timeout: 45 * 60 * 1000 });
console.log(r.stdout?.slice(-2000) || r.stderr);
process.exit(r.status ?? 1);
