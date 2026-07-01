import * as vscode from 'vscode';
import { EpidbotClient } from '../api/client';
import { Plot } from '../types/epidbot';

export class PlotTreeItem extends vscode.TreeItem {
  constructor(public readonly plot: Plot) {
    super(plot.filename, vscode.TreeItemCollapsibleState.None);

    this.description = plot.description || plot.source;
    this.tooltip = `${plot.filename}\nSource: ${plot.source}\nSize: ${plot.width}x${plot.height}`;
    this.contextValue = 'plotItem+code';
    this.iconPath = new vscode.ThemeIcon('file-media');
  }
}

export class PlotsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private client: EpidbotClient | null = null;

  setClient(client: EpidbotClient | null) {
    this.client = client;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element) {
      return [];
    }

    if (!this.client) {
      return [this.createPlaceholder('Click the gear icon to configure your API key', 'epidbot.configure')];
    }

    try {
      const plots = (await this.client.listPlots())
        .filter((p) => p.code_snippet && p.code_snippet.trim());

      if (plots.length === 0) {
        return [this.createInfoItem('No plots with code snippets found')];
      }

      return plots
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((p) => new PlotTreeItem(p));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return [this.createErrorItem(message)];
    }
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
