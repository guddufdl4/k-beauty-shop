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
const indonesian = JSON.parse(fs.readFileSync('messages/id.json', 'utf8'));
const thai = JSON.parse(fs.readFileSync('messages/th.json', 'utf8'));
assert.ok(!indonesian.quoteRead.failed.includes('tanda baca'), 'read receipt must not mean punctuation');
assert.ok(indonesian.checkout.quoteNumberPending.includes('permintaan'), 'reference is assigned after request submission, not shipment');
assert.ok(!JSON.stringify(thai).includes('ผู้ซื้อส่ง'), 'use the complete Thai wholesale buyer term');
assert.ok(!thai.cart.errors.moqMultiple.includes('ทวีคูณ'), 'MOQ uses integer multiples, not exponential growth');
for (const locale of ['vi', 'id', 'th']) {
  const messages = JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'));
  assert.ok(!messages.wholesaleInquiry.subtitle.includes('1–2'), 'do not promise a fixed response time');
  assert.notEqual(messages.checkout.loginRequired, messages.auth.signupSubtitle);
}
console.log('PASS reviewed terminology, login/request states and response-time copy');
