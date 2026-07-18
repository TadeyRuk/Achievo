import { AnimatePresence } from 'motion/react';
import { ErrorBoundary } from '../../shared/ui';
import { ActivityForm, PipelineVisualizer } from '../../features/earn';
import { Dashboard } from '../../features/dashboard';
import { RewardHistory } from '../../features/history';
import { WalletProfile } from '../../features/wallet';
import { StudentProfile } from '../../features/profile';
import type { ShellEarn, ShellNavigation, ShellOverlays, ShellSession } from './types';

type TabContentProps = {
  navigation: ShellNavigation;
  session: ShellSession;
  earn: ShellEarn;
  overlays: Pick<
    ShellOverlays,
    'setShowRefer' | 'setShowConnectSuccess' | 'setShowDisconnectConfirm' | 'setShowInfo'
  >;
};

export function TabContent({ navigation, session, earn, overlays }: TabContentProps) {
  const { tab, setTab, statusBanner, rewardsPaused } = navigation;
  const {
    showSplash,
    showLogin,
    userName,
    userAvatar,
    handleAvatarChange,
    wallet,
    history,
    progression,
    onboarding,
  } = session;
  const { activityText, setActivityText, showForm, setShowForm, pipeline } = earn;
  const { setShowRefer, setShowConnectSuccess, setShowDisconnectConfirm, setShowInfo } = overlays;

  return (
    <>
      {statusBanner && !showSplash && !showLogin && (
        <div className="mx-5 mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900">
          {statusBanner}
        </div>
      )}
      {rewardsPaused && !showSplash && !showLogin && (
        <div className="mx-5 mb-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-900">
          Rewards temporarily paused — history and profile still work.
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        {!showSplash && !showLogin && tab === 'home' && (
          <ErrorBoundary name="earn">
            {pipeline.isRunning ||
            pipeline.txHash ||
            pipeline.pipeline.some((step) => step.status === 'error') ? (
              <div key="home-running" className="p-5 space-y-5">
                <PipelineVisualizer steps={pipeline.pipeline} logs={pipeline.logs} />

                {pipeline.txHash && !pipeline.isRunning && (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        pipeline.resetPipeline();
                        setActivityText('');
                        setShowForm(true);
                      }}
                      className="w-full flex items-center justify-center py-4 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all shadow-md shadow-[var(--dah-primary)]/15 active:scale-98 cursor-pointer"
                    >
                      Submit Another Activity
                    </button>
                    <button
                      onClick={() => {
                        pipeline.resetPipeline();
                        setActivityText('');
                        setShowForm(false);
                      }}
                      className="w-full flex items-center justify-center py-4 bg-[#f3f5fa] hover:bg-[#ebedf2] border border-[#e1e3e8]/40 text-[#00162b] rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                )}

                {!pipeline.isRunning &&
                  pipeline.pipeline.some((step) => step.status === 'error') && (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          pipeline.resetPipeline();
                          setShowForm(true);
                        }}
                        className="w-full flex items-center justify-center py-4 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all shadow-md shadow-[var(--dah-primary)]/15 active:scale-98 cursor-pointer"
                      >
                        Back to Form
                      </button>
                      <button
                        onClick={() => {
                          pipeline.resetPipeline();
                          setShowForm(false);
                        }}
                        className="w-full flex items-center justify-center py-4 bg-[#f3f5fa] hover:bg-[#ebedf2] border border-[#e1e3e8]/40 text-[#00162b] rounded-full font-extrabold text-[14px] font-display uppercase tracking-wider transition-all active:scale-98 cursor-pointer"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  )}
              </div>
            ) : showForm && wallet.walletAddress ? (
              <ActivityForm
                key="home-form"
                text={activityText}
                onChange={setActivityText}
                onSubmit={pipeline.handleSubmit}
                isWalletConnected={!!wallet.walletAddress}
                isSubmitting={pipeline.isRunning}
                onBack={() => setShowForm(false)}
              />
            ) : (
              <Dashboard
                key="home-dashboard"
                userName={userName}
                history={history}
                progression={progression}
                walletAddress={wallet.walletAddress}
                onSubmitActivityClick={() => {
                  if (rewardsPaused) return;
                  if (!wallet.walletAddress) setTab('wallet');
                  else setShowForm(true);
                }}
                onConnectWalletClick={() => setTab('wallet')}
                onInviteClick={() => setShowRefer(true)}
              />
            )}
          </ErrorBoundary>
        )}
        {!showSplash && !showLogin && tab === 'history' && (
          <ErrorBoundary name="history">
            <RewardHistory
              key="history"
              history={history}
              progression={progression}
            />
          </ErrorBoundary>
        )}
        {!showSplash && !showLogin && tab === 'wallet' && (
          <ErrorBoundary name="wallet">
            <WalletProfile
              key="wallet"
              walletAddress={wallet.walletAddress}
              walletId={wallet.walletId}
              isFunded={wallet.isFunded}
              treasuryInfo={wallet.treasuryInfo}
              isConnecting={wallet.isConnecting}
              onConnect={async (id) => {
                const ok = await wallet.connect(id);
                if (ok) setShowConnectSuccess(true);
              }}
              onDisconnect={() => setShowDisconnectConfirm(true)}
              onFund={wallet.fund}
              onRefresh={wallet.refresh}
              history={history}
            />
          </ErrorBoundary>
        )}
        {!showSplash && !showLogin && tab === 'profile' && (
          <ErrorBoundary name="profile">
            <StudentProfile
              key="profile"
              walletAddress={wallet.walletAddress}
              history={history}
              progression={progression}
              userAvatar={userAvatar}
              onAvatarChange={handleAvatarChange}
              userName={userName}
              onShowInfoClick={() => setShowInfo(true)}
              onShowTourClick={onboarding.replay}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </>
  );
}
