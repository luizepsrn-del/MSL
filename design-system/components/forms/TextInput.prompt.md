Free-text entry. One control for text, multi-line, number, date, time and money — `type` decides, so there is no separate date or money component.

```jsx
<TextInput id="titulo" value={titulo} onChange={setTitulo} fullWidth />
<TextInput id="nota" type="multiline" value={nota} onChange={setNota} fullWidth />
<TextInput id="valor" type="money" placeholder="0,00" value={valor} onChange={setValor} />
<TextInput id="quando" type="date" value={quando} onChange={setQuando} />
```

Always wrap it in a `Field` — it carries no label of its own. `multiline` grows with its content rather than scrolling. `money` stays a text input so the pt-BR comma survives typing; parse it with `lerMoeda` from `src/formato`. Use `size="lg"` (44px) on touch surfaces. Addition, not from the source — see DESIGN.md → Form fields.
