import { $, $$ } from '@wdio/globals';
import BasePage from './base.page';

/**
 * CartPage encapsulates locators and actions for the shopping cart page (/cart.html).
 */
class CartPage extends BasePage {
    public get cartContainer() {
        return $('[data-test="cart-contents-container"]');
    }

    public get cartItems() {
        return $$('[data-test="cart-list"] [data-test="inventory-item"]');
    }

    public get cartItemNames() {
        return $$('[data-test="cart-list"] [data-test="inventory-item-name"]');
    }

    public get cartItemPrices() {
        return $$('[data-test="cart-list"] [data-test="inventory-item-price"]');
    }

    public get checkoutButton() {
        return $('[data-test="checkout"]');
    }

    public get continueShoppingButton() {
        return $('[data-test="continue-shopping"]');
    }

    public async waitForLoad(): Promise<void> {
        await this.waitForUrl('cart.html');
        await this.cartContainer.waitForDisplayed({
            timeout: 5000,
            timeoutMsg: 'Cart contents container did not load within 5s.'
        });
    }

    public async getItemNames(): Promise<string[]> {
        const elements = await this.cartItemNames;
        const names: string[] = [];
        for (const el of elements) {
            names.push((await el.getText()).trim());
        }
        return names;
    }

    public async getItemPriceStrings(): Promise<string[]> {
        const elements = await this.cartItemPrices;
        const prices: string[] = [];
        for (const el of elements) {
            prices.push((await el.getText()).trim());
        }
        return prices;
    }

    public async proceedToCheckout(): Promise<void> {
        await this.checkoutButton.waitForClickable({ timeout: 5000 });
        await this.checkoutButton.click();
    }
}

export default new CartPage();
export { CartPage };
