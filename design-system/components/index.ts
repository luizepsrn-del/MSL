/**
 * Component layer of the design system.
 *
 * This barrel is the ONLY supported import surface. Application code imports
 * from `design-system`, never from `design-system/components/...` directly —
 * the adherence rules in adherence.rules.json enforce that.
 *
 *   import { Button, StatCard, Badge } from '../../design-system';
 *
 * The stylesheet is imported once, at the app root:
 *
 *   import 'design-system/styles.css';
 *
 * See DESIGN.md for the visual contract and design-system/README.md for the map.
 */

/* ── Core ─────────────────────────────────────── */
export { Icon } from './core/Icon';
export type { IconProps } from './core/Icon';
export { Button } from './core/Button';
export type { ButtonProps } from './core/Button';
export { IconButton } from './core/IconButton';
export type { IconButtonProps } from './core/IconButton';
export { Card } from './core/Card';
export type { CardProps } from './core/Card';
export { Badge } from './core/Badge';
export type { BadgeProps, BadgeTone } from './core/Badge';
export { Tag } from './core/Tag';
export type { TagProps, TagTone } from './core/Tag';
export { Avatar } from './core/Avatar';
export type { AvatarProps, AvatarStatus } from './core/Avatar';
export { ProgressBar } from './core/ProgressBar';
export type { ProgressBarProps, ProgressTone } from './core/ProgressBar';

/* ── Forms ────────────────────────────────────── */
export { SearchInput } from './forms/SearchInput';
export type { SearchInputProps } from './forms/SearchInput';
export { Checkbox } from './forms/Checkbox';
export type { CheckboxProps } from './forms/Checkbox';
export { Switch } from './forms/Switch';
export type { SwitchProps } from './forms/Switch';
export { Radio } from './forms/Radio';
export type { RadioProps, RadioOption } from './forms/Radio';
export { Select } from './forms/Select';
export type { SelectProps, SelectOption } from './forms/Select';

/* ── Navigation ───────────────────────────────── */
export { Sidebar } from './navigation/Sidebar';
export type {
  SidebarProps,
  SidebarSection,
  SidebarItem,
} from './navigation/Sidebar';
export { TopBar } from './navigation/TopBar';
export type { TopBarProps, TopBarUser, ThemeName } from './navigation/TopBar';
export { PageHeader } from './navigation/PageHeader';
export type { PageHeaderProps } from './navigation/PageHeader';
export { Pagination } from './navigation/Pagination';
export type { PaginationProps } from './navigation/Pagination';

/* ── Data ─────────────────────────────────────── */
export { StatCard } from './data/StatCard';
export type { StatCardProps, DeltaTone } from './data/StatCard';
export { DataTable } from './data/DataTable';
export type { DataTableProps, DataTableColumn } from './data/DataTable';
export { SelectionToolbar } from './data/SelectionToolbar';
export type { SelectionToolbarProps } from './data/SelectionToolbar';
export { DonutChart } from './data/DonutChart';
export type { DonutChartProps, DonutSegment } from './data/DonutChart';
export { LineChart } from './data/LineChart';
export type { LineChartProps, LineSeries } from './data/LineChart';
export { BarChart } from './data/BarChart';
export type { BarChartProps } from './data/BarChart';
export { MetricBarList } from './data/MetricBarList';
export type { MetricBarListProps, MetricBarItem } from './data/MetricBarList';
export { CarrierRow } from './data/CarrierRow';
export type { CarrierRowProps } from './data/CarrierRow';

/* ── Messaging ────────────────────────────────── */
export { ChatListItem } from './messaging/ChatListItem';
export type { ChatListItemProps } from './messaging/ChatListItem';
export { MessageBubble } from './messaging/MessageBubble';
export type {
  MessageBubbleProps,
  MessageQuote,
  MessageAttachment,
} from './messaging/MessageBubble';
export { MessageComposer } from './messaging/MessageComposer';
export type { MessageComposerProps } from './messaging/MessageComposer';

/* ── Feedback ─────────────────────────────────── */
export { Modal } from './feedback/Modal';
export type { ModalProps } from './feedback/Modal';
export { SuccessDialog } from './feedback/SuccessDialog';
export type { SuccessDialogProps } from './feedback/SuccessDialog';
export { OptionCard } from './feedback/OptionCard';
export type { OptionCardProps } from './feedback/OptionCard';
export { StepProgress } from './feedback/StepProgress';
export type { StepProgressProps } from './feedback/StepProgress';
export { PromoCard } from './feedback/PromoCard';
export type { PromoCardProps } from './feedback/PromoCard';
export { PromoBanner } from './feedback/PromoBanner';
export type { PromoBannerProps } from './feedback/PromoBanner';

/* ── Assets ───────────────────────────────────── */
export { promoRocket, promoLogisticsCollage } from '../assets';
