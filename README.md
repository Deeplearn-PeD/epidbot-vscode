# Epidbot for VS Code

[![GitHub Release](https://img.shields.io/github/v/release/Deeplearn-PeD/epidbot-vscode?label=release&color=blue)](https://github.com/Deeplearn-PeD/epidbot-vscode/releases)
[![VS Code](https://img.shields.io/badge/VS%20Code-%3E%3D1.90.0-blue?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![GitHub Downloads](https://img.shields.io/github/downloads/Deeplearn-PeD/epidbot-vscode/total?label=downloads)](https://github.com/Deeplearn-PeD/epidbot-vscode/releases)

Browse and download your EpidBot code snippets, reports, and plots directly from VS Code.

## Features

- **Sidebar browser** — Three tree views for Code Snippets, Reports, and Plots
- **API key authentication** — Securely stored in VS Code's SecretStorage
- **Session filtering** — Filter snippets by EpidBot session
- **Preview** — Open snippets with syntax highlighting, reports as Markdown, and plots in a rich webview
- **Download** — One-click download for code (`.py`/`.sql`), reports (`.md`), and plots (`.png` + code `.py`)
- **Search** — QuickPick search across all snippets and chat messages
- **Status bar indicator** — Shows connection state at a glance

## Requirements

- VS Code 1.90.0 or later
- An [EpidBot](https://github.com/Deeplearn-PeD/EpiDBot) instance running (local or remote)
- An EpidBot API key (`ek_...`)

## Installation

### From GitHub Releases

Download the latest `.vsix` from the [Releases page](https://github.com/Deeplearn-PeD/epidbot-vscode/releases), then:

```bash
code --install-extension epidbot-vscode-*.vsix
```

Or in VS Code: `Ctrl+Shift+P` → **Extensions: Install from VSIX...** → select the downloaded file.

### From Source

```bash
git clone https://github.com/Deeplearn-PeD/epidbot-vscode.git
cd epidbot-vscode
npm install
# Press F5 to launch the Extension Development Host
```

## Configuration

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **Epidbot: Configure API Key**
3. Enter your EpidBot server URL (default: `http://localhost:8123`)
4. Enter your API key (starts with `ek_`)

The API key is stored securely in VS Code's SecretStorage. The server URL is saved in your VS Code settings.

You can also set the server URL in `settings.json`:

```json
{
  "epidbot.serverUrl": "http://localhost:8123"
}
```

## Usage

### Sidebar

Click the Epidbot icon in the Activity Bar to open the sidebar:

- **Code Snippets** — Grouped by language (Python, SQL, DuckDB SQL). Click a snippet to open it in the editor with syntax highlighting.
- **Reports** — Sorted by last update. Click to open as Markdown with preview.
- **Plots** — Sorted by newest first. Click to open a detail panel showing the image and its generating code. Items with a code snippet are marked with a `+code` badge.

Each view has toolbar buttons:
- **Filter by Session** — Filter content by a specific EpidBot session
- **Refresh** — Reload all data from the API

### Inline Actions

Every tree item has inline download buttons:
- Snippets → download as `.py` or `.sql`
- Reports → download as `.md`
- Plots → download image as `.png`, and code as `.py` (when available)

Right-click any item for the full context menu.

### Commands

| Command | Description |
|---|---|
| `Epidbot: Configure API Key` | Set or update your API key and server URL |
| `Epidbot: Search Content` | Search across all snippets and chat messages |
| `Epidbot: Refresh All` | Refresh all tree views |
| `Epidbot: Filter by Session` | Select a session to filter snippets |

### Keyboard Shortcuts

Add custom keybindings in `keybindings.json`:

```json
{
  "key": "ctrl+shift+e",
  "command": "epidbot.search"
}
```

## Architecture

```
src/
├── extension.ts              # Entry point — wires providers, commands, status bar
├── api/
│   └── client.ts             # Axios HTTP client with X-API-Key auth + error handling
├── providers/
│   ├── SnippetsProvider.ts    # TreeDataProvider — snippets grouped by language
│   ├── ReportsProvider.ts     # TreeDataProvider — reports list
│   └── PlotsProvider.ts       # TreeDataProvider — plots list
├── commands/
│   ├── configure.ts          # API key / server URL configuration
│   ├── download.ts           # Download snippet/report/plot to disk
│   ├── search.ts             # QuickPick unified search
│   └── sessionFilter.ts      # Session filter state + command
├── views/
│   └── DetailPanel.ts        # Webview for plot image + code snippet
└── types/
    └── epidbot.ts            # TypeScript interfaces for API responses
```

## API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `POST /search` | Search snippets and messages |
| `GET /reports` | List reports |
| `GET /reports/{id}` | Get report content |
| `GET /reports/{id}/download` | Download report as Markdown |
| `GET /plots/` | List plots |
| `GET /plots/{id}` | Get plot metadata |
| `GET /plots/{id}/file` | Download plot image |
| `GET /plots/{id}/snippet` | Download plot code snippet |
| `GET /sessions` | List sessions (for filtering) |
| `GET /auth/me` | Validate API key |

## License

MIT — Copyright (c) 2026 DeepLearn Pesquisa e Desenvolvimento
