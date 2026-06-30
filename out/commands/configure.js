"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConfigureCommand = registerConfigureCommand;
exports.initializeClient = initializeClient;
const vscode = __importStar(require("vscode"));
const client_1 = require("../api/client");
const SECRET_API_KEY = 'epidbot.apiKey';
const SECRET_ACCESS_TOKEN = 'epidbot.accessToken';
const SECRET_REFRESH_TOKEN = 'epidbot.refreshToken';
function registerConfigureCommand(context, onConfigured) {
    return vscode.commands.registerCommand('epidbot.configure', async () => {
        const serverUrl = await vscode.window.showInputBox({
            prompt: 'EpidBot server URL',
            placeHolder: 'https://epidbot.kwar-ai.com.br',
            value: vscode.workspace.getConfiguration('epidbot').get('serverUrl') || 'https://epidbot.kwar-ai.com.br',
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
        const wantCredentials = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Add username/password for plot image access? (Recommended — required for plot images)',
            ignoreFocusOut: true,
        });
        let accessToken = null;
        let refreshToken = null;
        if (wantCredentials === 'Yes') {
            const username = await vscode.window.showInputBox({
                prompt: 'EpidBot username',
                placeHolder: 'your_username',
                ignoreFocusOut: true,
            });
            if (!username) {
                vscode.window.showWarningMessage('Epidbot: Skipping login. Plot images will not load.');
            }
            else {
                const password = await vscode.window.showInputBox({
                    prompt: 'EpidBot password',
                    password: true,
                    ignoreFocusOut: true,
                });
                if (!password) {
                    vscode.window.showWarningMessage('Epidbot: Skipping login. Plot images will not load.');
                }
                else {
                    try {
                        const tempClient = new client_1.EpidbotClient(serverUrl, apiKey);
                        const tokens = await tempClient.login(username, password);
                        accessToken = tokens.access_token;
                        refreshToken = tokens.refresh_token;
                        await context.secrets.store(SECRET_ACCESS_TOKEN, accessToken);
                        await context.secrets.store(SECRET_REFRESH_TOKEN, refreshToken);
                        vscode.window.showInformationMessage('Epidbot: Logged in successfully.');
                    }
                    catch (err) {
                        const message = err instanceof Error ? err.message : 'Unknown error';
                        vscode.window.showErrorMessage(`Epidbot login failed: ${message}. Plot images will not load.`);
                    }
                }
            }
        }
        else {
            await context.secrets.delete(SECRET_ACCESS_TOKEN);
            await context.secrets.delete(SECRET_REFRESH_TOKEN);
        }
        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Validating API key...' }, async () => {
            try {
                const client = new client_1.EpidbotClient(serverUrl, apiKey, accessToken);
                const profile = await client.getProfile();
                vscode.window.showInformationMessage(`Epidbot: Connected as ${profile.username}${profile.email ? ` (${profile.email})` : ''}`);
                onConfigured(client);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                vscode.window.showErrorMessage(`Epidbot: ${message}`);
                onConfigured(null);
            }
        });
    });
}
async function initializeClient(context) {
    const apiKey = await context.secrets.get(SECRET_API_KEY);
    if (!apiKey) {
        return null;
    }
    const serverUrl = vscode.workspace.getConfiguration('epidbot').get('serverUrl') || 'https://epidbot.kwar-ai.com.br';
    const accessToken = await context.secrets.get(SECRET_ACCESS_TOKEN);
    const client = new client_1.EpidbotClient(serverUrl, apiKey, accessToken || null);
    if (accessToken) {
        try {
            await client.getProfile();
        }
        catch {
            const refreshTokenStr = await context.secrets.get(SECRET_REFRESH_TOKEN);
            if (refreshTokenStr) {
                try {
                    const tokens = await client.refreshAccessToken(refreshTokenStr);
                    await context.secrets.store(SECRET_ACCESS_TOKEN, tokens.access_token);
                    await context.secrets.store(SECRET_REFRESH_TOKEN, tokens.refresh_token);
                    client.setBearerToken(tokens.access_token);
                }
                catch {
                    client.setBearerToken(null);
                }
            }
            else {
                client.setBearerToken(null);
            }
        }
    }
    return client;
}
//# sourceMappingURL=configure.js.map