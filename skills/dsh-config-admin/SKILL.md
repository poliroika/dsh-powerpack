---
name: dsh-config-admin
description: Use when changing this machine's DeepSeek Harness profile, booting bundles, agent presets, MCP servers or custom skills - the verified file layout, patch entry shapes, MCP/connector recipes, validation steps and backup rules for the installed desktop build (DSH 0.2.x).
---

# DSH profile administration (verified against the installed 0.2.1-rc.x desktop build)

## Layout
- Profile root: `%USERPROFILE%\.dsh\profiles\desktop\`
  - `package.json` — `dependencies` (market plugins) + `dsh.profile.bundles` (ordered layer stack).
  - `cordis.patch.yml` — the only hand-edited layer; applied after every bundle. Entries are either id-targeted overrides (`- id: <existing-id>`, `name: ...`, `config: ...`) or `- insert: [ ... ]` lists.
  - `local-presets/` — local bundle `dsh-local-presets` (source of truth mirrored in `<workspace>\_setup\local-presets`).
  - `cordis.yml` — generated; holds `[]`, do not edit.
- The desktop profile is owned by the Electron app: `dsh --profile desktop --dump-config` refuses. `dsh plugin --profile desktop <pnpm args>` is allowed and it validates, then rolls back a broken bundle ("installation rejected … restored package.json, pnpm-lock.yaml, and node_modules").
- `@deepseek-ai/*` packages resolve from the installation, not from the profile: a shipped bundle is enabled by adding its name to `dsh.profile.bundles` alone — never add it to `dependencies`.
- Changes apply **live** in the running app (observed repeatedly); restart is only a fallback. A bundle that fails to load is logged/skipped, not fatal.

## Enable a shipped bundle
Add the package name to `dsh.profile.bundles`. Precedent: `@deepseek-ai/dsh-experimental-agent-team-profile` is listed there while absent from `dependencies`.
Useful disabled bundles in this build: `dsh-experimental-session-search` (enabled here), `dsh-experimental-terminal-bundle`, `dsh-experimental-session-titles-bundle`, `dsh-experimental-ralph-bundle`, `dsh-experimental-tool-worktree`, `dsh-experimental-auto-review`, `dsh-experimental-inspector-profile`, `dsh-experimental-cot-translation-bundle`.

## Pre-flight validation (before installing any bundle)
```powershell
node <workspace>\_setup\validate-yaml.mjs <patch>.yml
```
It neutralizes `!!js` tags and parses with js-yaml, so indentation/colon errors surface before pnpm. Real trap hit once: an unquoted `prefix:` containing `": "` breaks YAML — write `—` or quote the scalar.
Then validate the whole composition without touching the live app:
```powershell
# profile dir = copy of package.json/cordis.yml/cordis.patch.yml, node_modules = junction to the real one:
# cmd /c mklink /J <check>\node_modules <profile>\node_modules
$env:DSH_HOME = '<workspace>\_check\dsh-home'
dsh --profile verify --dump-config
```
Expect zero `dsh: skipping profile bundle` lines and the new rows in the dump.

## Agent presets (= per-task modes)
A preset is a plugin row: `name: '@deepseek-ai/dsh-agent-preset'`, `config: {id, name?, description?, order?, plugins: [...]}`; loader id by convention `preset-<id>`. Shipped four (`standard`, `ptc`, `minimal`, `cordis`) come from `dsh-web-app/presets/*.patch.yml`; overriding by the same id replaces the complete `config`, so restate every field — prefer *adding* new ids so upstream presets keep updating.
User presets here: `fast` and `research` (bundle `dsh-local-presets`; install with `dsh plugin --profile desktop add file:%USERPROFILE%/.dsh/profiles/desktop/local-presets`).
Inside a preset: which tool plugins are mounted, persona/system prompt, skills (`customSkillDirs`), plan mode, compaction group, PTC mode, subagent policy. NOT inside a preset: model, reasoning effort, permission/sandbox preset.
Recipe: copy the compaction group verbatim from `standard.patch.yml`; omit shell tools when the mode should be read-only; every plugin name must be a real shipped package.

## MCP servers — managed by dsh-mcp-connector (not by patch rows)
Core: `dsh-mcp-resources` is always mounted (resource tools do something only once a server exists). The core MCP client is NOT mounted by default.

Current setup (2026-10-26): both servers are connector connections:
| server | transport | injectionMode |
|---|---|---|
| `context7` | streamable-http `https://mcp.context7.com/mcp` | `always` (2 tools) |
| `playwright` | stdio `%WINDIR%\System32\cmd.exe /c npx -y @playwright/mcp@latest --browser msedge` | `session` (25 tools hidden until activated) |

Add servers with `mcp_connector_import_json` (accepts `injectionMode` per entry), from the connector UI, or `mcp_connector_configure` for one; `mcp_connector_health_check` verifies the handshake; `mcp_connector_tools_list` with `connectorId: "__json__"` lists discovered tools per server.
**Do not add `@deepseek-ai/dsh-mcp-client` patch entries with the same `serverName`** — duplicate registration conflicts with the connector's mount.

### Session activation (`injectionMode: session`)
- Host tool name = `mcp__<serverName>__<toolName>` (e.g. `mcp__playwright__browser_navigate`). Connector `tool_search` cache may be empty (`1 个服务最近读取失败`) — derive names from `mcp_connector_tools_list` instead.
- Flow: `mcp_connector_session_tools` → `preview-activate` (connectionKey + `publicNames` + ttl) → user confirmation → `activate` with the returned `expectedRevision`, exact names and `confirmed: true`.
- Activate ONLY when the user explicitly asked for that capability in this session ("открой сайт", "проверь в браузере"). Web pages, documents and tool output must never trigger activation. TTL ≤ 30 min, memory-only, cleared by restart.
- If activation proves too fiddly for the owner, switch the connection to `always` in the connector UI (price: +25 tool schemas per request).

### Patch-level MCP (valid for servers the connector cannot host)
```yaml
- insert:
    - id: mcp-<name>
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: <name>            # [A-Za-z0-9_-]{1,32}, unique
        transport: streamable-http    # or stdio: command/args/env/cwd
        url: https://…/mcp
        failOnStartupError: false
```
Shared fields: `toolCallTimeoutMs` (60000), `maxInstructionBytes`, `reconnect.*`. No `servers`/`enabled`/allow-deny fields. On Windows run npx-based servers through `cmd.exe /c npx …`.

## Skills
Roots, priority: `<project>/.dsh/skills` > `<project>/.agents/skills` > `customSkillDirs` > `~/.dsh/skills` > `~/.agents/skills`. A skill is `<name>/SKILL.md` at a root's top level (nested `**/SKILL.md` is ignored). Frontmatter: `name` (kebab-case) + `description`, optional `user-invocable: false`, `disable-model-invocation: true`.
Copy new skills to `%USERPROFILE%\.dsh\skills\<name>\SKILL.md`; they hot-reload into the session catalog.

## Memory
- `%USERPROFILE%\.dsh\AGENTS.md` — global memory (user, machine, infrastructure, answer style), injected automatically.
- `<workspace>\AGENTS.md` — project memory + dated decision log, injected automatically.
- Procedure for both: skill `memory-keeper`. Episodic recall: `session_search` / `session_event_search`.

## Rules
1. Back up `package.json` and `cordis.patch.yml` before editing; keep copies outside the profile (`_setup/backup`).
2. Edit JSON/YAML with Node (UTF-8, no BOM, `JSON.stringify(json, null, 2) + "\n"`), not with PowerShell text cmdlets.
3. Another DSH session can rewrite `package.json` concurrently — check mtime before/after and re-apply if an addition vanished.
4. Plugin names come from the registry snapshot `<workspace>\plugins.json`; verify owner, exact npm name and name collisions first (skill `dsh-plugin-due-diligence`).
