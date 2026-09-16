import React from 'react';
import {
  Card,
  Button,
  StatCard,
  PromoBanner,
  DonutChart,
  MetricBarList,
  LineChart,
  BarChart,
  Radio,
  promoLogisticsCollage,
} from '../../components';
import type { LineSeries } from '../../components';
import {
  kpis,
  fleet,
  fleetSegments,
  monthLabels,
  orderBars,
  revenueCurrent,
  revenuePrevious,
} from '../data';

export interface AnalyticsScreenProps {
  onViewPlans?: () => void;
}

/** Analytics — plan banner, KPI row, Monthly Revenue line chart, Orders bar chart, fleet donut. */
export function AnalyticsScreen({ onViewPlans }: AnalyticsScreenProps) {
  const [series, setSeries] = React.useState('last');

  const shown: LineSeries[] =
    series === 'last'
      ? [{ data: revenueCurrent }, { data: revenuePrevious, color: 'var(--chart-5)', width: 2 }]
      : [{ data: revenuePrevious, color: 'var(--chart-5)', width: 2 }, { data: revenueCurrent }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <PromoBanner
        image={promoLogisticsCollage}
        title={
          <>
            Your Profile Is Currently On
            <br />
            The Free Plan
          </>
        }
        body={
          <>
            Get Acquire Ted With Easting Plans
            <br />
            And Get More Now
          </>
        }
        actionLabel="View Plans"
        onAction={onViewPlans}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
          gap: 'var(--card-gap)',
        }}
      >
        {kpis.map((k) => (
          <StatCard key={k.label} {...k} />
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.75fr) minmax(0,1fr)',
          gap: 'var(--card-gap)',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
          <Card title="Monthly Revenue" onMenuClick={() => {}}>
            <Radio
              style={{ marginBottom: 'var(--sp-9)' }}
              value={series}
              onChange={setSeries}
              options={[
                { value: 'last', label: 'Last Year' },
                { value: 'prev', label: 'Previous Year' },
              ]}
            />
            <LineChart
              height={260}
              highlightIndex={4}
              tooltip="$30,89 per munth"
              yTicks={['$10,000', '$5000', '$2000', '$1000']}
              labels={monthLabels}
              series={shown}
            />
          </Card>
          <Card title="Orders" onMenuClick={() => {}}>
            <BarChart
              height={190}
              highlightIndex={5}
              valueLabel="382"
              labels={monthLabels}
              data={orderBars}
            />
          </Card>
        </div>
        <Card
          title="Top Carriers"
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
              gap: 'var(--sp-10)',
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
      </div>
    </div>
  );
}
