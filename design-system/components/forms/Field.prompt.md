Wrapper for a form control — label above, control in the middle, help or error below. The label is always present; never use a placeholder as the label.

```jsx
<Field label="Título" htmlFor="titulo" required>
  <TextInput id="titulo" value={titulo} onChange={setTitulo} fullWidth />
</Field>

<Field label="Valor" htmlFor="valor" error="Informe um valor válido">
  <TextInput id="valor" type="money" invalid value={valor} onChange={setValor} fullWidth />
</Field>
```

`error` replaces `help` and is announced with `role="alert"`. Pass `invalid` to the control as well so its hairline turns red. Addition, not from the source — see DESIGN.md → Form fields.
