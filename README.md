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

* Node.js 18+
* Google Chrome
* Java 8+
* Git

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

Generate the report:

```bash
npm run report:generate
```

Open the report:

```bash
npm run report:open
```

Screenshots are automatically captured on test failures and attached to the Allure report.

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

* Page Object Model
* Cucumber BDD
* Data driven testing
* Dynamic product selection
* Failure screenshots
* Allure reporting
* Tag based execution
* GitHub Actions CI

## Author

**Paulo Leme**

Senior Test Engineer | SDET | QA Automation

[GitHub](https://github.com/pauloleme)
