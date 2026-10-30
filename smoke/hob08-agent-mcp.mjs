#!/usr/bin/env node
// HOB08 "agent via MCP": connect to the Studio MCP sidecar, list tools, then
// (unless --list-only) run the Job Tracker prompt headlessly with `claude -p`.
// PIES_CLIENT_ID is passed on multi-tenant servers (Enterprise, dev stacks).
// PIES_MCP_URL overrides http://127.0.0.1:19085/sse (offset ports, Enterprise).
import { spawnSync } from 'node:child_process';

const url = process.env.PIES_MCP_URL || 'http://127.0.0.1:19085/sse';
const listOnly = process.argv.includes('--list-only');
const PROMPT = 'Use /pies-build: a job tracker with customers, jobs with status and due date, and a dashboard';

let session;
async function connect() {
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
      buf += dec.decode(value, { stream: true }).replace(/\r/g, '');
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
  let next = 10;
  const tool = async (name, args) => {
    const m = await call(next++, 'tools/call', { name, arguments: args });
    const text = m.result?.content?.[0]?.text || '';
    try { return JSON.parse(text); } catch { return { error: text }; }
  };
  const r = await call(2, 'tools/list', {});
  return { tools: r.result?.tools?.map(t => t.name) || [], tool, close: () => ctl.abort() };
}

session = await connect();
const tools = session.tools;
const need = ['create_app', 'compile_data_spec', 'save_generated_tables', 'compile_screen_spec', 'save_generated_menu', 'get_app_summary'];
const missing = need.filter(n => !tools.includes(n));
console.log(`HOB08 tools=${tools.length} missing=${missing.join(',') || 'none'}`);
if (missing.length) process.exit(1);
if (listOnly) { session.close(); process.exit(0); }

// Full leg: run /pies-build headlessly with the plugin from this repo, then
// prove through MCP that a new app exists with >=2 tables and >=3 screens.
const email = process.env.PIES_USER_EMAIL;
if (!email) { console.log('HOB08 FAIL PIES_USER_EMAIL not set'); process.exit(2); }
const listApps = async () => (await session.tool('list_apps', { user_email: email })).applications || [];
const appIds = async () => new Set((await listApps()).map(a => a.id));
const before = await appIds();
const pluginDir = new URL('../plugins/pies', import.meta.url).pathname;
const t0 = Date.now();
const r = spawnSync('claude', ['-p', `${PROMPT}. My PIES Studio sign-in email is ${email}.${process.env.PIES_CLIENT_ID ? ` My client_id is ${process.env.PIES_CLIENT_ID}.` : ''}`, '--plugin-dir', pluginDir, '--output-format', 'json',
  '--allowedTools', 'mcp__plugin_pies_pies', 'mcp__pies', 'Skill', '--max-budget-usd', process.env.HOB08_BUDGET_USD || '6'],
  { encoding: 'utf8', timeout: 45 * 60 * 1000, env: { ...process.env, PIES_MCP_URL: url } });
const mins = ((Date.now() - t0) / 60000).toFixed(1);
let out = {}; try { out = JSON.parse(r.stdout); } catch {}
console.log(`HOB08 claude exit=${r.status} turns=${out.num_turns ?? '?'} cost_usd=${out.total_cost_usd ?? '?'} minutes=${mins}`);
console.log(String(out.result || r.stderr || '').slice(-1500));
if (out.permission_denials?.length) console.log(`HOB08 permission_denials=${JSON.stringify(out.permission_denials.map(d => d.tool_name))}`);
session.close();
session = await connect();
// Other sessions may create apps meanwhile: take the new one about jobs.
const added = (await listApps()).filter(a => !before.has(a.id) && /job/i.test(`${a.name} ${a.description}`)).map(a => a.id);
if (!added.length) { console.log('HOB08 FAIL no new job app'); process.exit(1); }
const sum = await session.tool('get_app_summary', { app_id: added[0] });
const tables = sum.table_count || 0, screens = sum.screen_count || 0;
console.log(`HOB08 app=${added[0]} tables=${tables} screens=${screens}`);
session.close();
const ok = tables >= 2 && screens >= 3;
console.log(ok ? 'HOB08 PASS' : `HOB08 FAIL summary keys=${Object.keys(sum).join(',')}`);
process.exit(ok ? 0 : 1);
