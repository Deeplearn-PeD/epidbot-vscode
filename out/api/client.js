"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpidbotClient = void 0;
const axios_1 = __importDefault(require("axios"));
class EpidbotClient {
    client;
    constructor(serverUrl, apiKey) {
        this.client = axios_1.default.create({
            baseURL: `${serverUrl.replace(/\/+$/, '')}/api/v1`,
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.response) {
                const status = error.response.status;
                const detail = error.response.data?.detail;
                switch (status) {
                    case 401:
                        throw new Error(detail || 'Invalid API key. Run Epidbot: Configure API Key to update it.');
                    case 403:
                        throw new Error(detail || 'Access denied. Your account may not have API access enabled.');
                    case 429:
                        throw new Error('Rate limit exceeded. Please wait before making more requests.');
                    case 503:
                        throw new Error('EpidBot server is unavailable. Try again later.');
                    default:
                        throw new Error(detail || `API error (${status}): ${error.message}`);
                }
            }
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                throw new Error(`Cannot connect to EpidBot server. Check the server URL in settings.`);
            }
            throw new Error(`Network error: ${error.message}`);
        });
    }
    async getProfile() {
        const { data } = await this.client.get('/auth/me');
        return data;
    }
    async listSessions() {
        const { data } = await this.client.get('/sessions');
        return data;
    }
    async searchSnippets(query, sessionId) {
        const body = { query };
        if (sessionId) {
            body.session_id = sessionId;
        }
        const { data } = await this.client.post('/search', body);
        return data;
    }
    async searchAll(query) {
        const { data } = await this.client.post('/search', { query });
        return data;
    }
    async listReports() {
        const { data } = await this.client.get('/reports');
        return data;
    }
    async getReport(id) {
        const { data } = await this.client.get(`/reports/${id}`);
        return data;
    }
    async downloadReportMarkdown(id) {
        const { data } = await this.client.get(`/reports/${id}/download`, {
            responseType: 'text',
        });
        return data;
    }
    async downloadReportLatex(id) {
        const { data } = await this.client.get(`/reports/${id}/latex`, {
            responseType: 'arraybuffer',
        });
        return data;
    }
    async downloadReportLatexZip(id) {
        const { data } = await this.client.get(`/reports/${id}/latex-zip`, {
            responseType: 'arraybuffer',
        });
        return data;
    }
    async listPlots(search) {
        const params = {};
        if (search) {
            params.search = search;
        }
        const { data } = await this.client.get('/plots/', { params });
        return data;
    }
    async getPlot(id) {
        const { data } = await this.client.get(`/plots/${id}`);
        return data;
    }
    async getPlotSnippet(id) {
        const { data } = await this.client.get(`/plots/${id}/snippet`, {
            responseType: 'text',
        });
        return data;
    }
}
exports.EpidbotClient = EpidbotClient;
//# sourceMappingURL=client.js.map