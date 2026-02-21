import * as vscode from "vscode";

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Basic structural HTML mimicking a Primer layout
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>GH-AW Inspector</title>
				<style>
          body {
            font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 10px;
          }
          .Box {
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            margin-bottom: 16px;
          }
          .Box-header {
            padding: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
            font-weight: 600;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
          }
          .Box-body {
            padding: 16px;
          }
          .btn {
            color: var(--vscode-button-foreground);
            background-color: var(--vscode-button-background);
            border: 1px solid var(--vscode-button-border, transparent);
            border-radius: 6px;
            padding: 5px 16px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
          }
          .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
        </style>
			</head>
			<body>
				<div class="Box">
          <div class="Box-header">
            Workflows
          </div>
          <div class="Box-body">
            <p>Welcome to the Native Primer UI Sidebar!</p>
            <button class="btn" onclick="startSimulation()">Run Simulation</button>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          function startSimulation() {
            // Ideally we pass messages to the extension, but here we can just use the command directly if we registered a URI handler, or send a message.
            vscode.postMessage({ type: 'startSimulation' });
          }
        </script>
			</body>
			</html>`;
    }
}
