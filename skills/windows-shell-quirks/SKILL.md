---
name: windows-shell-quirks
description: Use when running shell commands or scripts on this Windows host - the PowerShell dialect, execution-policy, sandbox, network and encoding traps that repeatedly break otherwise correct commands.
---

# Windows host quirks (verified on this machine)

## Shell dialect
`pwsh -Command` here is **Windows PowerShell 5.1**, not PowerShell 7. Missing things that look standard:
- `ConvertFrom-Json -AsHashtable` does not exist. Use `PSCustomObject` + `.PSObject.Properties` recursion.
- No ternary, no `??`, no `-Parallel`, no `Get-ChildItem -Relative`.
- `$HOME` is a read-only automatic variable and names are case-insensitive: `$home = ...` fails. Use `$dshHome`, `$root`, etc.
- `Set-Content -Encoding UTF8` writes a BOM, and `Set-Content -Encoding ascii` **destroys non-ASCII text** — never pass Cyrillic/Chinese content through a PowerShell-written script or variable. Write such files with the `write` tool or with Node reading from a file that a tool wrote. Symptom seen: Russian memory files became `???????`.
- For config/JSON files prefer Node (`readFileSync`/`writeFileSync`, `'utf8'`); use `-Encoding ascii` only when the text is pure ASCII.
- `2>&1` on a native command wraps stderr in `NativeCommandError` records; filter with `Select-Object -First` and check `$LASTEXITCODE` separately.

## Execution policy
`.ps1` scripts are blocked (also `npx.ps1`). Workarounds:
- Run a script file as `powershell -NoProfile -ExecutionPolicy Bypass -File <path>`.
- Prefer `cmd /c npx ...`, `node.exe`, or the `.cmd` shim.

## Sandbox and permissions
- File writes are confined to the session workspace. Writes elsewhere fail with `Access is denied` or the `[sandbox: file access denied]` marker. Do not retry a denied path blindly; ask for owner approval with a justification if the change is genuinely required.
- Creating a directory junction inside the workspace pointing outside it is denied.
- Toggling `$env:DSH_HOME` works and is the supported way to run the `dsh` CLI against scratch profiles.

## Network
- `curl.exe` and `Invoke-WebRequest`/`Invoke-RestMethod` fail TLS here (`schannel: SEC_E_NO_CREDENTIALS`, `connection closed`). Do not conclude the network is down.
- Working HTTP paths: the `web_fetch`/`web_search` tools (out-of-sandbox bridge), or the bundled Node: `node -e "fetch(url).then(...)"` — Node's own TLS stack works and can write the body to a workspace file.

## Node
- Node/npm live under a versioned winget directory; `npx.cmd` and `node_modules\npm\bin\npx-cli.js` sit next to `node.exe`.
- When a spawned tool needs `npx`, point it at `cmd.exe /c npx ...` or at `node.exe <...>\npx-cli.js ...`.

## Reading the DSH bundle
`app.asar` is a single text-ish container: `Select-String -Path app.asar -Pattern '...'` finds strings fast, and `Get-Content app.asar -TotalCount N | Select-Object -Skip M` reads the surrounding region. To get real files, use `_inv\asar.ps1` (list/cat/extract) with `-ExecutionPolicy Bypass`.

## Hygiene
- Before any delete or move, resolve and print the absolute path and confirm it is the intended target.
- Long builds/installs: run as a managed background job, do not busy-poll.
