import { browser } from '@wdio/globals';

/**
 * BasePage encapsulates common functionality, navigation, and utilities
 * shared across all Page Object classes.
 */
export default abstract class BasePage {
    /**
     * Opens a path relative to the configured baseUrl.
     * @param path Relative path (e.g. '/' or 'inventory.html')
     */
    public async open(path: string = ''): Promise<void> {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        await browser.url(normalizedPath);
    }

    public async getPageTitle(): Promise<string> {
        return browser.getTitle();
    }

    public async getCurrentUrl(): Promise<string> {
        return browser.getUrl();
    }

    public async waitForUrl(urlSubstring: string, timeoutMs: number = 10000): Promise<void> {
        await browser.waitUntil(
            async () => (await this.getCurrentUrl()).includes(urlSubstring),
            {
                timeout: timeoutMs,
                timeoutMsg: `Expected URL to include "${urlSubstring}" within ${timeoutMs}ms, but was "${await this.getCurrentUrl()}".`
            }
        );
    }
}

