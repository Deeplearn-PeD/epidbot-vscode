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
exports.PlotsProvider = exports.PlotTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class PlotTreeItem extends vscode.TreeItem {
    plot;
    constructor(plot) {
        super(plot.filename, vscode.TreeItemCollapsibleState.None);
        this.plot = plot;
        const hasCode = plot.code_snippet && plot.code_snippet.trim().length > 0;
        this.description = plot.description || plot.source;
        this.tooltip = `${plot.filename}\nSource: ${plot.source}\nSize: ${plot.width}x${plot.height}\nCode snippet: ${hasCode ? 'Yes' : 'No'}`;
        this.contextValue = hasCode ? 'plotItem+code' : 'plotItem';
        this.iconPath = new vscode.ThemeIcon('file-media');
        this.command = {
            command: 'epidbot.openPlot',
            title: 'Open Plot Detail',
            arguments: [plot],
        };
    }
}
exports.PlotTreeItem = PlotTreeItem;
class PlotsProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    client = null;
    setClient(client) {
        this.client = client;
        this.refresh();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return [];
        }
        if (!this.client) {
            return [this.createPlaceholder('Click the gear icon to configure your API key', 'epidbot.configure')];
        }
        try {
            const plots = await this.client.listPlots();
            if (plots.length === 0) {
                return [this.createInfoItem('No plots found')];
            }
            return plots
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((p) => new PlotTreeItem(p));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            return [this.createErrorItem(message)];
        }
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
exports.PlotsProvider = PlotsProvider;
//# sourceMappingURL=PlotsProvider.js.map