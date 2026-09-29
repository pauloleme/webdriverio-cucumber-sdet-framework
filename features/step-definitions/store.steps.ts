import { After, Before, Given, Then, When } from '@wdio/cucumber-framework';
import { browser, expect } from '@wdio/globals';

import { checkoutCustomer } from '../data/checkout-customer';
import { standardUserPassword } from '../data/credentials';
import { productNamesByKey } from '../data/products';
import cartPage from '../page-objects/cart.page';
import checkoutPage from '../page-objects/checkout.page';
import inventoryPage from '../page-objects/inventory.page';
import loginPage from '../page-objects/login.page';
import { formatCentsToPrice, calculateTotalInCents } from '../utils/price.utils';

Before(async () => {
    await browser.deleteCookies();
    await browser.url('/');
    await browser.execute(() => window.localStorage.clear());
});

After(async () => {
    await browser.deleteCookies();
    await browser.execute(() => window.localStorage.clear());
});

// ==========================================
// Authentication Steps
// ==========================================

Given(/^I am on the login page$/, async () => {
    await loginPage.open('');
    await expect(browser).toHaveTitle('Swag Labs');
});

When(/^I log in with '(\w+)'$/, async (username: string) => {
    await loginPage.login(username, standardUserPassword);
});

Then(/^I should be redirected to the inventory page$/, async () => {
    await inventoryPage.waitForLoad();
    await expect(browser).toHaveUrl(expect.stringContaining('/inventory.html'));
});

Then(/^I should see the login error message containing "([^"]+)"$/, async (expectedError: string) => {
    const actualError = await loginPage.getLoginErrorMessage();
    expect(actualError).toContain(expectedError);
});

Then(/^I should see a new screen appearing$/, async () => {
    if (await loginPage.isErrorMessageDisplayed()) {
        const errorMessage = await loginPage.getLoginErrorMessage();
        expect(errorMessage.length).toBeGreaterThan(0);
    } else {
        await inventoryPage.waitForLoad();
        await expect(browser).toHaveUrl(expect.stringContaining('/inventory.html'));
    }
});

// ==========================================
// Inventory & Catalog Steps
// ==========================================

Then(/^I should see (\d+) products displayed in the inventory$/, async (expectedCountString: string) => {
    const expectedCount = parseInt(expectedCountString, 10);
    const actualCount = await inventoryPage.getProductCount();
    expect(actualCount).toBe(expectedCount);
});

Then(/^all products should have valid names and prices$/, async () => {
    const products = await inventoryPage.getAllProducts();
    expect(products.length).toBeGreaterThan(0);

    for (const product of products) {
        expect(product.name.trim().length).toBeGreaterThan(0);
        expect(product.price).toBeGreaterThan(0);
        expect(product.description.trim().length).toBeGreaterThan(0);
    }
});

When(/^I sort products by "([^"]+)"$/, async (sortCriteria: string) => {
    await inventoryPage.selectSortOption(sortCriteria);
});

Then(/^the products should be ordered by "([^"]+)" correctly$/, async (sortCriteria: string) => {
    if (sortCriteria.includes('Name')) {
        const actualNames = await inventoryPage.getProductNames();
        const expectedSortedNames = sortCriteria.includes('A to Z')
            ? [...actualNames].sort((a, b) => a.localeCompare(b))
            : [...actualNames].sort((a, b) => b.localeCompare(a));

        expect(actualNames).toEqual(expectedSortedNames);
    } else if (sortCriteria.includes('Price')) {
        const actualPrices = await inventoryPage.getProductPrices();
        const expectedSortedPrices = sortCriteria.includes('low to high')
            ? [...actualPrices].sort((a, b) => a - b)
            : [...actualPrices].sort((a, b) => b - a);

        expect(actualPrices).toEqual(expectedSortedPrices);
    } else {
        throw new Error(`Unsupported sort criteria: "${sortCriteria}"`);
    }
});

When(/^I add the product "([^"]+)" to the cart$/, async (productName: string) => {
    await inventoryPage.addProductToCart(productName);
});

Then(/^the shopping cart badge should display (\d+)$/, async (expectedCountString: string) => {
    const expectedCount = parseInt(expectedCountString, 10);
    const actualCount = await inventoryPage.getCartBadgeCount();
    expect(actualCount).toBe(expectedCount);
});

// ==========================================
// Cart & Checkout Steps
// ==========================================

When(/^I add the products "([^"]+)" to the cart$/, async (productKeys: string) => {
    for (const productKey of productKeys.split(',')) {
        const key = productKey.trim();
        const productName = productNamesByKey[key];

        if (!productName) {
            throw new Error(`Unknown product key: "${key}"`);
        }

        await inventoryPage.addProductToCart(productName);
    }
});

When(/^I go to the cart$/, async () => {
    await inventoryPage.shoppingCartButton.click();
    await cartPage.waitForLoad();
});

Then(/^the cart total should be "(\$\d+\.\d{2})"$/, async (expectedTotal: string) => {
    const displayedPrices = await cartPage.getItemPriceStrings();

    if (displayedPrices.length === 0) {
        throw new Error('No item prices were found in the cart.');
    }

    const totalCents = calculateTotalInCents(displayedPrices);
    const actualCalculatedTotal = formatCentsToPrice(totalCents);

    expect(actualCalculatedTotal).toBe(expectedTotal);
});

When(/^I complete the checkout with total "(\$\d+\.\d{2})"$/, async (expectedTotal: string) => {
    await cartPage.proceedToCheckout();
    await checkoutPage.fillCustomerInformation(checkoutCustomer);
    await checkoutPage.continueToOverview();

    const actualSubtotal = await checkoutPage.getSubtotalAmount();
    expect(actualSubtotal).toBe(expectedTotal);

    await checkoutPage.finishCheckout();
});

Then(/^I should see the order confirmation page$/, async () => {
    const confirmationHeader = await checkoutPage.getConfirmationHeaderText();
    expect(confirmationHeader).toBe('Thank you for your order!');
});
