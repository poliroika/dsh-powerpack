---
name: memory-keeper
description: Use at the end of a session, or when a durable fact about the user, the machine or a project appears, to keep the two AGENTS.md memory files accurate. Also use when the user says "запомни" or asks what you remember.
---

# Memory keeper

Memory lives in files that DSH injects into every session automatically — no tool call needed to read them:
- `%USERPROFILE%\.dsh\AGENTS.md` — global: user preferences, machine, DSH infrastructure, response style.
- `<workspace>\AGENTS.md` — per-project: layout, key facts, dated decision log, gotchas.

`sessions_search` / `session_event_search` are for episodic recall ("what did we do about X"), **not** a substitute for these files.

## When to write
Write only durable facts that would change future behavior:
- a preference or correction from the user ("не спрашивай …, просто делай");
- machine/infrastructure facts (paths, versions, ports, commands that work or fail);
- decisions with their reason, and the alternative that was rejected;
- recurring traps and their fix.

Do **not** write: one-off task details, guesses, secrets, tokens, credentials, PII, or anything already in a skill. Never store a token or a password — store where to find it (which credential store / env var name).

## How to write
1. Read the file first (it changed if another session edited it).
2. Prefer a targeted `edit` over rewriting: append to the right section, keep the table/list shape.
3. Date every non-obvious fact: `2026-10-26:`.
4. Keep the global file under ~150 lines and the project file under ~120. If a section grows, move detail into a skill (`~/.dsh/skills/...`) or drop the oldest low-value lines.
5. Verify after writing: re-read the changed lines; the runtime will show the file as reloaded instructions.

## Where a fact belongs
| Fact | Goes to |
|---|---|
| How the user wants answers | global AGENTS.md → «Как отвечать» |
| Machine, OS, shells, credentials locations | global AGENTS.md → «Инфраструктура» |
| DSH profile/plugins/MCP/presets inventory | global AGENTS.md → «Инфраструктура DSH» |
| What is in this workspace, key files | `<workspace>/AGENTS.md` → «Что здесь лежит» |
| Operational trap with a concrete fix | `<workspace>/AGENTS.md` → «Грабли» (or the matching skill) |
| Reusable procedure | a skill in `~/.dsh/skills/<name>/SKILL.md` |
| One-off / historical detail | nowhere — `session_search` will find it |

## When the user says "запомни"
Decide the destination using the table above, write it, then answer with one line: what was written and to which file. No prose essay.
