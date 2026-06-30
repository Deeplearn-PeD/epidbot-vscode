import * as vscode from 'vscode';
import { EpidbotClient } from './api/client';
import { SnippetsProvider } from './providers/SnippetsProvider';
import { ReportsProvider } from './providers/ReportsProvider';
import { PlotsProvider, PlotTreeItem } from './providers/PlotsProvider';
import { ReportTreeItem } from './providers/ReportsProvider';
import { SnippetTreeItem } from './providers/SnippetsProvider';
import { PlotDetailPanel } from './views/DetailPanel';
import { registerConfigureCommand, initializeClient } from './commands/configure';
import {
  downloadSnippet,
  downloadReport,
  downloadPlot,
  downloadPlotCode,
} from './commands/download';
import { registerSearchCommand } from './commands/search';
import {
  registerSelectSessionCommand,
  getSelectedSessionId,
} from './commands/sessionFilter';
import { SnippetResult } from './types/epidbot';
import { Report } from './types/epidbot';
import { Plot } from './types/epidbot';

let client: EpidbotClient | null = null;
let statusBarItem: vscode.StatusBarItem;
let snippetsProvider: SnippetsProvider;
let reportsProvider: ReportsProvider;
let plotsProvider: PlotsProvider;

export function activate(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'epidbot.configure';
  context.subscriptions.push(statusBarItem);

  snippetsProvider = new SnippetsProvider();
  reportsProvider = new ReportsProvider();
  plotsProvider = new PlotsProvider();

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

  context.subscriptions.push(
    registerConfigureCommand(context, (newClient) => {
      client = newClient;
      snippetsProvider.setClient(client);
      reportsProvider.setClient(client);
      plotsProvider.setClient(client);
      updateStatusBar();
    })
  );

  context.subscriptions.push(
    registerSearchCommand(() => client)
  );

  context.subscriptions.push(
    registerSelectSessionCommand(
      () => client,
      () => {
        snippetsProvider.setSessionId(getSelectedSessionId());
        reportsProvider.refresh();
        plotsProvider.refresh();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('epidbot.refresh', () => {
      snippetsProvider.refresh();
      reportsProvider.refresh();
      plotsProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('epidbot.openSnippet', (snippet: SnippetResult) => {
      openSnippetInEditor(snippet);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('epidbot.openReport', async (report: Report) => {
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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to open report: ${message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('epidbot.openPlot', (plot: Plot) => {
      if (!client) {
        vscode.window.showErrorMessage('Epidbot: Not configured.');
        return;
      }
      PlotDetailPanel.createOrShow(client, plot);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('epidbot.downloadSnippet', (snippet: SnippetResult) => {
      downloadSnippet(client, snippet);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('epidbot.downloadReport', (report: Report) => {
      downloadReport(client, report.id, report.title);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('epidbot.downloadPlot', (plot: Plot) => {
      downloadPlot(client, plot.id, plot.filename);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('epidbot.downloadPlotCode', (plot: Plot) => {
      downloadPlotCode(client, plot.id, plot.filename);
    })
  );

  initializeClient(context).then((c) => {
    client = c;
    snippetsProvider.setClient(client);
    reportsProvider.setClient(client);
    plotsProvider.setClient(client);
    updateStatusBar();
  });
}

async function openSnippetInEditor(snippet: SnippetResult): Promise<void> {
  const languageMap: Record<string, string> = {
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

function updateStatusBar(): void {
  if (client) {
    statusBarItem.text = '$(pass) Epidbot';
    statusBarItem.tooltip = 'Epidbot: Connected — Click to reconfigure';
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = '$(warning) Epidbot';
    statusBarItem.tooltip = 'Epidbot: Not configured — Click to set API key';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
  statusBarItem.show();
}

export function deactivate(): void {}
