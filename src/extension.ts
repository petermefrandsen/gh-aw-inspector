import * as vscode from 'vscode';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { SimulationPanel } from './panels/SimulationPanel';

export function activate(context: vscode.ExtensionContext) {
    // Register the Sidebar Provider
    const sidebarProvider = new SidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "gh-aw-inspector-sidebar",
            sidebarProvider
        )
    );

    // Register the command to start the simulation
    context.subscriptions.push(
        vscode.commands.registerCommand('gh-aw-inspector.startSimulation', (workflowObj: { name: string, fsPath: string } | string) => {
            if (typeof workflowObj === 'string') {
                vscode.window.showErrorMessage('Failed to start simulation, outdated message format.');
                return;
            }
            SimulationPanel.createOrShow(context.extensionUri, workflowObj.fsPath, workflowObj.name);
        })
    );
}

export function deactivate() { }
