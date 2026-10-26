// Russian localization for the @a9i5k4/dsh-auto-memory plug-in.
//
// The plug-in ships a Chinese prompt frame, Chinese tool descriptions and a
// Chinese-only client UI (its dictionaries cover zh/en/ja). This script adds a
// Russian locale without touching the plug-in's logic:
//   * prompt frame constants        -> Russian overlay object
//   * LLM prompt openings           -> Russian role + "write in Russian"
//   * 19 tool descriptions          -> Russian
//   * client dictionaries           -> I18N.ru + L10N.ru + `ru` in LOCALE_ALL
//   * hardcoded client strings      -> exact literal replacement
//   * leftover frame/ledger titles  -> exact replacement (incl. ledger validator)
//
// Every step is idempotent and marker-guarded, so re-running after a plug-in
// update is safe.
//
// Usage (DSH Desktop must be closed while the files are patched):
//   node localize.mjs [--profile <profileDir>]
// Env: DSH_PROFILE_DIR, default ~/.dsh/profiles/desktop
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DICT = join(HERE, 'dictionaries');

const args = process.argv.slice(2);
const profileArg = (() => {
  const i = args.indexOf('--profile');
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return process.env.DSH_PROFILE_DIR || join(homedir(), '.dsh', 'profiles', 'desktop');
})();

const PLUGIN = join(profileArg, 'node_modules', '@a9i5k4', 'dsh-auto-memory');
const LIB = join(PLUGIN, 'lib');
if (!existsSync(LIB)) {
  console.error(`Plug-in not found under ${PLUGIN}`);
  console.error('Install it first:  dsh plugin --profile <name> add @a9i5k4/dsh-auto-memory');
  process.exit(1);
}
const read = f => readFileSync(join(LIB, f), 'utf8');
const write = (f, s) => writeFileSync(join(LIB, f), s, 'utf8');
const dict = name => JSON.parse(readFileSync(join(DICT, name), 'utf8'));

/** Brace matcher that skips JS strings and comments. */
function matching(text, s) {
  let d = 0;
  for (let i = s; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '/') { i = text.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2); if (i < 0) break; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { const q = c; for (i++; i < text.length; i++) { if (text[i] === '\\') { i++; continue; } if (text[i] === q) break; } continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (!d) return i; }
  }
  throw new Error('unbalanced braces');
}
function readLiteral(text, start) {
  const q = text[start];
  let out = '';
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\') { const n = text[i + 1]; out += n === 'n' ? '\n' : n === 't' ? '\t' : n; i += 2; continue; }
    if (c === q) return { value: out, end: i };
    out += c; i++;
  }
  throw new Error('unterminated literal');
}
const quote = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const report = (name, state) => console.log(`  ${name}: ${state}`);

// ── 1. prompt frame ───────────────────────────────────────────────────────────
function localizeFrame() {
  const file = 'index.js';
  let src = read(file);
  const marker = '/* ru-memory-localization */';
  if (src.includes(marker)) return report('prompt frame', 'already localized');
  const anchor = 'const DEFAULT_PROMPT_LAYERS = Object.freeze({';
  const at = src.indexOf(anchor);
  if (at < 0) return report('prompt frame', 'SKIPPED (anchor not found, plug-in changed?)');
  const braceStart = at + anchor.length - 1;
  const braceEnd = matching(src, braceStart);
  const body = src.slice(braceStart + 1, braceEnd);
  const rawSuffix = src.slice(braceEnd + 1);
  const suffix = rawSuffix.startsWith(')') ? rawSuffix.slice(1) : rawSuffix;
  const ru = dict('ru-frame.json');
  const rebuilt = src.slice(0, at)
    + `const RU_OVERLAY = ${JSON.stringify(ru)};\n`
    + `const DEFAULT_PROMPT_LAYERS = Object.freeze(Object.assign({${body}}, RU_OVERLAY))`
    + suffix
    + `\n${marker}\n`;
  write(file, rebuilt);
  report('prompt frame', `${Object.keys(ru).length} keys`);
}

// ── 2. LLM prompt openings ───────────────────────────────────────────────────
const PROMPT_PAIRS = [
  ["'你是记忆整理员。", "'Ты — редактор памяти. Пиши строго по-русски: любой твой текст — на русском. "],
  ["'你是记忆检索助手。", "'Ты — помощник по поиску в памяти. Пиши строго по-русски. "],
  ["'你是用户的记忆管家。", "'Ты — хранитель памяти пользователя. Пиши строго по-русски: любой твой текст — на русском. "],
  ["'你是跨工作区记忆架构师。", "'Ты — архитектор памяти по рабочим папкам. Пиши строго по-русски. "],
  ["'你是一个温暖、细腻的生活助理。", "'Ты — тёплый и внимательный бытовой ассистент. Пиши строго по-русски. "],
  ["'你是一个温暖的生活助理。", "'Ты — тёплый бытовой ассистент. Пиши строго по-русски. "],
  ["'你是用户的长期记忆管家。", "'Ты — хранитель долгосрочной памяти пользователя. Пиши строго по-русски: любой твой текст — на русском. "],
];
function localizePrompts() {
  const file = 'index.js';
  let src = read(file);
  const marker = '/* ru-prompts-localization */';
  if (src.includes(marker)) return report('prompts', 'already localized');
  let applied = 0;
  for (const [from, to] of PROMPT_PAIRS) { if (!src.includes(from)) continue; src = src.split(from).join(to); applied++; }
  write(file, `${src}\n${marker}\n`);
  report('prompts', `${applied}/${PROMPT_PAIRS.length} openings`);
}

// ── 3. tool descriptions ─────────────────────────────────────────────────────
function localizeTools() {
  const file = 'index.js';
  let src = read(file);
  const marker = '/* ru-tools-localization */';
  if (src.includes(marker)) return report('tool descriptions', 'already localized');
  const items = dict('ru-tools.json');
  let applied = 0;
  for (const { name, text } of items) {
    const needle = `defineTool('${name}', `;
    const at = src.indexOf(needle);
    if (at < 0) continue;
    const descStart = at + needle.length;
    if (src[descStart] !== "'") continue;
    const lit = readLiteral(src, descStart);
    src = src.slice(0, descStart) + quote(text) + src.slice(lit.end + 1);
    applied++;
  }
  write(file, `${src}\n${marker}\n`);
  report('tool descriptions', `${applied}/${items.length}`);
}

// ── 4. client dictionaries ───────────────────────────────────────────────────
function localizeClientDictionaries() {
  const file = 'client.js';
  let src = read(file);
  const marker = '/* ru-client-localization */';
  if (src.includes(marker)) return report('client dictionaries', 'already localized');
  const i18n = dict('ru-i18n.json');
  const l10n = dict('ru-l10n.json');
  i18n.ru = 'Русский';
  const l10nAt = src.indexOf('var L10N = {');
  if (l10nAt < 0) return report('client dictionaries', 'SKIPPED (L10N anchor not found)');
  const braceStart = src.indexOf('{', l10nAt);
  const insertAt = matching(src, braceStart) + 1;
  const code = `\n\n${marker}\n`
    + `I18N.ru = ${JSON.stringify(i18n)};\n`
    + `L10N.ru = ${JSON.stringify(l10n)};\n`
    + `try { I18N.en.ru = 'Русский'; I18N.zh.ru = 'Русский' } catch (e) {}\n`
    + `if (LOCALE_ALL.indexOf('ru') < 0) LOCALE_ALL.push('ru')\n`;
  write(file, src.slice(0, insertAt) + code + src.slice(insertAt));
  return report('client dictionaries', `I18N.ru ${Object.keys(i18n).length} / L10N.ru ${Object.keys(l10n).length}`);
}

// ── 5. hardcoded client literals ─────────────────────────────────────────────
function localizeClientHardcoded() {
  const file = 'client.js';
  let src = read(file);
  const marker = '/* ru-client-hardcoded */';
  if (src.includes(marker)) return report('hardcoded client strings', 'already localized');
  const map = dict('hardcoded-map.json');
  const escape = (text, quoteChar) => text.replace(/\\/g, '\\\\').replace(new RegExp(quoteChar, 'g'), `\\${quoteChar}`).replace(/\n/g, '\\n');
  let replaced = 0;
  for (const [from, to] of Object.entries(map)) {
    for (const q of ["'", '"']) {
      const needle = q + escape(from, q) + q;
      if (!src.includes(needle)) continue;
      replaced += src.split(needle).length - 1;
      src = src.split(needle).join(q + escape(to, q) + q);
    }
  }
  write(file, `${src}\n${marker}\n`);
  report('hardcoded client strings', `${replaced} replacements`);
}

// ── 6. leftover frame fragments + ledger titles ─────────────────────────────
const FRAME2_PAIRS = [
  ['自动沉淀: 每轮对话结束自动评估', 'автоотложение: оценка после каждого раунда'],
  ['自动沉淀: 已关闭', 'автоотложение: выключено'],
  ['其他工作区记忆(开发/排查时可调用 memory_recall 检索其日志/笔记): ', 'Память других рабочих папок (при разработке/отладке ищется через memory_recall): '],
  ['[层账] ', '[Слои] '],
  ['[降级] ', '[Деградация] '],
  ['空层：', 'Пустой слой: '],
  ['（本轮该层无数据可注入，非静默丢弃）', '(в этом раунде в слое нет данных — это не потеря)'],
  ['[闸门] 本轮无语义命中（no-hit）→ 仅目录层，未下探 Tier-1/Tier-2', '[Фильтр] В этом раунде семантических совпадений нет → только каталог, Tier-1/Tier-2 не запрашивались'],
  ['…(截断,全文见 handoff/ 白板与账本)', '…(обрезано, полный текст — в handoff/, доска и ledger)'],
  ['…(截断,完整内容用 memory_recall 或 GUI 面板)', '…(обрезано; полный текст — memory_recall или панель GUI)'],
  ['# 交接账本 · ', '# Ledger передачи · '],
  ['项目约定(CLAUDE.md 等)', 'Соглашения проекта (CLAUDE.md и др.)'],
  ["'项目文件'", "'файл проекта'"],
  ['需要这些记忆时:直接读取上述绝对路径文件(你有文件读取能力),或用 memory_recall 按需检索;不要凭空猜测其内容。', 'Если эти записи нужны: прочитайте файл по указанному абсолютному пути (доступ к файлам есть) или ищите через memory_recall; не выдумывайте содержимое.'],
  ['· 历史会话索引: ', '· Индекс прошлых сессий: '],
  [' 个 —— 需要时用 memory_recall 检索。', ' — при необходимости ищите через memory_recall.'],
];
const LEDGER_PAIRS = [
  ["['任务状态', '目标', '已试方案与失败原因', '进度与下一步']", "['Статус задачи', 'Цель', 'Испробованные подходы и причины провала', 'Прогресс и следующий шаг']"],
  ["title: '已试方案与失败原因'", "title: 'Испробованные подходы и причины провала'"],
  ["title: '进度与下一步'", "title: 'Прогресс и следующий шаг'"],
  ["title: '目标'", "title: 'Цель'"],
  ["title: '任务状态'", "title: 'Статус задачи'"],
  ["'## 任务状态'", "'## Статус задачи'"],
  ["'## 目标'", "'## Цель'"],
  ["'## 已试方案与失败原因'", "'## Испробованные подходы и причины провала'"],
  ["'## 进度与下一步'", "'## Прогресс и следующий шаг'"],
];
function localizeRemaining() {
  const files = readdirSync(LIB).filter(f => f.endsWith('.js'));
  let touched = 0;
  for (const file of files) {
    let src = read(file);
    if (src.includes('/* ru-frame2-localization */') || src.includes('// ru-ledger-titles')) continue;
    let changed = false;
    for (const [from, to] of [...FRAME2_PAIRS, ...LEDGER_PAIRS]) {
      if (!src.includes(from)) continue;
      src = src.split(from).join(to);
      changed = true;
    }
    if (changed) { write(file, `${src}\n/* ru-frame2-localization */\n// ru-ledger-titles\n`); touched++; }
  }
  report('frame/ledger strings', `${touched} files touched`);
}

console.log(`Localizing plug-in at ${PLUGIN}`);
localizeFrame();
localizePrompts();
localizeTools();
localizeClientDictionaries();
localizeClientHardcoded();
localizeRemaining();
console.log('Done. Restart DeepSeek Harness to apply.');
