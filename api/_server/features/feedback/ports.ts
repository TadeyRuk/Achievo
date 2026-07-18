import type {
  GeneralFeedbackApiRequest,
  TransactionFeedbackApiRequest,
} from '@achievo/contracts';

export interface FeedbackPorts {
  claimOnce(key: string, ttlSeconds: number): Promise<boolean>;
  releaseClaim(key: string): Promise<void>;
  submitTransaction(payload: TransactionFeedbackApiRequest): Promise<void>;
  submitGeneral(payload: GeneralFeedbackApiRequest): Promise<void>;
  mapError(error: unknown): { status: number; message: string } | null;
}
