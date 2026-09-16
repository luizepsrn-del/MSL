const { Card, Button, StatCard, CarrierRow, DonutChart, MetricBarList, LineChart, Pagination, IconButton } = window.MySystemLifeDesignSystem_265e57 || {};

function CarrierHeader() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '28px minmax(0,2fr) 90px minmax(0,1fr) minmax(0,1fr) 40px',
      gap: 'var(--sp-6)', minHeight: 44, alignItems: 'center', padding: '0 var(--sp-8)',
      background: 'var(--surface-raised)', font: 'var(--type-body)', color: 'var(--text-muted)',
    }}>
      <span /><span>Company</span><span>Reviews</span><span>Vehicles</span><span>Partners</span>
      <span style={{ justifySelf: 'end' }}>Action</span>
    </div>
  );
}

function OverviewScreen() {
  const D = window.MSL_DATA;
  const [page, setPage] = React.useState(2);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 'var(--card-gap)' }}>
        {D.kpis.map(k => <StatCard key={k.label} {...k} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.75fr) minmax(0,1fr)', gap: 'var(--card-gap)', alignItems: 'start' }}>
        <Card flush title="Top Carriers" bodyStyle={{ paddingBottom: 'var(--card-pad-lg)' }}
          action={<Button variant="secondary" size="sm" iconRight="arrow-right">See All</Button>}>
          <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--r-lg)', overflow: 'hidden', margin: '0 var(--card-pad-lg)' }}>
            <CarrierHeader />
            {D.carriers.map(c => <CarrierRow key={c.rank} {...c} />)}
          </div>
          <div style={{ padding: 'var(--sp-9) var(--card-pad-lg) 0' }}>
            <Pagination page={page} total={6} onChange={setPage} />
          </div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
          <Card title="Top Carriers" action={<Button variant="secondary" size="sm" iconRight="arrow-right">See All</Button>}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-10)' }}>
              <DonutChart size={170} thickness={28} centerValue="100%" centerLabel="Total"
                segments={[
                  { value: 57, color: 'var(--chart-1)' },
                  { value: 18, color: 'var(--chart-2)' },
                  { value: 9, color: 'var(--chart-3)' },
                  { value: 7, color: 'var(--chart-4)' },
                  { value: 9, color: 'var(--chart-5)' },
                ]} />
              <MetricBarList style={{ width: '100%' }} items={D.fleet} />
            </div>
          </Card>
          <Card title="Average Revenue" onMenuClick={() => {}}>
            <strong style={{ display: 'block', font: 'var(--type-metric)', color: 'var(--text-heading)', marginBottom: 'var(--sp-6)' }}>$1015,48</strong>
            <LineChart height={150} highlightIndex={7} yTicks={[]} labels={D.monthLabels}
              series={[{ data: D.revenuePrevious, color: 'var(--chart-5)', width: 2 }]} />
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OverviewScreen });
