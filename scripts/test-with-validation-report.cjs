const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const allureDirectory = path.join(root, 'allure-results');
const evidenceDirectory = path.join(root, 'artifacts', 'passive-evidence');
const reportDirectory = path.join(root, 'artifacts', 'validation-report');
const reportPath = path.join(reportDirectory, 'latest.html');
const statuses = ['passed', 'failed', 'broken', 'skipped', 'unknown'];
const colors = { passed: '#17845c', failed: '#c43d4d', broken: '#d17a24', skipped: '#788493', unknown: '#b8c1ca' };

function listFiles(directory, suffix) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const filePath = path.join(directory, entry.name);
        return entry.isDirectory() ? listFiles(filePath, suffix) : entry.isFile() && entry.name.endsWith(suffix) ? [filePath] : [];
    });
}

function filesCreatedSinceRunStart(filePaths, beforeRun) {
    return filePaths.filter((filePath) => !beforeRun.has(path.resolve(filePath)));
}

function readJson(filePath) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return undefined; }
}

function readScenarios(filePaths) {
    return filePaths.map(readJson).filter((result) => result && typeof result.name === 'string').map((result) => ({
        name: result.name,
        feature: result.labels?.find((label) => label.name === 'feature')?.value || 'Feature',
        status: statuses.includes(result.status) ? result.status : 'unknown',
        start: Number(result.start) || 0,
        stop: Number(result.stop) || 0,
        steps: Array.isArray(result.steps) ? result.steps : [],
        details: result.statusDetails?.message || ''
    })).sort((left, right) => left.feature.localeCompare(right.feature) || left.name.localeCompare(right.name));
}

function readEvidence(filePaths) {
    const records = [];
    for (const filePath of filePaths) {
        try {
            for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
                if (!line.trim()) continue;
                try {
                    const record = JSON.parse(line);
                    if (record && typeof record.type === 'string') records.push(record);
                } catch { /* Ignore incomplete JSONL rows. */ }
            }
        } catch { /* Evidence is supplemental and must not affect test status. */ }
    }
    return records;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeText(value, limit = 300) {
    return String(value ?? '')
        .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => { try { return new URL(url).origin; } catch { return '[URL]'; } })
    .replace(/\bBearer\s+[A-Z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Z0-9_-]{5,}\.[A-Z0-9_-]{5,}\.[A-Z0-9_-]{5,}\b/gi, '[REDACTED_TOKEN]')
    .replace(/\b(password|passwd|token|access[_-]?token|refresh[_-]?token|authorization|cookie|secret|api[_-]?key|email|phone|mobile|first[_-]?name|last[_-]?name|full[_-]?name|postal[_-]?code|zip[_-]?code|ssn|address)\b["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s&,;)}\]]+)/gi, '$1=[REDACTED]')
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b\+?\d[\d ().-]{7,}\d\b/g, '[REDACTED_PHONE]')
        .slice(0, limit);
}

function statusCounts(items) {
    const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
    for (const item of items) counts[statuses.includes(item.status) ? item.status : 'unknown']++;
    return counts;
}

function flattenSteps(steps, depth = 0) {
    return steps.flatMap((step) => [{
        name: safeText(step.name || 'Unnamed validation'),
        status: statuses.includes(step.status) ? step.status : 'unknown',
        depth: Math.min(depth, 5),
        duration: Math.max(0, Number(step.stop) - Number(step.start))
    }, ...flattenSteps(Array.isArray(step.steps) ? step.steps : [], depth + 1)]);
}

function statusChart(title, counts, total) {
    const safeTotal = Math.max(1, total);
    let offset = 0;
    const segments = statuses.map((status) => {
        const start = offset;
        offset += counts[status] / safeTotal * 100;
        return `${colors[status]} ${start.toFixed(2)}% ${offset.toFixed(2)}%`;
    });
    const bars = statuses.map((status) => {
        const width = total ? counts[status] / total * 100 : 0;
        return `<div class="bar"><span>${status}</span><i><b style="width:${width.toFixed(2)}%;background:${colors[status]}"></b></i><strong>${counts[status]}</strong></div>`;
    }).join('');
    return `<section class="panel"><h2>${title}</h2><div class="chart"><div class="donut" style="background:conic-gradient(${segments.join(',')})"><b>${total}<small>total</small></b></div><div class="bars">${bars}</div></div></section>`;
}

function evidenceChart(records) {
    const counts = new Map();
    for (const record of records) counts.set(record.type, (counts.get(record.type) || 0) + 1);
    const max = Math.max(1, ...counts.values());
    const bars = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) =>
        `<div class="bar"><span>${escapeHtml(type)}</span><i><b class="evidence-bar" style="width:${(count / max * 100).toFixed(2)}%"></b></i><strong>${count}</strong></div>`
    ).join('');
    return `<section class="panel"><h2>Passive evidence</h2><p class="muted">${records.length} events in this run</p><div class="bars">${bars || '<p class="muted">No events captured.</p>'}</div></section>`;
}

function renderScenario(scenario) {
    const steps = flattenSteps(scenario.steps).map((step) =>
        `<li style="--depth:${step.depth}"><span class="dot ${step.status}"></span><span>${escapeHtml(step.name)}</span><b>${step.status}</b><small>${step.duration ? `${step.duration} ms` : ''}</small></li>`
    ).join('');
    const failure = scenario.details ? `<p class="failure">${escapeHtml(safeText(scenario.details, 1000))}</p>` : '';
    return `<details class="scenario"><summary><b class="pill ${scenario.status}">${scenario.status}</b><span><strong>${escapeHtml(safeText(scenario.name))}</strong><small>${escapeHtml(safeText(scenario.feature))}</small></span><time>${Math.max(0, scenario.stop - scenario.start)} ms</time></summary>${failure}<ul>${steps || '<li class="muted">No step details.</li>'}</ul></details>`;
}

function renderEvidenceTable(records) {
    if (!records.length) return '<p class="muted">No passive evidence captured in this run.</p>';
    const rows = records.map((record) => {
        let origin = '';
        try { origin = new URL(record.requestUrl || record.pageUrl).origin; } catch { /* URL is optional. */ }
        return `<tr><td>${escapeHtml(safeText(record.scenarioName))}</td><td>${escapeHtml(record.type)}</td><td>${escapeHtml(record.method || '')}</td><td>${escapeHtml(record.statusCode || '')}</td><td>${escapeHtml(origin)}</td><td>${escapeHtml(record.occurrences || 1)}</td></tr>`;
    }).join('');
    return `<div class="table-wrap"><table><thead><tr><th>Scenario</th><th>Event</th><th>Method</th><th>Status</th><th>Origin</th><th>Count</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function buildReport({ runId, startedAt, finishedAt, exitCode, scenarios, evidence, observerEnabled }) {
    const counts = statusCounts(scenarios);
    const steps = scenarios.flatMap((scenario) => flattenSteps(scenario.steps));
    const stepCounts = statusCounts(steps);
    const runStatus = exitCode === 0 ? 'PASSED' : 'FAILED';
    const scenarioRows = scenarios.length ? scenarios.map(renderScenario).join('') : '<p class="muted">No scenario result files were produced for this run.</p>';
    const charts = `${statusChart('Scenario status', counts, scenarios.length)}${statusChart('Step validations', stepCounts, steps.length)}${evidenceChart(evidence)}`;
    const observerState = observerEnabled ? 'Enabled for this run.' : 'Disabled. Set PASSIVE_OBSERVER_ENABLED=true to collect browser events.';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Current E2E Validation Report</title><style>
:root{--ink:#17222d;--muted:#697785;--line:#dce3e9;--green:#17845c;--red:#c43d4d;--orange:#d17a24;--blue:#277a92}*{box-sizing:border-box}body{margin:0;background:#f1f4f6;color:var(--ink);font:14px/1.5 "Segoe UI",Arial,sans-serif}header{background:#173e43;color:white;padding:25px max(22px,calc((100vw - 1180px)/2));border-bottom:5px solid #d17a3e}.eyebrow{text-transform:uppercase;font-size:11px;color:#c4d9d6}h1{margin:6px 0 10px;font-size:27px}.meta{display:flex;gap:10px 20px;flex-wrap:wrap;color:#dce8e5}.run-pill{background:${runStatus === 'PASSED' ? 'var(--green)' : 'var(--red)'};padding:3px 9px;border-radius:4px;font-weight:700}.container{max-width:1180px;padding:0 20px;margin:22px auto}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric,.panel,.block{background:#fff;border:1px solid var(--line);border-radius:6px}.metric{padding:14px}.metric span{display:block;color:var(--muted);font-size:12px}.metric strong{font-size:23px}.charts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}.panel,.block{padding:16px}.panel h2,.block h2{margin:0 0 12px;font-size:16px}.chart{display:flex;align-items:center;gap:15px}.donut{width:96px;height:96px;flex:0 0 96px;border-radius:50%;display:grid;place-items:center;position:relative}.donut:before{content:"";position:absolute;inset:12px;background:white;border-radius:50%}.donut>b{z-index:1;text-align:center;font-size:18px}.donut small{display:block;font-size:10px;color:var(--muted);font-weight:400}.bars{min-width:0;flex:1}.bar{display:grid;grid-template-columns:70px minmax(30px,1fr) 20px;align-items:center;gap:7px;margin:7px 0;font-size:11px}.bar span{color:var(--muted);overflow-wrap:anywhere}.bar strong{text-align:right}.bar i{height:8px;background:#e9edf0;border-radius:9px;overflow:hidden}.bar i b{display:block;height:100%;border-radius:9px}.evidence-bar{background:var(--blue)}.muted{font-size:12px;color:var(--muted)}.scenario{border-top:1px solid var(--line)}summary{display:grid;grid-template-columns:72px minmax(0,1fr) 70px;gap:10px;align-items:center;padding:11px 2px;cursor:pointer;list-style:none}summary::-webkit-details-marker{display:none}summary span strong,summary span small{display:block;overflow-wrap:anywhere}summary small{color:var(--muted)}summary time{text-align:right;color:var(--muted);font-size:12px}.pill{font-size:11px;text-align:center;padding:3px 6px;border-radius:4px}.pill.passed{color:#126344;background:#e2f3eb}.pill.failed{color:#a52636;background:#fde8eb}.pill.broken{color:#8d4a0a;background:#fff0df}.pill.skipped,.pill.unknown{background:#edf0f3;color:#56616d}ul{list-style:none;padding:0 0 10px;margin:0}li{display:grid;grid-template-columns:8px minmax(0,1fr) 60px 55px;gap:8px;align-items:center;padding:5px 0 5px calc(10px + var(--depth)*14px);font-size:12px}li span:nth-child(2){overflow-wrap:anywhere}li b,li small{text-align:right}li small{color:var(--muted)}.dot{width:7px;height:7px;border-radius:50%;background:#adb7c1}.dot.passed{background:var(--green)}.dot.failed{background:var(--red)}.dot.broken{background:var(--orange)}.failure{padding:8px;background:#fff3f3;overflow-wrap:anywhere}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:9px;border-top:1px solid var(--line);overflow-wrap:anywhere}th{color:var(--muted)}footer{max-width:1180px;margin:auto;padding:0 20px 24px;color:var(--muted);font-size:12px}@media(max-width:900px){.charts{grid-template-columns:1fr 1fr}}@media(max-width:620px){header{padding:22px}.container{padding:0 12px}.metrics{grid-template-columns:1fr 1fr}.charts{grid-template-columns:1fr}summary{grid-template-columns:64px minmax(0,1fr) 55px}}
</style></head><body><header><div class="eyebrow">WebdriverIO · Cucumber · current run only</div><h1>Validation report</h1><div class="meta"><span class="run-pill">${runStatus}</span><span>Run ${escapeHtml(runId)}</span><span>Started ${escapeHtml(new Date(startedAt).toLocaleString())}</span><span>Duration ${((finishedAt - startedAt) / 1000).toFixed(1)} s</span></div></header><main class="container"><section class="metrics"><div class="metric"><span>Scenarios</span><strong>${scenarios.length}</strong></div><div class="metric"><span>Passed</span><strong>${counts.passed}</strong></div><div class="metric"><span>Failed / broken</span><strong>${counts.failed + counts.broken}</strong></div><div class="metric"><span>Passive events</span><strong>${evidence.length}</strong></div></section><section class="charts">${charts}</section><section class="block"><h2>Scenarios and validations</h2>${scenarioRows}</section><section class="block"><h2>Browser evidence</h2><p class="muted">${observerState} URLs are displayed by origin only. Raw console messages, headers, bodies, DOM and screenshots are excluded.</p>${renderEvidenceTable(evidence)}</section></main><footer>Generated for this execution. Older Allure files were not included. Updated ${escapeHtml(new Date(finishedAt).toLocaleString())}.</footer></body></html>`;
}

function openReport() {
    if (process.env.CI === 'true' || process.env.VALIDATION_REPORT_OPEN === 'false') return;
    const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    try {
        const child = spawn(command, [reportPath], { detached: true, stdio: 'ignore' });
        child.on('error', () => console.warn('Não foi possível abrir o relatório automaticamente.'));
        child.unref();
    } catch { console.warn('Não foi possível abrir o relatório automaticamente.'); }
}

function run() {
    const oldResults = new Set(listFiles(allureDirectory, '-result.json').map((file) => path.resolve(file)));
    const oldEvidence = new Set(listFiles(evidenceDirectory, '.jsonl').map((file) => path.resolve(file)));
    const startedAt = Date.now();
    const runId = randomUUID();
    const cli = path.join(root, 'node_modules', '@wdio', 'cli', 'bin', 'wdio.js');
    const execution = spawnSync(process.execPath, [cli, 'run', './wdio.conf.ts', ...process.argv.slice(2)], { cwd: root, env: process.env, stdio: 'inherit' });
    const finishedAt = Date.now();
    const exitCode = execution.error ? 1 : execution.status ?? 1;
    if (execution.error) console.error(`Não foi possível iniciar o WebdriverIO: ${execution.error.message}`);

    const scenarios = readScenarios(filesCreatedSinceRunStart(listFiles(allureDirectory, '-result.json'), oldResults));
    const evidence = readEvidence(filesCreatedSinceRunStart(listFiles(evidenceDirectory, '.jsonl'), oldEvidence));
    try {
        fs.mkdirSync(reportDirectory, { recursive: true });
        fs.writeFileSync(reportPath, buildReport({ runId, startedAt, finishedAt, exitCode, scenarios, evidence, observerEnabled: process.env.PASSIVE_OBSERVER_ENABLED === 'true' }), 'utf8');
        const counts = statusCounts(scenarios);
        console.log('\nResumo da validação atual');
        console.log(`Execução: ${exitCode === 0 ? 'PASSOU' : 'FALHOU'}`);
        console.log(`Cenários: ${scenarios.length} | passaram ${counts.passed} | falharam ${counts.failed} | quebrados ${counts.broken} | ignorados ${counts.skipped}`);
        console.log(`Eventos passivos: ${evidence.length}`);
        console.log(`Relatório HTML: ${reportPath}`);
        openReport();
    } catch (error) {
        console.warn(`Não foi possível gerar o relatório HTML: ${error.message}`);
    }
    process.exitCode = exitCode;
}

if (require.main === module) run();

module.exports = { buildReport, filesCreatedSinceRunStart, readEvidence, readScenarios, statusCounts };