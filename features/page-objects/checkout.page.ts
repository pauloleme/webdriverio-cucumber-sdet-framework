import { $ } from '@wdio/globals';
import BasePage from './base.page';
import { CustomerInformation } from '../types';

/**
 * CheckoutPage encapsulates the multi-step checkout process:
 * Step 1 (information), Step 2 (overview), and complete (confirmation).
 */
class CheckoutPage extends BasePage {
    public get checkoutButton() {
        return $('[data-test="checkout"]');
    }

    public get firstNameInput() {
        return $('[data-test="firstName"]');
    }

    public get lastNameInput() {
        return $('[data-test="lastName"]');
    }

    public get postalCodeInput() {
        return $('[data-test="postalCode"]');
    }

    public get continueButton() {
        return $('[data-test="continue"]');
    }

    public get finishButton() {
        return $('[data-test="finish"]');
    }

    public get subtotalLabel() {
        return $('[data-test="subtotal-label"]');
    }

    public get taxLabel() {
        return $('[data-test="tax-label"]');
    }

    public get totalLabel() {
        return $('[data-test="total-label"]');
    }

    public get confirmationHeader() {
        return $('[data-test="complete-header"]');
    }

    public get customerInformationFields() {
        return {
            firstName: this.firstNameInput,
            lastName: this.lastNameInput,
            postalCode: this.postalCodeInput
        };
    }

    public async fillCustomerInformation(customer: CustomerInformation): Promise<void> {
        await this.firstNameInput.setValue(customer.firstName);
        await this.lastNameInput.setValue(customer.lastName);
        await this.postalCodeInput.setValue(customer.postalCode);
    }

    public async continueToOverview(): Promise<void> {
        await this.continueButton.waitForClickable({ timeout: 5000 });
        await this.continueButton.click();
    }

    public async finishCheckout(): Promise<void> {
        await this.finishButton.waitForClickable({ timeout: 5000 });
        await this.finishButton.click();
    }

    public async getSubtotalAmount(): Promise<string> {
        const text = await this.subtotalLabel.getText();
        const match = text.match(/\$([\d.]+)/);
        if (!match) {
            throw new Error(`Could not extract subtotal amount from: "${text}"`);
        }
        return `$${Number(match[1]).toFixed(2)}`;
    }

    public async getConfirmationHeaderText(): Promise<string> {
        await this.confirmationHeader.waitForDisplayed({ timeout: 5000 });
        return (await this.confirmationHeader.getText()).trim();
    }
}

export default new CheckoutPage();
export const checkoutPage = new CheckoutPage();
export { CheckoutPage };