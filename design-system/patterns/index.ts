/**
 * Composition patterns and templates.
 *
 * These are not primitives — they are the assembled screens and shells from
 * the source UI kits, showing how the primitives compose into a real product.
 * Use them as the starting point for a new screen rather than laying one out
 * from scratch.
 */

/* ── Shared ───────────────────────────────────── */
export { AccountSetupModal } from './AccountSetupModal';
export type { AccountSetupModalProps } from './AccountSetupModal';

/* ── Desktop kit ──────────────────────────────── */
export { AdminShell } from './desktop/AdminShell';
export type { AdminShellProps } from './desktop/AdminShell';
export { Brand } from './desktop/Brand';
export type { BrandProps } from './desktop/Brand';
export { OverviewScreen } from './desktop/OverviewScreen';
export { AnalyticsScreen } from './desktop/AnalyticsScreen';
export type { AnalyticsScreenProps } from './desktop/AnalyticsScreen';
export { OrdersScreen } from './desktop/OrdersScreen';
export type { OrdersScreenProps } from './desktop/OrdersScreen';
export { AutomationsScreen } from './desktop/AutomationsScreen';
export { MessagesScreen } from './desktop/MessagesScreen';
export { PlaceholderScreen } from './desktop/PlaceholderScreen';
export type { PlaceholderScreenProps } from './desktop/PlaceholderScreen';

/* ── Mobile kit ───────────────────────────────── */
export { MobileShell, PhoneFrame } from './mobile/MobileShell';
export type { MobileShellProps, PhoneFrameProps } from './mobile/MobileShell';
export {
  StatusBar,
  MobileHeader,
  MobileUtilityRow,
  MobileDrawer,
} from './mobile/MobileChrome';
export type {
  MobileHeaderProps,
  MobileUtilityRowProps,
  MobileDrawerProps,
} from './mobile/MobileChrome';
export {
  KpiRail,
  MobileDashboard,
  MobileOrders,
  MobileAutomations,
  MobileCarriers,
  MobileMessages,
  MobilePlaceholder,
} from './mobile/MobileScreens';

/* ── Sample data the patterns render ──────────── */
export * as sampleData from './data';
