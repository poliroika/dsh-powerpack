# Third-party notices

Этот репозиторий содержит только собственные файлы (установщик, пресеты, скиллы,
скрипты и словари локализации, документация) и не перепубликует сторонние пакеты:
все плагины ставятся из npm как зависимости.

## Модифицируемый пакет

`@a9i5k4/dsh-auto-memory` — **BSD 3-Clause License**
Copyright (c) 2026, Aik358. All rights reserved.

Скрипты в `localize/` модифицируют файлы этого пакета на вашей машине
(`lib/index.js`, `lib/client.js`, `lib/ledger-criteria.js`, `lib/handoff-anchor.js`),
поэтому являются производной работой. Условия BSD-3 соблюдены: копирайт и текст
лицензии сохраняются в самом пакете (`node_modules/@a9i5k4/dsh-auto-memory/LICENSE`),
модификации не выдаются за оригинал, имя автора не используется для продвижения.
Перепубликация самого пакета здесь не выполняется.

## Устанавливаемые зависимости

| Пакет | Лицензия |
|---|---|
| `deepseek-ai/deepseek-harness` и пакеты `@deepseek-ai/*` | MIT, Copyright (c) 2026 DeepSeek |
| `dshmarket` | MIT, Copyright (c) 2026 fkysly and dsh-market contributors |
| `@goodandready/dsh-russian-lang` | MIT, Copyright (c) 2026 GooDAnDReaDY |
| `@liustack/modsearch` | MIT |
| `dsh-context` | Apache-2.0 |
| `dsh-theme-cyberpunk2077` | MIT |
| `cc-safety-net` | см. пакет |
| `dsh-better-sidebar` | см. пакет |
| `dsh-mcp-connector` | см. пакет |
| `@a9i5k4/dsh-auto-memory` | BSD-3-Clause, Copyright (c) 2026 Aik358 |

Тексты лицензий поставляются внутри самих пакетов в `node_modules/<pkg>/LICENSE`.

## Товарные знаки

DeepSeek Harness — продукт DeepSeek. Этот репозиторий не является официальным
продуктом DeepSeek и не аффилирован с ним.
