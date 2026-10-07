const fs = require('node:fs');
const assert = require('node:assert/strict');
const {IntlMessageFormat} = require('intl-messageformat');
const {parse} = require('@formatjs/icu-messageformat-parser');
function leaves(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') out[path] = child;
    else leaves(child, path, out);
  }
  return out;
}
function args(ast, result = new Set()) {
  for (const node of ast) {
    if ([1, 2, 3, 4, 5, 6].includes(node.type)) result.add(node.value);
    if (node.options) for (const option of Object.values(node.options)) args(option.value, result);
    if (node.children) args(node.children, result);
  }
  return [...result].sort();
}
const base = leaves(JSON.parse(fs.readFileSync('messages/en.json', 'utf8')));
for (const locale of ['vi', 'id', 'th']) {
  const translated = leaves(JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8')));
  assert.deepEqual(Object.keys(translated).sort(), Object.keys(base).sort());
  for (const [key, value] of Object.entries(translated)) {
    assert.ok(value.trim(), `${locale}.${key} empty`);
    const ast = parse(value);
    assert.deepEqual(args(ast), args(parse(base[key])), `${locale}.${key} arguments`);
    const values = Object.fromEntries(args(ast).map(name => [name, /count|quantity|total|page|index|amount|price|rate|days|min|max|remaining/i.test(name) ? 2 : 'HMT']));
    // Parsing/compilation catches invalid ICU even when no interpolation is needed.
    new IntlMessageFormat(value, locale);
    if (!ast.some(node => [3, 4, 8].includes(node.type))) new IntlMessageFormat(value, locale).format(values);
  }
  console.log(`PASS ${locale}: ${Object.keys(translated).length} messages, ICU and placeholder parity`);
}
const routing = fs.readFileSync('src/i18n/routing.ts', 'utf8');
for (const locale of ['vi', 'id', 'th']) assert.ok(routing.includes(`"${locale}"`));
