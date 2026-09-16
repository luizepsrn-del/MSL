import React from 'react';
import { Sidebar, PromoCard, SuccessDialog, PageHeader, promoRocket } from '../../components';
import type { ThemeName } from '../../components';
import { AccountSetupModal } from '../AccountSetupModal';
import { StatusBar, MobileHeader, MobileUtilityRow, MobileDrawer } from './MobileChrome';
import {
  MobileDashboard,
  MobileOrders,
  MobileAutomations,
  MobileCarriers,
  MobileMessages,
  MobilePlaceholder,
} from './MobileScreens';
import { nav, titles } from '../data';

export interface MobileShellProps {
  theme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
  initialView?: string;
}

/**
 * The mobile application shell at 390pt: status bar, header, utility row,
 * drawer navigation and the routed scroll area.
 *
 * Desktop parity is the rule — nothing is removed, only re-laid-out. See
 * DESIGN.md → Layout and design-system/README.md → Patterns.
 */
export function MobileShell({
  theme = 'dark',
  onThemeChange,
  initialView = 'analytics',
}: MobileShellProps) {
  const [view, setView] = React.useState(initialView);
  const [drawer, setDrawer] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [setup, setSetup] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [title, subtitle] = titles[view] || ['', ''];

  const go = (id: string) => {
    setView(id);
    setDrawer(false);
  };

  const body =
    {
      overview: <MobileDashboard onViewPlans={() => setSetup(true)} />,
      analytics: <MobileDashboard onViewPlans={() => setSetup(true)} />,
      orders: <MobileOrders onEdit={() => setDone(true)} />,
      automations: <MobileAutomations />,
      carriers: <MobileCarriers />,
      messages: <MobileMessages />,
    }[view] || <MobilePlaceholder name={title} />;

  return (
    <>
      <StatusBar />
      <MobileHeader onMenu={() => setDrawer(true)} onProfile={() => setSetup(true)} />
      <MobileUtilityRow
        query={query}
        onQuery={setQuery}
        theme={theme}
        onTheme={onThemeChange}
      />
      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0 var(--sp-8) var(--sp-12)',
        }}
      >
        <PageHeader title={title} subtitle={subtitle} style={{ marginBottom: 'var(--sp-9)' }} />
        {body}
      </main>
      <MobileDrawer open={drawer} onClose={() => setDrawer(false)}>
        <Sidebar
          sections={nav}
          active={view}
          onSelect={go}
          search={false}
          width="100%"
          style={{ borderRight: 0, paddingTop: 'var(--sp-14)' }}
          footer={
            <PromoCard
              image={promoRocket}
              body="Get special offers up to 12 months"
              onAction={() => {
                setDrawer(false);
                setSetup(true);
              }}
            />
          }
        />
      </MobileDrawer>

      <AccountSetupModal
        open={setup}
        onClose={() => setSetup(false)}
        onContinue={() => {
          setSetup(false);
          setDone(true);
        }}
        width={330}
        gap="var(--sp-6)"
      />

      <SuccessDialog
        open={done}
        onClose={() => setDone(false)}
        title="Order updated!"
        message="Your changes have been successfully applied"
      />
    </>
  );
}

export interface PhoneFrameProps {
  children?: React.ReactNode;
}

/** The 390×700 device frame the mobile kit is presented in. */
export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: 390,
        height: 700,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--surface-app)',
        border: '8px solid var(--ink-800)',
        borderRadius: 44,
        boxShadow: 'var(--shadow-modal)',
        transform: 'translateZ(0)',
        flex: '0 0 auto',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 104,
          height: 26,
          borderRadius: 'var(--r-pill)',
          background: '#000',
          zIndex: 70,
        }}
      />
      {children}
    </div>
  );
}
