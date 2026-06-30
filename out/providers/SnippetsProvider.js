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
exports.SnippetsProvider = exports.SnippetTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const epidbot_1 = require("../types/epidbot");
class SnippetTreeItem extends vscode.TreeItem {
    snippet;
    constructor(snippet, isChild) {
        super(snippet.title, isChild ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
        this.snippet = snippet;
        this.description = snippet.language;
        this.tooltip = `${snippet.title}\nLanguage: ${snippet.language}\n${snippet.description}\nTags: ${snippet.tags.join(', ')}`;
        this.contextValue = 'snippetItem';
        this.iconPath = this.getLanguageIcon(snippet.language);
        this.command = {
            command: 'epidbot.openSnippet',
            title: 'Open Snippet',
            arguments: [snippet],
        };
    }
    getLanguageIcon(language) {
        switch (language) {
            case 'python':
                return new vscode.ThemeIcon('file-code');
            case 'sql':
            case 'duckdb_sql':
                return new vscode.ThemeIcon('database');
            default:
                return new vscode.ThemeIcon('code');
        }
    }
}
exports.SnippetTreeItem = SnippetTreeItem;
class LanguageGroup extends vscode.TreeItem {
    language;
    snippets;
    constructor(language, snippets) {
        super(language === 'duckdb_sql' ? 'DuckDB SQL' : language.charAt(0).toUpperCase() + language.slice(1), vscode.TreeItemCollapsibleState.Expanded);
        this.language = language;
        this.snippets = snippets;
        this.contextValue = 'languageGroup';
        this.iconPath = new vscode.ThemeIcon('symbol-class');
        this.description = `${snippets.length} snippet${snippets.length !== 1 ? 's' : ''}`;
    }
}
class SnippetsProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    client = null;
    sessionId = null;
    setClient(client) {
        this.client = client;
        this.refresh();
    }
    setSessionId(sessionId) {
        this.sessionId = sessionId;
        this.refresh();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!this.client) {
            return [this.createPlaceholder('Click the gear icon to configure your API key', 'epidbot.configure')];
        }
        if (element instanceof LanguageGroup) {
            return element.snippets.map((s) => new SnippetTreeItem(s, true));
        }
        if (!element) {
            try {
                const response = await this.client.searchSnippets(undefined, this.sessionId);
                const snippets = response.results.filter(epidbot_1.isSnippetResult);
                if (snippets.length === 0) {
                    return [this.createInfoItem('No code snippets found')];
                }
                const byLanguage = new Map();
                for (const s of snippets) {
                    const lang = s.language || 'unknown';
                    if (!byLanguage.has(lang)) {
                        byLanguage.set(lang, []);
                    }
                    byLanguage.get(lang).push(s);
                }
                return Array.from(byLanguage.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([lang, items]) => new LanguageGroup(lang, items));
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                return [this.createErrorItem(message)];
            }
        }
        return [];
    }
    createPlaceholder(message, command) {
        const item = new vscode.TreeItem(message, vscode.TreeItemCollapsibleState.None);
        item.command = { command, title: 'Configure' };
        item.iconPath = new vscode.ThemeIcon('warning');
        return item;
    }
    createInfoItem(message) {
        const item = new vscode.TreeItem(message, vscode.TreeItemCollapsibleState.None);
        item.iconPath = new vscode.ThemeIcon('info');
        return item;
    }
    createErrorItem(message) {
        const item = new vscode.TreeItem(message, vscode.TreeItemCollapsibleState.None);
        item.iconPath = new vscode.ThemeIcon('error');
        return item;
    }
}
exports.SnippetsProvider = SnippetsProvider;
//# sourceMappingURL=SnippetsProvider.js.map