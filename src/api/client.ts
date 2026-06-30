import axios, { AxiosInstance, AxiosError } from 'axios';
import * as vscode from 'vscode';
import {
  SearchResponse,
  Report,
  Plot,
  Session,
  UserProfile,
} from '../types/epidbot';

export class EpidbotClient {
  private client: AxiosInstance;

  constructor(serverUrl: string, apiKey: string) {
    this.client = axios.create({
      baseURL: `${serverUrl.replace(/\/+$/, '')}/api/v1`,
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

  async getProfile(): Promise<UserProfile> {
    const { data } = await this.client.get<UserProfile>('/auth/me');
    return data;
  }

  async listSessions(): Promise<Session[]> {
    const { data } = await this.client.get<Session[]>('/sessions');
    return data;
  }

  async searchSnippets(
    query?: string,
    sessionId?: number | null
  ): Promise<SearchResponse> {
    const body: Record<string, unknown> = {
      source_type: 'snippet',
    };
    if (query) {
      body.query = query;
    }
    if (sessionId) {
      body.session_id = sessionId;
    }
    const { data } = await this.client.post<SearchResponse>('/search', body);
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
    const { data } = await this.client.get<ArrayBuffer>(`/plots/${id}/file`, {
      responseType: 'arraybuffer',
    });
    return data;
  }

  async getPlotSnippet(id: number): Promise<string> {
    const { data } = await this.client.get<string>(`/plots/${id}/snippet`, {
      responseType: 'text',
    });
    return data;
  }
}
