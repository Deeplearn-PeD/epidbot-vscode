import * as vscode from 'vscode';
import { EpidbotClient } from '../api/client';
import { SnippetResult, isSnippetResult } from '../types/epidbot';

export class SnippetTreeItem extends vscode.TreeItem {
  constructor(
    public readonly snippet: SnippetResult,
    isChild: boolean
  ) {
    super(snippet.title, isChild ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);

    this.description = snippet.language;
    this.tooltip = `${snippet.title}\nLanguage: ${snippet.language}\n${snippet.description}\nTags: ${snippet.tags.join(', ')}`;
    this.contextValue = 'snippetItem';
    this.iconPath = this.getLanguageIcon(snippet.language);

    this.command = {
      command: 'epidbot.openSnippet',
      title: 'Open Snippet',
      arguments: [snippet],
    };
  }

  private getLanguageIcon(language: string): vscode.ThemeIcon {
    switch (language) {
      case 'python':
        return new vscode.ThemeIcon('file-code');
      case 'sql':
      case 'duckdb_sql':
        return new vscode.ThemeIcon('database');
      default:
        return new vscode.ThemeIcon('code');
    }
  }
}

class LanguageGroup extends vscode.TreeItem {
  constructor(
    public readonly language: string,
    public readonly snippets: SnippetResult[]
  ) {
    super(
      language === 'duckdb_sql' ? 'DuckDB SQL' : language.charAt(0).toUpperCase() + language.slice(1),
      vscode.TreeItemCollapsibleState.Expanded
    );
    this.contextValue = 'languageGroup';
    this.iconPath = new vscode.ThemeIcon('symbol-class');
    this.description = `${snippets.length} snippet${snippets.length !== 1 ? 's' : ''}`;
  }
}

export class SnippetsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private client: EpidbotClient | null = null;
  private sessionId: number | null = null;

  setClient(client: EpidbotClient | null) {
    this.client = client;
    this.refresh();
  }

  setSessionId(sessionId: number | null) {
    this.sessionId = sessionId;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!this.client) {
      return [this.createPlaceholder('Click the gear icon to configure your API key', 'epidbot.configure')];
    }

    if (element instanceof LanguageGroup) {
      return element.snippets.map((s) => new SnippetTreeItem(s, true));
    }

    if (!element) {
      try {
        const response = await this.client.searchSnippets(undefined, this.sessionId);
        console.log('[Epidbot] Search response:', JSON.stringify({ total: response.total, resultCount: response.results.length }));
        const snippets = response.results.filter(isSnippetResult);
        console.log('[Epidbot] Filtered snippets:', snippets.length);

        if (snippets.length === 0) {
          if (response.total > 0) {
            return [this.createInfoItem(`Found ${response.total} results but none matched snippet format. Check debug console.`)];
          }
          return [this.createInfoItem('No code snippets found')];
        }

        const byLanguage = new Map<string, SnippetResult[]>();
        for (const s of snippets) {
          const lang = s.language || 'unknown';
          if (!byLanguage.has(lang)) {
            byLanguage.set(lang, []);
          }
          byLanguage.get(lang)!.push(s);
        }

        return Array.from(byLanguage.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([lang, items]) => new LanguageGroup(lang, items));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return [this.createErrorItem(message)];
      }
    }

    return [];
  }

  private createPlaceholder(message: string, command: string): vscode.TreeItem {
    const item = new vscode.TreeItem(message, vscode.TreeItemCollapsibleState.None);
    item.command = { command, title: 'Configure' };
    item.iconPath = new vscode.ThemeIcon('warning');
    return item;
  }

  private createInfoItem(message: string): vscode.TreeItem {
    const item = new vscode.TreeItem(message, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('info');
    return item;
  }

  private createErrorItem(message: string): vscode.TreeItem {
    const item = new vscode.TreeItem(message, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('error');
    return item;
  }
}
