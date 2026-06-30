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
exports.getSelectedSessionId = getSelectedSessionId;
exports.getSelectedSessionName = getSelectedSessionName;
exports.registerSelectSessionCommand = registerSelectSessionCommand;
const vscode = __importStar(require("vscode"));
let selectedSessionId = null;
let selectedSessionName = null;
function getSelectedSessionId() {
    return selectedSessionId;
}
function getSelectedSessionName() {
    return selectedSessionName;
}
function registerSelectSessionCommand(client, onChanged) {
    return vscode.commands.registerCommand('epidbot.selectSession', async () => {
        const c = client();
        if (!c) {
            vscode.window.showErrorMessage('Epidbot: Not configured. Run "Epidbot: Configure API Key" first.');
            return;
        }
        const sessions = await vscode.window.withProgress({ location: { viewId: 'epidbot.snippets' }, title: 'Loading sessions...' }, async () => {
            try {
                return await c.listSessions();
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to load sessions: ${message}`);
                return null;
            }
        });
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
//# sourceMappingURL=sessionFilter.js.map