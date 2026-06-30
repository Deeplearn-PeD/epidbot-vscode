import * as vscode from 'vscode';
import { EpidbotClient } from '../api/client';
import { Report } from '../types/epidbot';

export class ReportTreeItem extends vscode.TreeItem {
  constructor(public readonly report: Report) {
    super(report.title, vscode.TreeItemCollapsibleState.None);

    this.description = report.report_type;
    this.tooltip = `${report.title}\nType: ${report.report_type}\nImages: ${report.image_count}\nCreated: ${new Date(report.created_at).toLocaleDateString()}`;
    this.contextValue = 'reportItem';
    this.iconPath = new vscode.ThemeIcon('book');

    this.command = {
      command: 'epidbot.openReport',
      title: 'Open Report',
      arguments: [report],
    };
  }
}

export class ReportsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
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
      const reports = await this.client.listReports();

      if (reports.length === 0) {
        return [this.createInfoItem('No reports found')];
      }

      return reports
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .map((r) => new ReportTreeItem(r));
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
