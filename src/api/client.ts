import {
  SearchResponse,
  Report,
  Plot,
  Session,
  UserProfile,
} from '../types/epidbot';

async function extractDetail(response: Response): Promise<string | undefined> {
  try {
    const text = await response.clone().text();
    return (JSON.parse(text) as { detail?: string }).detail;
  } catch {
    return undefined;
  }
}

async function epidbotFetch<T>(
  url: string,
  options: RequestInit & { apiKey: string; parseAs?: 'json' | 'text' | 'arraybuffer' }
): Promise<T> {
  const { apiKey, parseAs, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set('X-API-Key', apiKey);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, { ...fetchOptions, headers });
  } catch (err: unknown) {
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
    return (await response.text()) as unknown as T;
  }
  if (mode === 'arraybuffer') {
    return (await response.arrayBuffer()) as unknown as T;
  }
  return (await response.json()) as T;
}

export class EpidbotClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(serverUrl: string, apiKey: string) {
    this.baseUrl = `${serverUrl.replace(/\/+$/, '')}/api/v1`;
    this.apiKey = apiKey;
  }

  private url(path: string, params?: Record<string, string>): string {
    const u = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        u.searchParams.set(k, v);
      }
    }
    return u.toString();
  }

  async getProfile(): Promise<UserProfile> {
    return epidbotFetch<UserProfile>(this.url('/auth/me'), { apiKey: this.apiKey });
  }

  async listSessions(): Promise<Session[]> {
    return epidbotFetch<Session[]>(this.url('/sessions'), { apiKey: this.apiKey });
  }

  async searchSnippets(query: string, sessionId?: number | null): Promise<SearchResponse> {
    const body: Record<string, unknown> = { query };
    if (sessionId) {
      body.session_id = sessionId;
    }
    return epidbotFetch<SearchResponse>(this.url('/search'), {
      method: 'POST',
      body: JSON.stringify(body),
      apiKey: this.apiKey,
    });
  }

  async searchAll(query: string): Promise<SearchResponse> {
    return epidbotFetch<SearchResponse>(this.url('/search'), {
      method: 'POST',
      body: JSON.stringify({ query }),
      apiKey: this.apiKey,
    });
  }

  async listReports(): Promise<Report[]> {
    return epidbotFetch<Report[]>(this.url('/reports'), { apiKey: this.apiKey });
  }

  async getReport(id: number): Promise<Report> {
    return epidbotFetch<Report>(this.url(`/reports/${id}`), { apiKey: this.apiKey });
  }

  async downloadReportMarkdown(id: number): Promise<string> {
    return epidbotFetch<string>(this.url(`/reports/${id}/download`), {
      apiKey: this.apiKey,
      parseAs: 'text',
    });
  }

  async downloadReportLatex(id: number): Promise<string> {
    return epidbotFetch<string>(this.url(`/reports/${id}/latex`), {
      apiKey: this.apiKey,
      parseAs: 'text',
    });
  }

  async downloadReportLatexZip(id: number): Promise<ArrayBuffer> {
    return epidbotFetch<ArrayBuffer>(this.url(`/reports/${id}/latex-zip`), {
      apiKey: this.apiKey,
      parseAs: 'arraybuffer',
    });
  }

  async listPlots(search?: string): Promise<Plot[]> {
    const params: Record<string, string> = {};
    if (search) {
      params.search = search;
    }
    return epidbotFetch<Plot[]>(this.url('/plots/', params), { apiKey: this.apiKey });
  }

  async getPlot(id: number): Promise<Plot> {
    return epidbotFetch<Plot>(this.url(`/plots/${id}`), { apiKey: this.apiKey });
  }

  async getPlotSnippet(id: number): Promise<string> {
    return epidbotFetch<string>(this.url(`/plots/${id}/snippet`), {
      apiKey: this.apiKey,
      parseAs: 'text',
    });
  }
}
