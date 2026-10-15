const fs = require('node:fs');
const path = require('node:path');

const reportPath = path.resolve(__dirname, '..', 'artifacts', 'validation-report', 'latest.html');
const requiredContent = [
    '<!doctype html>',
    '<title>Current E2E Validation Report</title>',
    'Scenario status',
    'Step validations',
    'Passive evidence',
    'Older Allure files were not included.'
];

function validateReport(html) {
    const missing = requiredContent.filter((content) => !html.includes(content));
    if (missing.length > 0) {
        throw new Error(`Validation dashboard is missing required sections: ${missing.join(', ')}`);
    }

    const scenarios = [...html.matchAll(/<details class="scenario"/g)].length;
    if (scenarios === 0) {
        throw new Error('Validation dashboard contains no scenario results.');
    }

    if (!html.includes('</html>')) {
        throw new Error('Validation dashboard HTML is incomplete.');
    }

    return { scenarios, bytes: Buffer.byteLength(html, 'utf8') };
}

function verifyReport(filePath = reportPath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Validation dashboard was not generated: ${filePath}`);
    }

    const html = fs.readFileSync(filePath, 'utf8');
    const result = validateReport(html);
    console.log(`Validation dashboard verified: ${result.scenarios} scenarios, ${result.bytes} bytes.`);
    return result;
}

if (require.main === module) {
    try {
        verifyReport();
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = { validateReport, verifyReport };