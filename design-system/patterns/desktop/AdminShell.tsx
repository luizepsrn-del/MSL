import React from 'react';
import { Sidebar, TopBar, PromoCard, SuccessDialog, promoRocket } from '../../components';
import type { ThemeName } from '../../components';
import { AccountSetupModal } from '../AccountSetupModal';
import { Brand } from './Brand';
import { OverviewScreen } from './OverviewScreen';
import { AnalyticsScreen } from './AnalyticsScreen';
import { OrdersScreen } from './OrdersScreen';
import { AutomationsScreen } from './AutomationsScreen';
import { MessagesScreen } from './MessagesScreen';
import { PlaceholderScreen } from './PlaceholderScreen';
import { nav, titles } from '../data';

export interface AdminShellProps {
  /** controlled theme — wire it to the app's theme provider */
  theme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
  /** initial view id, default "analytics" */
  initialView?: string;
}

/**
 * The desktop application shell: 72px top bar, 224px rail, routed content area,
 * Account Set Up modal and the "Order updated!" confirmation.
 *
 * This is the layout template every desktop screen sits in — see
 * design-system/README.md → Patterns.
 */
export function AdminShell({
  theme = 'dark',
  onThemeChange,
  initialView = 'analytics',
}: AdminShellProps) {
  const [view, setView] = React.useState(initialView);
  const [setup, setSetup] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [title, subtitle] = titles[view] || ['', ''];

  const body =
    {
      overview: <OverviewScreen />,
      analytics: <AnalyticsScreen onViewPlans={() => setSetup(true)} />,
      orders: <OrdersScreen onEdit={() => setDone(true)} />,
      automations: <AutomationsScreen />,
      messages: <MessagesScreen />,
    }[view] || <PlaceholderScreen name={title} />;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--surface-app)',
      }}
    >
      <TopBar
        brand={<Brand />}
        title={title}
        subtitle={subtitle}
        theme={theme}
        onThemeChange={onThemeChange}
        credits={40}
        notifications={2}
        user={{ name: 'Ronald R.', role: 'Broker', rating: 4.8 }}
        onUserClick={() => setSetup(true)}
      />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          sections={nav}
          active={view}
          onSelect={setView}
          style={{ paddingTop: 'var(--sp-9)' }}
          footer={
            <PromoCard
              image={promoRocket}
              body="Get special offers up to 12 months"
              onAction={() => setSetup(true)}
            />
          }
        />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflowX: 'auto',
            overflowY: view === 'messages' ? 'hidden' : 'auto',
            padding: 'var(--shell-gutter)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flex: view === 'messages' ? 1 : 'none',
              minWidth: 960,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {body}
          </div>
        </main>
      </div>

      <AccountSetupModal
        open={setup}
        onClose={() => setSetup(false)}
        onContinue={() => {
          setSetup(false);
          setDone(true);
        }}
      />

      <SuccessDialog
        open={done}
        onClose={() => setDone(false)}
        title="Order updated!"
        message="Your changes have been successfully applied"
      />
    </div>
  );
}
