"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpidbotClient = void 0;
async function extractDetail(response) {
    try {
        const text = await response.clone().text();
        return JSON.parse(text).detail;
    }
    catch {
        return undefined;
    }
}
async function epidbotFetch(url, options) {
    const { apiKey, parseAs, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers);
    headers.set('X-API-Key', apiKey);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    let response;
    try {
        response = await fetch(url, { ...fetchOptions, headers });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('fetch failed')) {
            throw new Error('Cannot connect to EpidBot server. Check the server URL in settings.');
        }
        throw new Error(`Network error: ${msg}`);
    }
    if (!response.ok) {
        const detail = await extractDetail(response);
        switch (response.status) {
            case 401:
                throw new Error(detail || 'Invalid API key. Run Epidbot: Configure API Key to update it.');
            case 403:
                throw new Error(detail || 'Access denied. Your account may not have API access enabled.');
            case 429:
                throw new Error('Rate limit exceeded. Please wait before making more requests.');
            case 503:
                throw new Error('EpidBot server is unavailable. Try again later.');
            default:
                throw new Error(detail || `API error (${response.status})`);
        }
    }
    const mode = parseAs || 'json';
    if (mode === 'text') {
        return (await response.text());
    }
    if (mode === 'arraybuffer') {
        return (await response.arrayBuffer());
    }
    return (await response.json());
}
class EpidbotClient {
    baseUrl;
    apiKey;
    constructor(serverUrl, apiKey) {
        this.baseUrl = `${serverUrl.replace(/\/+$/, '')}/api/v1`;
        this.apiKey = apiKey;
    }
    url(path, params) {
        const u = new URL(`${this.baseUrl}${path}`);
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                u.searchParams.set(k, v);
            }
        }
        return u.toString();
    }
    async getProfile() {
        return epidbotFetch(this.url('/auth/me'), { apiKey: this.apiKey });
    }
    async listSessions() {
        return epidbotFetch(this.url('/sessions'), { apiKey: this.apiKey });
    }
    async searchSnippets(query, sessionId) {
        const body = { query };
        if (sessionId) {
            body.session_id = sessionId;
        }
        return epidbotFetch(this.url('/search'), {
            method: 'POST',
            body: JSON.stringify(body),
            apiKey: this.apiKey,
        });
    }
    async searchAll(query) {
        return epidbotFetch(this.url('/search'), {
            method: 'POST',
            body: JSON.stringify({ query }),
            apiKey: this.apiKey,
        });
    }
    async listReports() {
        return epidbotFetch(this.url('/reports'), { apiKey: this.apiKey });
    }
    async getReport(id) {
        return epidbotFetch(this.url(`/reports/${id}`), { apiKey: this.apiKey });
    }
    async downloadReportMarkdown(id) {
        return epidbotFetch(this.url(`/reports/${id}/download`), {
            apiKey: this.apiKey,
            parseAs: 'text',
        });
    }
    async downloadReportLatex(id) {
        return epidbotFetch(this.url(`/reports/${id}/latex`), {
            apiKey: this.apiKey,
            parseAs: 'text',
        });
    }
    async downloadReportLatexZip(id) {
        return epidbotFetch(this.url(`/reports/${id}/latex-zip`), {
            apiKey: this.apiKey,
            parseAs: 'arraybuffer',
        });
    }
    async listPlots(search) {
        const params = {};
        if (search) {
            params.search = search;
        }
        return epidbotFetch(this.url('/plots/', params), { apiKey: this.apiKey });
    }
    async getPlot(id) {
        return epidbotFetch(this.url(`/plots/${id}`), { apiKey: this.apiKey });
    }
    async getPlotSnippet(id) {
        return epidbotFetch(this.url(`/plots/${id}/snippet`), {
            apiKey: this.apiKey,
            parseAs: 'text',
        });
    }
}
exports.EpidbotClient = EpidbotClient;
//# sourceMappingURL=client.js.map