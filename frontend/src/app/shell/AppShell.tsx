import { ShellFrame } from './frame';
import { TabContent } from './tabContent';
import { ShellOverlaysLayer } from './overlays';
import type { AppShellProps } from './types';

export type { AppShellProps, Tab } from './types';

export function AppShell({ navigation, session, earn, overlays }: AppShellProps) {
  return (
    <ShellFrame
      navigation={navigation}
      session={session}
      overlays={overlays}
      overlaysSlot={
        <ShellOverlaysLayer
          navigation={navigation}
          session={session}
          earn={earn}
          overlays={overlays}
        />
      }
    >
      <TabContent
        navigation={navigation}
        session={session}
        earn={earn}
        overlays={overlays}
      />
    </ShellFrame>
  );
}
