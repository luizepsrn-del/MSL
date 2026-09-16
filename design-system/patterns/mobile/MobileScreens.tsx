import React from 'react';
import {
  Card,
  Button,
  Badge,
  Tag,
  StatCard,
  PromoBanner,
  LineChart,
  BarChart,
  DonutChart,
  MetricBarList,
  Radio,
  Avatar,
  ChatListItem,
  MessageBubble,
  MessageComposer,
  IconButton,
  Switch,
  Pagination,
  Select,
  promoLogisticsCollage,
} from '../../components';
import type { TagTone } from '../../components';
import {
  kpis,
  orders,
  automations,
  carriers,
  chats,
  thread as initialThread,
  fleet,
  fleetSegments,
  monthLabels,
  orderBars,
  revenueCurrent,
  revenuePrevious,
  type Kpi,
  type AutomationRow,
  type ThreadMessage,
} from '../data';

/* KPI tiles become a swipeable rail on mobile — the pattern the source shows, with dots. */
export function KpiRail({ items }: { items: Kpi[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [idx, setIdx] = React.useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (el) setIdx(Math.round(el.scrollLeft / (el.clientWidth * 0.62)));
  };

  return (
    <div>
      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          display: 'flex',
          gap: 'var(--sp-6)',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          margin: '0 calc(-1 * var(--sp-8))',
          padding: '0 var(--sp-8) var(--sp-5)',
        }}
      >
        {items.map((k) => (
          <div key={k.label} style={{ flex: '0 0 62%', scrollSnapAlign: 'start' }}>
            <StatCard {...k} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
        {items.map((k, i) => (
          <span
            key={k.label}
            style={{
              width: i === idx ? 18 : 6,
              height: 6,
              borderRadius: 'var(--r-pill)',
              background: i === idx ? 'var(--purple-500)' : 'var(--ink-700)',
              transition: 'width var(--dur-base) var(--ease-out)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function MobileDashboard({ onViewPlans }: { onViewPlans?: () => void }) {
  const [series, setSeries] = React.useState('last');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <PromoBanner
        image={promoLogisticsCollage}
        title={
          <>
            Your Profile Is Currently
            <br />
            On The Free Plan
          </>
        }
        body="Get Acquire Ted With Easting Plans And Get More Now"
        actionLabel="View Plans"
        onAction={onViewPlans}
        style={{ padding: 'var(--sp-9)', minHeight: 150 }}
      />
      <KpiRail items={kpis} />
      <Card title="Monthly Revenue" onMenuClick={() => {}} padding="var(--sp-8)">
        <Radio
          style={{ marginBottom: 'var(--sp-8)' }}
          value={series}
          onChange={setSeries}
          options={[
            { value: 'last', label: 'Last Year' },
            { value: 'prev', label: 'Previous Year' },
          ]}
        />
        <LineChart
          height={190}
          highlightIndex={4}
          tooltip="$30,89 per munth"
          yTicks={['$10,000', '$5000', '$2000', '$1000']}
          labels={monthLabels}
          series={
            series === 'last'
              ? [
                  { data: revenueCurrent },
                  { data: revenuePrevious, color: 'var(--chart-5)', width: 2 },
                ]
              : [{ data: revenuePrevious, color: 'var(--chart-5)', width: 2 }]
          }
        />
      </Card>
      <Card
        title="Top Carriers"
        padding="var(--sp-8)"
        action={
          <Button variant="secondary" size="sm" iconRight="arrow-right">
            See All
          </Button>
        }
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--sp-9)',
          }}
        >
          <DonutChart
            size={170}
            thickness={28}
            centerValue="100%"
            centerLabel="Total"
            segments={fleetSegments}
          />
          <MetricBarList style={{ width: '100%' }} items={fleet} />
        </div>
      </Card>
      <Card title="Orders" onMenuClick={() => {}} padding="var(--sp-8)">
        <BarChart
          height={150}
          highlightIndex={5}
          valueLabel="382"
          labels={monthLabels}
          data={orderBars}
        />
      </Card>
    </div>
  );
}

/* Rows become stacked cards rather than a side-scrolling table — nothing is dropped. */
export function MobileOrders({ onEdit }: { onEdit?: () => void }) {
  const [filter, setFilter] = React.useState('all');
  const [sel, setSel] = React.useState(['44511828177', '4501829693']);
  const [page, setPage] = React.useState(2);

  const rows = orders.filter((o) => filter === 'all' || o.tone === filter);
  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Button variant="primary" size="lg" fullWidth iconRight="plus">
        Create New Order
      </Button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)' }}>
        <strong
          style={{
            font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
            color: 'var(--text-heading)',
          }}
        >
          {sel.length} Item selected
        </strong>
        <div style={{ marginLeft: 'auto', minWidth: 130 }}>
          <Select
            size="md"
            value={filter}
            onChange={setFilter}
            fullWidth
            options={[
              { value: 'all', label: 'All Orders' },
              { value: 'delay', label: 'Delayed' },
              { value: 'ontime', label: 'On Time' },
              { value: 'delivered', label: 'Delivered' },
            ]}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--sp-5)', overflowX: 'auto', paddingBottom: 2 }}>
        <Button variant="secondary" size="sm" onClick={() => setSel([])}>
          Dismiss
        </Button>
        <Button variant="secondary" size="sm">
          Send Invoice
        </Button>
        <Button variant="secondary" size="sm">
          Report
        </Button>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      {rows.map((o) => {
        const on = sel.includes(o.id);
        const fields: [string, string][] = [
          ['From', o.from],
          ['To', o.to],
          ['Cargo', o.cargo],
          ['Weight', o.weight],
          ['Price', o.price],
          ['Delivery Date', o.date],
        ];
        return (
          <div
            key={o.id}
            onClick={() => toggle(o.id)}
            style={{
              padding: 'var(--sp-8)',
              background: on ? 'var(--surface-active)' : 'var(--surface-card)',
              border: `1px solid ${on ? 'var(--border-accent)' : 'var(--border-hairline)'}`,
              borderRadius: 'var(--r-card)',
              cursor: 'pointer',
              transition: 'var(--t-hover)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--sp-6)',
              }}
            >
              <span
                style={{
                  font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
                  color: 'var(--text-heading)',
                }}
              >
                {o.id}
              </span>
              <Badge tone={o.tone}>{o.status}</Badge>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--sp-6)',
                marginTop: 'var(--sp-8)',
              }}
            >
              {fields.map(([k, v]) => (
                <div key={k} style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      font: 'var(--fw-regular) var(--fs-xs)/1.3 var(--font-core)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {k}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      font: 'var(--type-body)',
                      color: 'var(--text-body)',
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <Pagination page={page} total={6} onChange={setPage} />
    </div>
  );
}

export function MobileAutomations() {
  const [rows, setRows] = React.useState<AutomationRow[]>(automations);
  const toggle = (id: string, on: boolean) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, on } : r)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Button variant="primary" size="lg" fullWidth iconRight="plus">
        Create New Automation
      </Button>
      {rows.map((r) => (
        <div
          key={r.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-8)',
            padding: 'var(--sp-8)',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--r-card)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                font: 'var(--fw-medium) var(--fs-sm)/1.35 var(--font-core)',
                color: 'var(--text-heading)',
              }}
            >
              {r.name}
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-5)',
                marginTop: 6,
              }}
            >
              <Tag tone={r.type.toLowerCase() as TagTone} count={r.count}>
                {r.type}
              </Tag>
              <span
                style={{
                  font: 'var(--fw-regular) var(--fs-xs)/1 var(--font-core)',
                  color: 'var(--text-muted)',
                }}
              >
                {r.created}
              </span>
            </span>
          </div>
          <Switch checked={r.on} onChange={(on) => toggle(r.id, on)} />
        </div>
      ))}
    </div>
  );
}

export function MobileCarriers() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      {carriers.map((c) => (
        <div
          key={c.rank}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-8)',
            padding: 'var(--sp-8)',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--r-card)',
          }}
        >
          <Avatar name={c.name} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                font: 'var(--fw-medium) var(--fs-sm)/1.3 var(--font-core)',
                color: 'var(--text-heading)',
              }}
            >
              {c.name}
            </span>
            <span
              style={{
                display: 'block',
                font: 'var(--fw-regular) var(--fs-xs)/1.3 var(--font-core)',
                color: 'var(--text-muted)',
              }}
            >
              {c.location}
            </span>
            <span
              style={{
                display: 'block',
                font: 'var(--type-body)',
                color: 'var(--text-muted)',
                marginTop: 4,
              }}
            >
              {c.vehicles} Vehicles · {c.partners} partners
            </span>
          </div>
          <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
            <span
              style={{
                display: 'block',
                font: 'var(--fw-medium) var(--fs-lg)/1.2 var(--font-core)',
                color: 'var(--text-heading)',
              }}
            >
              {c.rating}
            </span>
            <span
              style={{
                display: 'block',
                font: 'var(--fw-regular) var(--fs-micro)/1.2 var(--font-core)',
                color: 'var(--text-muted)',
              }}
            >
              {c.reviews} Reviews
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MobileMessages() {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');
  const [thread, setThread] = React.useState<ThreadMessage[]>(initialThread);
  const active = chats.find((c) => c.id === openId);

  if (!active) {
    return (
      <div
        style={{
          margin: 'calc(-1 * var(--sp-8))',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--r-card)',
          overflow: 'hidden',
          background: 'var(--surface-card)',
        }}
      >
        {chats.map((c) => (
          <ChatListItem key={c.id} {...c} onClick={() => setOpenId(c.id)} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-9)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)' }}>
        <IconButton
          icon="arrow-left"
          label="Back to all chats"
          size={44}
          variant="ghost"
          onClick={() => setOpenId(null)}
        />
        <Avatar name={active.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)' }}>
            <span
              style={{
                font: 'var(--fw-medium) var(--fs-md)/1.2 var(--font-core)',
                color: 'var(--text-heading)',
              }}
            >
              {active.name}
            </span>
            <Tag tone={active.role === 'Driver' ? 'driver' : 'role'}>{active.role}</Tag>
          </span>
          <span style={{ font: 'var(--type-body)', color: 'var(--text-muted)' }}>
            PSP Cargo Group
          </span>
        </div>
        <IconButton icon="phone" label="Call" size={44} />
      </div>
      <span
        style={{
          alignSelf: 'center',
          padding: '6px 16px',
          borderRadius: 'var(--r-pill)',
          background: 'var(--surface-raised)',
          font: 'var(--type-body)',
          color: 'var(--text-muted)',
        }}
      >
        Today, Dec 25
      </span>
      {thread.map((m, i) => (
        <MessageBubble
          key={i}
          own={m.own}
          author={m.author}
          time={m.time}
          read={m.read}
          quote={m.quote}
          attachment={m.attachment}
        >
          {m.text}
        </MessageBubble>
      ))}
      <MessageComposer
        value={draft}
        onChange={setDraft}
        tools={['paperclip', 'smile']}
        onSend={(t) => {
          setThread((x) => [...x, { own: true, time: 'Now', text: t }]);
          setDraft('');
        }}
      />
    </div>
  );
}

export function MobilePlaceholder({ name }: { name: string }) {
  return (
    <Card padding="var(--sp-9)">
      <div style={{ textAlign: 'center', padding: 'var(--sp-12) 0' }}>
        <h3 style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)' }}>{name}</h3>
        <p
          style={{
            font: 'var(--type-body)',
            color: 'var(--text-muted)',
            marginTop: 'var(--sp-5)',
            lineHeight: 'var(--lh-normal)',
          }}
        >
          Not designed in the source material. Left blank on purpose.
        </p>
      </div>
    </Card>
  );
}
