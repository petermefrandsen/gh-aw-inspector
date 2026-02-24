import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { EvaluationPanel } from '../../panels/EvaluationPanel';

const EXTENSION_ID = 'petermefrandsen.gh-aw-inspector';
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../');
const MAIN_WORKFLOW = path.join(WORKSPACE_ROOT, 'test-workspace', '.github', 'workflows', 'daily-security-red-team.md');

function getExtensionUri(): vscode.Uri {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} must be installed in the test host`);
    return ext.extensionUri;
}

suite('EvaluationPanel', () => {

    // Ensure a clean slate before and after every test
    setup(() => {
        EvaluationPanel.currentPanel?.dispose();
    });

    teardown(() => {
        EvaluationPanel.currentPanel?.dispose();
    });

    // -----------------------------------------------------------------------
    // Panel creation
    // -----------------------------------------------------------------------
    test('createOrShow creates a panel (currentPanel is set)', () => {
        const extensionUri = getExtensionUri();
        assert.strictEqual(EvaluationPanel.currentPanel, undefined, 'no panel should exist before the test');

        EvaluationPanel.createOrShow(extensionUri, MAIN_WORKFLOW, 'daily-security-red-team.md');

        assert.ok(EvaluationPanel.currentPanel !== undefined, 'currentPanel should be set after createOrShow');
    });

    // -----------------------------------------------------------------------
    // Singleton behaviour
    // -----------------------------------------------------------------------
    test('createOrShow is a singleton — second call reuses the same panel', () => {
        const extensionUri = getExtensionUri();

        EvaluationPanel.createOrShow(extensionUri, MAIN_WORKFLOW, 'first.md');
        const panelAfterFirst = EvaluationPanel.currentPanel;
        assert.ok(panelAfterFirst, 'panel should exist after first call');

        EvaluationPanel.createOrShow(extensionUri, MAIN_WORKFLOW, 'second.md');
        const panelAfterSecond = EvaluationPanel.currentPanel;

        assert.strictEqual(panelAfterFirst, panelAfterSecond, 'second createOrShow should return the same instance');
    });

    // -----------------------------------------------------------------------
    // Dispose
    // -----------------------------------------------------------------------
    test('dispose clears currentPanel', () => {
        const extensionUri = getExtensionUri();

        EvaluationPanel.createOrShow(extensionUri, MAIN_WORKFLOW, 'daily-security-red-team.md');
        assert.ok(EvaluationPanel.currentPanel, 'panel should exist before dispose');

        EvaluationPanel.currentPanel!.dispose();

        assert.strictEqual(EvaluationPanel.currentPanel, undefined, 'currentPanel should be undefined after dispose');
    });

    // -----------------------------------------------------------------------
    // update()
    // -----------------------------------------------------------------------
    test('update does not throw and keeps the singleton', () => {
        const extensionUri = getExtensionUri();

        EvaluationPanel.createOrShow(extensionUri, MAIN_WORKFLOW, 'original.md');
        const originalInstance = EvaluationPanel.currentPanel;
        assert.ok(originalInstance, 'panel should exist');

        assert.doesNotThrow(() => {
            originalInstance.update(MAIN_WORKFLOW, 'updated.md');
        });

        assert.strictEqual(EvaluationPanel.currentPanel, originalInstance, 'instance should not change after update');
    });
});
