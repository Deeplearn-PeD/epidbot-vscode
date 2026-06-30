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
exports.ReportsProvider = exports.ReportTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class ReportTreeItem extends vscode.TreeItem {
    report;
    constructor(report) {
        super(report.title, vscode.TreeItemCollapsibleState.None);
        this.report = report;
        this.description = report.report_type;
        this.tooltip = `${report.title}\nType: ${report.report_type}\nImages: ${report.image_count}\nCreated: ${new Date(report.created_at).toLocaleDateString()}`;
        this.contextValue = 'reportItem';
        this.iconPath = new vscode.ThemeIcon('book');
        this.command = {
            command: 'epidbot.openReport',
            title: 'Open Report',
            arguments: [report],
        };
    }
}
exports.ReportTreeItem = ReportTreeItem;
class ReportsProvider {
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
            const reports = await this.client.listReports();
            if (reports.length === 0) {
                return [this.createInfoItem('No reports found')];
            }
            return reports
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .map((r) => new ReportTreeItem(r));
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
exports.ReportsProvider = ReportsProvider;
//# sourceMappingURL=ReportsProvider.js.map