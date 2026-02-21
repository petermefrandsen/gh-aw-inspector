import { VSBrowser, ActivityBar, WebView } from 'vscode-extension-tester';
import * as assert from 'assert';

describe('Sidebar Explorer UI E2E Test', () => {
    let browser: VSBrowser;

    before(async function () {
        this.timeout(20000);
        browser = VSBrowser.instance;
        await browser.waitForWorkbench();
    });

    it('Should open the Webview Sidebar from Activity Bar and render dynamic elements', async function () {
        this.timeout(30000);

        const activityBar = new ActivityBar();
        const viewControl = await activityBar.getViewControl('GH Agentic Workflows');
        assert.ok(viewControl !== undefined, 'Should find the GH AW Inspector activity bar icon');

        // Open the sidebar view
        const sideBar = await viewControl.openView();
        assert.ok(sideBar !== undefined, 'Sidebar container view should open successfully');

        // Give the webview panel adequate time to resolve and fetch `findFiles` locally
        await new Promise(res => setTimeout(res, 3000));

        // Bind to the inner iframe
        const webview = new WebView();
        await webview.switchToFrame();

        try {
            // Gain access to the underlying Selenium Webdriver managing the webview
            const webDriver = webview.getDriver();
            const sourceHTML = await webDriver.getPageSource();

            // Validate the `renderWorkflows` JS correctly constructed the native Tree structure using dynamic discovery
            assert.ok(sourceHTML.includes('tree-item'), 'Should render wrapper tree items');
            assert.ok(sourceHTML.includes('reporting.md') || sourceHTML.includes('daily-security-red-team.md'), 'Should have bound the local test-workspace workflows');

        } finally {
            // Restore context out of iframe
            await webview.switchBack();
        }
    });
});
