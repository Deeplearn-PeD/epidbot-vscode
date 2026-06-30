"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpidbotClient = void 0;
const axios_1 = __importDefault(require("axios"));
class EpidbotClient {
    client;
    serverUrl;
    apiKey;
    bearerToken = null;
    constructor(serverUrl, apiKey, bearerToken) {
        this.serverUrl = serverUrl.replace(/\/+$/, '');
        this.apiKey = apiKey;
        this.bearerToken = bearerToken || null;
        this.client = axios_1.default.create({
            baseURL: `${this.serverUrl}/api/v1`,
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
    setBearerToken(token) {
        this.bearerToken = token;
    }
    getBearerToken() {
        return this.bearerToken;
    }
    async login(username, password) {
        const resp = await axios_1.default.post(`${this.serverUrl}/api/v1/auth/login`, { username, password }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        this.bearerToken = resp.data.access_token;
        return resp.data;
    }
    async refreshAccessToken(refreshToken) {
        const resp = await axios_1.default.post(`${this.serverUrl}/api/v1/auth/refresh`, { refresh_token: refreshToken }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        this.bearerToken = resp.data.access_token;
        return resp.data;
    }
    bearerConfig() {
        return {
            headers: {
                Authorization: `Bearer ${this.bearerToken}`,
                'X-API-Key': undefined,
            },
        };
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
        console.log('[Epidbot] searchSnippets response:', JSON.stringify({
            total: data.total,
            resultsLen: data.results.length,
        }));
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
    async getPlotImage(id) {
        const config = {
            responseType: 'arraybuffer',
        };
        if (this.bearerToken) {
            Object.assign(config, this.bearerConfig());
        }
        const { data } = await this.client.get(`/plots/${id}/file`, config);
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