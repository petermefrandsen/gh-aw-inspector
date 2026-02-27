import * as assert from 'assert';
import * as vscode from 'vscode';
import { SidebarProvider } from '../../sidebar/SidebarProvider';

// ---------------------------------------------------------------------------
// Shared mock factory — creates a minimal WebviewView that captures messages
// ---------------------------------------------------------------------------
function makeMockWebviewView() {
    const postedMessages: any[] = [];
    let messageListener: ((msg: any) => void) | null = null;
    let visibilityListener: (() => void) | null = null;
    let isVisible = true;

    const mock: any = {
        webview: {
            options: {},
            html: '',
            onDidReceiveMessage: (listener: (msg: any) => void) => {
                messageListener = listener;
                return { dispose: () => { } };
            },
            postMessage: (message: any) => {
                postedMessages.push(message);
            },
            asWebviewUri: (uri: vscode.Uri) => uri,
        },
        onDidDispose: (_cb: () => void) => ({ dispose: () => { } }),
        onDidChangeVisibility: (cb: () => void) => {
            visibilityListener = cb;
            return { dispose: () => { } };
        },
        get visible() { return isVisible; },
    };

    const send = (msg: any) => messageListener?.(msg);
    const triggerVisibilityChange = () => visibilityListener?.();
    const setVisible = (v: boolean) => { isVisible = v; };
    return { mock: mock as vscode.WebviewView, postedMessages, send, triggerVisibilityChange, setVisible };
}

suite('SidebarProvider', () => {

    // -----------------------------------------------------------------------
    // Instantiation
    // -----------------------------------------------------------------------
    test('instantiates without throwing', () => {
        const uri = vscode.Uri.file('/fake/path/to/extension');
        const provider = new SidebarProvider(uri);
        assert.ok(provider !== null);
    });

    // -----------------------------------------------------------------------
    // resolveWebviewView — initial load
    // -----------------------------------------------------------------------
    test('resolveWebviewView sets webview HTML', () => {
        const uri = vscode.Uri.file('/fake/path');
        const provider = new SidebarProvider(uri);
        const { mock } = makeMockWebviewView();
        provider.resolveWebviewView(mock);
        assert.ok(
            typeof (mock.webview as any).html === 'string' && (mock.webview as any).html.length > 0,
            'html should be set on the webview'
        );
    });

    test('resolveWebviewView posts workflows message on load', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Workspace folder must be open in the test host');

        const dummyFileUri = vscode.Uri.joinPath(workspaceFolder.uri, '.github', 'workflows', 'test-on-load.md');
        await vscode.workspace.fs.writeFile(dummyFileUri, Buffer.from('# Dummy'));
        await vscode.workspace.findFiles('**/*'); // warm up index

        const provider = new SidebarProvider(workspaceFolder.uri);
        const { mock, postedMessages } = makeMockWebviewView();
        provider.resolveWebviewView(mock);

        await new Promise(resolve => setTimeout(resolve, 2500));

        try {
            const workflowMsg = postedMessages.find(m => m.type === 'workflows');
            assert.ok(workflowMsg, '"workflows" message should have been posted');
            assert.ok(Array.isArray(workflowMsg.value), 'value should be an array');
        } finally {
            await vscode.workspace.fs.delete(dummyFileUri).then(() => { }, () => { });
        }
    });

    // -----------------------------------------------------------------------
    // Discovered workflow shape
    // -----------------------------------------------------------------------
    test('workflow entries have expected shape (name, fsPath, status)', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Workspace folder must be open in the test host');

        const provider = new SidebarProvider(workspaceFolder.uri);
        const { mock, postedMessages } = makeMockWebviewView();
        provider.resolveWebviewView(mock);

        await new Promise(resolve => setTimeout(resolve, 2500));

        const workflowMsg = postedMessages.find(m => m.type === 'workflows');
        assert.ok(workflowMsg, '"workflows" message should have been posted');

        if (workflowMsg.value.length > 0) {
            const entry = workflowMsg.value[0];
            assert.ok('name' in entry, 'workflow entry should have "name"');
            assert.ok('fsPath' in entry, 'workflow entry should have "fsPath"');
            assert.ok('status' in entry, 'workflow entry should have "status"');
        }
    });

    test('discovers daily-security-red-team.md in test-workspace', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Workspace folder must be open in the test host');

        const provider = new SidebarProvider(workspaceFolder.uri);
        const { mock, postedMessages } = makeMockWebviewView();
        provider.resolveWebviewView(mock);

        await new Promise(resolve => setTimeout(resolve, 2500));

        const workflowMsg = postedMessages.find(m => m.type === 'workflows');
        assert.ok(workflowMsg, '"workflows" message should have been posted');
        const names: string[] = workflowMsg.value.map((v: any) => v.name);
        assert.ok(
            names.includes('daily-security-red-team.md'),
            `Expected daily-security-red-team.md in discovered workflows, got: ${names.join(', ')}`
        );
    });

    test('only_loads_md_files_should_exclude_yml_and_yaml_when_present_in_workflows_dir', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Workspace folder must be open in the test host');

        const ymlFile = vscode.Uri.joinPath(workspaceFolder.uri, '.github', 'workflows', 'test-regular-workflow.yml');
        const yamlFile = vscode.Uri.joinPath(workspaceFolder.uri, '.github', 'workflows', 'test-regular-workflow.yaml');
        await vscode.workspace.fs.writeFile(ymlFile, Buffer.from('name: test'));
        await vscode.workspace.fs.writeFile(yamlFile, Buffer.from('name: test'));

        try {
            const provider = new SidebarProvider(workspaceFolder.uri);
            const { mock, postedMessages } = makeMockWebviewView();
            provider.resolveWebviewView(mock);

            await new Promise(resolve => setTimeout(resolve, 2500));

            const workflowMsg = postedMessages.find(m => m.type === 'workflows');
            assert.ok(workflowMsg, '"workflows" message should have been posted');
            const names: string[] = workflowMsg.value.map((v: any) => v.name);
            assert.ok(
                !names.includes('test-regular-workflow.yml'),
                `Expected .yml files to be excluded, but got: ${names.join(', ')}`
            );
            assert.ok(
                !names.includes('test-regular-workflow.yaml'),
                `Expected .yaml files to be excluded, but got: ${names.join(', ')}`
            );
        } finally {
            await vscode.workspace.fs.delete(ymlFile).then(() => { }, () => { });
            await vscode.workspace.fs.delete(yamlFile).then(() => { }, () => { });
        }
    });

    // -----------------------------------------------------------------------
    // Message routing — refresh
    // -----------------------------------------------------------------------
    test('refresh message triggers another workflows postMessage', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Workspace folder must be open in the test host');

        const provider = new SidebarProvider(workspaceFolder.uri);
        const { mock, postedMessages, send } = makeMockWebviewView();
        provider.resolveWebviewView(mock);

        await new Promise(resolve => setTimeout(resolve, 2500));
        const countAfterLoad = postedMessages.filter(m => m.type === 'workflows').length;
        assert.ok(countAfterLoad >= 1, 'should have at least one workflows message after initial load');

        send({ type: 'refresh' });
        await new Promise(resolve => setTimeout(resolve, 2500));

        const countAfterRefresh = postedMessages.filter(m => m.type === 'workflows').length;
        assert.ok(countAfterRefresh > countAfterLoad, 'refresh should produce an additional workflows message');
    });

    // -----------------------------------------------------------------------
    // Message routing — startEvaluation
    // -----------------------------------------------------------------------
    test('startEvaluation message does not throw', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Workspace folder must be open in the test host');

        const uri = workspaceFolder.uri;
        const provider = new SidebarProvider(uri);
        const { mock, send } = makeMockWebviewView();
        provider.resolveWebviewView(mock);

        const fsPath = vscode.Uri.joinPath(
            workspaceFolder.uri, '.github', 'workflows', 'daily-security-red-team.md'
        ).fsPath;
        const payload = { name: 'daily-security-red-team.md', fsPath };
        assert.doesNotThrow(() => send({ type: 'startEvaluation', value: payload }));

        // Small wait so the EvaluationPanel created by the command is disposed
        // before the EvaluationPanel test suite starts.
        await new Promise(resolve => setTimeout(resolve, 200));
    });

    // -----------------------------------------------------------------------
    // Message routing — debugWorkflow
    // -----------------------------------------------------------------------
    test('debugWorkflow message does not throw', () => {
        const uri = vscode.Uri.file('/fake/path');
        const provider = new SidebarProvider(uri);
        const { mock, send } = makeMockWebviewView();
        provider.resolveWebviewView(mock);

        assert.doesNotThrow(() => send({ type: 'debugWorkflow', value: 'my-workflow.md' }));
    });

    // -----------------------------------------------------------------------
    // Message routing — ready
    // -----------------------------------------------------------------------
    test('ready message triggers a workflows postMessage', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Workspace folder must be open in the test host');

        const provider = new SidebarProvider(workspaceFolder.uri);
        const { mock, postedMessages, send } = makeMockWebviewView();
        provider.resolveWebviewView(mock);

        await new Promise(resolve => setTimeout(resolve, 2500));
        const countBeforeReady = postedMessages.filter(m => m.type === 'workflows').length;
        assert.ok(countBeforeReady >= 1, 'should have at least one workflows message after initial load');

        send({ type: 'ready' });
        await new Promise(resolve => setTimeout(resolve, 2500));

        const countAfterReady = postedMessages.filter(m => m.type === 'workflows').length;
        assert.ok(countAfterReady > countBeforeReady, 'ready message should trigger an additional workflows message');
    });

    // -----------------------------------------------------------------------
    // Visibility change handler
    // -----------------------------------------------------------------------
    test('visibility change triggers workflows update when view is visible', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'Workspace folder must be open in the test host');

        const provider = new SidebarProvider(workspaceFolder.uri);
        const { mock, postedMessages, triggerVisibilityChange } = makeMockWebviewView();
        provider.resolveWebviewView(mock);

        await new Promise(resolve => setTimeout(resolve, 2500));
        const countBefore = postedMessages.filter(m => m.type === 'workflows').length;
        assert.ok(countBefore >= 1, 'should have at least one workflows message after initial load');

        triggerVisibilityChange();
        await new Promise(resolve => setTimeout(resolve, 2500));

        const countAfter = postedMessages.filter(m => m.type === 'workflows').length;
        assert.ok(countAfter > countBefore, 'visibility change should trigger an additional workflows message');
    });
});
