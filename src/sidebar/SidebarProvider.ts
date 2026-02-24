import * as vscode from "vscode";
import * as path from "path";

interface WorkflowState {
    name: string;
    fsPath: string;
    status: 'none' | 'success' | 'warning' | 'error';
}

export class SidebarProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Listen for messages from the sidebar
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "refresh": {
                    await this._updateWorkflows();
                    break;
                }
                case "startEvaluation": {
                    vscode.commands.executeCommand('gh-aw-inspector.startEvaluation', data.value);
                    break;
                }
                case "debugWorkflow": {
                    vscode.window.showInformationMessage(`Debugging workflow: ${data.value}`);
                    break;
                }
            }
        });

        // Initial load
        this._updateWorkflows();
    }

    private async _updateWorkflows() {
        if (!this._view) { return; }

        console.log("GH-AW Inspector: _updateWorkflows called.");
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            console.log("GH-AW Inspector: No workspace folders found!");
            this._view.webview.postMessage({ type: 'workflows', value: [] });
            return;
        }

        const workflows: WorkflowState[] = [];

        try {
            // Use RelativePattern to strictly search within the specific workspace folder's .github/workflows directory (no subdirectories)
            const pattern = new vscode.RelativePattern(workspaceFolders[0], '.github/workflows/*.{yml,yaml,md}');
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

            console.log(`GH-AW Inspector: Found ${files.length} workflow files using RelativePattern.`);

            for (const file of files) {
                const name = path.basename(file.fsPath);
                console.log(`GH-AW Inspector: Added workflow -> ${name} from ${file.fsPath}`);
                // Default to 'none' (grey). Future implementation could query specific CI status here.
                workflows.push({ name, fsPath: file.fsPath, status: 'none' });
            }
        } catch (e) {
            console.error("GH-AW Inspector: Failed to search for workflows", e);
        }

        console.log(`GH-AW Inspector: Dispatching ${workflows.length} workflows to webview.`);
        // Send to webview
        this._view.webview.postMessage({ type: 'workflows', value: workflows });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "node_modules", "@vscode", "codicons", "dist", "codicon.css"));
        const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "src", "webview", "styles", "vscode-vars.css"));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>GH-AW Inspector</title>
                <link href="${codiconsUri}" rel="stylesheet" />
                <link href="${stylesUri}" rel="stylesheet" />
                <script type="module" src="${toolkitUri}"></script>
                <style>
                    /* Sidebar styles */
                    body {
                        padding: 0;
                        margin: 0;
                    }

                    .explorer-header {
                        padding: var(--space-2) var(--space-3);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }

                    .explorer-title {
                        font-size: 11px;
                        text-transform: uppercase;
                        font-weight: 500;
                        color: var(--vscode-sideBarTitle-foreground);
                        margin: 0;
                        letter-spacing: 0.5px;
                    }

                    .header-actions {
                        display: flex;
                        gap: 2px;
                        opacity: 0;
                        transition: opacity 0.2s ease;
                    }

                    .explorer-header:hover .header-actions {
                        opacity: 1;
                    }

                    .icon-action {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 24px;
                        height: 24px;
                        border-radius: 4px;
                        cursor: pointer;
                        color: var(--vscode-icon-foreground);
                        border: none;
                        background: transparent;
                        padding: 0;
                    }

                    .icon-action:hover {
                        background-color: var(--vscode-toolbar-hoverBackground);
                    }

                    .section {
                        display: flex;
                        flex-direction: column;
                    }

                    .section-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 4px var(--space-2);
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 11px;
                        text-transform: uppercase;
                        color: var(--vscode-sideBarSectionHeader-foreground);
                        background-color: var(--vscode-sideBarSectionHeader-background);
                    }

                    .section-header .section-title-wrap {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }

                    .section-actions {
                        display: flex;
                        opacity: 0;
                    }

                    .section-header:hover .section-actions {
                        opacity: 1;
                    }

                    /* File Tree View */
                    .tree-item {
                        display: flex;
                        align-items: center;
                        height: 22px;
                        padding: 0 var(--space-2);
                        cursor: pointer;
                        color: var(--vscode-list-inactiveSelectionForeground);
                        position: relative;
                        outline: none;
                        border: 1px solid transparent;
                    }

                    .tree-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                        color: var(--vscode-list-hoverForeground);
                    }

                    .tree-item.active {
                        background-color: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                    }

                    .tree-item:focus {
                        border-color: var(--vscode-focusBorder);
                    }

                    .tree-item .indent {
                        width: 16px;
                    }

                    .tree-item .tree-label {
                        flex: 1;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        font-size: 13px;
                        margin-left: 6px;
                    }

                    .status-dot {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        margin: 0 8px;
                        flex-shrink: 0;
                        background-color: var(--vscode-disabledForeground); /* Grey default */
                    }

                    .status-success { background-color: var(--vscode-testing-iconPassed); }
                    .status-warning { background-color: var(--vscode-problemsWarningIcon-foreground); }
                    .status-error { background-color: var(--vscode-problemsErrorIcon-foreground); }

                    .tree-actions {
                        display: flex;
                        opacity: 0;
                    }

                    .tree-item:hover .tree-actions {
                        opacity: 1;
                    }

                    /* Utility for text colors */
                    .text-warning { color: var(--vscode-list-warningForeground); }
                    .text-error { color: var(--vscode-list-errorForeground); }
                    
                    .empty-state {
                        padding: var(--space-3);
                        font-size: 13px;
                        color: var(--vscode-descriptionForeground);
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="explorer-header group">
                    <h2 class="explorer-title">Explorer: Workflows</h2>
                    <div class="header-actions">
                        <button class="icon-action" title="New Workflow">
                            <i class="codicon codicon-add"></i>
                        </button>
                        <button class="icon-action" title="Collapse All">
                            <i class="codicon codicon-collapse-all"></i>
                        </button>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header" tabindex="0">
                        <div class="section-title-wrap">
                            <i class="codicon codicon-chevron-right codicon-modifier-spin" id="workflows-chevron" style="transform: rotate(90deg)"></i>
                            <span>GitHub Workflows</span>
                        </div>
                        <div class="section-actions">
                            <button class="icon-action" title="Refresh" onclick="refreshWorkflows()">
                                <i class="codicon codicon-refresh"></i>
                            </button>
                        </div>
                    </div>

                    <div class="section-body" id="workflows-list">
                        <!-- Populated dynamically via JS -->
                        <div class="empty-state">Loading workflows...</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header" tabindex="0" style="border-top: 1px solid var(--vscode-sideBarSectionHeader-border, transparent)">
                        <div class="section-title-wrap">
                            <i class="codicon codicon-chevron-right"></i>
                            <span>Timeline</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header" tabindex="0" style="border-top: 1px solid var(--vscode-sideBarSectionHeader-border, transparent)">
                        <div class="section-title-wrap">
                            <i class="codicon codicon-chevron-right"></i>
                            <span>MCP Inspector</span>
                        </div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const workflowsList = document.getElementById('workflows-list');

                    function refreshWorkflows() {
                        vscode.postMessage({ type: 'refresh' });
                    }

                    function startEvaluation(encodedName, encodedFsPath) {
                        vscode.postMessage({ type: 'startEvaluation', value: { name: decodeURIComponent(encodedName), fsPath: decodeURIComponent(encodedFsPath) } });
                    }
                    
                    function debugWorkflow(encodedName) {
                        vscode.postMessage({ type: 'debugWorkflow', value: decodeURIComponent(encodedName) });
                    }

                    // Listen for updates from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'workflows':
                                renderWorkflows(message.value);
                                break;
                        }
                    });

                    function renderWorkflows(workflows) {
                        if (workflows.length === 0) {
                            workflowsList.innerHTML = '<div class="empty-state">No workflows found.</div>';
                            return;
                        }

                        let html = '';
                        workflows.forEach(fw => {
                            const statusClass = fw.status === 'none' ? '' : 'status-' + fw.status;
                            const textClass = fw.status === 'warning' ? 'text-warning' : (fw.status === 'error' ? 'text-error' : '');
                            let statusTitle = 'No analysis';
                            if (fw.status === 'success') statusTitle = 'Checks passed';
                            else if (fw.status === 'error') statusTitle = 'Checks failed';
                            else if (fw.status === 'warning') statusTitle = 'Analysis warning';
                            
                            html += '<div class="tree-item" tabindex="0" onclick="startEvaluation(\\'' + encodeURIComponent(fw.name) + '\\', \\'' + encodeURIComponent(fw.fsPath) + '\\')">'; 
                            html += '    <span class="indent"></span>';
                            html += '    <i class="codicon codicon-github-action"></i>';
                            html += '    <span class="tree-label ' + textClass + '">' + fw.name + '</span>';
                            html += '    <div class="status-dot ' + statusClass + '" title="' + statusTitle + '"></div>';

                            if(fw.status === 'error'){
                                html += '    <div class="tree-actions">';
                                html += '        <button class="icon-action" title="Debug" onclick="event.stopPropagation(); debugWorkflow(\\'' + encodeURIComponent(fw.name) + '\\')">';
                                html += '            <i class="codicon codicon-bug"></i>';
                                html += '        </button>';
                                html += '    </div>';
                            }

                            html += '</div>';
                        });

                        workflowsList.innerHTML = html;
                    }
                </script>
            </body>
            </html>`;
    }
}
