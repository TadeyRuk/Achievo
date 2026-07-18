import type {
  ApiErrorResponse,
  FeedbackApiSuccess,
  GeneralFeedbackApiRequest,
  HealthApiError,
  HealthApiSuccess,
  IdentityApiGetRequest,
  IdentityApiPublicSuccess,
  IdentityApiUpdateRequest,
  IdentityApiUpdateSuccess,
  NonceApiRequest,
  NonceApiSuccess,
  PayoutsApiSuccess,
  RewardApiRequest,
  RewardApiResponse,
  TransactionFeedbackApiInfoSuccess,
  TransactionFeedbackApiRequest,
} from '@achievo/contracts';

export type AchievoFetch = typeof globalThis.fetch;

export interface CreateAchievoClientOptions {
  baseUrl?: string;
  fetch?: AchievoFetch;
}

export type SignChallenge = (challengeXdr: string) => Promise<string>;

export interface SubmitActivityRequest {
  wallet: string;
  activityText: string;
  signChallenge: SignChallenge;
}

export interface AchievoClient {
  getHealth(): Promise<HealthApiSuccess>;
  getNonce(request: NonceApiRequest): Promise<NonceApiSuccess>;
  submitReward(request: RewardApiRequest): Promise<RewardApiResponse>;
  submitActivity(request: SubmitActivityRequest): Promise<RewardApiResponse>;
  getIdentity(request: IdentityApiGetRequest): Promise<IdentityApiPublicSuccess>;
  updateIdentity(request: IdentityApiUpdateRequest): Promise<IdentityApiUpdateSuccess>;
  getPayouts(): Promise<PayoutsApiSuccess>;
  getTransactionFeedbackInfo(): Promise<TransactionFeedbackApiInfoSuccess>;
  submitTransactionFeedback(request: TransactionFeedbackApiRequest): Promise<FeedbackApiSuccess>;
  submitGeneralFeedback(request: GeneralFeedbackApiRequest): Promise<FeedbackApiSuccess>;
}

export type AchievoApiErrorBody = ApiErrorResponse | HealthApiError;

export class ApiError<TBody = AchievoApiErrorBody> extends Error {
  readonly status: number;
  readonly body: TBody | undefined;

  constructor(message: string, status: number, body?: TBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function normalizeBaseUrl(baseUrl?: string): string {
  return baseUrl?.trim().replace(/\/+$/, '') ?? '';
}

function errorMessage(body: unknown, fallback: string): string {
  if (
    typeof body === 'object'
    && body !== null
    && 'error' in body
    && typeof body.error === 'string'
  ) {
    return body.error;
  }
  return fallback;
}

async function hashActivityIntent(activityText: string): Promise<string> {
  const bytes = new TextEncoder().encode(activityText);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createAchievoClient(options: CreateAchievoClientOptions = {}): AchievoClient {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error('A Fetch API implementation is required.');
  }

  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const url = (path: string) => `${baseUrl}${path}`;

  async function request<TSuccess, TError = ApiErrorResponse>(
    path: string,
    label: string,
    init: RequestInit,
  ): Promise<TSuccess> {
    const response = await fetchImpl(url(path), init);
    const raw = await response.text();
    let body: unknown;

    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      throw new ApiError(`${label} API error ${response.status}: server returned non-JSON`, response.status);
    }

    if (!response.ok) {
      throw new ApiError<TError>(
        errorMessage(body, `${label} API error ${response.status}`),
        response.status,
        body as TError,
      );
    }

    return body as TSuccess;
  }

  const getNonce = (nonceRequest: NonceApiRequest) => {
    const query = new URLSearchParams({
      wallet: nonceRequest.wallet,
      intentHash: nonceRequest.intentHash,
    });
    return request<NonceApiSuccess>(`/api/nonce?${query.toString()}`, 'Nonce', { method: 'GET' });
  };

  const submitReward = (rewardRequest: RewardApiRequest) =>
    request<RewardApiResponse>('/api/reward', 'Reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rewardRequest),
    });

  return {
    getHealth: () =>
      request<HealthApiSuccess, HealthApiError>('/api/health', 'Health', { method: 'GET' }),
    getNonce,
    submitReward,
    async submitActivity({ wallet, activityText, signChallenge }) {
      const trimmedActivity = activityText.trim();
      const intentHash = await hashActivityIntent(trimmedActivity);
      const nonce = await getNonce({ wallet, intentHash });
      const signedXdr = await signChallenge(nonce.challengeXdr);

      return submitReward({
        activityText: trimmedActivity,
        wallet,
        nonce: nonce.nonce,
        expiry: nonce.expiry,
        mac: nonce.mac,
        signedXdr,
        intentHash,
      });
    },
    getIdentity: ({ wallet }) => {
      const query = new URLSearchParams({ wallet });
      return request<IdentityApiPublicSuccess>(
        `/api/identity?${query.toString()}`,
        'Identity',
        { method: 'GET' },
      );
    },
    updateIdentity: (identityRequest) =>
      request<IdentityApiUpdateSuccess>('/api/identity', 'Identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identityRequest),
      }),
    getPayouts: () => request<PayoutsApiSuccess>('/api/payouts', 'Payouts', { method: 'GET' }),
    getTransactionFeedbackInfo: () =>
      request<TransactionFeedbackApiInfoSuccess>('/api/feedback', 'Feedback', { method: 'GET' }),
    submitTransactionFeedback: (feedbackRequest) =>
      request<FeedbackApiSuccess>('/api/feedback', 'Feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackRequest),
      }),
    submitGeneralFeedback: (feedbackRequest) =>
      request<FeedbackApiSuccess>('/api/feedback-general', 'Feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackRequest),
      }),
  };
}

export type {
  ApiErrorResponse,
  FeedbackApiSuccess,
  GeneralFeedbackApiRequest,
  HealthApiError,
  HealthApiSuccess,
  IdentityApiGetRequest,
  IdentityApiPublicSuccess,
  IdentityApiUpdateRequest,
  IdentityApiUpdateSuccess,
  NonceApiRequest,
  NonceApiSuccess,
  PayoutsApiSuccess,
  PublicPayoutEntry,
  RewardApiRequest,
  RewardApiResponse,
  TransactionFeedbackApiInfoSuccess,
  TransactionFeedbackApiRequest,
} from '@achievo/contracts';
