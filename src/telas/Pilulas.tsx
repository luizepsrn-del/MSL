import { Button } from '../../design-system';

/** Uma fileira de pílulas: a escolhida em roxo cheio, as outras discretas. */
export function Pilulas<T extends string | number>({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
}: {
  rotulo: string;
  opcoes: { valor: T; rotulo: string; icone?: string }[];
  valor: T;
  aoEscolher: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={rotulo} style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
      {opcoes.map((o) => (
        <Button
          key={String(o.valor)}
          size="sm"
          variant={o.valor === valor ? 'primary' : 'ghost'}
          iconLeft={o.icone}
          onClick={() => aoEscolher(o.valor)}
          style={{ borderRadius: 'var(--r-pill)' }}
        >
          {o.rotulo}
        </Button>
      ))}
    </div>
  );
}
