import * as vscode from 'vscode';
import { EpidbotClient } from '../api/client';
import { SearchResult } from '../types/epidbot';

export function registerSearchCommand(
  client: () => EpidbotClient | null
): vscode.Disposable {
  return vscode.commands.registerCommand('epidbot.search', async () => {
    const c = client();
    if (!c) {
      vscode.window.showErrorMessage('Epidbot: Not configured. Run "Epidbot: Configure API Key" first.');
      return;
    }

    const query = await vscode.window.showInputBox({
      prompt: 'Search EpidBot snippets and messages',
      placeHolder: 'e.g., dengue, SIR model, mortality rate',
      ignoreFocusOut: true,
    });

    if (!query) {
      return;
    }

    const results = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Searching EpidBot...' },
      async (): Promise<SearchResult[] | null> => {
        try {
          const response = await c.searchAll(query);
          return response.results;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          vscode.window.showErrorMessage(`Search failed: ${message}`);
          return null;
        }
      }
    );

    if (!results || results.length === 0) {
      vscode.window.showInformationMessage('No results found.');
      return;
    }

    const items = results.map((r) => {
      const label = r.source_type === 'snippet'
        ? `$(code) ${r.title || 'Untitled'}`
        : `$(comment-discussion) ${(r.content || '').substring(0, 80)}`;
      const description = r.source_type === 'snippet'
        ? `${r.language || ''} — ${r.session_name}`
        : `Message — ${r.session_name}`;

      return {
        label,
        description,
        detail: r.source_type === 'snippet' ? r.description : undefined,
        result: r,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${results.length} result${results.length !== 1 ? 's' : ''}`,
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) {
      return;
    }

    const r = selected.result;

    if (r.source_type === 'snippet' && r.source_code) {
      const doc = await vscode.workspace.openTextDocument({
        content: r.source_code,
        language: r.language === 'sql' || r.language === 'duckdb_sql' ? 'sql' : 'python',
      });
      await vscode.window.showTextDocument(doc);
    } else if (r.source_type === 'message' && r.content) {
      const doc = await vscode.workspace.openTextDocument({
        content: r.content,
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc);
    }
  });
}
