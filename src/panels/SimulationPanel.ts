import * as vscode from "vscode";

export class SimulationPanel {
    public static currentPanel: SimulationPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (SimulationPanel.currentPanel) {
            SimulationPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            "gh-aw-simulation",
            "Simulation",
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
            }
        );

        SimulationPanel.currentPanel = new SimulationPanel(panel, extensionUri);
    }

    public dispose() {
        SimulationPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Simulation</title>
        <style>
          body {
            font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 0;
            margin: 0;
            height: 100vh;
            display: flex;
          }
          .split-left {
            flex: 1;
            padding: 20px;
            border-right: 1px solid var(--vscode-widget-border);
          }
          .split-right {
            flex: 1;
            padding: 20px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
          }
          h2 {
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 8px;
            margin-top: 0;
          }
          textarea {
            width: 100%;
            height: 150px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            font-family: inherit;
            border-radius: 6px;
            resize: vertical;
          }
        </style>
			</head>
			<body>
        <div class="split-left">
          <h2>Input Prompt</h2>
          <textarea placeholder="Ask the agent to do something..."></textarea>
        </div>
        <div class="split-right">
          <h2>Rendered Markdown Report</h2>
          <p><em>The agent's response will appear here...</em></p>
        </div>
			</body>
			</html>`;
    }
}
