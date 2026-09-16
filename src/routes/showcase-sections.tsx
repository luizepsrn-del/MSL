import React from 'react';
import {
  Icon,
  Button,
  IconButton,
  Card,
  Badge,
  Tag,
  Avatar,
  ProgressBar,
  SearchInput,
  Checkbox,
  Switch,
  Radio,
  Select,
  Field,
  TextInput,
  Sidebar,
  TopBar,
  PageHeader,
  Pagination,
  StatCard,
  DataTable,
  SelectionToolbar,
  DonutChart,
  LineChart,
  BarChart,
  MetricBarList,
  CarrierRow,
  ChatListItem,
  MessageBubble,
  MessageComposer,
  Modal,
  SuccessDialog,
  OptionCard,
  StepProgress,
  PromoCard,
  PromoBanner,
  promoRocket,
  promoLogisticsCollage,
  sampleData,
} from '../../design-system';
import type { DataTableColumn } from '../../design-system';
import { Row, Stack, Spec, Note } from './showcase-ui';

/* Every component in the library gets a Spec, and every Spec names the states
   it is showing. States the source never defines are called out rather than
   invented — see DESIGN.md → Interaction states. */

export function CoreSection() {
  const [checked, setChecked] = React.useState(true);
  return (
    <Stack>
      <Spec
        name="Button"
        states="5 variants × 3 sizes · default · hover · press · focus · disabled"
      >
        <Row>
          <Button variant="primary">View Plans</Button>
          <Button variant="secondary">Send Invoice</Button>
          <Button variant="outline">Thank you!</Button>
          <Button variant="ghost">Dismiss</Button>
          <Button variant="danger">Delete</Button>
        </Row>
        <Row>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button iconLeft="plus">Icon left</Button>
          <Button iconRight="arrow-right">Icon right</Button>
        </Row>
        <Row>
          <Button disabled>Disabled primary</Button>
          <Button variant="secondary" disabled>
            Disabled secondary
          </Button>
          <Button variant="danger" disabled>
            Disabled danger
          </Button>
          <Button fullWidth style={{ maxWidth: 220 }}>
            Full width
          </Button>
        </Row>
        <Note>
          Hover and press are live — hover a button to see the brighter gradient and its glow,
          hold to see the 0.97 press scale. Focus shows the 2px purple ring on keyboard tab.
          There is no loading state: the source defines none, and DESIGN.md forbids inventing
          one.
        </Note>
      </Spec>

      <Spec name="IconButton" states="3 variants · active · disabled · sizes 28–44">
        <Row>
          <IconButton icon="phone" label="Call" />
          <IconButton icon="video" label="Video" />
          <IconButton icon="more-vertical" label="More" variant="ghost" />
          <IconButton icon="send" label="Send" variant="accent" />
          <IconButton icon="bell" label="Alerts" active />
          <IconButton icon="settings" label="Settings" disabled />
        </Row>
        <Row>
          <IconButton icon="search" label="Search" size={28} />
          <IconButton icon="search" label="Search" size={34} />
          <IconButton icon="search" label="Search" size={38} />
          <IconButton icon="search" label="Search" size={44} />
        </Row>
      </Spec>

      <Spec name="Icon" states="sizes 14–22 · muted · body · semantic colour">
        <Row>
          <Icon name="truck" size={14} />
          <Icon name="truck" size={16} />
          <Icon name="truck" size={18} />
          <Icon name="truck" size={22} />
          <Icon name="zap" size={18} color="var(--green-500)" />
          <Icon name="alert-triangle" size={18} color="var(--red-500)" />
          <Icon name="arrow-down" size={18} color="var(--purple-300)" />
        </Row>
      </Spec>

      <Spec name="Card" states="default · with header · with action · glow · flush · menu">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--card-gap)',
          }}
        >
          <Card title="Plain card">Body content sits here.</Card>
          <Card
            title="With action"
            subtitle="And a subtitle"
            action={
              <Button variant="secondary" size="sm" iconRight="arrow-right">
                See All
              </Button>
            }
          >
            Body content.
          </Card>
          <Card title="Glow" glow onMenuClick={() => {}}>
            The purple corner wash, reserved for the lead KPI tile.
          </Card>
        </div>
      </Spec>

      <Spec name="Badge" states="6 tones · with dot · without dot">
        <Row>
          <Badge tone="ontime">On Time</Badge>
          <Badge tone="delay">Delay</Badge>
          <Badge tone="delivered">Delivered</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="solid" dot={false}>
            2 New
          </Badge>
        </Row>
        <Note>
          The status vocabulary is closed — Delay / On Time / Delivered. The danger tone exists
          in tokens but has no label in the source.
        </Note>
      </Spec>

      <Spec name="Tag" states="6 tones · with count chip · without">
        <Row>
          <Tag tone="order" count={17}>
            Order
          </Tag>
          <Tag tone="invoice" count={8}>
            Invoice
          </Tag>
          <Tag tone="carrier" count={14}>
            Carrier
          </Tag>
          <Tag tone="driver">Driver</Tag>
          <Tag tone="role">Carrier</Tag>
          <Tag tone="neutral">Neutral</Tag>
        </Row>
      </Spec>

      <Spec name="Avatar" states="initials · sizes 28–56 · status dot · ring">
        <Row>
          <Avatar name="Ronald Richards" size={28} />
          <Avatar name="Harrold Tafoya" size={36} />
          <Avatar name="Mate Bruney" size={44} />
          <Avatar name="Shannon Kile" size={56} />
          <Avatar name="Savina Navarrate" status="online" />
          <Avatar name="Marcel Pasculli" status="away" />
          <Avatar name="Nisa Cordial" status="offline" />
          <Avatar name="Rafi Rohamat" ring="online" />
        </Row>
        <Note>
          No avatar photography exists in the source, so the fallback is initials on a
          name-derived duotone ground.
        </Note>
      </Spec>

      <Spec name="ProgressBar" states="5 tones · with label · bare · 0% · 100%">
        <Stack gap="var(--sp-6)">
          <ProgressBar value={57} tone="purple" label="Trucks" valueLabel="57%" />
          <ProgressBar value={18} tone="green" label="Cargo Vans" valueLabel="18%" />
          <ProgressBar value={9} tone="orange" label="Trailers" valueLabel="9%" />
          <ProgressBar value={7} tone="neutral" label="Cargo planes" valueLabel="7%" />
          <ProgressBar value={42} tone="accent" label="Accent" valueLabel="42%" />
          <ProgressBar value={0} label="Empty" valueLabel="0%" />
          <ProgressBar value={100} label="Full" valueLabel="100%" />
          <ProgressBar value={64} />
        </Stack>
      </Spec>

      <Spec name="Checkbox" states="unchecked · checked · indeterminate · disabled · with label">
        <Row>
          <Checkbox checked={checked} onChange={setChecked} label="Interactive" />
          <Checkbox checked={false} label="Unchecked" />
          <Checkbox checked label="Checked" />
          <Checkbox indeterminate label="Indeterminate" />
          <Checkbox disabled label="Disabled" />
          <Checkbox checked disabled label="Disabled checked" />
        </Row>
      </Spec>
    </Stack>
  );
}

export function FormsSection() {
  const [q, setQ] = React.useState('');
  const [on, setOn] = React.useState(true);
  const [radio, setRadio] = React.useState('last');
  const [sel, setSel] = React.useState('all');
  const [titulo, setTitulo] = React.useState('');
  const [nota, setNota] = React.useState('Uma nota que cresce conforme eu escrevo.');
  const [valor, setValor] = React.useState('1.234,56');
  return (
    <Stack>
      <Spec
        name="Field + TextInput"
        states="6 tipos · vazio · preenchido · foco · erro · desabilitado · multi-linha que cresce"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--sp-9)',
            alignItems: 'start',
          }}
        >
          <Field label="Título" htmlFor="sc-titulo" required help="Obrigatório">
            <TextInput
              id="sc-titulo"
              value={titulo}
              onChange={setTitulo}
              placeholder="O que precisa ser feito?"
              fullWidth
            />
          </Field>

          <Field label="Valor" htmlFor="sc-valor" help="Aceita 1.234,56 ou R$ 1.234,56">
            <TextInput id="sc-valor" type="money" value={valor} onChange={setValor} fullWidth />
          </Field>

          <Field label="Quando" htmlFor="sc-data">
            <TextInput id="sc-data" type="date" value="2026-01-03" onChange={() => {}} fullWidth />
          </Field>

          <Field label="Hora" htmlFor="sc-hora">
            <TextInput id="sc-hora" type="time" value="14:30" onChange={() => {}} fullWidth />
          </Field>

          <Field label="Com erro" htmlFor="sc-erro" error="Informe um valor válido">
            <TextInput id="sc-erro" value="abc" invalid onChange={() => {}} fullWidth />
          </Field>

          <Field label="Desabilitado" htmlFor="sc-off" disabled>
            <TextInput id="sc-off" value="Não dá para editar" disabled onChange={() => {}} fullWidth />
          </Field>

          <Field label="Toque (44px)" htmlFor="sc-lg" help="size=lg nas superfícies de toque">
            <TextInput id="sc-lg" size="lg" value="" onChange={() => {}} fullWidth />
          </Field>
        </div>

        <Field label="Nota" htmlFor="sc-nota" help="Cresce com o conteúdo, não rola numa caixa fixa">
          <TextInput id="sc-nota" type="multiline" value={nota} onChange={setNota} fullWidth />
        </Field>

        <Note>
          Adição declarada, não vem da fonte — veja DESIGN.md, seção Form fields. Nenhum valor
          de design novo: altura, raio, fio, foco sem brilho e o tom de erro já existiam nos
          tokens. Clique num campo para ver o fio virar roxo; o campo com erro usa o fio
          vermelho e anuncia a mensagem com role=alert.
        </Note>
      </Spec>
      <Spec name="SearchInput" states="3 sizes · empty · filled · focus · with shortcut chip">
        <Stack gap="var(--sp-6)" style={{ maxWidth: 380 }}>
          <SearchInput size="sm" placeholder="Small" fullWidth />
          <SearchInput value={q} onChange={setQ} placeholder="Search or type command" fullWidth />
          <SearchInput size="lg" placeholder="Large" shortcut="F" fullWidth />
          <SearchInput value="Filled value" onChange={() => {}} fullWidth />
        </Stack>
        <Note>Focus swaps the hairline to the purple focus border — click into a field.</Note>
      </Spec>

      <Spec name="Switch" states="on · off · disabled · 2 sizes · with label">
        <Row>
          <Switch checked={on} onChange={setOn} label="Interactive" />
          <Switch checked label="On" />
          <Switch checked={false} label="Off" />
          <Switch checked size="sm" label="Small on" />
          <Switch checked={false} size="sm" label="Small off" />
          <Switch checked disabled label="Disabled on" />
          <Switch checked={false} disabled label="Disabled off" />
        </Row>
      </Spec>

      <Spec name="Radio" states="selected · unselected">
        <Radio
          value={radio}
          onChange={setRadio}
          options={[
            { value: 'last', label: 'Last Year' },
            { value: 'prev', label: 'Previous Year' },
          ]}
        />
      </Spec>

      <Spec name="Select" states="closed · open · selected item · placeholder · 3 sizes">
        <Row style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 180 }}>
            <Select
              value={sel}
              onChange={setSel}
              fullWidth
              options={[
                { value: 'all', label: 'All Orders' },
                { value: 'delay', label: 'Delayed' },
                { value: 'ontime', label: 'On Time' },
                { value: 'delivered', label: 'Delivered' },
              ]}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Select
              size="sm"
              placeholder="Placeholder, nothing selected"
              fullWidth
              options={[{ value: 'a', label: 'Option A' }]}
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Select
              size="lg"
              placeholder="Large"
              fullWidth
              options={[{ value: 'a', label: 'Option A' }]}
            />
          </div>
        </Row>
        <Note>
          Open one — the selected item takes the soft purple fill and a trailing tick, the
          chevron rotates 180°.
        </Note>
      </Spec>
    </Stack>
  );
}

export function NavigationSection() {
  const [active, setActive] = React.useState('overview');
  const [page, setPage] = React.useState(2);
  return (
    <Stack>
      <Spec name="TopBar" states="full utility cluster · theme segment · title + subtitle">
        <TopBar
          title="Overview"
          subtitle="Meet your oun numbers regarding all operations"
          theme="dark"
          onThemeChange={() => {}}
          credits={40}
          notifications={2}
          user={{ name: 'Ronald R.', role: 'Broker', rating: 4.8 }}
          style={{ border: `var(--bw-hairline) solid var(--border-hairline)`, borderRadius: 'var(--r-card)' }}
        />
      </Spec>

      <Spec name="Sidebar" states="active item + edge tab · hover · badge · sections · footer slot">
        <Sidebar
          sections={sampleData.nav}
          active={active}
          onSelect={setActive}
          style={{
            height: 520,
            border: `var(--bw-hairline) solid var(--border-hairline)`,
            borderRadius: 'var(--r-card)',
          }}
          footer={
            <PromoCard image={promoRocket} body="Get special offers up to 12 months" />
          }
        />
        <Note>Click an item — the active item takes the gradient plus its glowing edge tab.</Note>
      </Spec>

      <Spec name="PageHeader" states="title only · with subtitle · with actions">
        <Stack gap="var(--sp-10)">
          <PageHeader title="Analytics" />
          <PageHeader title="Orders" subtitle="Database of wires tenders" />
          <PageHeader
            title="Automations"
            subtitle="Automated flows for effective actions"
            actions={
              <Button variant="primary" size="sm" iconRight="plus">
                Create New Automation
              </Button>
            }
          />
        </Stack>
      </Spec>

      <Spec name="Pagination" states="current page · first page (Previous disabled) · last page">
        <Stack gap="var(--sp-10)">
          <Pagination page={page} total={6} onChange={setPage} />
          <Pagination page={1} total={6} onChange={() => {}} />
          <Pagination page={6} total={6} onChange={() => {}} />
          <Pagination page={5} total={12} onChange={() => {}} />
        </Stack>
      </Spec>
    </Stack>
  );
}

interface DemoRow extends Record<string, unknown> {
  id: string;
  name: string;
  status: string;
  tone: 'ontime' | 'delay' | 'delivered';
}

const DEMO_ROWS: DemoRow[] = [
  { id: '4511829208', name: 'Building Materials', status: 'Delay', tone: 'delay' },
  { id: '44511828177', name: 'Refrigerated Goods', status: 'On Time', tone: 'ontime' },
  { id: '4511826012', name: 'Bulk Chemicals', status: 'Delivered', tone: 'delivered' },
];

const DEMO_COLUMNS: DataTableColumn<DemoRow>[] = [
  { key: 'id', header: 'Order', width: 'minmax(120px,1fr)', sortable: true },
  { key: 'name', header: 'Cargo', width: 'minmax(160px,1.4fr)', sortable: true },
  {
    key: 'status',
    header: 'Status',
    width: '120px',
    render: (r) => <Badge tone={r.tone}>{r.status}</Badge>,
  },
];

export function DataSection() {
  const [selected, setSelected] = React.useState<string[]>(['44511828177']);
  return (
    <Stack>
      <Spec name="StatCard" states="default · glow · with delta (3 tones)">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 'var(--card-gap)',
          }}
        >
          <StatCard icon="wallet" value="1174" label="Total amount of orders" glow />
          <StatCard icon="banknote" value="$8,126,420" label="Total money paid" />
          <StatCard icon="truck" value="29" label="Available courier" delta="+12%" />
          <StatCard
            icon="clock"
            value="89,011"
            label="Hours on the road"
            delta="-4%"
            deltaTone="danger"
          />
          <StatCard icon="users" value="312" label="Partners" delta="+2%" deltaTone="delay" />
        </div>
      </Spec>

      <Spec name="DataTable" states="sortable header · row selection · selected row · EMPTY">
        <Stack gap="var(--sp-10)">
          <DataTable
            selectable
            selected={selected}
            onSelectedChange={setSelected}
            rows={DEMO_ROWS}
            columns={DEMO_COLUMNS}
          />
          <div>
            <Note>Empty state — no rows:</Note>
            <DataTable
              rows={[]}
              columns={DEMO_COLUMNS}
              emptyMessage="Nothing here yet"
            />
          </div>
        </Stack>
      </Spec>

      <Spec name="SelectionToolbar" states="none selected · some selected · with filter slot">
        <Stack gap="var(--sp-10)">
          <SelectionToolbar count={0} />
          <SelectionToolbar
            count={3}
            actions={
              <>
                <Button variant="secondary" size="sm">
                  Dismiss
                </Button>
                <Button variant="secondary" size="sm">
                  Send Invoice
                </Button>
                <Button variant="secondary" size="sm">
                  Edit
                </Button>
              </>
            }
            trailing={
              <Select
                value="all"
                options={[{ value: 'all', label: 'All Orders' }]}
                onChange={() => {}}
              />
            }
          />
        </Stack>
      </Spec>

      <Spec name="CarrierRow" states="leaderboard row, zero-padded rank">
        <div
          style={{
            border: `var(--bw-hairline) solid var(--border-hairline)`,
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
          }}
        >
          {sampleData.carriers.slice(0, 4).map((c) => (
            <CarrierRow key={c.rank} {...c} />
          ))}
        </div>
      </Spec>

      <Spec name="DonutChart" states="5 segments · with centre figure · bare · single segment">
        <Row style={{ alignItems: 'center', gap: 'var(--sp-12)' }}>
          <DonutChart
            size={170}
            thickness={28}
            centerValue="100%"
            centerLabel="Total"
            segments={sampleData.fleetSegments}
          />
          <DonutChart size={120} thickness={18} segments={sampleData.fleetSegments} />
          <DonutChart
            size={120}
            thickness={18}
            centerValue="57%"
            segments={[{ value: 57, color: 'var(--chart-1)' }]}
          />
        </Row>
      </Spec>

      <Spec name="LineChart" states="two series · highlight point + band + tooltip · no ticks">
        <Stack gap="var(--sp-12)">
          <LineChart
            height={240}
            highlightIndex={4}
            tooltip="$30,89 per munth"
            yTicks={['$10,000', '$5000', '$2000', '$1000']}
            labels={sampleData.monthLabels}
            series={[
              { data: sampleData.revenueCurrent },
              { data: sampleData.revenuePrevious, color: 'var(--chart-5)', width: 2 },
            ]}
          />
          <LineChart
            height={150}
            highlightIndex={7}
            labels={sampleData.monthLabels}
            series={[{ data: sampleData.revenuePrevious, color: 'var(--chart-5)', width: 2 }]}
          />
        </Stack>
      </Spec>

      <Spec name="BarChart" states="neutral bars · one gradient highlight · value pill · no labels">
        <Stack gap="var(--sp-12)">
          <BarChart
            height={190}
            highlightIndex={5}
            valueLabel="382"
            labels={sampleData.monthLabels}
            data={sampleData.orderBars}
          />
          <BarChart height={110} data={sampleData.orderBars} />
        </Stack>
      </Spec>

      <Spec name="MetricBarList" states="labelled percentage stack">
        <MetricBarList items={sampleData.fleet} />
      </Spec>
    </Stack>
  );
}

export function MessagingSection() {
  const [draft, setDraft] = React.useState('');
  return (
    <Stack>
      <Spec name="ChatListItem" states="default · active/selected · unread · typing · hover">
        <div
          style={{
            border: `var(--bw-hairline) solid var(--border-hairline)`,
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
            background: 'var(--surface-card)',
            maxWidth: 420,
          }}
        >
          <ChatListItem name="Harrold Tafoya" role="Carrier" typing time="05:11 PM" active />
          <ChatListItem
            name="Mate Bruney"
            role="Carrier"
            preview="Thank you. Glad to feel this …"
            time="04:17 PM"
            unread={4}
          />
          <ChatListItem
            name="Shannon Kile"
            role="Driver"
            preview="Yes, thank you…"
            time="Yesterday"
          />
        </div>
      </Spec>

      <Spec name="MessageBubble" states="own · received · read receipt · quote · attachment">
        <Stack gap="var(--sp-9)" style={{ maxWidth: 620 }}>
          <MessageBubble own time="09:44 PM" read>
            Sounds perfect. I will drop a message to Nick regarding changes.
          </MessageBubble>
          <MessageBubble own quote={{ author: 'Mate Bruney', text: 'Wa he insist on this date?' }}>
            I&apos;m afraid, yes, he wille
          </MessageBubble>
          <MessageBubble author="Harrold Tafoya" time="09:44 PM">
            Nick, payday is coming. Can you copy the invoice for our bookkeeping department?
          </MessageBubble>
          <MessageBubble
            own
            attachment={{ name: "I'm Invoice Ceva Bahn 21032023", kind: 'PDF' }}
          />
        </Stack>
      </Spec>

      <Spec name="MessageComposer" states="empty · with draft · custom tool run">
        <Stack gap="var(--sp-6)" style={{ maxWidth: 620 }}>
          <MessageComposer value={draft} onChange={setDraft} onSend={() => setDraft('')} />
          <MessageComposer
            value="A message in progress"
            onChange={() => {}}
            tools={['paperclip', 'smile']}
          />
        </Stack>
      </Spec>
    </Stack>
  );
}

export function FeedbackSection() {
  const [modal, setModal] = React.useState(false);
  const [dialog, setDialog] = React.useState(false);
  const [danger, setDanger] = React.useState(false);
  const [pick, setPick] = React.useState('carriers');
  return (
    <Stack>
      <Spec name="OptionCard" states="default · selected · hover">
        <Stack gap="var(--sp-6)" style={{ maxWidth: 520 }}>
          <OptionCard
            icon="wallet"
            title="Find Orders Manually"
            description="Manual Orders With Allow You To Analyze Every Order In More Details."
            selected={pick === 'orders'}
            onClick={() => setPick('orders')}
          />
          <OptionCard
            icon="truck"
            title="Add New Carriers"
            description="New Carriers Increase Orders Circulation And The Number Of Deals."
            selected={pick === 'carriers'}
            onClick={() => setPick('carriers')}
          />
          <OptionCard
            icon="audio-lines"
            title="Create Automation"
            description="Automated Campaigns Save Your Time In Making Super-Fast Deals"
            selected={pick === 'auto'}
            onClick={() => setPick('auto')}
          />
        </Stack>
      </Spec>

      <Spec name="StepProgress" states="early step · late step">
        <Stack gap="var(--sp-12)" style={{ maxWidth: 560 }}>
          <StepProgress
            step={7}
            total={8}
            title="Account Set Up"
            subtitle="What Do You Want To Do First?"
          />
          <StepProgress step={2} total={8} title="Account Set Up" />
        </Stack>
      </Spec>

      <Spec name="Modal · SuccessDialog" states="closed (click to open) · open · success · danger">
        <Row>
          <Button onClick={() => setModal(true)}>Open Modal</Button>
          <Button variant="secondary" onClick={() => setDialog(true)}>
            Open SuccessDialog
          </Button>
          <Button variant="danger" onClick={() => setDanger(true)}>
            Open danger dialog
          </Button>
        </Row>
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          width={520}
          header={<StepProgress step={7} total={8} title="Account Set Up" />}
          footer={
            <>
              <Button variant="secondary" size="lg" fullWidth onClick={() => setModal(false)}>
                Skip
              </Button>
              <Button variant="primary" size="lg" fullWidth onClick={() => setModal(false)}>
                Continue
              </Button>
            </>
          }
        >
          A centred dialog over a blurred scrim. Escape closes it.
        </Modal>
        <SuccessDialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="Order updated!"
          message="Your changes have been successfully applied"
        />
        <SuccessDialog
          open={danger}
          onClose={() => setDanger(false)}
          tone="danger"
          title="Something went wrong"
          message="The order could not be updated"
          actionLabel="Close"
        />
      </Spec>

      <Spec name="PromoCard" states="with illustration · text only">
        <Row style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 240 }}>
            <PromoCard image={promoRocket} body="Get special offers up to 12 months" />
          </div>
          <div style={{ width: 240 }}>
            <PromoCard title="Go Premium!" body="No illustration supplied." />
          </div>
        </Row>
      </Spec>

      <Spec name="PromoBanner" states="with collage imagery · without">
        <Stack gap="var(--card-gap)">
          <PromoBanner
            image={promoLogisticsCollage}
            title={
              <>
                Your Profile Is Currently On
                <br />
                The Free Plan
              </>
            }
            body="Get Acquire Ted With Easting Plans And Get More Now"
            actionLabel="View Plans"
          />
          <PromoBanner title="No imagery" body="The banner without the collage." />
        </Stack>
      </Spec>
    </Stack>
  );
}
