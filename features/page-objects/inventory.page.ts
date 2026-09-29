import { $, $$ } from '@wdio/globals';
import BasePage from './base.page';

class InventoryPage extends BasePage {

    get inventoryItems() {
        return $$('[data-test="inventory-item"]');
    }

    private async findProductCardByName(productName: string) {
        const productCards = await this.inventoryItems;

        for (const productCard of productCards) {
            const displayedProductName = await productCard
                .$('[data-test="inventory-item-name"]')
                .getText();

            if (displayedProductName === productName) {
                return productCard;
            }
        }

        return undefined;
    }

    async addProductToCart(productName: string) {
        let matchingProductCard = await this.findProductCardByName(productName);

        await browser.waitUntil(async () => {
            matchingProductCard = await this.findProductCardByName(productName);
            return matchingProductCard !== undefined;
        }, {
            timeout: 10000,
            timeoutMsg: `Product "${productName}" did not appear in the inventory.`
        });

        if (!matchingProductCard) {
            throw new Error(`Product "${productName}" was not found in the inventory.`);
        }

        await matchingProductCard.$('button').click();
    }

    get shoppingCartButton() {
        return $('[data-test="shopping-cart-link"]');
    }

    get inventoryItemPrices() {
        return $$('[data-test="inventory-item-price"]');
    }
}

export default new InventoryPage();