---
name: dsh-plugin-due-diligence
description: Use before recommending, installing or auditing a DeepSeek Harness market plugin - where the registry snapshot is, how to read downloads/stars/capabilities and red lines, how to spot name collisions, and how to install and verify without breaking the profile.
---

# DSH plugin due diligence

## Registry snapshot
`%USERPROFILE%\Documents\deepseek-harness\default-workspace\plugins.json` — full community registry (`awesome-dsh-plugin.com/plugins.json`, ~6.9k entries, refreshed on demand). Per entry: `name, owner, npm, version, stars, downloads (30-day npm), category, description.en, capabilities[], capabilityRedLines[], install`.
Query it with Node, never by eye:
```powershell
node -e "const j=require('%USERPROFILE%/Documents/deepseek-harness/default-workspace/plugins.json');const r=j.plugins.filter(p=>/mcp/i.test(p.description?.en||'')).sort((a,b)=>(b.downloads||0)-(a.downloads||0)).slice(0,15);for(const p of r)console.log(p.downloads,p.stars,p.name,p.owner)"
```
A newer snapshot: `web_fetch https://awesome-dsh-plugin.com/plugins.json` (large response, gets truncated — prefer the local file).

## Reading the signals
- `capabilities` — what the plugin can touch (`fs-read`, `fs-write`, `shell`, `network`, `credentials`, `host-runtime`, `dynamic-code`, `subagent`, `llm`). ~1.5k plugins declare nothing: absence is not safety.
- `capabilityRedLines` — flagged risky combinations. The frequent one is "reads credentials AND has network", which is expected for plugins that talk to the model API, but means a leak is an outbound leak.
- `downloads` beats `stars` for real usage; both are weak trust signals at small numbers.
- False positives exist: OOXML preview plugins trip "plaintext http://" on `schemas.openxmlformats.org`, which is an XML namespace, not traffic.

## Name collisions are systemic
The same display name can map to different npm packages (`dsh-cost-meter` has 4+ claimants, `dsh-archive-manager` 6, `dsh-session-manager` 4). Always install by the exact npm name/scope shown in the registry entry whose owner you vetted; never by the human name alone.

## Installing
- While the desktop app is running, the reliable path is its plugin manager / market UI — it holds the profile lock, runs pnpm, registers `dsh.bundle`, and hot-mounts.
- `dsh plugin --profile desktop add <pkg>` works too: it forwards to pnpm, then reconciles `dsh.profile.bundles` (adding newly installed packages that declare `dsh.bundle`, warning about those that do not). It takes the profile `package.json.lock`; the app should be closed for it.
- GitHub specs run build scripts (`prepare`) that pnpm blocks until the exact key is added under `allowBuilds` in `profile/pnpm-workspace.yaml`. Pin a commit (`github:owner/repo#sha`).
- Incompatible engine ranges are reported; the escape hatch is `dsh plugin --profile desktop allow-version <pkg@ver> --dsh-version <ver> --accept-risk` — treat it as a real risk decision.

## Verifying after install
1. `package.json` → dependency present and bundle listed in `dsh.profile.bundles`.
2. `node_modules/<pkg>/package.json` exists and its version matches.
3. Restart the app; the plugin should appear in the plugin inventory UI, and a bundle that failed to load is logged but does not stop boot.
4. Keep a copy of `package.json` + `cordis.patch.yml` from before the install; removing a plugin means pnpm remove plus a bundles-list cleanup.

## Policy
Do not install, on the owner's behalf, a plugin that combines `credentials` with `network` (cost meters, account widgets, IM bots, config sync) or that grants `host-runtime`/`dynamic-code`/full desktop control unless the owner explicitly approved that trade-off. Offer the shortlist with the trade-offs and let the owner choose.
