const { Card } = window.MySystemLifeDesignSystem_265e57 || {};

/* The source material covers five views. The remaining sidebar destinations
   are intentionally left blank rather than invented. */
function PlaceholderScreen({ name }) {
  return (
    <Card style={{ minHeight: 320 }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 'var(--sp-6)', height: 280, textAlign: 'center',
      }}>
        <h3 style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)' }}>{name}</h3>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', maxWidth: 380, lineHeight: 'var(--lh-normal)' }}>
          Not designed in the source material. Left blank on purpose — Overview, Orders,
          Automations, Analytics and Messages are the five views the kit covers.
        </p>
      </div>
    </Card>
  );
}

Object.assign(window, { PlaceholderScreen });
