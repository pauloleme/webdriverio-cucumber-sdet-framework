import { $ } from '@wdio/globals';
import BasePage from './base.page';

/**
 * LoginPage encapsulates element locators and user interactions
 * for the SauceDemo login interface.
 */
class LoginPage extends BasePage {
    public get usernameInput() {
        return $('[data-test="username"]');
    }

    public get passwordInput() {
        return $('[data-test="password"]');
    }

    public get loginButton() {
        return $('[data-test="login-button"]');
    }

    public get submitButton() {
        return this.loginButton;
    }

    public get errorMessage() {
        return $('[data-test="error"]');
    }

    public async login(username: string, password: string): Promise<void> {
        await this.usernameInput.setValue(username);
        await this.passwordInput.setValue(password);
        await this.loginButton.click();
    }

    public async isErrorMessageDisplayed(): Promise<boolean> {
        return this.errorMessage.isDisplayed();
    }

    public async getLoginErrorMessage(): Promise<string> {
        await this.errorMessage.waitForDisplayed({
            timeout: 5000,
            timeoutMsg: 'Expected login error message to appear within 5s'
        });
        return this.errorMessage.getText();
    }
}

export default new LoginPage();
export { LoginPage };
