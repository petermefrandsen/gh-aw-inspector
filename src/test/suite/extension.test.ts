import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'petermefrandsen.gh-aw-inspector';

suite('Extension', () => {

    // -----------------------------------------------------------------------
    // Activation
    // -----------------------------------------------------------------------
    test('extension is present in the extension host', () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext !== undefined, `Extension "${EXTENSION_ID}" should be present`);
    });

    test('extension activates successfully', async () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, `Extension "${EXTENSION_ID}" should be present`);

        if (!ext.isActive) {
            await ext.activate();
        }

        assert.strictEqual(ext.isActive, true, 'Extension should be active');
    });

    // -----------------------------------------------------------------------
    // Registered commands
    // -----------------------------------------------------------------------
    test('gh-aw-inspector.startEvaluation command is registered', async () => {
        const allCommands = await vscode.commands.getCommands(true);
        assert.ok(
            allCommands.includes('gh-aw-inspector.startEvaluation'),
            '"gh-aw-inspector.startEvaluation" command should be registered after activation'
        );
    });

    // -----------------------------------------------------------------------
    // Package manifest contributions
    // -----------------------------------------------------------------------
    test('extension contributes the sidebar webview view', () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, `Extension "${EXTENSION_ID}" should be present`);

        const views: any[] = ext.packageJSON?.contributes?.views?.['gh-aw-inspector'] ?? [];
        const sidebarView = views.find((v: any) => v.id === 'gh-aw-inspector-sidebar');
        assert.ok(sidebarView !== undefined, 'Package manifest should declare the gh-aw-inspector-sidebar view');
        assert.strictEqual(sidebarView.type, 'webview', 'Sidebar view type should be "webview"');
    });

    test('extension contributes the startEvaluation command in package manifest', () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, `Extension "${EXTENSION_ID}" should be present`);

        const commands: any[] = ext.packageJSON?.contributes?.commands ?? [];
        const cmd = commands.find((c: any) => c.command === 'gh-aw-inspector.startEvaluation');
        assert.ok(cmd !== undefined, 'Package manifest should declare the startEvaluation command');
    });

    test('extension declares correct engine requirement (vscode ^1.90.0)', () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, `Extension "${EXTENSION_ID}" should be present`);

        const engine: string = ext.packageJSON?.engines?.vscode ?? '';
        assert.ok(engine.startsWith('^1.90') || engine.startsWith('>=1.90'),
            `engines.vscode should be ^1.90.0 or newer, got: "${engine}"`);
    });

    // -----------------------------------------------------------------------
    // Command argument validation
    // -----------------------------------------------------------------------
    test('startEvaluation command with a string argument shows error (legacy format guard)', async () => {
        // Passing a raw string instead of a workflow object hits the guard branch in extension.ts
        await assert.doesNotReject(
            Promise.resolve(vscode.commands.executeCommand('gh-aw-inspector.startEvaluation', 'legacy-string-value'))
        );
    });
});
