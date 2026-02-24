import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import cronstrue from "cronstrue";

function getCronDescription(cronStr: string): string {
  try {
    return cronstrue.toString(cronStr);
  } catch {
    return "Invalid Cron";
  }
}

function formatItems(key: string, items: any): string {
  if (!items) return '<span class="text-secondary-text">None</span>';

  let itemArray: { key: string, value: any }[] = [];
  if (typeof items === 'string') itemArray = [{ key: items, value: null }];
  else if (Array.isArray(items)) {
    itemArray = items.map(i => {
      if (typeof i === 'object') {
        return { key: JSON.stringify(i), value: i };
      }
      return { key: String(i), value: null };
    });
  } else if (typeof items === 'object') {
    itemArray = Object.keys(items).map(k => ({ key: k, value: items[k] }));
  } else {
    itemArray = [{ key: String(items), value: null }];
  }

  let finalHtml = "";
  itemArray.forEach(item => {
    let displayText = item.key;
    let hoverTitle = item.value && typeof item.value === 'object' ? JSON.stringify(item.value, null, 2).replace(/"/gi, '&quot;') : (item.value ? `${item.key}: ${item.value}` : item.key);

    if (key === 'permissions') {
      hoverTitle = item.value ? `${item.key}: ${item.value}` : item.key;
    }

    if (key === 'on' || key === 'schedule') {
      if (item.key === 'schedule' && Array.isArray(item.value)) {
        item.value.forEach((s: any) => {
          const cronStr = s.cron || String(s);
          const cronHover = getCronDescription(cronStr);
          finalHtml += `
            <span class="bg-slate-100 dark:bg-slate-800 text-[11px] px-2 py-0.5 rounded border border-slate-200 dark:border-border-dark flex items-center gap-1 cursor-help" title="${cronHover}">
                <span class="material-symbols-outlined text-[12px]">schedule</span> ${cronStr}
            </span>`;
        });
        return;
      } else if (typeof item.value === 'string' && item.value.includes(' ')) {
        hoverTitle = getCronDescription(item.value);
      }
    }

    finalHtml += `
        <span class="bg-slate-100 dark:bg-slate-800 text-[11px] px-2 py-0.5 rounded border border-slate-200 dark:border-border-dark flex items-center gap-1 cursor-help" title="${hoverTitle}">
            <span class="material-symbols-outlined text-[12px]">check</span> ${displayText}
        </span>
    `;
  });

  return finalHtml;
}

/**
 * Recursively resolves `imports:` references in a workflow's frontmatter.
 * Returns files in dependency-first order (imports before the referencing file),
 * with duplicates removed via the `visited` set.
 */
function resolveImports(
  filePath: string,
  visited = new Set<string>()
): { filePath: string; content: string }[] {
  const abs = path.resolve(filePath);
  if (visited.has(abs)) { return []; }
  visited.add(abs);

  let fileContent = '';
  try {
    fileContent = fs.readFileSync(abs, 'utf8');
  } catch {
    return [];
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(fileContent);
  } catch {
    return [{ filePath: abs, content: fileContent }];
  }

  const imports: string[] = Array.isArray(parsed.data?.imports) ? parsed.data.imports : [];
  const dir = path.dirname(abs);

  const results: { filePath: string; content: string }[] = [];
  for (const imp of imports) {
    const importPath = path.resolve(dir, imp);
    const nested = resolveImports(importPath, visited);
    results.push(...nested);
  }

  // Self last — dependencies come first
  results.push({ filePath: abs, content: fileContent });
  return results;
}

export class EvaluationPanel {
  public static currentPanel: EvaluationPanel | undefined;
  private static _cachedModels: vscode.LanguageModelChat[] | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _name: string = '';
  private _fsPath: string = '';
  private _extensionUri: vscode.Uri;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, fsPath: string, name: string) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this.update(fsPath, name);

    this._panel.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'loadModels':
          this._loadModels(message.force === true).catch(console.error);
          break;
        case 'startEvaluation':
          EvaluationPanel.openEvaluationRun(this._extensionUri, this._fsPath, this._name, message.model as string).catch(console.error);
          break;
      }
    }, null, this._disposables);
  }

  private async _loadModels(force: boolean) {
    if (!force && EvaluationPanel._cachedModels && EvaluationPanel._cachedModels.length > 0) {
      this._panel.webview.postMessage({
        command: 'modelsLoaded',
        models: EvaluationPanel._cachedModels.map(m => ({ id: m.id, name: m.name })),
      });
      return;
    }

    try {
      // Use VS Code's built-in Language Model API — no manual token handling needed.
      // This surfaces Copilot models authorised via the user's VS Code account.
      const lmModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (lmModels.length === 0) {
        this._panel.webview.postMessage({
          command: 'modelsError',
          error: 'No Copilot chat models available. Make sure the GitHub Copilot extension is installed and you are signed in.',
        });
        return;
      }
      EvaluationPanel._cachedModels = lmModels;
      this._panel.webview.postMessage({
        command: 'modelsLoaded',
        models: lmModels.map(m => ({ id: m.id, name: m.name })),
      });
    } catch (e: any) {
      this._panel.webview.postMessage({
        command: 'modelsError',
        error: `Failed to load models via vscode.lm: ${e.message}`,
      });
    }
  }

  public static createOrShow(extensionUri: vscode.Uri, fsPath: string, name: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (EvaluationPanel.currentPanel) {
      EvaluationPanel.currentPanel.update(fsPath, name);
      EvaluationPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "gh-aw-evaluation",
      "Evaluation",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
      }
    );

    EvaluationPanel.currentPanel = new EvaluationPanel(panel, extensionUri, fsPath, name);
  }

  public update(fsPath: string, name: string) {
    this._name = name;
    this._fsPath = fsPath;
    this._panel.title = `Evaluate: ${name}`;
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, fsPath, name);
  }

  /**
   * Opens a new panel that streams a Copilot evaluation of the workflow.
   * Context is built by recursively resolving all `imports:` references in the
   * workflow's frontmatter and concatenating the raw file contents.
   */
  public static async openEvaluationRun(extensionUri: vscode.Uri, fsPath: string, name: string, model: string) {
    const timestamp = new Date().toLocaleString();
    const title = `Evaluation: ${name} (${timestamp})`;
    const panel = vscode.window.createWebviewPanel(
      'gh-aw-evaluation-run',
      title,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    panel.webview.html = EvaluationPanel._getLoadingHtml();

    // --- Build context: resolve imports recursively, then read every file ---
    const files = resolveImports(fsPath);
    const workflowsDir = path.dirname(fsPath);

    let contextBlock = '';
    for (const f of files) {
      const rel = path.relative(workflowsDir, f.filePath);
      contextBlock += `\n=== File: ${rel} ===\n${f.content}\n`;
    }

    // --- Load the evaluation prompt template ---
    let promptTemplate = '';
    try {
      const promptUri = vscode.Uri.joinPath(extensionUri, 'src', 'prompts', 'evaluate-gh-aw.md');
      promptTemplate = fs.readFileSync(promptUri.fsPath, 'utf8');
    } catch (e: any) {
      panel.webview.postMessage({ command: 'error', message: `Could not read prompt template: ${e.message}` });
      return;
    }

    const prompt = promptTemplate.replace('{{CLI_OUTPUT}}', contextBlock);

    // --- Use VS Code Language Model API (vscode.lm) — uses the user's Copilot subscription ---
    const lmModel = EvaluationPanel._cachedModels?.find(m => m.id === model);
    if (!lmModel) {
      panel.webview.postMessage({
        command: 'error',
        message: `Model "${model}" not found in cached models. Please go back and reload models.`,
      });
      return;
    }

    const cts = new vscode.CancellationTokenSource();
    // Cancel the request if the user closes the panel
    panel.onDidDispose(() => cts.cancel());

    try {
      const messages = [vscode.LanguageModelChatMessage.User(prompt)];
      const response = await lmModel.sendRequest(messages, {}, cts.token);

      for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
          panel.webview.postMessage({ command: 'token', delta: part.value });
        }
      }
      panel.webview.postMessage({ command: 'done' });
    } catch (e: any) {
      if (e instanceof vscode.CancellationError) { return; }
      panel.webview.postMessage({ command: 'error', message: `Copilot evaluation failed: ${e.message}` });
    } finally {
      cts.dispose();
    }
  }

  private static _getLoadingHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Evaluation</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--vscode-editor-background, #0d1117);
      color: var(--vscode-editor-foreground, #e6edf3);
      font-family: var(--vscode-font-family, 'Inter', sans-serif);
      padding: 24px;
    }
    #loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      padding: 48px 24px 24px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.08);
      border-top-color: #16ca52;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .label {
      font-size: 13px;
      opacity: 0.6;
      letter-spacing: 0.02em;
    }
    #stream-output {
      width: 100%;
      max-width: 860px;
      margin-top: 8px;
      padding: 14px 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      line-height: 1.7;
      white-space: pre-wrap;
      word-break: break-word;
      opacity: 0.65;
      max-height: 55vh;
      overflow-y: auto;
    }
    #rendered-output {
      display: none;
      max-width: 860px;
      margin: 0 auto;
      line-height: 1.7;
    }
    #rendered-output h1, #rendered-output h2, #rendered-output h3,
    #rendered-output h4, #rendered-output h5 {
      margin-top: 1.4em;
      margin-bottom: 0.5em;
      font-weight: 600;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 0.3em;
    }
    #rendered-output h1 { font-size: 1.4em; }
    #rendered-output h2 { font-size: 1.2em; }
    #rendered-output h3 { font-size: 1.05em; border-bottom: none; }
    #rendered-output p { margin: 0.7em 0; }
    #rendered-output code {
      background: rgba(255,255,255,0.08);
      padding: 0.1em 0.4em;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.88em;
    }
    #rendered-output pre {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      padding: 14px;
      overflow-x: auto;
      margin: 1em 0;
    }
    #rendered-output pre code { background: none; padding: 0; }
    #rendered-output table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.9em; }
    #rendered-output th, #rendered-output td {
      border: 1px solid rgba(255,255,255,0.15);
      padding: 6px 12px;
      text-align: left;
    }
    #rendered-output th { background: rgba(255,255,255,0.06); font-weight: 600; }
    #rendered-output ul, #rendered-output ol { padding-left: 1.5em; margin: 0.7em 0; }
    #rendered-output li { margin: 0.2em 0; }
    #rendered-output blockquote {
      border-left: 3px solid #16ca52;
      padding-left: 1em;
      margin: 1em 0;
      opacity: 0.8;
    }
    #rendered-output a { color: #16ca52; }
    #rendered-output details { margin: 0.5em 0; }
    #rendered-output summary { cursor: pointer; font-weight: 600; padding: 4px 0; }
  </style>
</head>
<body>
  <div id="loading-container">
    <div class="spinner"></div>
    <span class="label">Generating evaluation with Copilot…</span>
    <pre id="stream-output"></pre>
  </div>
  <div id="rendered-output"></div>

  <script>
    const vscode = acquireVsCodeApi();
    let rawMarkdown = '';
    const streamOutput = document.getElementById('stream-output');
    const loadingContainer = document.getElementById('loading-container');
    const renderedOutput = document.getElementById('rendered-output');

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'token') {
        rawMarkdown += msg.delta;
        streamOutput.textContent = rawMarkdown;
        streamOutput.scrollTop = streamOutput.scrollHeight;
      } else if (msg.command === 'done') {
        loadingContainer.style.display = 'none';
        renderedOutput.style.display = 'block';
        renderedOutput.innerHTML = marked.parse(rawMarkdown);
      } else if (msg.command === 'error') {
        const spinner = document.querySelector('.spinner');
        const label = document.querySelector('.label');
        if (spinner) { spinner.style.display = 'none'; }
        if (label) { label.textContent = 'Evaluation failed'; }
        streamOutput.style.color = '#f85149';
        streamOutput.textContent = 'Error: ' + msg.message;
      }
    });
  </script>
</body>
</html>`;
  }

  public dispose() {
    EvaluationPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) { x.dispose(); }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, fsPath: string, name: string) {
    let frontmatter: any = {};
    let rawYaml = "";
    let markdownContent = "";

    try {
      const fileContent = fs.readFileSync(fsPath, 'utf8');
      const parsed = matter(fileContent);
      frontmatter = parsed.data || {};
      rawYaml = matter.stringify("", frontmatter).trim();
      markdownContent = parsed.content.trim();
    } catch (e) {
      console.error("Failed to parse frontmatter", e);
    }

    let overviewHTML = '<div class="grid grid-cols-2 gap-4">';
    for (const [key, value] of Object.entries(frontmatter)) {
      overviewHTML += `
        <div class="space-y-1">
            <p class="text-[11px] text-secondary-text font-medium uppercase tracking-tight">${key}</p>
            <div class="flex flex-wrap gap-1">
                ${formatItems(key, value)}
            </div>
        </div>`;
    }
    overviewHTML += '</div>';

    const engineSelection = frontmatter.engine && typeof frontmatter.engine === 'object' ? frontmatter.engine.model : (frontmatter.engine || 'claude');
    const cachedModels = EvaluationPanel._cachedModels;
    const modelOptionsHtml = cachedModels && cachedModels.length > 0
      ? cachedModels.map(m => `<option value="${m.id}"${m.id === engineSelection ? ' selected' : ''}>${m.name} (${m.id})</option>`).join('')
      : `<option value="${engineSelection}" selected>${engineSelection}</option>`;
    const hasCache = !!(cachedModels && cachedModels.length > 0);

    return `<!DOCTYPE html>
<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Evaluation Launcher</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#16ca52",
                        "background-light": "#f6f8f6",
                        "background-dark": "#0d1117",
                        "surface-dark": "#161b22",
                        "border-dark": "#30363d",
                        "secondary-text": "#8b949e",
                    },
                    fontFamily: {
                        "display": ["Inter", "sans-serif"],
                        "mono": ["JetBrains Mono", "monospace"]
                    },
                    borderRadius: {
                        "DEFAULT": "0.125rem",
                        "lg": "0.25rem",
                        "xl": "0.5rem",
                        "full": "0.75rem"
                    },
                },
            },
        }
    </script>
<style>
        body {
            font-family: 'Inter', sans-serif;
            -webkit-tap-highlight-color: transparent;
            min-height: 100vh;
        }
        .code-block {
            font-family: 'JetBrains Mono', monospace;
        }
    </style>
  </head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
<header class="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-border-dark px-4 py-3 flex items-center gap-3">
<div class="flex flex-col overflow-hidden">
<div class="flex items-center gap-1 text-[10px] uppercase tracking-wider text-secondary-text font-semibold truncate">
<span>workflows</span>
<span class="material-symbols-outlined text-[10px]">chevron_right</span>
</div>
<h1 class="text-sm font-bold truncate">${name}</h1>
</div>
</header>
<main class="flex-1 overflow-y-auto pb-24">
<section class="p-4">
<div class="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg overflow-hidden shadow-sm">
<div class="p-4 border-b border-slate-200 dark:border-border-dark flex items-center justify-between">
<h3 class="text-sm font-semibold flex items-center gap-2">
<span class="material-symbols-outlined text-primary text-[20px]">info</span>
                        Workflow Overview
                    </h3>
<span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 uppercase tracking-tighter">Active</span>
</div>
<div class="p-4 space-y-4">
    ${overviewHTML}
    
    <div class="mt-4 pt-4 border-t border-slate-200 dark:border-border-dark space-y-3">
        <div>
            <button id="toggleRawBtn" class="text-[12px] text-primary hover:underline flex items-center gap-1">
                <span class="material-symbols-outlined border border-primary rounded-sm text-[12px]">visibility</span>
                Show Raw Frontmatter
            </button>
            <div id="rawFrontmatterContainer" class="hidden mt-2 p-3 bg-slate-900 text-slate-300 rounded-lg text-[12px] overflow-x-auto code-block border border-border-dark max-h-64 overflow-y-auto">
                <pre><code>${rawYaml.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
            </div>
        </div>
        <div>
            <button id="toggleBodyBtn" class="text-[12px] text-primary hover:underline flex items-center gap-1">
                <span class="material-symbols-outlined border border-primary rounded-sm text-[12px]">visibility_off</span>
                Hide Workflow Body
            </button>
            <div id="bodyContainer" class="mt-2 p-3 bg-slate-900 text-slate-300 rounded-lg text-[12px] overflow-x-auto code-block border border-border-dark max-h-64 overflow-y-auto">
                <pre><code>${markdownContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
            </div>
        </div>
    </div>
</div>
</div>
</section>
<section class="px-4 space-y-4">
<div class="flex items-center gap-2 pb-1">
<span class="material-symbols-outlined text-secondary-text text-[20px]">terminal</span>
<h3 class="text-sm font-semibold">Agentic Workflow Evaluation Settings</h3>
</div>
<div class="space-y-4">
<div class="space-y-1.5 flex gap-2">
    <div class="flex-1">
        <label class="text-[11px] text-secondary-text font-medium uppercase ml-1">CLI Selection</label>
        <div class="relative">
            <select id="cliSelect" class="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg px-3 py-2 text-sm appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
                <option value="copilot" selected>gh copilot</option>
            </select>
            <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-text">unfold_more</span>
        </div>
    </div>
    <div class="flex items-end mb-[2px]">
        <button id="loadModelsBtn" class="bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1.5 rounded-lg border border-primary/30 text-[12px] font-bold uppercase transition">
            ${hasCache ? 'Refresh' : 'Load Models'}
        </button>
    </div>
</div>

<div class="space-y-1.5">
<label class="text-[11px] text-secondary-text font-medium uppercase ml-1">Model Selection</label>
<div class="relative">
<select id="modelSelect" class="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-lg px-3 py-2 text-sm appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all">
${modelOptionsHtml}
</select>
<span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary-text">unfold_more</span>
</div>
</div>
<div class="space-y-1.5">
<label class="text-[11px] text-secondary-text font-medium uppercase ml-1">Verbosity Level</label>
<div id="verbosityGroup" class="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-border-dark">
<button data-verbosity="normal" class="verbosity-btn w-full py-1.5 text-[11px] font-semibold rounded whitespace-normal break-words">Normal</button>
<button data-verbosity="minimalistic" class="verbosity-btn w-full py-1.5 text-[11px] font-semibold rounded whitespace-normal break-words opacity-40 cursor-not-allowed text-secondary-text" disabled title="Not yet implemented">Minimalistic</button>
<button data-verbosity="verbose" class="verbosity-btn w-full py-1.5 text-[11px] font-semibold rounded whitespace-normal break-words opacity-40 cursor-not-allowed text-secondary-text" disabled title="Not yet implemented">Verbose</button>
</div>
</div>
</div>
</section>
    <div class="h-20"></div>
</main>
<div class="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent">
<button id="startEvalBtn" class="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
<span class="material-symbols-outlined text-[20px]">play_arrow</span>
            Start Evaluation
        </button>
</div>

<script>
    const vscode = acquireVsCodeApi();
    
    // Toggle raw frontmatter
    const toggleBtn = document.getElementById('toggleRawBtn');
    const rawContainer = document.getElementById('rawFrontmatterContainer');
    toggleBtn.addEventListener('click', () => {
        if(rawContainer.classList.contains('hidden')) {
            rawContainer.classList.remove('hidden');
            toggleBtn.innerHTML = '<span class="material-symbols-outlined border border-primary rounded-sm text-[12px]">visibility_off</span> Hide Raw Frontmatter';
        } else {
            rawContainer.classList.add('hidden');
            toggleBtn.innerHTML = '<span class="material-symbols-outlined border border-primary rounded-sm text-[12px]">visibility</span> Show Raw Frontmatter';
        }
    });

    // Toggle workflow body
    const toggleBodyBtn = document.getElementById('toggleBodyBtn');
    const bodyContainer = document.getElementById('bodyContainer');
    toggleBodyBtn.addEventListener('click', () => {
        if(bodyContainer.classList.contains('hidden')) {
            bodyContainer.classList.remove('hidden');
            toggleBodyBtn.innerHTML = '<span class="material-symbols-outlined border border-primary rounded-sm text-[12px]">visibility_off</span> Hide Workflow Body';
        } else {
            bodyContainer.classList.add('hidden');
            toggleBodyBtn.innerHTML = '<span class="material-symbols-outlined border border-primary rounded-sm text-[12px]">visibility</span> Show Workflow Body';
        }
    });

    // Handle CLI models
    const loadModelsBtn = document.getElementById('loadModelsBtn');
    const cliSelect = document.getElementById('cliSelect');
    const modelSelect = document.getElementById('modelSelect');
    const hasCache = ${hasCache};

    function setLoading(loading) {
        if (loading) {
            loadModelsBtn.disabled = true;
            loadModelsBtn.classList.remove('!bg-red-500/20', '!text-red-400', '!border-red-400/30');
            loadModelsBtn.title = '';
            loadModelsBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>';
        } else {
            loadModelsBtn.disabled = false;
            loadModelsBtn.innerText = 'Refresh';
        }
    }

    loadModelsBtn.addEventListener('click', () => {
        setLoading(true);
        vscode.postMessage({ command: 'loadModels', cli: cliSelect.value, force: true });
    });

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'modelsLoaded') {
            setLoading(false);
            const currentVal = modelSelect.value;
            modelSelect.innerHTML = '';
            message.models.forEach(model => {
                const opt = document.createElement('option');
                opt.value = model.id;
                opt.innerText = model.name + ' (' + model.id + ')';
                if (model.id === currentVal) { opt.selected = true; }
                modelSelect.appendChild(opt);
            });
        } else if (message.command === 'modelsError') {
            setLoading(false);
            loadModelsBtn.innerText = 'Retry';
            loadModelsBtn.classList.add('!bg-red-500/20', '!text-red-400', '!border-red-400/30');
            loadModelsBtn.title = message.error;
            modelSelect.innerHTML = '<option disabled selected>Failed \u2014 hover Retry for details</option>';
            console.error('Models error:', message.error);
        }
    });

    // Verbosity selection
    const verbosityBtns = document.querySelectorAll('.verbosity-btn');
    let selectedVerbosity = 'normal';

    function updateVerbosityStyles() {
        verbosityBtns.forEach(btn => {
            const b = btn;
            if (b.dataset.verbosity === selectedVerbosity) {
                b.classList.add('bg-white', 'dark:bg-surface-dark', 'shadow-sm', 'border', 'border-slate-200', 'dark:border-border-dark', 'text-slate-900', 'dark:text-slate-100');
                b.classList.remove('text-secondary-text', 'hover:text-slate-900', 'dark:hover:text-slate-100');
            } else {
                b.classList.remove('bg-white', 'dark:bg-surface-dark', 'shadow-sm', 'border', 'border-slate-200', 'dark:border-border-dark', 'text-slate-900', 'dark:text-slate-100');
                b.classList.add('text-secondary-text', 'hover:text-slate-900', 'dark:hover:text-slate-100');
            }
        });
    }

    verbosityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                selectedVerbosity = btn.dataset.verbosity;
                updateVerbosityStyles();
            }
        });
    });

    updateVerbosityStyles();

    // Auto-load models on first open if cache is not pre-populated
    if (!hasCache) {
        setLoading(true);
        vscode.postMessage({ command: 'loadModels', cli: cliSelect.value, force: false });
    }

    // Start Evaluation button
    const startEvalBtn = document.getElementById('startEvalBtn');
    startEvalBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'startEvaluation', model: modelSelect.value });
    });
</script>
</body></html>`;
  }
}
