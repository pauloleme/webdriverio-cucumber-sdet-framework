# SauceDemo E2E Tests

End-to-end browser tests for SauceDemo, built with WebdriverIO and Cucumber.

## Requirements

- Node.js and npm
- Google Chrome

## Run the tests

```sh
npm ci
npm test
```

Run an individual feature:

```sh
npm run test:checkout
npm run test:login
```

Allure result files are written to `allure-results/`.

## Project structure

- `features/checkout.feature` and `features/login.feature` contain Gherkin scenarios.
- `features/step-definitions/` contains Cucumber step implementations.
- `features/page-objects/` contains page selectors and browser interactions.
- `features/data/` contains test credentials, customer details, and product mappings.
- `wdio.conf.ts` configures WebdriverIO and the Cucumber runner.
