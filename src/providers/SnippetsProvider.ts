import * as vscode from 'vscode';
import { EpidbotClient } from '../api/client';
import { SnippetResult, isSnippetResult } from '../types/epidbot';

export class SnippetTreeItem extends vscode.TreeItem {
  constructor(
    public readonly snippet: SnippetResult,
    isChild: boolean
  ) {
    super(snippet.title, isChild ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);

    const descParts: string[] = [snippet.language];
    if (snippet.description && snippet.description.trim()) {
      const shortDesc = snippet.description.length > 80
        ? snippet.description.slice(0, 77) + '...'
        : snippet.description;
      descParts.push(shortDesc);
    }
    this.description = descParts.join(' — ');
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

class SearchPromptItem extends vscode.TreeItem {
  constructor() {
    super('Search for code snippets...', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('search');
    this.command = {
      command: 'epidbot.searchSnippetsPrompt',
      title: 'Search Snippets',
    };
  }
}

export class SnippetsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private client: EpidbotClient | null = null;
  private sessionId: number | null = null;
  private lastQuery: string | null = null;
  private lastSnippets: SnippetResult[] = [];

  setClient(client: EpidbotClient | null) {
    this.client = client;
    this.lastQuery = null;
    this.lastSnippets = [];
    this.refresh();
  }

  setSessionId(sessionId: number | null) {
    this.sessionId = sessionId;
    if (this.lastQuery) {
      this.refresh();
    }
  }

  setSearchResults(query: string, snippets: SnippetResult[]): void {
    this.lastQuery = query;
    this.lastSnippets = snippets;
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
      if (!this.lastQuery || this.lastSnippets.length === 0) {
        return [new SearchPromptItem()];
      }

      const byLanguage = new Map<string, SnippetResult[]>();
      for (const s of this.lastSnippets) {
        const lang = s.language || 'unknown';
        if (!byLanguage.has(lang)) {
          byLanguage.set(lang, []);
        }
        byLanguage.get(lang)!.push(s);
      }

      const groups = Array.from(byLanguage.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([lang, items]) => new LanguageGroup(lang, items));

      const header = new vscode.TreeItem(
        `Results for "${this.lastQuery}" (${this.lastSnippets.length} snippets)`,
        vscode.TreeItemCollapsibleState.None
      );
      header.iconPath = new vscode.ThemeIcon('search');
      header.contextValue = 'searchHeader';

      return [header, ...groups];
    }

    return [];
  }

  private createPlaceholder(message: string, command: string): vscode.TreeItem {
    const item = new vscode.TreeItem(message, vscode.TreeItemCollapsibleState.None);
    item.command = { command, title: 'Configure' };
    item.iconPath = new vscode.ThemeIcon('warning');
    return item;
  }
}
