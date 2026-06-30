"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlotDetailPanel = void 0;
const vscode = __importStar(require("vscode"));
class PlotDetailPanel {
    static currentPanel;
    panel;
    disposables = [];
    constructor(panel, client, plot) {
        this.panel = panel;
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.html = this.getLoadingHtml();
        this.loadContent(client, plot);
    }
    static createOrShow(client, plot) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (PlotDetailPanel.currentPanel) {
            PlotDetailPanel.currentPanel.panel.reveal(column);
            PlotDetailPanel.currentPanel.loadContent(client, plot);
            return;
        }
        const panel = vscode.window.createWebviewPanel('epidbotPlotDetail', `Plot: ${plot.filename}`, column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        PlotDetailPanel.currentPanel = new PlotDetailPanel(panel, client, plot);
    }
    async loadContent(client, plot) {
        this.panel.title = `Plot: ${plot.filename}`;
        try {
            const imageData = await client.getPlotImage(plot.id);
            const base64 = Buffer.from(imageData).toString('base64');
            const mimeType = plot.mime_type || 'image/png';
            let codeHtml = '';
            if (plot.code_snippet) {
                const escapedCode = plot.code_snippet
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                codeHtml = `
          <div class="section">
            <div class="section-header">
              <h3>Code Snippet</h3>
              <button onclick="copyCode()">Copy</button>
            </div>
            <pre><code class="language-python">${escapedCode}</code></pre>
          </div>
          <script>const code = ${JSON.stringify(plot.code_snippet)};</script>`;
            }
            this.panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
      line-height: 1.5;
    }
    h2 { font-size: 18px; margin-bottom: 8px; }
    .meta { color: var(--vscode-descriptionForeground); margin-bottom: 16px; font-size: 12px; }
    .section { margin-top: 20px; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    h3 { font-size: 14px; color: var(--vscode-titleBar-activeForeground); }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 4px 12px;
      cursor: pointer;
      border-radius: 2px;
      font-size: 12px;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    img { max-width: 100%; border: 1px solid var(--vscode-panel-border); border-radius: 4px; }
    pre {
      background: var(--vscode-textCodeBlock-background);
      color: var(--vscode-textPreformat-foreground);
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      line-height: 1.4;
    }
    code { font-family: var(--vscode-editor-font-family, monospace); }
    .no-code { color: var(--vscode-descriptionForeground); font-style: italic; padding: 12px; }
  </style>
</head>
<body>
  <h2>${escapeHtml(plot.filename)}</h2>
  <div class="meta">
    ${plot.description ? `<p>${escapeHtml(plot.description)}</p>` : ''}
    <p>Source: ${escapeHtml(plot.source)} &bull; ${plot.width}x${plot.height} &bull; ${formatBytes(plot.file_size_bytes)}</p>
  </div>
  <div class="section">
    <h3>Image</h3>
    <img src="data:${mimeType};base64,${base64}" alt="${escapeHtml(plot.filename)}" />
  </div>
  ${codeHtml || '<div class="section"><div class="no-code">No code snippet available for this plot.</div></div>'}
  <script>
    function copyCode() {
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('button');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
    }
  </script>
</body>
</html>`;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            this.panel.webview.html = `<!DOCTYPE html>
<html><body style="padding:20px;color:var(--vscode-errorForeground);">
  <p>Failed to load plot: ${escapeHtml(message)}</p>
</body></html>`;
        }
    }
    getLoadingHtml() {
        return `<!DOCTYPE html>
<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;color:var(--vscode-descriptionForeground);">
  <p>Loading plot...</p>
</body></html>`;
    }
    dispose() {
        PlotDetailPanel.currentPanel = undefined;
        this.panel.dispose();
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.PlotDetailPanel = PlotDetailPanel;
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
//# sourceMappingURL=DetailPanel.js.map