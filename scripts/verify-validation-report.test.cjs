const assert = require('node:assert/strict');
const test = require('node:test');
const { validateReport } = require('./verify-validation-report.cjs');

const validReport = `<!doctype html><html><head><title>Current E2E Validation Report</title></head><body>
<h2>Scenario status</h2><h2>Step validations</h2><h2>Passive evidence</h2>
<details class="scenario"><summary>passed</summary></details>
Older Allure files were not included.</body></html>`;

test('accepts a complete dashboard with scenario results', () => {
    assert.deepEqual(validateReport(validReport), { scenarios: 1, bytes: Buffer.byteLength(validReport, 'utf8') });
});

test('rejects an incomplete dashboard', () => {
    assert.throws(() => validateReport('<!doctype html><html></html>'), /missing required sections/);
});

test('rejects dashboards without scenarios', () => {
    const reportWithoutScenarios = validReport.replace('<details class="scenario"><summary>passed</summary></details>', 'No scenarios');
    assert.throws(() => validateReport(reportWithoutScenarios), /no scenario results/);
});