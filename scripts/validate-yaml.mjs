// Pre-flight YAML syntax check for DSH patch files.
// `!!js <expr>` is a loader-specific tag, so neutralize it before a plain js-yaml parse.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('C:/Users/admin/.dsh/profiles/desktop/node_modules/js-yaml');

let failed = false;
for (const file of process.argv.slice(2)) {
  const source = readFileSync(file, 'utf8').replace(/!!js\s+[^\n]*/g, '"__js__"');
  try {
    const doc = yaml.load(source, { json: true });
    console.log(`OK   ${file} (entries=${Array.isArray(doc) ? doc.length : typeof doc})`);
  } catch (error) {
    failed = true;
    console.log(`FAIL ${file}: ${error.message}`);
  }
}
process.exitCode = failed ? 1 : 0;
