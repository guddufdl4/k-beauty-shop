const fs = require('fs'), vm = require('vm'), ts = require('typescript'), assert = require('assert/strict');
function load(file, imports = {}, DateClass = Date) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,require:name=>imports[name]??{},Date:DateClass,Intl,Map,console,URLSearchParams});
  return exports;
}
const visits = load('src/lib/admin/visits.ts');
const orders = load('src/lib/admin/orders.ts', {'@/lib/admin/visits': visits,'./order-workflow-policy':load('src/lib/admin/order-workflow-policy.ts')});
const before = '2026-10-07T14:59:59Z', after = '2026-10-07T15:00:00Z';
assert.match(orders.formatAdminOrderDate(before), /2026\. 10\. 07\. 23:59/);
assert.match(orders.formatAdminOrderDate(after), /2026\. 10\. 08\. 00:00/);
assert.equal(orders.formatAdminOrderDate('invalid'), '—');
const totals = orders.buildAdminOrderPeriodTotals([{created_at:before,total:100},{created_at:after,total:200}],new Date('2026-10-08T03:00:00Z'));
assert.equal(totals.today.amount,200); assert.equal(totals.today.count,1);
assert.equal(totals.yesterday.amount,100); assert.equal(totals.yesterday.count,1);
assert.equal(totals.thisWeek.amount,300); assert.equal(totals.thisMonth.amount,300);
assert.equal(totals.daily[0].key,'2026-10-08');
assert.equal(orders.buildAdminOrdersHref(2,'deleted'),'/admin/orders?view=deleted&page=2');
console.log('PASS: displayed KST dates agree with daily/weekly/monthly totals at midnight; invalid dates; deleted pagination.');
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [after])); } }
const cart = load('src/lib/cart.ts', {}, FixedDate);
assert.match(cart.generateOrderNumber(), /^KB-20261008-/);
cart.generateSequentialQuoteNumber(async prefix => {
  assert.equal(prefix,'QT-20261008-'); return prefix+'0002';
}).then(number => { assert.equal(number,'QT-20261008-0003'); console.log('PASS: new order and quote numbers use KST across midnight.'); }).catch(error => {console.error(error);process.exitCode=1;});
