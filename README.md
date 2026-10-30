# PIES Studio for coding agents

Let Claude Code, Codex CLI or Cursor's agent build and run data apps in PIES Studio Hobby on your own computer. The agent talks to the Studio MCP server that Hobby already runs (`http://127.0.0.1:19085/sse`, local only). Whole-app builds run on your agent's own model; PIES Private AI Micro (Preview) answers offline inside Studio.

## Requirements
- PIES Studio Hobby (latest), open.
- Claude Code, Codex CLI or Cursor.

## Install
Claude Code plugin:
```
/plugin marketplace add pies-io/claude-plugins
/plugin install pies
```
Or the plain MCP entry:
```
claude mcp add --transport sse pies http://127.0.0.1:19085/sse
```
Codex CLI (`~/.codex/config.toml`):
```toml
[mcp_servers.pies]
url = "http://127.0.0.1:19085/sse"
```
Cursor (`.cursor/mcp.json`):
```json
{ "mcpServers": { "pies": { "url": "http://127.0.0.1:19085/sse" } } }
```
Started Hobby with `PIES_DESKTOP_PORT_OFFSET=N`? Use port `19085+N` (Studio AI Settings shows the exact line). Enterprise: set `PIES_MCP_URL` to your server's MCP URL.

## Skills
- `/pies-build "<what you want>"` builds tables, sample rows, screens, a dashboard and the menu.
- `/pies-run` builds the preview, opens the running app (Sign in with PIES Studio) and the Studio editor.
- `/pies-explain` asks the app what it does.

## Known issues
- On a multi-tenant (Enterprise) server, writes need the client_id of an existing app; Hobby fills it in.
- On older Hobby builds, tool calls can time out for a few minutes after the menu is saved; your work is saved.

## Privacy
Nothing leaves your computer except what your agent sends to its own model provider.

## Smoke test
`node smoke/hob08-agent-mcp.mjs --list-only` checks the server; without the flag it runs a headless `claude -p` build.

Full docs: https://docs.pies.io/customer/coding-agents
