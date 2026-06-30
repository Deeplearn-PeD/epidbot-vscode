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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const SnippetsProvider_1 = require("./providers/SnippetsProvider");
const ReportsProvider_1 = require("./providers/ReportsProvider");
const PlotsProvider_1 = require("./providers/PlotsProvider");
const DetailPanel_1 = require("./views/DetailPanel");
const configure_1 = require("./commands/configure");
const download_1 = require("./commands/download");
const search_1 = require("./commands/search");
const sessionFilter_1 = require("./commands/sessionFilter");
let client = null;
let statusBarItem;
let snippetsProvider;
let reportsProvider;
let plotsProvider;
function activate(context) {
    console.log('[Epidbot] activate() started');
    vscode.window.showInformationMessage('Epidbot activated');
    try {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.command = 'epidbot.configure';
        context.subscriptions.push(statusBarItem);
        snippetsProvider = new SnippetsProvider_1.SnippetsProvider();
        reportsProvider = new ReportsProvider_1.ReportsProvider();
        plotsProvider = new PlotsProvider_1.PlotsProvider();
        vscode.window.createTreeView('epidbot.snippets', {
            treeDataProvider: snippetsProvider,
            showCollapseAll: true,
        });
        vscode.window.createTreeView('epidbot.reports', {
            treeDataProvider: reportsProvider,
            showCollapseAll: false,
        });
        vscode.window.createTreeView('epidbot.plots', {
            treeDataProvider: plotsProvider,
            showCollapseAll: false,
        });
        context.subscriptions.push((0, configure_1.registerConfigureCommand)(context, (newClient) => {
            client = newClient;
            snippetsProvider.setClient(client);
            reportsProvider.setClient(client);
            plotsProvider.setClient(client);
            updateStatusBar();
        }));
        context.subscriptions.push((0, search_1.registerSearchCommand)(() => client));
        context.subscriptions.push((0, sessionFilter_1.registerSelectSessionCommand)(() => client, () => {
            snippetsProvider.setSessionId((0, sessionFilter_1.getSelectedSessionId)());
            reportsProvider.refresh();
            plotsProvider.refresh();
        }));
        context.subscriptions.push(vscode.commands.registerCommand('epidbot.refresh', () => {
            snippetsProvider.refresh();
            reportsProvider.refresh();
            plotsProvider.refresh();
        }));
        context.subscriptions.push(vscode.commands.registerCommand('epidbot.openSnippet', (snippet) => {
            openSnippetInEditor(snippet);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('epidbot.openReport', async (report) => {
            if (!client) {
                vscode.window.showErrorMessage('Epidbot: Not configured.');
                return;
            }
            try {
                const full = await client.getReport(report.id);
                const doc = await vscode.workspace.openTextDocument({
                    content: full.content,
                    language: 'markdown',
                });
                await vscode.window.showTextDocument(doc, { preview: false });
                await vscode.commands.executeCommand('markdown.showPreview', doc.uri);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to open report: ${message}`);
            }
        }));
        context.subscriptions.push(vscode.commands.registerCommand('epidbot.openPlot', (plot) => {
            if (!client) {
                vscode.window.showErrorMessage('Epidbot: Not configured.');
                return;
            }
            DetailPanel_1.PlotDetailPanel.createOrShow(client, plot);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('epidbot.downloadSnippet', (snippet) => {
            (0, download_1.downloadSnippet)(client, snippet);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('epidbot.downloadReport', (report) => {
            (0, download_1.downloadReport)(client, report.id, report.title);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('epidbot.downloadPlot', (plot) => {
            (0, download_1.downloadPlot)(client, plot.id, plot.filename);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('epidbot.downloadPlotCode', (plot) => {
            (0, download_1.downloadPlotCode)(client, plot.id, plot.filename);
        }));
        (0, configure_1.initializeClient)(context).then((c) => {
            client = c;
            snippetsProvider.setClient(client);
            reportsProvider.setClient(client);
            plotsProvider.setClient(client);
            updateStatusBar();
            console.log('[Epidbot] client initialized:', c ? 'connected' : 'no API key');
        }).catch((err) => {
            console.error('[Epidbot] client init error:', err);
        });
        console.log('[Epidbot] activate() completed');
    }
    catch (err) {
        console.error('[Epidbot] activate() failed:', err);
        vscode.window.showErrorMessage(`Epidbot failed to start: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function openSnippetInEditor(snippet) {
    const languageMap = {
        python: 'python',
        sql: 'sql',
        duckdb_sql: 'sql',
    };
    const language = languageMap[snippet.language] || 'plaintext';
    const doc = await vscode.workspace.openTextDocument({
        content: snippet.source_code,
        language,
    });
    await vscode.window.showTextDocument(doc, { preview: false });
}
function updateStatusBar() {
    if (client) {
        statusBarItem.text = '$(pass) Epidbot';
        statusBarItem.tooltip = 'Epidbot: Connected — Click to reconfigure';
        statusBarItem.backgroundColor = undefined;
    }
    else {
        statusBarItem.text = '$(warning) Epidbot';
        statusBarItem.tooltip = 'Epidbot: Not configured — Click to set API key';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    statusBarItem.show();
}
function deactivate() { }
//# sourceMappingURL=extension.js.map