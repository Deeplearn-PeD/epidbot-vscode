import * as vscode from 'vscode';
import { EpidbotClient } from '../api/client';

const SECRET_API_KEY = 'epidbot.apiKey';
const SECRET_ACCESS_TOKEN = 'epidbot.accessToken';
const SECRET_REFRESH_TOKEN = 'epidbot.refreshToken';

export function registerConfigureCommand(
  context: vscode.ExtensionContext,
  onConfigured: (client: EpidbotClient | null) => void
): vscode.Disposable {
  return vscode.commands.registerCommand('epidbot.configure', async () => {
    const serverUrl = await vscode.window.showInputBox({
      prompt: 'EpidBot server URL',
      placeHolder: 'https://epidbot.kwar-ai.com.br',
      value: vscode.workspace.getConfiguration('epidbot').get<string>('serverUrl') || 'https://epidbot.kwar-ai.com.br',
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
    await context.secrets.store(SECRET_API_KEY, apiKey);

    const wantCredentials = await vscode.window.showQuickPick(
      ['Yes', 'No'],
      {
        placeHolder: 'Add username/password for plot image access? (Recommended — required for plot images)',
        ignoreFocusOut: true,
      }
    );

    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (wantCredentials === 'Yes') {
      const username = await vscode.window.showInputBox({
        prompt: 'EpidBot username',
        placeHolder: 'your_username',
        ignoreFocusOut: true,
      });

      if (!username) {
        vscode.window.showWarningMessage('Epidbot: Skipping login. Plot images will not load.');
      } else {
        const password = await vscode.window.showInputBox({
          prompt: 'EpidBot password',
          password: true,
          ignoreFocusOut: true,
        });

        if (!password) {
          vscode.window.showWarningMessage('Epidbot: Skipping login. Plot images will not load.');
        } else {
          try {
            const tempClient = new EpidbotClient(serverUrl, apiKey);
            const tokens = await tempClient.login(username, password);
            accessToken = tokens.access_token;
            refreshToken = tokens.refresh_token;
            await context.secrets.store(SECRET_ACCESS_TOKEN, accessToken);
            await context.secrets.store(SECRET_REFRESH_TOKEN, refreshToken);
            vscode.window.showInformationMessage('Epidbot: Logged in successfully.');
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            vscode.window.showErrorMessage(`Epidbot login failed: ${message}. Plot images will not load.`);
          }
        }
      }
    } else {
      await context.secrets.delete(SECRET_ACCESS_TOKEN);
      await context.secrets.delete(SECRET_REFRESH_TOKEN);
    }

    vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Validating API key...' },
      async () => {
        try {
          const client = new EpidbotClient(serverUrl, apiKey, accessToken);
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
  const apiKey = await context.secrets.get(SECRET_API_KEY);
  if (!apiKey) {
    return null;
  }

  const serverUrl = vscode.workspace.getConfiguration('epidbot').get<string>('serverUrl') || 'https://epidbot.kwar-ai.com.br';
  const accessToken = await context.secrets.get(SECRET_ACCESS_TOKEN);

  const client = new EpidbotClient(serverUrl, apiKey, accessToken || null);

  if (accessToken) {
    try {
      await client.getProfile();
    } catch {
      const refreshTokenStr = await context.secrets.get(SECRET_REFRESH_TOKEN);
      if (refreshTokenStr) {
        try {
          const tokens = await client.refreshAccessToken(refreshTokenStr);
          await context.secrets.store(SECRET_ACCESS_TOKEN, tokens.access_token);
          await context.secrets.store(SECRET_REFRESH_TOKEN, tokens.refresh_token);
          client.setBearerToken(tokens.access_token);
        } catch {
          client.setBearerToken(null);
        }
      } else {
        client.setBearerToken(null);
      }
    }
  }

  return client;
}
