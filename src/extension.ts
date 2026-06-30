import * as vscode from 'vscode';
import { EpidbotClient } from './api/client';
import { SnippetsProvider } from './providers/SnippetsProvider';
import { ReportsProvider } from './providers/ReportsProvider';
import { PlotsProvider } from './providers/PlotsProvider';
import { registerConfigureCommand, initializeClient } from './commands/configure';
import {
  downloadSnippet,
  downloadReport,
  downloadPlotCode,
} from './commands/download';
import { registerSearchCommand } from './commands/search';
import {
  registerSelectSessionCommand,
  getSelectedSessionId,
} from './commands/sessionFilter';
import { SnippetResult, isSnippetResult } from './types/epidbot';
import { Report } from './types/epidbot';
import { Plot } from './types/epidbot';

let client: EpidbotClient | null = null;
let statusBarItem: vscode.StatusBarItem;
let snippetsProvider: SnippetsProvider;
let reportsProvider: ReportsProvider;
let plotsProvider: PlotsProvider;

export function activate(context: vscode.ExtensionContext): void {
  console.log('[Epidbot] activate() started');

  try {
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
      vscode.commands.registerCommand('epidbot.searchSnippetsPrompt', async () => {
        if (!client) {
          vscode.window.showErrorMessage('Epidbot: Not configured.');
          return;
        }
        const query = await vscode.window.showInputBox({
          prompt: 'Search code snippets',
          placeHolder: 'e.g., dengue, import, SIR model, SELECT',
          ignoreFocusOut: true,
        });
        if (!query) {
          return;
        }
        try {
          const [searchResponse, plots] = await Promise.all([
            client.searchSnippets(query, getSelectedSessionId()),
            client.listPlots(query),
          ]);

          const snippets = searchResponse.results.filter(isSnippetResult);

          const plotSnippets: SnippetResult[] = plots
            .filter((p) => p.code_snippet && p.code_snippet.trim())
            .map((p) => ({
              source_type: 'snippet' as const,
              title: `${p.filename.replace(/\.(png|jpg|jpeg|webp|gif|svg)$/i, '')} (plot code)`,
              description: p.description || `Plot code for ${p.filename}`,
              language: 'python' as const,
              source_code: p.code_snippet!,
              tags: [],
              rank: 0,
              session_id: 0,
              session_name: '',
              created_at: p.created_at,
            }));

          const seen = new Set<string>();
          const allSnippets: SnippetResult[] = [];
          for (const s of [...snippets, ...plotSnippets]) {
            const key = s.source_code.trim();
            if (!seen.has(key)) {
              seen.add(key);
              allSnippets.push(s);
            }
          }
          if (allSnippets.length === 0) {
            vscode.window.showInformationMessage(`No snippets found for "${query}". Try a different term.`);
          }
          snippetsProvider.setSearchResults(query, allSnippets);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          vscode.window.showErrorMessage(`Search failed: ${message}`);
        }
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
          const safeTitle = report.title.replace(/[/\\:*?"<>|]/g, '_');
          const uri = vscode.Uri.parse(`untitled:${safeTitle}.md`);
          const doc = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(doc, { preview: false });
          await editor.edit((editBuilder) => {
            const lastLine = doc.lineCount - 1;
            const lastChar = doc.lineAt(lastLine).text.length;
            editBuilder.delete(new vscode.Range(0, 0, lastLine, lastChar));
            editBuilder.insert(new vscode.Position(0, 0), full.content);
          });
          await vscode.commands.executeCommand('markdown.showPreview', doc.uri);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to open report: ${message}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('epidbot.openPlot', async (plot: Plot) => {
        if (!client) {
          vscode.window.showErrorMessage('Epidbot: Not configured.');
          return;
        }
        if (!plot.code_snippet || !plot.code_snippet.trim()) {
          vscode.window.showInformationMessage(`No code snippet available for "${plot.filename}".`);
          return;
        }
        const doc = await vscode.workspace.openTextDocument({
          content: plot.code_snippet,
          language: 'python',
        });
        await vscode.window.showTextDocument(doc, { preview: false });
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
      console.log('[Epidbot] client initialized:', c ? 'connected' : 'no API key');
    }).catch((err) => {
      console.error('[Epidbot] client init error:', err);
    });

    console.log('[Epidbot] activate() completed');
  } catch (err) {
    console.error('[Epidbot] activate() failed:', err);
    vscode.window.showErrorMessage(`Epidbot failed to start: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function openSnippetInEditor(snippet: SnippetResult): Promise<void> {
  const languageMap: Record<string, string> = {
    python: 'python',
    sql: 'sql',
    duckdb_sql: 'sql',
  };
  const language = languageMap[snippet.language] || 'plaintext';
  const ext = snippet.language === 'sql' || snippet.language === 'duckdb_sql' ? '.sql' : '.py';
  const safeTitle = snippet.title.replace(/[/\\:*?"<>|]/g, '_');
  const uri = vscode.Uri.parse(`untitled:${safeTitle}${ext}`);
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, { preview: false });
  await editor.edit((editBuilder) => {
    const lastLine = doc.lineCount - 1;
    const lastChar = doc.lineAt(lastLine).text.length;
    editBuilder.delete(new vscode.Range(0, 0, lastLine, lastChar));
    editBuilder.insert(new vscode.Position(0, 0), snippet.source_code);
  });
  await vscode.languages.setTextDocumentLanguage(doc, language);
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
