import type { ApiErrorResponse } from '@achievo/contracts';
import type { HttpResult } from './types';

export function json<T>(status: number, body: T): HttpResult<T> {
  return { status, body };
}

export function error(status: number, message: string): HttpResult<ApiErrorResponse> {
  return json(status, { error: message });
}

export function methodNotAllowed(): HttpResult<ApiErrorResponse> {
  return error(405, 'Method not allowed');
}
