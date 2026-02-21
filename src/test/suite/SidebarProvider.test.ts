import * as assert from 'assert';
import * as vscode from 'vscode';
import { SidebarProvider } from '../../sidebar/SidebarProvider';

suite('SidebarProvider Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('SidebarProvider instantiates correctly', () => {
        const dummyUri = vscode.Uri.file('/fake/path/to/extension');
        const provider = new SidebarProvider(dummyUri);
        assert.ok(provider !== null, 'SidebarProvider should instantiate successfully');
    });

    test('SidebarProvider captures Webview load and triggers updateWorkflows', async () => {
        const dummyUri = vscode.Uri.file('/fake/path/to/extension');
        const provider = new SidebarProvider(dummyUri);

        // Mock the resolved WebviewView
        let postedMessage: any = null;
        let messageListener: any = null;

        const mockWebviewView: any = {
            webview: {
                options: {},
                html: "",
                onDidReceiveMessage: (listener: any) => {
                    messageListener = listener;
                },
                postMessage: (message: any) => {
                    postedMessage = message;
                },
                asWebviewUri: (uri: vscode.Uri) => uri
            }
        };

        // Create a dummy file in the workspace to bypass headless search indexing lag
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Workspace folder must be open in the test host');
        const dummyFileUri = vscode.Uri.joinPath(workspaceFolder.uri, '.github', 'workflows', 'test-headless.md');
        await vscode.workspace.fs.writeFile(dummyFileUri, Buffer.from('# Dummy test'));

        // Warm up VS Code Search API index before triggering
        await vscode.workspace.findFiles('**/*');

        // When `resolveWebviewView` is called, it triggers `_updateWorkflows()` internally and hits our mocked postMessage.
        provider.resolveWebviewView(mockWebviewView as vscode.WebviewView);

        // Allow microtask queue to process the async `_updateWorkflows()`
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Test Environment Posted Message:', JSON.stringify(postedMessage));

        assert.ok(postedMessage !== null, 'postMessage should have been called upon resolve');
        assert.strictEqual(postedMessage.type, 'workflows', 'The posted message type should be "workflows"');
        assert.ok(Array.isArray(postedMessage.value), 'The posted message value should be an array representing the scanned workflows');

        // In our test-workspace, we have dummy yml/md files
        // By running this test inside `test-workspace`, the `findFiles` native API from VS Code will actually scan it.
        const fileNames = postedMessage.value.map((v: any) => v.name);
        assert.ok(fileNames.includes('reporting.md') || fileNames.includes('daily-security-red-team.md') || fileNames.includes('test-headless.md'), 'Should have discovered at least one actual Markdown/YML workflow from the test workspace');

        // Cleanup test artifact
        try {
            await vscode.workspace.fs.delete(dummyFileUri);
        } catch (e) { }
    });
});
