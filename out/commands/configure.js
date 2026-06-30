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
const SECRET_KEY = 'epidbot.apiKey';
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
        await context.secrets.store(SECRET_KEY, apiKey);
        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Validating API key...' }, async () => {
            try {
                const client = new client_1.EpidbotClient(serverUrl, apiKey);
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
    const apiKey = await context.secrets.get(SECRET_KEY);
    if (!apiKey) {
        return null;
    }
    const serverUrl = vscode.workspace.getConfiguration('epidbot').get('serverUrl') || 'https://epidbot.kwar-ai.com.br';
    return new client_1.EpidbotClient(serverUrl, apiKey);
}
//# sourceMappingURL=configure.js.map