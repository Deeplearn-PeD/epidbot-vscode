import * as vscode from 'vscode';
import { EpidbotClient } from '../api/client';

let selectedSessionId: number | null = null;
let selectedSessionName: string | null = null;

export function getSelectedSessionId(): number | null {
  return selectedSessionId;
}

export function getSelectedSessionName(): string | null {
  return selectedSessionName;
}

export function registerSelectSessionCommand(
  client: () => EpidbotClient | null,
  onChanged: () => void
): vscode.Disposable {
  return vscode.commands.registerCommand('epidbot.selectSession', async () => {
    const c = client();
    if (!c) {
      vscode.window.showErrorMessage('Epidbot: Not configured. Run "Epidbot: Configure API Key" first.');
      return;
    }

    const sessions = await vscode.window.withProgress(
      { location: { viewId: 'epidbot.snippets' }, title: 'Loading sessions...' },
      async () => {
        try {
          return await c.listSessions();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to load sessions: ${message}`);
          return null;
        }
      }
    );

    if (!sessions) {
      return;
    }

    const items = [
      {
        label: '$(list-flat) All sessions',
        description: `Show content from all sessions`,
        sessionId: null,
      },
      ...sessions.map((s) => ({
        label: `$(comment-discussion) ${s.name || `Session ${s.id}`}`,
        description: `${s.message_count} messages — ${new Date(s.created_at).toLocaleDateString()}`,
        sessionId: s.id,
      })),
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Filter by session (current: ${selectedSessionName || 'All'})`,
      matchOnDescription: true,
    });

    if (selected === undefined) {
      return;
    }

    selectedSessionId = selected.sessionId;
    selectedSessionName = selected.sessionId === null ? null : selected.label.replace('$(comment-discussion) ', '');
    onChanged();
  });
}
