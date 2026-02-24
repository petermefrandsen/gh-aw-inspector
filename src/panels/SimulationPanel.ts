import * as vscode from "vscode";
import * as fs from "fs";
import * as https from "https";
import { exec } from "child_process";
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

export class SimulationPanel {
  public static currentPanel: SimulationPanel | undefined;
  private static _cachedModels: { id: string; name: string }[] | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, fsPath: string, name: string) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this.update(fsPath, name);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'loadModels':
          this._loadModelsForCli(message.force === true);
          break;
      }
    }, null, this._disposables);
  }

  private _loadModelsForCli(force: boolean) {
    if (!force && SimulationPanel._cachedModels) {
      this._panel.webview.postMessage({ command: 'modelsLoaded', models: SimulationPanel._cachedModels });
      return;
    }

    // Get the gh auth token, then call the Copilot models API directly.
    // This avoids running the copilot binary, which requires a native pty module
    // that is incompatible with the extension host Node.js environment.
    exec('gh auth token', { env: process.env }, (tokenErr, tokenOut) => {
      const token = tokenOut?.trim();
      if (tokenErr || !token) {
        this._panel.webview.postMessage({
          command: 'modelsError',
          error: `Could not get GitHub auth token. Is gh authenticated? ${tokenErr?.message ?? ''}`,
        });
        return;
      }

      const options: https.RequestOptions = {
        hostname: 'api.githubcopilot.com',
        path: '/models',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Copilot-Integration-Id': 'vscode-chat',
          'User-Agent': 'gh-aw-inspector',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as { data: any[] };
            const models = parsed.data
              .filter(m => m.capabilities?.type === 'chat')
              .map(m => ({ id: m.id as string, name: m.name as string }))
              // de-duplicate by id
              .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);

            if (models.length > 0) {
              SimulationPanel._cachedModels = models;
              this._panel.webview.postMessage({ command: 'modelsLoaded', models });
            } else {
              this._panel.webview.postMessage({
                command: 'modelsError',
                error: `API returned no chat models. HTTP ${res.statusCode}. Body: ${data.slice(0, 200)}`,
              });
            }
          } catch (e: any) {
            this._panel.webview.postMessage({
              command: 'modelsError',
              error: `Failed to parse API response: ${e.message}. Body: ${data.slice(0, 200)}`,
            });
          }
        });
      });

      req.on('error', (e: Error) => {
        this._panel.webview.postMessage({ command: 'modelsError', error: `HTTPS request failed: ${e.message}` });
      });

      req.end();
    });
  }

  public static createOrShow(extensionUri: vscode.Uri, fsPath: string, name: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (SimulationPanel.currentPanel) {
      SimulationPanel.currentPanel.update(fsPath, name);
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

    SimulationPanel.currentPanel = new SimulationPanel(panel, extensionUri, fsPath, name);
  }

  public update(fsPath: string, name: string) {
    this._panel.title = `Simulate: ${name}`;
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, fsPath, name);
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

    // Generate dynamic overview HTML
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
    const cachedModels = SimulationPanel._cachedModels;
    const modelOptionsHtml = cachedModels && cachedModels.length > 0
      ? cachedModels.map(m => `<option value="${m.id}"${m.id === engineSelection ? ' selected' : ''}>${m.name} (${m.id})</option>`).join('')
      : `<option value="${engineSelection}" selected>${engineSelection}</option>`;
    const hasCache = !!(cachedModels && cachedModels.length > 0);

    return `<!DOCTYPE html>
<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Simulation Launcher Variant 2</title>
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
<h3 class="text-sm font-semibold">Agentic Workflow Simulation Settings</h3>
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
    <!-- Replaced with dynamic workflow body block in the overview section -->
    <div class="h-20"></div>
</main>
<div class="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent">
<button class="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
<span class="material-symbols-outlined text-[20px]">play_arrow</span>
            Start Simulation Execution
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
</script>
</body></html>`;
  }
}
