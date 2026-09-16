Centred dialog over a blurred scrim. Escape and scrim click both close.

```jsx
<Modal open={open} onClose={close} width={760}
  header={<><StepProgress step={7} total={8} title="Account Set Up" subtitle="What Do You Want To Do First?" /></>}
  footer={<><Button variant="secondary" fullWidth>Skip</Button><Button fullWidth>Continue</Button></>}>
  …OptionCards…
</Modal>
```
