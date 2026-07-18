import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';
import { Navbar, BottomNav } from '../../shared/ui';
import { iosSpring, reducedMotionTransition } from '../../shared/lib';
import { SplashScreen } from '../SplashScreen';
import { Login } from '../Login';
import type { ShellNavigation, ShellOverlays, ShellSession } from './types';

type ShellFrameProps = {
  navigation: ShellNavigation;
  session: ShellSession;
  overlays: Pick<ShellOverlays, 'setShowFeedback' | 'setShowRefer'>;
  children: ReactNode;
  overlaysSlot: ReactNode;
};

export function ShellFrame({
  navigation,
  session,
  overlays,
  children,
  overlaysSlot,
}: ShellFrameProps) {
  const {
    tab,
    setTab,
    scrollContainerRef,
    phoneFrameRef,
    contentFrameMotion,
    reduceMotion,
  } = navigation;
  const {
    showSplash,
    setShowSplash,
    showLogin,
    setShowLogin,
    setUserNameState,
    handleAvatarChange,
    wallet,
  } = session;
  const { setShowFeedback, setShowRefer } = overlays;

  return (
    <div className="min-h-[100dvh] bg-[var(--dah-surface-highest)] flex items-center justify-center">
      <div
        ref={phoneFrameRef}
        data-phone-frame
        className="relative w-full max-w-[420px] bg-[var(--dah-bg)] sm:rounded-[3rem] sm:border-[4px] sm:border-[var(--dah-primary-container)] sm:h-[880px] h-[100dvh] flex flex-col overflow-hidden sm:shadow-2xl sm:shadow-[#000666]/35"
      >
        <AnimatePresence>
          {showSplash && (
            <SplashScreen
              progress={wallet.bootstrapProgress}
              onDone={() => setShowSplash(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!showSplash && showLogin && (
            <Login
              onComplete={(name, avatar) => {
                setUserNameState(name);
                handleAvatarChange(avatar);
                setShowLogin(false);
              }}
            />
          )}
        </AnimatePresence>

        <motion.div
          className="relative flex flex-col flex-1 min-h-0 overflow-hidden origin-center"
          animate={contentFrameMotion}
          transition={reduceMotion ? reducedMotionTransition : iosSpring}
        >
          <AnimatePresence>
            {!showSplash && !showLogin && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 110, damping: 19 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60 }}
              >
                <Navbar onFeedbackClick={() => setShowFeedback(true)} />
              </motion.div>
            )}
          </AnimatePresence>

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto pt-[84px] pb-28 custom-scrollbar"
          >
            {children}
          </div>

          <AnimatePresence>
            {!showSplash && !showLogin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 110, damping: 19 }}
                className="absolute bottom-0 left-0 right-0 z-50"
              >
                <BottomNav
                  activeTab={tab}
                  onTabChange={(t) => {
                    setShowRefer(false);
                    setTab(t);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {overlaysSlot}
      </div>
      <Analytics />
    </div>
  );
}
