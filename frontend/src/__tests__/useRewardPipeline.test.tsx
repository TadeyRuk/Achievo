import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRewardPipeline } from '../app/model/useRewardPipeline';

const mocks = vi.hoisted(() => ({
  signChallengeXdr: vi.fn(),
  submitActivity: vi.fn(),
  trackActivitySubmitted: vi.fn(),
  trackRewardPaid: vi.fn(),
}));

vi.mock('../features/wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/wallet')>();
  return {
    ...actual,
    signChallengeXdr: mocks.signChallengeXdr,
  };
});

vi.mock('../shared/api', () => ({
  achievoClient: {
    submitActivity: mocks.submitActivity,
  },
}));

vi.mock('../shared/analytics', () => ({
  trackActivitySubmitted: mocks.trackActivitySubmitted,
  trackRewardPaid: mocks.trackRewardPaid,
}));

describe('useRewardPipeline SDK errors', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.signChallengeXdr.mockResolvedValue('signed-challenge');
    mocks.submitActivity.mockImplementation(async ({ signChallenge }) => {
      await signChallenge('challenge-xdr');
      throw new Error('Reward service unavailable');
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('keeps SDK failures in the existing Kouri error state and log', async () => {
    const setActivityText = vi.fn();
    const onPayout = vi.fn();
    const fetchBalance = vi.fn();
    const loadTreasury = vi.fn();
    const { result } = renderHook(() =>
      useRewardPipeline({
        walletAddress: 'GABC',
        walletId: 'freighter',
        activityText: 'Tutored a classmate',
        setActivityText,
        onPayout,
        fetchBalance,
        loadTreasury,
      }),
    );

    let submission!: Promise<void>;
    act(() => {
      submission = result.current.handleSubmit();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      await submission;
    });

    expect(mocks.submitActivity).toHaveBeenCalledWith({
      wallet: 'GABC',
      activityText: 'Tutored a classmate',
      signChallenge: expect.any(Function),
    });
    expect(mocks.signChallengeXdr).toHaveBeenCalledWith('freighter', 'challenge-xdr');
    expect(result.current.pipelineError).toBe('Reward service unavailable');
    expect(result.current.pipeline[3]).toMatchObject({
      status: 'error',
      detail: 'Reward service unavailable',
    });
    expect(result.current.logs.at(-1)).toBe('❌ [Kouri Agent] Reward service unavailable');
    expect(onPayout).not.toHaveBeenCalled();
    expect(fetchBalance).not.toHaveBeenCalled();
    expect(loadTreasury).not.toHaveBeenCalled();
    expect(setActivityText).not.toHaveBeenCalled();
  });

  it('retains the existing completed flow for pending responses with a transaction hash', async () => {
    mocks.submitActivity.mockResolvedValue({
      pending: true,
      txHash: 'pending-hash',
      reward: 4,
      activity: 'tutoring',
      error: 'Confirmation pending',
      scoringMode: 'heuristic',
    });
    const onPayout = vi.fn();
    const fetchBalance = vi.fn();
    const loadTreasury = vi.fn();
    const setActivityText = vi.fn();
    const { result } = renderHook(() =>
      useRewardPipeline({
        walletAddress: 'GABC',
        walletId: 'freighter',
        activityText: 'Tutored a classmate',
        setActivityText,
        onPayout,
        fetchBalance,
        loadTreasury,
      }),
    );

    let submission!: Promise<void>;
    act(() => {
      submission = result.current.handleSubmit();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
      await submission;
    });

    expect(result.current.pipelineError).toBeNull();
    expect(result.current.txHash).toBe('pending-hash');
    expect(onPayout).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pending-hash',
        txHash: 'pending-hash',
        reward: 4,
        activity: 'tutoring',
      }),
    );
    expect(mocks.trackRewardPaid).toHaveBeenCalledWith({
      amount: 4,
      activity: 'tutoring',
      txHash: 'pending-hash',
    });
    expect(fetchBalance).toHaveBeenCalledWith('GABC');
    expect(loadTreasury).toHaveBeenCalledOnce();
    expect(setActivityText).toHaveBeenCalledWith('');
  });
});
