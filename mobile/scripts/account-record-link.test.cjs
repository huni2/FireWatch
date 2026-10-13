const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const moduleFixture = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../shared/account-record-link.ts'), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {module:moduleFixture,exports:moduleFixture.exports});
const {accountRecordComparison, accountRecordSummary} = moduleFixture.exports;
const holding = (symbol, quantity) => ({symbol,name:symbol,quantity,averageCost:100,currency:'USD'});
const snapshot = (holdings=[], watchedStocks=[]) => ({holdings,watchedStocks,cash:0,goal:'목표',accountType:'GENERAL'});
test('only validated conflict responses enter the comparison flow', () => {
 const comparison={fingerprint:'a'.repeat(64),device:snapshot(),account:snapshot()};
 assert.equal(accountRecordComparison({code:'ACCOUNT_RECORD_CHOICE_REQUIRED',details:{comparison}}),comparison);
 assert.equal(accountRecordComparison({code:'CONFLICT',details:{comparison}}),null);
 assert.equal(accountRecordComparison({code:'ACCOUNT_RECORD_CHOICE_REQUIRED'}),null);
 assert.equal(accountRecordComparison({code:'ACCOUNT_RECORD_CHOICE_REQUIRED',details:{comparison:{...comparison,device:{holdings:[]}}}}),null);
});
test('summary deduplicates company identities without summing the recorded quantities', () => {
 const c={device:snapshot([holding('aapl',2),holding('MSFT',3)],['aapl','MSFT']),account:snapshot([holding('AAPL',10)],['AAPL'])};
 const s=accountRecordSummary(c);
 assert.equal(s.holdings,2);assert.equal(s.watches,2);assert.equal(s.duplicates.length,1);
 assert.equal(c.account.holdings[0].quantity,10);assert.equal(c.device.holdings[0].quantity,2);
});
test('an empty portfolio still preserves an independent watch-list comparison', () => {
 const s=accountRecordSummary({device:snapshot([],['005930.KS']),account:snapshot([],['035720.KS'])});
 assert.equal(s.holdings,0);assert.equal(s.watches,2);assert.equal(s.duplicates.length,0);
});
