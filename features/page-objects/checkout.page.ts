class CheckoutPage {    

    public get checkoutButton() {
        return $('[data-test="checkout"]');
    }

    public get customerInformationFields() {
        return {
            firstName: $('[data-test="firstName"]'),
            lastName: $('[data-test="lastName"]'),
            postalCode: $('[data-test="postalCode"]')
        };
    }

    public get totalLabel() {
        return $('[data-test="total-label"]');
    }

    public get subtotalLabel() {
        return $('[data-test="subtotal-label"]');
    }

    public get taxLabel() {
        return $('[data-test="tax-label"]');
    }

    public get finishButton() {
        return $('[data-test="finish"]');
    }

    public get continueButton() {
        return $('[data-test="continue"]');
    }

    public get confirmationHeader() {
        return $('[data-test="complete-header"]');
    }  

    public get downloadOrderPdfButton() {
        return $('[data-test="generate-pdf-order"]');
    }
}

export const checkoutPage = new CheckoutPage();