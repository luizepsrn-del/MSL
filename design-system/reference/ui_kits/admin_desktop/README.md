# Admin Dashboard — desktop UI kit

A click-through recreation of the logistics admin dashboard shown in the source
material (`uploads/01`, `03`, `05`, `07`–`09`, `11`). Open `index.html`.

## What's here

| File | Surface |
| --- | --- |
| `index.html` | Shell — top bar, sidebar, view routing, Account Set Up modal, confirmation dialog |
| `Brand.jsx` | Wordmark lockup (no logo was supplied — see the root readme) |
| `OverviewScreen.jsx` | KPI row, Top Carriers leaderboard + pagination, fleet donut, Average Revenue |
| `AnalyticsScreen.jsx` | Plan banner, KPI row, Monthly Revenue line chart, Orders bar chart, fleet donut |
| `OrdersScreen.jsx` | Search + create bar, selection toolbar, sortable Orders table, pagination |
| `AutomationsScreen.jsx` | Automations table with operation-type tags and status switches |
| `MessagesScreen.jsx` | Two-pane chat — pinned/all chat list, thread with quote + attachment, composer |
| `PlaceholderScreen.jsx` | Deliberate blank for the four views the source never designed |
| `data.js` | All sample rows, carriers, chats, series (`window.MSL_DATA`) |

## What works

Sidebar routing · light/dark segment · table sorting and row selection · Orders
filter and search · Automations switches and search · chat selection and sending ·
revenue series switch · pagination · Account Set Up modal (from "View Plans", the
user chip or the promo card) · "Order updated!" confirmation (from Orders → Edit).

## Deliberately blank

Carriers, Invoice, Reporting, Settings and Help have no design in the source
material, so they render a stated placeholder rather than invented screens.
