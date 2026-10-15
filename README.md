# WebdriverIO Cucumber SDET Framework

End to end test automation framework built with WebdriverIO, TypeScript, Cucumber and Page Object Model.

Application under test: [SauceDemo](https://www.saucedemo.com/)

## Tech Stack

| Technology        | Purpose           |
| ----------------- | ----------------- |
| WebdriverIO v9    | Web automation    |
| TypeScript        | Test development  |
| Cucumber          | BDD and Gherkin   |
| Page Object Model | Test architecture |
| Allure            | Test reporting    |
| Node.js           | Runtime           |
| GitHub Actions    | CI                |

## Architecture

```text
features/
├── data/
├── page-objects/
├── step-definitions/
├── checkout.feature
└── login.feature

scripts/
wdio.conf.ts
package.json
tsconfig.json
```

### Structure

**Page Objects**
Locators and UI interactions.

**Step Definitions**
Connect Gherkin scenarios to the automation code.

**Feature Files**
Contain BDD scenarios.

**Test Data**
Contains reusable test data.

## Requirements

- Node.js 18+
- Google Chrome
- Java 8+
- Git

## Installation

```bash
git clone https://github.com/pauloleme/webdriverio-cucumber-sdet-framework.git
cd webdriverio-cucumber-sdet-framework
npm install
```

## Run Tests

Run all tests:

```bash
npm test
```

Run smoke tests:

```bash
npm run test:smoke
```

Run regression tests:

```bash
npm run test:regression
```

Run login tests:

```bash
npm run test:login
```

Run checkout tests:

```bash
npm run test:checkout
```

Run tests by tag:

```bash
npm run test:tag -- "@smoke"
```

## Cucumber Tags

```text
@login
@auth
@positive
@negative
@smoke
@regression
```

Example:

```bash
npm run test:tag -- "@smoke and not @negative"
```

## Allure Report

Running `npm test` also generates a current-run validation dashboard at `artifacts/validation-report/latest.html` and opens it locally. The dashboard includes scenario and step statuses, durations, passive evidence counts, and charts; older Allure results are excluded. In CI, the HTML path and summary are printed without trying to open a browser.

Generate the report:

```bash
npm run report:generate
```

Open the report:

```bash
npm run report:open
```

Screenshots are saved to `screenshots/` after failed steps and included in the CI artifact upload. They are not automatically attached to the Allure report.

### Passive Browser Evidence

Passive browser evidence is disabled by default. Enable it for a run with:

```bash
npx cross-env PASSIVE_OBSERVER_ENABLED=true npm run test:smoke
```

WebDriver BiDi console errors, JavaScript exceptions, failed requests, and HTTP responses with status 400 or higher are stored as JSONL under `artifacts/passive-evidence/`, grouped by worker run and scenario. Evidence is bounded and deduplicated. Raw console text and source locations are omitted because they can contain application data. Query strings, URL fragments, credentials, common credential and personal-data fields, bearer tokens, JWTs, emails, and phone-like values are redacted. Request and response bodies, headers, cookies, DOM snapshots, and screenshots are not collected by the observer.

Redaction is heuristic and cannot identify every application-specific identifier embedded in arbitrary error messages or URL paths. Treat the local artifacts as sensitive and review them before sharing externally. If browser BiDi events are unsupported, collection is skipped with a concise warning; observer failures do not change test verdicts.

## Automation Behavior

| Area | What it does |
| --- | --- |
| Scenario execution | `npm test` runs the WebdriverIO v9 and Cucumber feature suite against SauceDemo. Cucumber executes each feature's `Background` steps before its scenarios. |
| Existing validations | Scenarios verify login behavior, inventory contents and sorting, cart updates and totals, and checkout confirmation using the existing Page Objects and assertions. |
| Browser lifecycle | Before each scenario, the hooks clear cookies, open the configured base URL, and clear local storage. After each scenario, they clear cookies and local storage again. |
| Headless execution | Set `HEADLESS=true` to run Chrome without a visible window. The current CI configuration also enables headless mode. |
| Passive observation | Set `PASSIVE_OBSERVER_ENABLED=true` to observe WebDriver BiDi console errors, JavaScript exceptions, failed requests, and HTTP responses with status 400 or higher. Observation is disabled by default. |
| Evidence | Bounded, deduplicated JSONL records are written per run and scenario to `artifacts/passive-evidence/`. Sensitive URL parts are removed; raw console text, headers, bodies, DOM content, and screenshots are not stored by the observer. |
| Validation dashboard | `npm test` generates `artifacts/validation-report/latest.html` from result files created by that invocation. It shows run status, scenario and step statuses, durations, passive event counts, and charts. Locally it opens automatically; CI prints the path and summary. |
| Failure screenshots | A screenshot is saved after a failed step to `screenshots/`. CI uploads that directory with the test artifacts. |

This project performs deterministic browser automation plus optional passive evidence collection. It does not currently use an LLM, decide whether an observed event is a defect, or execute autonomous browser actions. Passive events are diagnostic evidence and do not change the conventional test verdict.

## CI

GitHub Actions runs the test pipeline with:

```text
Node.js
Java
Dependencies
Smoke tests
Allure report
```

## Key Features

- Page Object Model
- Cucumber BDD
- Data driven testing
- Dynamic product selection
- Failure screenshots
- Allure reporting
- Tag based execution
- GitHub Actions CI

## Author

**Paulo Leme**

Senior Test Engineer | SDET | QA Automation

[GitHub](https://github.com/pauloleme)
