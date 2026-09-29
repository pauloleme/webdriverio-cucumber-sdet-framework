import { $, browser } from '@wdio/globals';
import BasePage from './base.page';

/**
 * sub page containing specific selectors and methods for a specific page
 */
class LoginPage extends BasePage {
  /**
   * define selectors using getter methods
   */
  public get usernameInput() {
    return $("#user-name");
  }

  public get passwordInput() {
    return $("#password");
  }

  public get errorMessage() {
    return $('[data-test="error"]');
  }

  public get submitButton() {
    return $('[data-test="login-button"]');
  }

  public get title() {
    return browser.getTitle();
}
  /**
   * a method to encapsule automation code to interact with the page
   * e.g. to login using username and password
   */
  public async login(username: string, password: string) {
    await this.usernameInput.setValue(username);
    await this.passwordInput.setValue(password);
    await this.submitButton.click();
  }

  public async getLoginErrorMessage() {
    await this.errorMessage.waitForDisplayed();
    return this.errorMessage.getText();
  }

}

export default new LoginPage();
