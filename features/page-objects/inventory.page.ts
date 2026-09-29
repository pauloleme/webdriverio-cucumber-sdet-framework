import { $, $$, browser } from '@wdio/globals';
import BasePage from './base.page';
import { CatalogProduct, SortCriteria, SortOption } from '../types';
import { parsePriceToCents } from '../utils/price.utils';

const SORT_CRITERIA_MAP: Record<SortCriteria, SortOption> = {
    'Name (A to Z)': 'az',
    'Name (Z to A)': 'za',
    'Price (low to high)': 'lohi',
    'Price (high to low)': 'hilo'
};

/**
 * InventoryPage models the SauceDemo product catalog page,
 * supporting item queries, sorting actions, and cart additions.
 */
class InventoryPage extends BasePage {
    public get inventoryContainer() {
        return $('[data-test="inventory-container"]');
    }

    public get inventoryItems() {
        return $$('[data-test="inventory-item"]');
    }

    public get inventoryItemNames() {
        return $$('[data-test="inventory-item-name"]');
    }

    public get inventoryItemPrices() {
        return $$('[data-test="inventory-item-price"]');
    }

    public get inventoryItemDescriptions() {
        return $$('[data-test="inventory-item-desc"]');
    }

    public get sortDropdown() {
        return $('[data-test="product-sort-container"]');
    }

    public get shoppingCartButton() {
        return $('[data-test="shopping-cart-link"]');
    }

    public get shoppingCartBadge() {
        return $('[data-test="shopping-cart-badge"]');
    }

    public async waitForLoad(): Promise<void> {
        await this.waitForUrl('inventory.html');
        await this.inventoryContainer.waitForDisplayed({
            timeout: 10000,
            timeoutMsg: 'Inventory catalog container did not load within 10s'
        });
        await browser.waitUntil(
            async () => (await this.inventoryItems).length > 0,
            {
                timeout: 10000,
                timeoutMsg: 'Inventory items did not appear within 10s'
            }
        );
    }

    public async getProductCount(): Promise<number> {
        await this.waitForLoad();
        const items = await this.inventoryItems;
        return items.length;
    }

    public async getProductNames(): Promise<string[]> {
        const nameElements = await this.inventoryItemNames;
        const names: string[] = [];
        for (const el of nameElements) {
            names.push((await el.getText()).trim());
        }
        return names;
    }

    public async getProductPrices(): Promise<number[]> {
        const priceElements = await this.inventoryItemPrices;
        const prices: number[] = [];
        for (const el of priceElements) {
            const text = (await el.getText()).trim();
            prices.push(parsePriceToCents(text) / 100);
        }
        return prices;
    }

    public async getAllProducts(): Promise<CatalogProduct[]> {
        const items = await this.inventoryItems;
        const catalog: CatalogProduct[] = [];

        for (const item of items) {
            const name = (await item.$('[data-test="inventory-item-name"]').getText()).trim();
            const priceText = (await item.$('[data-test="inventory-item-price"]').getText()).trim();
            const description = (await item.$('[data-test="inventory-item-desc"]').getText()).trim();

            catalog.push({
                name,
                price: parsePriceToCents(priceText) / 100,
                description
            });
        }

        return catalog;
    }

    public async selectSortOption(criteria: SortCriteria | string): Promise<void> {
        const sortValue = (SORT_CRITERIA_MAP as Record<string, SortOption>)[criteria] || criteria;
        await this.sortDropdown.waitForClickable({ timeout: 5000 });
        await this.sortDropdown.selectByAttribute('value', sortValue);
    }

    public async addProductToCart(productName: string): Promise<void> {
        const productCard = await this.findProductCardByName(productName);
        if (!productCard) {
            throw new Error(`Product "${productName}" was not found in the inventory catalog.`);
        }

        const addToCartButton = productCard.$('button');
        await addToCartButton.waitForClickable({ timeout: 5000 });
        await addToCartButton.click();
    }

    public async getCartBadgeCount(): Promise<number> {
        if (!(await this.shoppingCartBadge.isDisplayed())) {
            return 0;
        }
        const text = await this.shoppingCartBadge.getText();
        return parseInt(text.trim(), 10) || 0;
    }

    private async findProductCardByName(productName: string) {
        let matchingCard: WebdriverIO.Element | undefined;

        await browser.waitUntil(async () => {
            const cards = await this.inventoryItems;
            for (const card of cards) {
                const title = await card.$('[data-test="inventory-item-name"]').getText();
                if (title.trim() === productName.trim()) {
                    matchingCard = card;
                    return true;
                }
            }
            return false;
        }, {
            timeout: 10000,
            timeoutMsg: `Product "${productName}" did not appear in inventory within 10s.`
        });

        return matchingCard;
    }
}

export default new InventoryPage();
export { InventoryPage };