import type { SidebarSection } from '../../design-system';

/**
 * A navegação do produto.
 *
 * Os seis pilares do sistema, em português. Isto é dado, não código — trocar
 * a estrutura do sistema é editar esta lista.
 *
 * Vida pessoal e profissional convivem aqui dentro, separadas por um eixo de
 * contexto e não por dois aplicativos. O eixo entra com o primeiro pilar.
 */

export interface Pilar {
  /** o segmento da rota: /app/<id> */
  id: string;
  rotulo: string;
  /** nome kebab-case do Lucide */
  icone: string;
  subtitulo: string;
}

export const PILARES: Pilar[] = [
  {
    id: 'inicio',
    rotulo: 'Início',
    icone: 'layout-dashboard',
    subtitulo: 'O dia de hoje em uma tela',
  },
  {
    id: 'rotina',
    rotulo: 'Rotina',
    icone: 'repeat',
    subtitulo: 'O que se repete, e o que já foi feito hoje',
  },
  {
    id: 'tarefas',
    rotulo: 'Tarefas',
    icone: 'clipboard-check',
    subtitulo: 'O que precisa ser feito, com prazo',
  },
  {
    id: 'calendario',
    rotulo: 'Calendário',
    icone: 'calendar',
    subtitulo: 'Compromissos e prazos no tempo',
  },
  {
    id: 'projetos',
    rotulo: 'Projetos',
    icone: 'layers',
    subtitulo: 'Trabalho maior que uma tarefa',
  },
  {
    id: 'financeiro',
    rotulo: 'Financeiro',
    icone: 'wallet',
    subtitulo: 'Entradas, saídas e o saldo previsto',
  },
  {
    id: 'metas',
    rotulo: 'Metas',
    icone: 'target',
    subtitulo: 'O alvo, e a distância até ele',
  },
];

/**
 * O agente.
 *
 * A rota continua sendo `/app/pedir`: o endereço é interface, e o que mudou
 * foi o que a tela faz, não onde ela mora.
 */
export const EXTENSAO: Pilar = {
  id: 'pedir',
  rotulo: 'Agente',
  icone: 'sparkles',
  subtitulo: 'Pergunte, peça um relatório, mande fazer',
};

/**
 * As regras.
 *
 * Fica em Ferramentas, e não entre os pilares: não é um lugar onde eu guardo
 * coisa, é um lugar onde eu ensino o sistema a reparar em coisa.
 */
export const REGRAS: Pilar = {
  id: 'regras',
  rotulo: 'Automações',
  icone: 'zap',
  subtitulo: 'Quando tal coisa acontecer, faça tal outra',
};

export const AJUSTES: Pilar = {
  id: 'ajustes',
  rotulo: 'Ajustes',
  icone: 'settings',
  subtitulo: 'Preferências, dados e backup',
};

/** As seções como o `Sidebar` as consome. */
export const SECOES: SidebarSection[] = [
  {
    label: 'Sistema',
    items: PILARES.map((p) => ({ id: p.id, label: p.rotulo, icon: p.icone })),
  },
  {
    label: 'Ferramentas',
    items: [EXTENSAO, REGRAS, AJUSTES].map((p) => ({ id: p.id, label: p.rotulo, icon: p.icone })),
  },
];

const TODOS = [...PILARES, EXTENSAO, REGRAS, AJUSTES];

export const porId = (id: string): Pilar | undefined => TODOS.find((p) => p.id === id);

export const PILAR_INICIAL = PILARES[0].id;
