import * as vscode from 'vscode';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { EvaluationPanel } from './panels/EvaluationPanel';

export function activate(context: vscode.ExtensionContext) {
    // Register the Sidebar Provider
    const sidebarProvider = new SidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "gh-aw-inspector-sidebar",
            sidebarProvider
        )
    );

    // Register the command to start an evaluation
    context.subscriptions.push(
        vscode.commands.registerCommand('gh-aw-inspector.startEvaluation', (workflowObj: { name: string, fsPath: string } | string) => {
            if (typeof workflowObj === 'string') {
                vscode.window.showErrorMessage('Failed to start evaluation, outdated message format.');
                return;
            }
            EvaluationPanel.createOrShow(context.extensionUri, workflowObj.fsPath, workflowObj.name);
        })
    );
}

export function deactivate() { }
