const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const targets = {
    results: path.join(rootDir, 'allure-results'),
    report: path.join(rootDir, 'allure-report'),
    screenshots: path.join(rootDir, 'screenshots'),
    logs: path.join(rootDir, 'logs')
};

const args: string[] = process.argv.slice(2);

let selectedTargets: [string, string][] = [];

if (args.includes('--results-only')) {
    selectedTargets.push(['allure-results', targets.results]);
} else if (args.includes('--report-only')) {
    selectedTargets.push(['allure-report', targets.report]);
} else if (args.includes('--screenshots-only')) {
    selectedTargets.push(['screenshots', targets.screenshots]);
} else {
    selectedTargets = [
        ['allure-results', targets.results],
        ['allure-report', targets.report],
        ['screenshots', targets.screenshots],
        ['logs', targets.logs]
    ];
}

console.log(
    '🧹 [Clean Evidence] Starting cleanup of previous evidence...'
);

let removedCount = 0;

for (const [name, targetPath] of selectedTargets) {
    if (fs.existsSync(targetPath)) {
        try {
            fs.rmSync(targetPath, {
                recursive: true,
                force: true
            });

            console.log(
                `  ✓ Successfully removed: ${name} (${targetPath})`
            );

            removedCount++;
        } catch (error) {
            console.error(
                `  ✗ Error removing ${name}: `,
                error instanceof Error ? error.message : error
            );
        }
    } else {
        console.log(`  - Not found (already clean): ${name}`);
    }
}

const directoryLabel = removedCount === 1 ? 'directory' : 'directories';

console.log(`✨ [Clean Evidence] Cleanup completed! ${removedCount} ${directoryLabel} removed.\n`);
