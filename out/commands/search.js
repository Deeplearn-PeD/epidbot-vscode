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
exports.registerSearchCommand = registerSearchCommand;
const vscode = __importStar(require("vscode"));
function registerSearchCommand(client) {
    return vscode.commands.registerCommand('epidbot.search', async () => {
        const c = client();
        if (!c) {
            vscode.window.showErrorMessage('Epidbot: Not configured. Run "Epidbot: Configure API Key" first.');
            return;
        }
        const query = await vscode.window.showInputBox({
            prompt: 'Search EpidBot snippets and messages',
            placeHolder: 'e.g., dengue, SIR model, mortality rate',
            ignoreFocusOut: true,
        });
        if (!query) {
            return;
        }
        const results = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Searching EpidBot...' }, async () => {
            try {
                const response = await c.searchAll(query);
                return response.results;
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                vscode.window.showErrorMessage(`Search failed: ${message}`);
                return null;
            }
        });
        if (!results || results.length === 0) {
            vscode.window.showInformationMessage('No results found.');
            return;
        }
        const items = results.map((r) => {
            const label = r.source_type === 'snippet'
                ? `$(code) ${r.title || 'Untitled'}`
                : `$(comment-discussion) ${(r.content || '').substring(0, 80)}`;
            const description = r.source_type === 'snippet'
                ? `${r.language || ''} — ${r.session_name}`
                : `Message — ${r.session_name}`;
            return {
                label,
                description,
                detail: r.source_type === 'snippet' ? r.description : undefined,
                result: r,
            };
        });
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Found ${results.length} result${results.length !== 1 ? 's' : ''}`,
            matchOnDescription: true,
            matchOnDetail: true,
        });
        if (!selected) {
            return;
        }
        const r = selected.result;
        if (r.source_type === 'snippet' && r.source_code) {
            const doc = await vscode.workspace.openTextDocument({
                content: r.source_code,
                language: r.language === 'sql' || r.language === 'duckdb_sql' ? 'sql' : 'python',
            });
            await vscode.window.showTextDocument(doc);
        }
        else if (r.source_type === 'message' && r.content) {
            const doc = await vscode.workspace.openTextDocument({
                content: r.content,
                language: 'markdown',
            });
            await vscode.window.showTextDocument(doc);
        }
    });
}
//# sourceMappingURL=search.js.map