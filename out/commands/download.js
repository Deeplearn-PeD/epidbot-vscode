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
exports.downloadSnippet = downloadSnippet;
exports.downloadReport = downloadReport;
exports.downloadPlotCode = downloadPlotCode;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
async function downloadSnippet(client, snippet) {
    if (!client) {
        vscode.window.showErrorMessage('Epidbot: Not configured. Run "Epidbot: Configure API Key" first.');
        return;
    }
    const ext = snippet.language === 'sql' || snippet.language === 'duckdb_sql' ? '.sql' : '.py';
    const defaultName = sanitizeFilename(snippet.title) + ext;
    const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(getDefaultDownloadDir(), defaultName)),
        filters: { 'Code Files': [ext.replace('.', '')] },
    });
    if (!uri) {
        return;
    }
    try {
        const content = Buffer.from(snippet.source_code, 'utf-8');
        await vscode.workspace.fs.writeFile(uri, content);
        vscode.window.showInformationMessage(`Snippet saved to ${uri.fsPath}`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to save snippet: ${message}`);
    }
}
async function downloadReport(client, reportId, title) {
    if (!client) {
        vscode.window.showErrorMessage('Epidbot: Not configured. Run "Epidbot: Configure API Key" first.');
        return;
    }
    const defaultName = sanitizeFilename(title) + '.md';
    const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(getDefaultDownloadDir(), defaultName)),
        filters: { 'Markdown': ['md'] },
    });
    if (!uri) {
        return;
    }
    try {
        const content = await client.downloadReportMarkdown(reportId);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
        vscode.window.showInformationMessage(`Report saved to ${uri.fsPath}`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to save report: ${message}`);
    }
}
async function downloadPlotCode(client, plotId, filename) {
    if (!client) {
        vscode.window.showErrorMessage('Epidbot: Not configured. Run "Epidbot: Configure API Key" first.');
        return;
    }
    const baseName = sanitizeFilename(filename).replace(/\.[^.]+$/, '');
    const defaultName = baseName + '.py';
    const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(getDefaultDownloadDir(), defaultName)),
        filters: { 'Python': ['py'] },
    });
    if (!uri) {
        return;
    }
    try {
        const content = await client.getPlotSnippet(plotId);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
        vscode.window.showInformationMessage(`Plot code saved to ${uri.fsPath}`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to save plot code: ${message}`);
    }
}
function sanitizeFilename(name) {
    return name
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 200);
}
function getDefaultDownloadDir() {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        return folders[0].uri.fsPath;
    }
    return '';
}
//# sourceMappingURL=download.js.map