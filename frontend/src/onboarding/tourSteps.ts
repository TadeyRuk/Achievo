export type TourTab = "home" | "history" | "wallet" | "profile";

export type TourPlacement = "top" | "bottom" | "auto";

export interface TourStep {
  id: string;
  tab: TourTab;
  target: string;
  title: string;
  body: string;
  placement?: TourPlacement;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "submit-activity",
    tab: "home",
    target: "submit-activity",
    title: "Submit an activity",
    body: "Tell Achievo what you accomplished. Verified activities earn XLM rewards on Stellar.",
    placement: "top",
  },
  {
    id: "bottom-nav",
    tab: "home",
    target: "bottom-nav",
    title: "Navigate the app",
    body: "Use the bottom bar to switch between Home, Rewards, Wallet, and Profile.",
    placement: "top",
  },
  {
    id: "nav-feedback",
    tab: "home",
    target: "nav-feedback",
    title: "Send feedback",
    body: "Tap the top-left icon anytime to share general feedback about Achievo.",
    placement: "bottom",
  },
  {
    id: "nav-refresh",
    tab: "home",
    target: "nav-refresh",
    title: "Refresh the app",
    body: "Tap to reload. Hold the button for Refresh or Clear cache (wipes local data after confirm).",
    placement: "bottom",
  },
  {
    id: "wallet-connect",
    tab: "wallet",
    target: "wallet-connect",
    title: "Connect your wallet",
    body: "Link a Stellar wallet so rewards can be paid out to you on-chain.",
    placement: "auto",
  },
  {
    id: "rewards-history",
    tab: "history",
    target: "rewards-history",
    title: "Track your rewards",
    body: "See your personal reward history, rank, and milestones here.",
    placement: "auto",
  },
  {
    id: "profile-info",
    tab: "profile",
    target: "profile-info",
    title: "Your profile",
    body: "Manage your avatar, check progress, and learn how Achievo’s reward pipeline works.",
    placement: "auto",
  },
];
