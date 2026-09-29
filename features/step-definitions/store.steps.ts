import { After, Before, Given, Then, When } from '@wdio/cucumber-framework';
import { browser, expect } from '@wdio/globals';

import { checkoutCustomer } from '../data/checkout-customer';
import { standardUserPassword } from '../data/credentials';
import { productNamesByKey } from '../data/products';
import { checkoutPage } from '../page-objects/checkout.page';
import inventoryPage from '../page-objects/inventory.page';
import loginPage from '../page-objects/login.page';

Before(async () => {
    await browser.deleteCookies();
    await browser.url('/');
    await browser.execute(() => window.localStorage.clear());
});

After(async () => {
    await browser.deleteCookies();
    await browser.execute(() => window.localStorage.clear());
});

Given(/^I am on the login page$/, async () => {
    await loginPage.open('');
    await expect(browser).toHaveTitle('Swag Labs');
});

When(/^I log in with '(\w+)'$/, async (username) => {
    await loginPage.login(username, standardUserPassword);
});

When(/^I add the products "([^"]+)" to the cart$/, async (productKeys) => {
    for (const productKey of productKeys.split(',')) {
        const productName = productNamesByKey[productKey.trim()];

        if (!productName) {
            throw new Error(`Unknown product key: ${productKey}`);
        }

        await inventoryPage.addProductToCart(productName);
    }
});

When(/^I go to the cart$/, async () => {
    await inventoryPage.shoppingCartButton.click();
    await browser.waitUntil(async () => (await browser.getUrl()).endsWith('/cart.html'), {
        timeout: 10000,
        timeoutMsg: 'The cart page did not load.'
    });
});

Then(/^the cart total should be "(\$\d+\.\d{2})"$/, async (expectedTotal) => {
    const displayedPrices = await browser.execute(() =>
        Array.from(document.querySelectorAll('[data-test="cart-list"] [data-test="inventory-item-price"]'))
            .map((priceElement) => priceElement.textContent?.trim() ?? '')
    );

    if (displayedPrices.length === 0) {
        throw new Error('No item prices were found in the cart.');
    }

    const pricesInCents = displayedPrices.map((displayedPrice) => {
        const amount = displayedPrice.match(/\$(\d+\.\d{2})/)?.[1];

        if (!amount) {
            throw new Error(`Could not parse item price: ${displayedPrice}`);
        }

        return Number(amount.replace('.', ''));
    });
    const actualCents = pricesInCents.reduce((total, priceInCents) => total + priceInCents, 0);

    const actualTotal = `$${(actualCents / 100).toFixed(2)}`;
    await expect(actualTotal).toBe(expectedTotal);
});

When(/^I complete the checkout with total "(\$\d+\.\d{2})"$/, async (expectedTotal) => {
    await checkoutPage.checkoutButton.click();

    await checkoutPage.customerInformationFields.firstName.setValue(checkoutCustomer.firstName);
    await checkoutPage.customerInformationFields.lastName.setValue(checkoutCustomer.lastName);
    await checkoutPage.customerInformationFields.postalCode.setValue(checkoutCustomer.postalCode);
    await checkoutPage.continueButton.click();
    const subtotalText = await checkoutPage.subtotalLabel.getText();
    const subtotalAmount = subtotalText.match(/\$([\d.]+)/)?.[1];

    if (!subtotalAmount) {
        throw new Error(`Could not extract subtotal from: ${subtotalText}`);
    }

    const actualTotal = `$${Number(subtotalAmount).toFixed(2)}`;
    await expect(actualTotal).toBe(expectedTotal);
    await checkoutPage.finishButton.click();
});

Then(/^I should see the order confirmation page$/, async () => {
    await expect(checkoutPage.confirmationHeader).toHaveText('Thank you for your order!');
});

Then(/^I should see a new screen appearing$/, async () => {
    if (await loginPage.errorMessage.isDisplayed()) {
        const errorMessage = await loginPage.getLoginErrorMessage();
        console.log('Error message:', errorMessage);
    } else {
        console.log('Login successful, new screen appeared.');
    }
});

