/**
 * Sample data for the composition patterns.
 *
 * Ported verbatim from the source UI kits (`ui_kits/admin_desktop/data.js`),
 * including the source's own typos in user-facing copy — "Meet your oun
 * numbers", "Database of wires tenders", "Thank youl". DESIGN.md → Content
 * Fundamentals explains why those are kept: the kits are an honest recreation
 * of the source screens. Write NEW copy correctly.
 *
 * This is demo data, not application state. Real screens fetch their own.
 */
import type { BadgeTone, SidebarSection, MetricBarItem } from '../components';

export interface OrderRow extends Record<string, unknown> {
  id: string;
  from: string;
  to: string;
  cargo: string;
  weight: string;
  price: string;
  date: string;
  status: string;
  tone: BadgeTone;
}

export interface CarrierEntry {
  rank: number;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  vehicles: number;
  partners: number;
}

export interface AutomationRow extends Record<string, unknown> {
  id: string;
  name: string;
  type: string;
  count: number;
  created: string;
  on: boolean;
}

export interface ChatEntry {
  id: string;
  name: string;
  role: string;
  preview?: string;
  time: string;
  unread?: number;
  typing?: boolean;
  pinned?: boolean;
}

export interface ThreadMessage {
  own: boolean;
  author?: string;
  time?: string;
  read?: boolean;
  text?: string;
  quote?: { author: string; text: string };
  attachment?: { name: string; kind: string };
}

export interface Kpi {
  icon: string;
  value: string;
  label: string;
  glow?: boolean;
}

const city = [
  'Viborg, Denmark',
  'Aarhus, Denmark',
  'Gdansk, Poland',
  'Hamburg, Germany',
  'Rotterdam, Netherlands',
];
const to = [
  'Siedice, Poland',
  'Lyon, France',
  'Turin, Italy',
  'Bilbao, Spain',
  'Leeds, United Kingdom',
];
const cargo = ['Building Materials', 'Refrigerated Goods', 'Bulk Chemicals', 'Palletised Retail'];
const statuses: [string, BadgeTone][] = [
  ['Delay', 'delay'],
  ['On Time', 'ontime'],
  ['Delivered', 'delivered'],
];

const rawOrders: [string, number, number, number, string, string, number][] = [
  ['4511829208', 0, 0, 0, '$950', 'Jan 3, 2025', 0],
  ['44511828177', 0, 0, 1, '$1,150', 'Jan 5, 2025', 1],
  ['4511826012', 1, 2, 0, '$850', 'Dec 28, 2024', 0],
  ['4501829693', 2, 1, 0, '$3,450', 'Dec 25, 2024', 0],
  ['4511829298', 0, 0, 0, '$1,855', 'Dec 23, 2024', 1],
  ['4462948102', 3, 3, 2, '$985', 'Dec 20, 2024', 0],
  ['4500221765', 0, 0, 0, '$1,450', 'Dec 18, 2024', 2],
  ['4511829296', 4, 4, 3, '$1,985', 'Dec 22, 2024', 2],
  ['4461828091', 0, 0, 0, '$9,080', 'Dec 16, 2024', 2],
  ['4511829284', 1, 1, 1, '$850', 'Dec 12, 2024', 2],
  ['4431829881', 0, 0, 0, '$1,854', 'Dec 10, 2024', 2],
];

export const orders: OrderRow[] = rawOrders.map(([id, fi, ti, ci, price, date, si]) => ({
  id,
  from: city[fi],
  to: to[ti],
  cargo: cargo[ci],
  weight: '51,360 kg. 4 ml',
  price,
  date,
  status: statuses[si][0],
  tone: statuses[si][1],
}));

const carrierRatings = [8.7, 8.1, 8.9, 8.7, 8.7, 8.6, 9.7, 8.7, 9.7];
const carrierReviews = [116, 74, 77, 88, 90, 112, 64, 12, 18];
const carrierVehicles = [21, 19, 24, 32, 21, 16, 8, 12, 18];
const carrierPartners = [12, 16, 34, 39, 24, 18, 12, 14, 32];

export const carriers: CarrierEntry[] = [
  'Arkas Logistics',
  'Zim Integrated',
  'HMM Shipping',
  'MSC Cargo',
  'CMA CGM Group',
  'ONE Network',
  'Maersk Line',
  'Cosco Freight',
  'Hapag Bridge',
].map((name, i) => ({
  rank: i + 1,
  name,
  location: 'Belfast, United Kingdom',
  rating: carrierRatings[i],
  reviews: carrierReviews[i],
  vehicles: carrierVehicles[i],
  partners: carrierPartners[i],
}));

const rawAutomations: [string, string, number, string, boolean][] = [
  ['Delivery Date Warning', 'Order', 17, 'October 25, 2024', true],
  ['Invoice Sending', 'Invoice', 8, 'October 31, 2024', true],
  ['Automatic Order Editing', 'Order', 4, 'February 11, 2024', true],
  ['Newsletters For High-Rated Carriers', 'Order', 11, 'October 24, 2024', true],
  ['New Delivery Date Warning', 'Order', 6, 'December 29, 2024', true],
  ['Newsletters For High-Rated Carriers', 'Carrier', 14, 'December 19, 2024', false],
  ['New Delivery Date Warning', 'Order', 19, 'March 13, 2024', true],
  ['Newsletters For High-Rated Carriers', 'Carrier', 28, 'May 6, 2024', true],
  ['Notifications For Delayed Orders', 'Order', 7, 'August 2, 2024', true],
  ['Carrier Rate', 'Order', 12, 'December 2, 2024', true],
  ['Automated Notifications', 'Carrier', 18, 'April 28, 2024', true],
];

export const automations: AutomationRow[] = rawAutomations.map(
  ([name, type, count, created, on], i) => ({ id: `a${i}`, name, type, count, created, on }),
);

export const chats: ChatEntry[] = [
  { id: 'c1', name: 'Harrold Tafoya', role: 'Carrier', typing: true, time: '05:11 PM', pinned: true },
  {
    id: 'c2',
    name: 'Mate Bruney',
    role: 'Carrier',
    preview: 'Thank you. Glad to feel this …',
    time: '04:17 PM',
    unread: 4,
    pinned: true,
  },
  {
    id: 'c3',
    name: 'Shannon Kile',
    role: 'Driver',
    preview: 'Yes, thank you…',
    time: '16:01 PM',
    unread: 2,
    pinned: true,
  },
  {
    id: 'c4',
    name: 'Kynie Mccotter',
    role: 'Carrier',
    preview: 'Have you had a chance to check it out?',
    time: '03:29 PM',
    unread: 3,
  },
  {
    id: 'c5',
    name: 'Savina Navarrate',
    role: 'Carrier',
    preview: "I'm already at the warehouse and…",
    time: '02:11 PM',
    unread: 1,
  },
  {
    id: 'c6',
    name: 'Marcel Pasculli',
    role: 'Driver',
    preview: 'Could you send me an updated invoice?',
    time: 'Yesterday',
  },
  {
    id: 'c7',
    name: 'Gilbertine Rivet',
    role: 'Driver',
    preview: 'Yes, I am. I will let you know…',
    time: 'Yesterday',
  },
  { id: 'c8', name: 'Nisa Cordial', role: 'Driver', preview: 'Yes, thank you…', time: 'Yesterday' },
  {
    id: 'c9',
    name: 'Rafi Rohamat',
    role: 'Carrier',
    preview: "I'm already at the warehouse and…",
    time: 'Dec 20, 2024',
  },
  {
    id: 'c10',
    name: 'Wenston Covil',
    role: 'Driver',
    preview: 'Can I fill up here? Location',
    time: 'Dec 18, 2024',
  },
  {
    id: 'c11',
    name: 'Albert Flores',
    role: 'Driver',
    preview: 'Yes, thank you…',
    time: 'Dec 12, 2024',
  },
];

export const thread: ThreadMessage[] = [
  {
    own: true,
    time: '09:44 PM',
    read: true,
    text: 'Sounds perfect. I will drop a message to Nick regarding changes.',
  },
  {
    own: true,
    quote: { author: 'Mate Bruney', text: 'Wa he insist on this date?' },
    text: "I'm afraid, yes, he wille",
  },
  {
    own: false,
    author: 'Harrold Tafoya',
    time: '09:44 PM',
    text: 'Nick, payday is coming. Can you copy the invoice for our bookkeeping department?',
  },
  {
    own: true,
    time: '10:50 PM',
    read: true,
    text: "I'm attaching the invoice for the last shipment. Please check it out and assure of correctness.",
  },
  { own: true, attachment: { name: "I'm Invoice Ceva Bahn 21032023", kind: 'PDF' } },
  {
    own: false,
    author: 'Harrold Tafoya',
    time: '09:44 PM',
    text: 'Thank youl Glad to feel this deference',
  },
];

export const revenueCurrent = [
  2400, 3450, 2900, 4300, 2050, 3900, 4650, 3400, 5250, 4050, 3350, 5650,
];
export const revenuePrevious = [
  3100, 2400, 3650, 2900, 4450, 3100, 2700, 4950, 3600, 4850, 3900, 4250,
];
export const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
export const orderBars = [120, 185, 140, 265, 190, 382, 210, 170, 245, 200, 150, 235];

export const fleet: MetricBarItem[] = [
  { label: 'Trucks', value: 57, tone: 'purple' },
  { label: 'Cargo Vans', value: 18, tone: 'green' },
  { label: 'Trailers', value: 9, tone: 'orange' },
  { label: 'Cargo planes', value: 7, tone: 'neutral' },
  { label: 'Others Vehicles', value: 9, tone: 'neutral' },
];

export const kpis: Kpi[] = [
  { icon: 'wallet', value: '1174', label: 'Total amount of orders', glow: true },
  { icon: 'banknote', value: '$8,126,420', label: 'Total money paid' },
  { icon: 'truck', value: '29', label: 'Available courier' },
  { icon: 'clock', value: '89,011', label: 'Hours on the road' },
];

export const nav: SidebarSection[] = [
  {
    label: 'Menu',
    items: [
      { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
      { id: 'orders', label: 'Orders', icon: 'clipboard-list' },
      { id: 'carriers', label: 'Carriers', icon: 'truck' },
      { id: 'invoice', label: 'Invoice', icon: 'file-text' },
      { id: 'automations', label: 'Automations', icon: 'audio-lines' },
      { id: 'analytics', label: 'Analytics', icon: 'chart-no-axes-combined' },
      { id: 'reporting', label: 'Reporting', icon: 'clipboard-check' },
      { id: 'messages', label: 'Messages', icon: 'message-square' },
    ],
  },
  {
    label: 'Support',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings' },
      { id: 'help', label: 'Help', icon: 'shield-question-mark' },
    ],
  },
];

export const titles: Record<string, [string, string]> = {
  overview: ['Overview', 'Meet your oun numbers regarding all operations'],
  orders: ['Orders', 'Database of wires tenders'],
  carriers: ['Carriers', 'Fleet partners and their capacity'],
  invoice: ['Invoice', 'Billing documents and payment status'],
  automations: ['Automations', 'Automated flows for effective actions'],
  analytics: ['Analytics', 'Data analytics and insights'],
  reporting: ['Reporting', 'Scheduled and ad-hoc reports'],
  messages: ['Messages', 'Chats between parties'],
  settings: ['Settings', 'Workspace and account preferences'],
  help: ['Help', 'Guides, shortcuts and support'],
};

export const fleetSegments = [
  { value: 57, color: 'var(--chart-1)' },
  { value: 18, color: 'var(--chart-2)' },
  { value: 9, color: 'var(--chart-3)' },
  { value: 7, color: 'var(--chart-4)' },
  { value: 9, color: 'var(--chart-5)' },
];
