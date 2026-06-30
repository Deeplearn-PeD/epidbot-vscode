export interface SnippetResult {
  source_type: 'snippet';
  session_id: number;
  session_name: string;
  title: string;
  description: string;
  language: 'python' | 'sql' | 'duckdb_sql';
  source_code: string;
  tags: string[];
  rank: number;
  created_at: string;
}

export interface SearchResult {
  source_type: 'message' | 'snippet';
  session_id: number;
  session_name: string;
  message_id?: number;
  role?: string;
  content?: string;
  title?: string;
  description?: string;
  language?: string;
  source_code?: string;
  tags?: string[];
  rank?: number;
  created_at: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export interface Report {
  id: number;
  user_id: number;
  title: string;
  report_type: string;
  prompt: string;
  content: string;
  abstract: string | null;
  image_count: number;
  content_size_bytes: number;
  has_pdf: boolean;
  created_at: string;
  updated_at: string;
  is_public: boolean;
}

export interface Plot {
  id: number;
  user_id: number;
  filename: string;
  description: string;
  source: 'generated' | 'uploaded';
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  width: number;
  height: number;
  code_snippet: string | null;
  created_at: string;
}

export interface Session {
  id: number;
  name: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  is_shared: boolean;
  permission: string;
  owner_name: string | null;
  share_count: number;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string | null;
  is_api_enabled: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export function isSnippetResult(r: SearchResult): r is SnippetResult {
  return r.source_type === 'snippet' && r.title !== undefined && r.source_code !== undefined;
}
