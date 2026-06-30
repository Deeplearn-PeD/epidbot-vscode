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
class SnippetTreeItem extends vscode.TreeItem {
    snippet;
    constructor(snippet, isChild) {
        super(snippet.title, isChild ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
        this.snippet = snippet;
        const descParts = [snippet.language];
        if (snippet.description && snippet.description.trim()) {
            const shortDesc = snippet.description.length > 80
                ? snippet.description.slice(0, 77) + '...'
                : snippet.description;
            descParts.push(shortDesc);
        }
        this.description = descParts.join(' — ');
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
class SearchPromptItem extends vscode.TreeItem {
    constructor() {
        super('Search for code snippets...', vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('search');
        this.command = {
            command: 'epidbot.searchSnippetsPrompt',
            title: 'Search Snippets',
        };
    }
}
class SnippetsProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    client = null;
    sessionId = null;
    lastQuery = null;
    lastSnippets = [];
    setClient(client) {
        this.client = client;
        this.lastQuery = null;
        this.lastSnippets = [];
        this.refresh();
    }
    setSessionId(sessionId) {
        this.sessionId = sessionId;
        if (this.lastQuery) {
            this.refresh();
        }
    }
    setSearchResults(query, snippets) {
        this.lastQuery = query;
        this.lastSnippets = snippets;
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
            if (!this.lastQuery || this.lastSnippets.length === 0) {
                return [new SearchPromptItem()];
            }
            const byLanguage = new Map();
            for (const s of this.lastSnippets) {
                const lang = s.language || 'unknown';
                if (!byLanguage.has(lang)) {
                    byLanguage.set(lang, []);
                }
                byLanguage.get(lang).push(s);
            }
            const groups = Array.from(byLanguage.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([lang, items]) => new LanguageGroup(lang, items));
            const header = new vscode.TreeItem(`Results for "${this.lastQuery}" (${this.lastSnippets.length} snippets)`, vscode.TreeItemCollapsibleState.None);
            header.iconPath = new vscode.ThemeIcon('search');
            header.contextValue = 'searchHeader';
            return [header, ...groups];
        }
        return [];
    }
    createPlaceholder(message, command) {
        const item = new vscode.TreeItem(message, vscode.TreeItemCollapsibleState.None);
        item.command = { command, title: 'Configure' };
        item.iconPath = new vscode.ThemeIcon('warning');
        return item;
    }
}
exports.SnippetsProvider = SnippetsProvider;
//# sourceMappingURL=SnippetsProvider.js.map