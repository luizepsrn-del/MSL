import { Card, Icon, Button } from '../../design-system';
import type { Pilar } from './navegacao';

/**
 * O que um pilar mostra antes de existir.
 *
 * Diz o que vai morar ali e não finge estar carregando. É o mesmo princípio do
 * `PlaceholderScreen` do kit de logística: declarar o vazio em vez de inventar
 * conteúdo.
 */
export function TelaEmBranco({ pilar }: { pilar: Pilar }) {
  return (
    <Card style={{ minHeight: 320 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--sp-8)',
          minHeight: 280,
          textAlign: 'center',
          padding: 'var(--sp-9) 0',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--surface-raised)',
            border: 'var(--bw-hairline) solid var(--border-hairline)',
            color: 'var(--text-muted)',
          }}
        >
          <Icon name={pilar.icone} size={24} />
        </span>

        <div style={{ minWidth: 0 }}>
          <h3 style={{ font: 'var(--type-card-title)', color: 'var(--text-heading)' }}>
            {pilar.rotulo}
          </h3>
          <p
            style={{
              font: 'var(--type-body)',
              color: 'var(--text-muted)',
              marginTop: 'var(--sp-3)',
              maxWidth: 420,
              lineHeight: 'var(--lh-normal)',
            }}
          >
            {pilar.subtitulo}. Ainda não construído — este pilar entra na sua vez, com
            modelo de dados, migração e teste antes da tela.
          </p>
        </div>

        <Button variant="outline" size="sm" iconLeft="sparkles">
          Pedir ao sistema
        </Button>
      </div>
    </Card>
  );
}
