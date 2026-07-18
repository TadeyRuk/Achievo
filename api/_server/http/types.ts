export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | string;

export interface HttpRequest<TBody = unknown> {
  method: HttpMethod;
  headers: Record<string, string | undefined>;
  query: Record<string, string | string[] | undefined>;
  body: TBody;
  clientIp: string;
}

export interface HttpResult<TBody = unknown> {
  status: number;
  body: TBody;
}

export type HttpRoute = (request: HttpRequest) => Promise<HttpResult>;
