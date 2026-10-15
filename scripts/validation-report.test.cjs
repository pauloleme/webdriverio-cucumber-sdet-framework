const assert = require('node:assert/strict');
const test = require('node:test');
const { buildReport, filesCreatedSinceRunStart, statusCounts } = require('./test-with-validation-report.cjs');

test('selects only result files created in the current run', () => {
    const previous = new Set(['C:\\repo\\allure-results\\old-result.json']);
    const currentFiles = [
        'C:\\repo\\allure-results\\old-result.json',
        'C:\\repo\\allure-results\\new-result.json'
    ];

    assert.deepEqual(filesCreatedSinceRunStart(currentFiles, previous), ['C:\\repo\\allure-results\\new-result.json']);
});

test('counts scenario statuses and categorizes unknown states', () => {
    assert.deepEqual(statusCounts([{ status: 'passed' }, { status: 'failed' }, { status: 'other' }]), {
        passed: 1,
        failed: 1,
        broken: 0,
        skipped: 0,
        unknown: 1
    });
});

test('renders charts and escaped current-run validation details', () => {
    const html = buildReport({
        runId: 'run-test',
        startedAt: 1000,
        finishedAt: 2500,
        exitCode: 1,
        observerEnabled: true,
        scenarios: [{
            name: '<script>alert(1)</script>',
            feature: 'Checkout',
            status: 'failed',
            start: 1000,
            stop: 2000,
            steps: [{ name: 'Then total is valid', status: 'failed', start: 1200, stop: 1400 }],
            details: 'password="private" Authorization: Bearer abc123 phone=555-123-4567'
        }],
        evidence: [{
            scenarioName: 'Checkout',
            type: 'http-error',
            method: 'GET',
            statusCode: 401,
            requestUrl: 'https://example.test/api?token=private',
            occurrences: 1
        }]
    });

    assert.match(html, /Scenario status/);
    assert.match(html, /Step validations/);
    assert.match(html, /Passive evidence/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>alert/);
    assert.doesNotMatch(html, /password="private"|abc123|555-123-4567|token=private/);
    assert.match(html, /FAILED/);
});