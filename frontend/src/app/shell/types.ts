import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { RewardHistoryItem } from '@achievo/shared';
import type { WalletSessionViewModel } from '../../features/wallet';
import type { OnboardingViewModel } from '../../features/onboarding';
import type { ProgressionViewModel } from '../../shared/lib';
import type { RewardPipelineViewModel } from '../model/useRewardPipeline';

export type Tab = 'home' | 'history' | 'wallet' | 'profile';

export type ShellNavigation = {
  tab: Tab;
  setTab: Dispatch<SetStateAction<Tab>>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  phoneFrameRef: RefObject<HTMLDivElement | null>;
  contentFrameMotion: { scale: number; borderRadius: number };
  reduceMotion: boolean | null;
  shellReady: boolean;
  statusBanner: string | null;
  rewardsPaused: boolean;
};

export type ShellSession = {
  showSplash: boolean;
  setShowSplash: Dispatch<SetStateAction<boolean>>;
  showLogin: boolean;
  setShowLogin: Dispatch<SetStateAction<boolean>>;
  userName: string;
  setUserNameState: Dispatch<SetStateAction<string>>;
  userAvatar: string;
  handleAvatarChange: (avatar: string) => void;
  wallet: WalletSessionViewModel;
  history: RewardHistoryItem[];
  progression: ProgressionViewModel;
  onboarding: OnboardingViewModel;
};

export type ShellEarn = {
  activityText: string;
  setActivityText: Dispatch<SetStateAction<string>>;
  showForm: boolean;
  setShowForm: Dispatch<SetStateAction<boolean>>;
  pipeline: RewardPipelineViewModel;
};

export type ShellOverlays = {
  showRefer: boolean;
  setShowRefer: Dispatch<SetStateAction<boolean>>;
  showConnectSuccess: boolean;
  setShowConnectSuccess: Dispatch<SetStateAction<boolean>>;
  showDisconnectConfirm: boolean;
  setShowDisconnectConfirm: Dispatch<SetStateAction<boolean>>;
  showDisconnectSuccess: boolean;
  setShowDisconnectSuccess: Dispatch<SetStateAction<boolean>>;
  showInfo: boolean;
  setShowInfo: Dispatch<SetStateAction<boolean>>;
  showFeedback: boolean;
  setShowFeedback: Dispatch<SetStateAction<boolean>>;
};

export type AppShellProps = {
  navigation: ShellNavigation;
  session: ShellSession;
  earn: ShellEarn;
  overlays: ShellOverlays;
};
