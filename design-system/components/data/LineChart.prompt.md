Smoothed line chart for trends. Two series max — current purple, comparison neutral.

```jsx
<LineChart height={240} highlightIndex={4} tooltip="$30,89 per month"
  yTicks={['$10,000', '$5000', '$2000', '$1000']}
  labels={['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']}
  series={[{ data: current }, { data: previous, color: 'var(--chart-5)', width: 2 }]} />
```
