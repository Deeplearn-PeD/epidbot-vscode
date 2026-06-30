import * as vscode from 'vscode';
import * as path from 'path';
import { EpidbotClient } from '../api/client';
import { SnippetResult } from '../types/epidbot';

export async function downloadSnippet(client: EpidbotClient | null, snippet: SnippetResult): Promise<void> {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to save snippet: ${message}`);
  }
}

export async function downloadReport(client: EpidbotClient | null, reportId: number, title: string): Promise<void> {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to save report: ${message}`);
  }
}

export async function downloadPlotCode(client: EpidbotClient | null, plotId: number, filename: string): Promise<void> {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to save plot code: ${message}`);
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

function getDefaultDownloadDir(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.fsPath;
  }
  return '';
}
