# 🚀 WebdriverIO + Cucumber SDET Framework

[![WebdriverIO](https://img.shields.io/badge/WebdriverIO-v9.32.0-EA5906?logo=webdriverio&logoColor=white)](https://webdriver.io/)
[![Cucumber](https://img.shields.io/badge/Cucumber-BDD-23D96C?logo=cucumber&logoColor=white)](https://cucumber.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Allure Report](https://img.shields.io/badge/Allure-Report-6A0DAD?logo=allure&logoColor=white)](https://allurereport.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

Professional E2E (*End-to-End*) test automation framework designed with a focus on scalability, maintainability, and SDET (*Software Development Engineer in Test*) best practices. The project integrates **WebdriverIO** with **Cucumber (BDD)**, **TypeScript**, the **Page Object Model (POM)** pattern, and rich visual test reporting with **Allure**.

The target web application tested in this suite is [SauceDemo](https://www.saucedemo.com).

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Test Coverage](#-test-coverage)
- [Prerequisites & Installation](#-prerequisites--installation)
- [Running Tests (Tags & Suites)](#-running-tests-tags--suites)
- [Allure Reporting](#-allure-reporting)
- [Evidence Management & Cleanup](#-evidence-management--cleanup)
- [Continuous Integration (CI/CD)](#-continuous-integration-cicd)
- [Implemented Best Practices](#-implemented-best-practices)

---

## 🛠 Tech Stack

- **[WebdriverIO v9](https://webdriver.io/):** Next-gen browser automation framework for Node.js supporting WebDriver and Chrome DevTools / BiDi protocols.
- **[Cucumber (Gherkin)](https://cucumber.io/):** Behavior-Driven Development (BDD) specification in natural language, accessible to technical and business teams.
- **[TypeScript](https://www.typescriptlang.org/):** Static typing, rich autocompletion, and compile-time error prevention.
- **[Page Object Model (POM)](https://martinfowler.com/bliki/PageObject.html):** Design pattern that decouples UI locators and page interactions from test logic.
- **[Allure Report](https://allurereport.org/):** High-level visual reporting with execution trends, detailed step timings, and automatic failure screenshot attachments.
- **[Node.js Native APIs](https://nodejs.org/):** Cross-platform scripts for managing and cleaning test artifacts across Windows, macOS, and Linux.

---

## 🏛 Project Architecture

The directory structure is organized to cleanly separate test data, UI page objects, step definitions, and feature files:

```text
webdriverIO-demo/
├── .vscode/                     # VS Code debug configurations and launch profiles
├── features/
│   ├── data/                    # Test data models and catalogs
│   │   ├── checkout-customer.ts # Customer information for checkout
│   │   ├── credentials.ts       # Authentication credentials
│   │   └── products.ts          # Catalog mapping product keys to display names
│   ├── page-objects/            # Page Object Model (POM) classes
│   │   ├── base.page.ts         # Shared base class with navigation methods
│   │   ├── login.page.ts        # Locators and actions for the Login page
│   │   ├── inventory.page.ts    # Product inventory, catalog selection, and cart link
│   │   └── checkout.page.ts     # Checkout forms, summary assertions, and finish button
│   ├── step-definitions/        # Cucumber glue code linking Gherkin to POM actions
│   │   └── store.steps.ts       # Given, When, Then step definitions
│   ├── checkout.feature         # BDD Scenarios: Cart totals and checkout flows
│   └── login.feature            # BDD Scenarios: Authentication and user profiles
├── scripts/
│   └── clean-evidence.ts        # Cross-platform Node.js utility to purge test artifacts
├── wdio.conf.ts                 # WebdriverIO configuration, Cucumber options, and hooks
├── package.json                 # Project dependencies and npm scripts
├── tsconfig.json                # Project TypeScript configuration
└── tsconfig.e2e.json            # TypeScript configuration tailored for E2E execution
```

---

## 🎯 Test Coverage

The test suite covers end-to-end user journeys through the e-commerce store:

### 1. Authentication (`@login`, `@auth`)
- **Valid Login (`@positive`, `@smoke`):** Authentication using `standard_user` and validation of redirect to the inventory page.
- **Special & Edge-Case Accounts (`@negative`, `@regression`):**
  - Locked out user (`locked_out_user`) with error message assertion.
  - Problem user (`problem_user`) verifying layout/image behavior.
  - Performance glitch user (`performance_glitch_user`) validating timeout resilience.
  - Error and visual user accounts (`error_user`, `visual_user`).

### 2. Inventory & Cart (`@cart`, `@checkout`)
- **Dynamic Product Selection:** Adding single or multiple products to cart using mapped identifiers (`backpack`, `bike`, `bolt-shirt`, `fleece-jacket`, `onesie`, `red-shirt`).
- **Cart Navigation:** Seamless transition between catalog, cart page (`cart.html`), and checkout.
- **Price & Total Precision Validation:** Prices extracted from the DOM are converted into integer cents to prevent IEEE 754 floating-point rounding errors when calculating compound cart totals.

### 3. Checkout Completion (`@checkout`)
- **Customer Information:** Inputs customer first name, last name, and postal code.
- **Order Summary:** Validates subtotal calculation against item sum.
- **Confirmation Page:** Asserts the order completion header (`"Thank you for your order!"`).

---

## ⚙️ Prerequisites & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher (tested on v24.x)
- **Google Chrome**: Installed locally
- **Java JRE/JDK**: Version 8 or higher (required by Allure CLI to generate HTML reports)

### Installation
Clone the repository and install project dependencies:

```bash
git clone https://github.com/pauloleme/webdriverio-cucumber-sdet-framework.git
cd webdriverio-cucumber-sdet-framework
npm install
```

---

## 🏃 Running Tests (Tags & Suites)

Tests can be executed across the full suite or targeted using Cucumber tags via predefined npm scripts:

| Command | Tag / Target | Description |
| :--- | :--- | :--- |
| `npm test` | All scenarios | Runs all feature files under `features/` |
| `npm run test:smoke` | `@smoke` | **Smoke Tests (~3s):** Fast sanity check (standard login & 1-item checkout) |
| `npm run test:regression` | `@regression` | **Full Regression:** All cart combinations and account types |
| `npm run test:login` | `@login` | Authentication and login test scenarios only |
| `npm run test:checkout` | `@checkout` | Cart calculations and checkout completion scenarios only |
| `npm run test:positive` | `@positive` | Happy-path scenarios with valid data |
| `npm run test:negative` | `@negative` | Scenarios expecting errors, locks, or restricted behavior |
| `npm run test:clean` | Cleanup + `test` | Purges previous test evidence before running the full suite |

### Custom Tag Expressions

Execute customized tag combinations dynamically with `test:tag`:

```bash
# Run tests tagged with @smoke AND NOT @negative
npm run test:tag -- "@smoke and not @negative"

# Run tests tagged with either @login OR @checkout
npm run test:tag -- "@login or @checkout"
```

> [!TIP]
> You can also pass the `TAGS` environment variable directly:
> ```bash
> TAGS="@smoke" npm test
> ```

---

## 📊 Allure Reporting

Raw test execution data is automatically collected in `allure-results/`. When any step fails, the `afterStep` hook in [wdio.conf.ts](file:///c:/Users/User/Documents/webdriverIO-demo/wdio.conf.ts) captures an **automatic screenshot** and embeds it directly into the corresponding step in the Allure report.

### Report Commands

```bash
# 1. Compile raw results and generate the HTML report into allure-report/
npm run report:generate

# 2. Open the generated HTML report in your default browser
npm run report:open

# 3. Spin up a temporary local Allure web server directly from allure-results/
npm run report:serve

# 4. Generate and open the report in a single step
npm run report

# 5. Full Pipeline: Clean old evidence -> Run @smoke tests -> Generate report
npm run test:report
```

---

## 🧹 Evidence Management & Cleanup

To avoid stale test artifacts or accumulating large directories across runs, the framework provides [scripts/clean-evidence.ts](file:///c:/Users/User/Documents/webdriverIO-demo/scripts/clean-evidence.ts).

The script uses Node.js native `fs.rmSync`, making it 100% cross-platform (PowerShell, Windows CMD, macOS, and Linux):

```bash
# Purge all previous evidence (allure-results, allure-report, screenshots, logs)
npm run clean:evidence
# or
npm run clean

# Granular cleanup options:
npm run clean:results        # Purges only allure-results/
npm run clean:report         # Purges only allure-report/
npm run clean:screenshots    # Purges only screenshots/
```

---

## 🔄 Continuous Integration (CI/CD)

Sample **GitHub Actions** workflow configuration (`.github/workflows/e2e-tests.yml`):

```yaml
name: E2E Automation Pipeline

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Setup Java (for Allure)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install Dependencies
        run: npm ci

      - name: Run Smoke Tests
        run: npm run test:smoke

      - name: Generate Allure Report
        if: always()
        run: npm run report:generate

      - name: Upload Test Report Artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: allure-report
          path: allure-report/
          retention-days: 14
```

---

## 💡 Implemented Best Practices

1. **Strict Page Object Model (POM):** Locators and page interactions are isolated in dedicated classes ([BasePage](file:///c:/Users/User/Documents/webdriverIO-demo/features/page-objects/base.page.ts), [LoginPage](file:///c:/Users/User/Documents/webdriverIO-demo/features/page-objects/login.page.ts), [InventoryPage](file:///c:/Users/User/Documents/webdriverIO-demo/features/page-objects/inventory.page.ts), [CheckoutPage](file:///c:/Users/User/Documents/webdriverIO-demo/features/page-objects/checkout.page.ts)), keeping Step Definitions lean and single-purpose.
2. **Deterministic & Explicit Waits:** Uses `waitUntil` and reactive `expect-webdriverio` matchers rather than hardcoded sleep delays.
3. **Monetary Precision via Integer Arithmetic:** Currency amounts are calculated in cents to guarantee zero rounding divergence across complex multi-item cart totals.
4. **Session Isolation:** `Before` and `After` hooks in [store.steps.ts](file:///c:/Users/User/Documents/webdriverIO-demo/features/step-definitions/store.steps.ts) clear browser cookies and `localStorage` before and after each scenario.
5. **Automated Visual Evidence on Failure:** Screenshots captured on failure are directly linked to the failing step in the report for rapid triage and debugging.


