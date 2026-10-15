const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const typescript = require('typescript');

const sourcePath = path.resolve(__dirname, '../features/utils/passive-observer.ts');
const sourceText = fs.readFileSync(sourcePath, 'utf8');
const compiledSource = typescript.transpileModule(sourceText, {
    compilerOptions: {
        esModuleInterop: true,
        module: typescript.ModuleKind.CommonJS,
        target: typescript.ScriptTarget.ES2022
    }
}).outputText;
const sourceModule = new Module(sourcePath, module);
sourceModule.filename = sourcePath;
sourceModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
sourceModule._compile(compiledSource, sourcePath);

const { PassiveObserver, redactSensitiveText, sanitizeUrl } = sourceModule.exports;

class FakeBiDiSource extends EventEmitter {
    subscriptions = [];
    unsubscriptions = [];
    currentUrl = 'https://example.test/start?session=private#details';
    subscribeError;

    async sessionSubscribe(options) {
        if (this.subscribeError) {
            throw this.subscribeError;
        }
        this.subscriptions.push(options.events);
    }

    async sessionUnsubscribe(options) {
        this.unsubscriptions.push(options.events);
    }

    async getUrl() {
        return this.currentUrl;
    }
}

function createObserver(options = {}) {
    const source = new FakeBiDiSource();
    const writes = [];
    const warnings = [];
    const observer = new PassiveObserver({
        enabled: true,
        source,
        warn: (message) => warnings.push(message),
        writeEvidenceFile: async (filePath, contents) => writes.push({ filePath, contents }),
        ...options
    });
    return { observer, source, writes, warnings };
}

function emitConsoleError(source, text = 'Application exception') {
    source.emit('log.entryAdded', {
        params: {
            level: 'error',
            text,
            type: 'javascript',
            source: { url: 'https://example.test/app.js?token=private', lineNumber: 12 }
        }
    });
}

test('redacts credentials, bearer values, emails, and URL query strings', () => {
    const safeText = redactSensitiveText(
        'password="secret" Authorization: Bearer abc123 email=person@example.test postalCode=18086-431 https://example.test/a?token=private'
    );

    assert.doesNotMatch(safeText, /secret|abc123|person@example\.test|18086-431|token=private/);
    assert.match(safeText, /password=\[REDACTED\]/);
    assert.match(safeText, /postalCode=\[REDACTED\]/);
    assert.equal(sanitizeUrl('https://user:pass@example.test/a?token=private#secret'), 'https://example.test/a');
});

test('normalizes console, network, and HTTP error events into bounded JSONL records', async () => {
    const { observer, source, writes } = createObserver();
    await observer.startScenario('Checkout flow');

    emitConsoleError(source, 'Request failed for https://example.test/api?access_token=hidden');
    source.emit('network.fetchError', {
        params: {
            errorText: 'net::ERR_CONNECTION_RESET',
            request: { method: 'GET', url: 'https://example.test/api?key=private' }
        }
    });
    source.emit('network.responseCompleted', {
        params: {
            request: { method: 'POST', url: 'https://example.test/checkout?email=private' },
            response: { status: 500 }
        }
    });
    source.emit('network.responseCompleted', {
        params: { request: { method: 'GET', url: 'https://example.test/ok' }, response: { status: 200 } }
    });

    await observer.finishScenario();
    const records = writes[0].contents.trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(records.map((record) => record.type), [
        'javascript-exception',
        'network-failure',
        'http-error'
    ]);
    assert.equal(records[0].scenarioName, 'Checkout flow');
    assert.equal(records[0].pageUrl, 'https://example.test/start');
    assert.equal(records[2].statusCode, 500);
    assert.ok(records.every((record) => record.runId && record.scenarioId && record.timestamp));
    assert.doesNotMatch(writes[0].contents, /private|hidden/);
    assert.ok(writes[0].contents.length < 12000);
});

test('deduplicates repeated events and caps the number of unique records', async () => {
    const { observer, source, writes, warnings } = createObserver({ maxEvents: 1 });
    await observer.startScenario('Duplicate event');
    emitConsoleError(source);
    emitConsoleError(source);
    source.emit('network.fetchError', {
        params: { errorText: 'connection failed', request: { method: 'GET', url: 'https://example.test/api' } }
    });

    await observer.finishScenario();
    const records = writes[0].contents.trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(records.length, 1);
    assert.equal(records[0].occurrences, 2);
    assert.equal(warnings.length, 1);
});

test('disabled observer installs no listeners and does not subscribe', async () => {
    const source = new FakeBiDiSource();
    const observer = new PassiveObserver({ enabled: false, source });

    assert.equal(await observer.startScenario('Disabled scenario'), false);
    assert.equal(source.eventNames().length, 0);
    assert.equal(source.subscriptions.length, 0);
});

test('isolates scenarios and uses collision-resistant evidence paths', async () => {
    const { observer, source, writes } = createObserver();
    await observer.startScenario('First scenario');
    emitConsoleError(source, 'first error');
    await observer.finishScenario();

    await observer.startScenario('Second scenario');
    emitConsoleError(source, 'second error');
    await observer.finishScenario();

    assert.equal(writes.length, 2);
    assert.notEqual(writes[0].filePath, writes[1].filePath);
    const first = JSON.parse(writes[0].contents.trim());
    const second = JSON.parse(writes[1].contents.trim());
    assert.equal(first.runId, second.runId);
    assert.notEqual(first.scenarioId, second.scenarioId);
    assert.equal(source.listenerCount('log.entryAdded'), 1);

    await observer.dispose();
    assert.equal(source.listenerCount('log.entryAdded'), 0);
    assert.equal(source.unsubscriptions.length, 1);
});

test('separates evidence paths across concurrent worker observers', async () => {
    const firstWorker = createObserver();
    const secondWorker = createObserver();
    await Promise.all([
        firstWorker.observer.startScenario('Concurrent scenario'),
        secondWorker.observer.startScenario('Concurrent scenario')
    ]);
    emitConsoleError(firstWorker.source, 'first worker error');
    emitConsoleError(secondWorker.source, 'second worker error');

    await Promise.all([
        firstWorker.observer.finishScenario(),
        secondWorker.observer.finishScenario()
    ]);

    assert.notEqual(firstWorker.writes[0].filePath, secondWorker.writes[0].filePath);
    assert.notEqual(
        JSON.parse(firstWorker.writes[0].contents).runId,
        JSON.parse(secondWorker.writes[0].contents).runId
    );
});

test('isolates subscription and filesystem failures from test execution', async () => {
    const source = new FakeBiDiSource();
    source.subscribeError = new Error('sensitive details are not logged');
    const warnings = [];
    const observer = new PassiveObserver({ enabled: true, source, warn: (message) => warnings.push(message) });
    assert.equal(await observer.startScenario('Subscription failure'), false);
    assert.equal(source.listenerCount('log.entryAdded'), 0);
    assert.deepEqual(warnings, ['Browser event collection is unavailable for this session.']);

    const failing = createObserver({
        writeEvidenceFile: async () => { throw new Error('filesystem details are not logged'); }
    });
    await failing.observer.startScenario('Storage failure');
    emitConsoleError(failing.source);
    assert.equal(await failing.observer.finishScenario(), undefined);
    assert.deepEqual(failing.warnings, ['Evidence could not be written to the local artifact directory.']);
});