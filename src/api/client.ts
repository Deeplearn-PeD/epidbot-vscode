import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import {
  SearchResponse,
  Report,
  Plot,
  Session,
  UserProfile,
  AuthTokens,
} from '../types/epidbot';

export class EpidbotClient {
  private client: AxiosInstance;
  private serverUrl: string;
  private apiKey: string;
  private bearerToken: string | null = null;

  constructor(serverUrl: string, apiKey: string, bearerToken?: string | null) {
    this.serverUrl = serverUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.bearerToken = bearerToken || null;

    this.client = axios.create({
      baseURL: `${this.serverUrl}/api/v1`,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const detail = (error.response.data as { detail?: string })?.detail;
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
      }
    );
  }

  setBearerToken(token: string | null): void {
    this.bearerToken = token;
  }

  getBearerToken(): string | null {
    return this.bearerToken;
  }

  async login(username: string, password: string): Promise<AuthTokens> {
    const resp = await axios.post<AuthTokens>(
      `${this.serverUrl}/api/v1/auth/login`,
      { username, password },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    this.bearerToken = resp.data.access_token;
    return resp.data;
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const resp = await axios.post<AuthTokens>(
      `${this.serverUrl}/api/v1/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    this.bearerToken = resp.data.access_token;
    return resp.data;
  }

  private bearerConfig(): AxiosRequestConfig {
    return {
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        'X-API-Key': undefined,
      },
    };
  }

  async getProfile(): Promise<UserProfile> {
    const { data } = await this.client.get<UserProfile>('/auth/me');
    return data;
  }

  async listSessions(): Promise<Session[]> {
    const { data } = await this.client.get<Session[]>('/sessions');
    return data;
  }

  async searchSnippets(query: string, sessionId?: number | null): Promise<SearchResponse> {
    const body: Record<string, unknown> = { query };
    if (sessionId) {
      body.session_id = sessionId;
    }
    const { data } = await this.client.post<SearchResponse>('/search', body);
    console.log('[Epidbot] searchSnippets response:', JSON.stringify({
      total: data.total,
      resultsLen: data.results.length,
    }));
    return data;
  }

  async searchAll(query: string): Promise<SearchResponse> {
    const { data } = await this.client.post<SearchResponse>('/search', { query });
    return data;
  }

  async listReports(): Promise<Report[]> {
    const { data } = await this.client.get<Report[]>('/reports');
    return data;
  }

  async getReport(id: number): Promise<Report> {
    const { data } = await this.client.get<Report>(`/reports/${id}`);
    return data;
  }

  async downloadReportMarkdown(id: number): Promise<string> {
    const { data } = await this.client.get<string>(`/reports/${id}/download`, {
      responseType: 'text',
    });
    return data;
  }

  async listPlots(search?: string): Promise<Plot[]> {
    const params: Record<string, string> = {};
    if (search) {
      params.search = search;
    }
    const { data } = await this.client.get<Plot[]>('/plots/', { params });
    return data;
  }

  async getPlot(id: number): Promise<Plot> {
    const { data } = await this.client.get<Plot>(`/plots/${id}`);
    return data;
  }

  async getPlotImage(id: number): Promise<ArrayBuffer> {
    const config: AxiosRequestConfig = {
      responseType: 'arraybuffer',
    };
    if (this.bearerToken) {
      Object.assign(config, this.bearerConfig());
    }
    const { data } = await this.client.get<ArrayBuffer>(`/plots/${id}/file`, config);
    return data;
  }

  async getPlotSnippet(id: number): Promise<string> {
    const { data } = await this.client.get<string>(`/plots/${id}/snippet`, {
      responseType: 'text',
    });
    return data;
  }
}
