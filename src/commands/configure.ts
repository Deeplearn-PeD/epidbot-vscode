import * as vscode from 'vscode';
import { EpidbotClient } from '../api/client';

const SECRET_KEY = 'epidbot.apiKey';

export function registerConfigureCommand(
  context: vscode.ExtensionContext,
  onConfigured: (client: EpidbotClient | null) => void
): vscode.Disposable {
  return vscode.commands.registerCommand('epidbot.configure', async () => {
    const serverUrl = await vscode.window.showInputBox({
      prompt: 'EpidBot server URL',
      placeHolder: 'http://localhost:8123',
      value: vscode.workspace.getConfiguration('epidbot').get<string>('serverUrl') || 'http://localhost:8123',
      ignoreFocusOut: true,
    });

    if (!serverUrl) {
      return;
    }

    const apiKey = await vscode.window.showInputBox({
      prompt: 'EpidBot API key (starts with ek_)',
      placeHolder: 'ek_...',
      password: true,
      ignoreFocusOut: true,
    });

    if (!apiKey) {
      return;
    }

    await vscode.workspace.getConfiguration('epidbot').update('serverUrl', serverUrl, vscode.ConfigurationTarget.Global);
    await context.secrets.store(SECRET_KEY, apiKey);

    vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Validating API key...' },
      async () => {
        try {
          const client = new EpidbotClient(serverUrl, apiKey);
          const profile = await client.getProfile();
          vscode.window.showInformationMessage(
            `Epidbot: Connected as ${profile.username}${profile.email ? ` (${profile.email})` : ''}`
          );
          onConfigured(client);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          vscode.window.showErrorMessage(`Epidbot: ${message}`);
          onConfigured(null);
        }
      }
    );
  });
}

export async function initializeClient(
  context: vscode.ExtensionContext
): Promise<EpidbotClient | null> {
  const apiKey = await context.secrets.get(SECRET_KEY);
  if (!apiKey) {
    return null;
  }

  const serverUrl = vscode.workspace.getConfiguration('epidbot').get<string>('serverUrl') || 'http://localhost:8123';
  return new EpidbotClient(serverUrl, apiKey);
}
