The 72px application bar. The utility cluster order is fixed: theme segment → credits → notifications → user chip.

```jsx
<TopBar brand={<Brand />} title="Analytics" subtitle="Data analytics and insights"
  theme="dark" onThemeChange={setTheme} credits={40} notifications={2}
  user={{ name: 'Ronald R.', role: 'Broker', rating: 4.8 }} />
```

On mobile drop `brand`/`title` into the page body and pass a hamburger via `leading`.
