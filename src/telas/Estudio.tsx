import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, Badge, Icon, IconButton, Field, TextInput } from '../../design-system';
import { useBanco } from '../dados/BancoContexto';
import { useInstagram } from '../dados/instagram';
import { lerReferencia } from '../dados/estudio';
import type { Referencia } from '../dados/esquema';
import {
  normalizarUsuario,
  ordenarReferencia,
  corpoDaPeca,
  textoDoPrompt,
  lerGerado,
  MAXIMO_DE_REFERENCIAS,
  type FormatoDoEstudio,
  type Gerado,
  type PerfilLido,
  type PostDeReferencia,
} from '../dominio/estudio';
import { legendaCurta, vezes } from '../dominio/instagram';
import { formatarNumero } from '../formato';
import { useLarguraDesktop } from '../casca/useLarguraDesktop';
import { Pilulas } from './Pilulas';

/**
 * O Estúdio: guardar posts de referência e montar o prompt do próximo post.
 *
 * O MSL não chama IA nenhuma (DECISOES.md, d). Ele monta o prompt com os meus
 * números e as referências; eu copio, levo para a IA que quiser e colo a
 * resposta de volta, que vira peça. O que fica no banco são os perfis, os
 * posts guardados com o porquê e a peça que eu salvar.
 */

const TEXTO: React.CSSProperties = { font: 'var(--type-body)', color: 'var(--text-muted)', lineHeight: 'var(--lh-normal)' };
const COLUNA: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' };
const FORTE: React.CSSProperties = { font: 'var(--fw-medium) var(--fs-md)/1.4 var(--font-core)', color: 'var(--text-body)' };

type Vista = 'gerar' | 'referencias';

const VISTAS: { valor: Vista; rotulo: string; icone: string }[] = [
  { valor: 'gerar', rotulo: 'Gerar', icone: 'sparkles' },
  { valor: 'referencias', rotulo: 'Referências', icone: 'bookmark' },
];

const FORMATOS: { valor: FormatoDoEstudio; rotulo: string }[] = [
  { valor: 'reel', rotulo: 'Reel' },
  { valor: 'carrossel', rotulo: 'Carrossel' },
];

const mensagemDe = (e: unknown) => (e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');

/** O endereço que leva ao Estúdio com o tema preenchido — para os atalhos. */
export function enderecoDoEstudio(tema: string, formato?: FormatoDoEstudio): string {
  const p = new URLSearchParams({ aba: 'estudio', tema: tema.slice(0, 500) });
  if (formato) p.set('formato', formato);
  return `/app/criacao?${p.toString()}`;
}

export function Estudio() {
  const [parametros, setParametros] = useSearchParams();
  const vista: Vista = parametros.get('vista') === 'referencias' ? 'referencias' : 'gerar';

  // O tema que um atalho mandou entra uma vez e sai do endereço: recarregar a
  // página não deve apagar o que eu já mudei no campo.
  const [inicial] = React.useState(() => ({
    tema: parametros.get('tema') ?? '',
    formato: (parametros.get('formato') === 'carrossel' ? 'carrossel' : 'reel') as FormatoDoEstudio,
  }));
  React.useEffect(() => {
    if (parametros.has('tema') || parametros.has('formato')) {
      const p = new URLSearchParams(parametros);
      p.delete('tema');
      p.delete('formato');
      setParametros(p, { replace: true });
    }
  }, [parametros, setParametros]);

  function escolherVista(v: Vista) {
    const p = new URLSearchParams(parametros);
    if (v === 'gerar') p.delete('vista');
    else p.set('vista', v);
    setParametros(p, { replace: true });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
      <Pilulas rotulo="Vista do Estúdio" opcoes={VISTAS} valor={vista} aoEscolher={escolherVista} />
      {vista === 'gerar' ? <Gerar inicial={inicial} /> : <Referencias />}
    </div>
  );
}

/* ── Gerar ───────────────────────────────────────────────────────────────── */

function Gerar({ inicial }: { inicial: { tema: string; formato: FormatoDoEstudio } }) {
  const { banco, hoje, criarPeca } = useBanco();
  const navegar = useNavigate();
  const instagram = useInstagram();
  const [formato, setFormato] = React.useState<FormatoDoEstudio>(inicial.formato);
  const [tema, setTema] = React.useState(inicial.tema);
  const [escolhidas, setEscolhidas] = React.useState<string[]>([]);
  const [prompt, setPrompt] = React.useState<string | null>(null);
  const [copiado, setCopiado] = React.useState<string | null>(null);
  const [resposta, setResposta] = React.useState('');
  const [erro, setErro] = React.useState<string | null>(null);
  const [gerado, setGerado] = React.useState<Gerado | null>(null);
  const [gancho, setGancho] = React.useState(0);
  const [ajuste, setAjuste] = React.useState('');
  const salvando = React.useRef(false);
  const campoDoPrompt = React.useRef<HTMLTextAreaElement>(null);

  const referencias = banco.referencias;
  const usadas = referencias.filter((r) => escolhidas.includes(r.id));
  const dados = instagram.estado === 'pronto' ? (instagram.dados ?? null) : null;

  function alternar(id: string) {
    setEscolhidas((atual) =>
      atual.includes(id)
        ? atual.filter((x) => x !== id)
        : atual.length >= MAXIMO_DE_REFERENCIAS
          ? atual
          : [...atual, id],
    );
  }

  function montar(comAjuste?: string) {
    if (!tema.trim()) {
      setErro('Escreva o tema do post.');
      return;
    }
    // Ajustar é sobre o que está na tela: se troquei a pílula de formato depois
    // de colar a resposta, o ajuste ainda é do formato que veio.
    const ajustando = comAjuste && gerado ? { pedido: comAjuste, anterior: gerado } : undefined;
    setErro(null);
    setCopiado(null);
    setPrompt(
      textoDoPrompt(
        {
          formato: ajustando ? ajustando.anterior.formato : formato,
          tema: tema.trim(),
          referencias: usadas.map((r) => ({
            usuario: r.usuario,
            legenda: r.legenda,
            formato: r.formato,
            curtidas: r.curtidas,
            comentarios: r.comentarios,
            porQue: r.porQue,
          })),
          ...(ajustando ? { ajuste: ajustando } : {}),
        },
        dados,
        hoje,
      ),
    );
    if (ajustando) setAjuste('');
  }

  async function copiar() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado('Prompt copiado.');
    } catch {
      // Sem permissão de área de transferência: seleciono e deixo o atalho
      // do teclado fazer o resto.
      campoDoPrompt.current?.select();
      setCopiado('Selecionei o prompt: copie com Ctrl+C ou ⌘C.');
    }
  }

  function lerResposta() {
    // A resposta tem o formato do prompt que montei por último.
    const pedido = prompt?.includes('"blocos"') ? 'reel' : prompt?.includes('"cards"') ? 'carrossel' : formato;
    const lido = lerGerado(resposta, pedido);
    if (!lido) {
      setErro('Não reconheci a resposta. Cole o texto inteiro que a IA devolveu, com as chaves { }.');
      return;
    }
    setErro(null);
    setGerado(lido);
    setGancho(0);
  }

  async function salvar() {
    if (!gerado || salvando.current) return;
    // Trava síncrona: dois toques rápidos chegam antes de o estado re-renderizar.
    salvando.current = true;
    try {
      await criarPeca({
        titulo: gerado.ganchos[gancho] ?? gerado.ganchos[0],
        tipo: gerado.formato === 'reel' ? 'roteiro' : 'carrossel',
        estado: 'rascunho',
        contexto: 'profissional',
        corpo: corpoDaPeca(gerado, gancho),
        publicadoEm: undefined,
        geradaPorIa: true,
        ...(usadas.length ? { referenciasUsadas: usadas.map((r) => r.id) } : {}),
      });
      navegar('/app/criacao');
    } catch (e) {
      // Só solta a trava se não salvou: depois de salvar, um segundo toque
      // ainda pode chegar antes de a tela trocar, e duplicaria a peça.
      salvando.current = false;
      throw e;
    }
  }

  const semNumeros = instagram.estado !== 'carregando' && instagram.estado !== 'pronto';

  return (
    <>
      <Card title="Novo post" subtitle="O MSL monta o prompt com o tema, seus números e as referências; você leva para a IA que quiser">
        <div style={COLUNA}>
          {semNumeros && (
            <p style={TEXTO}>Montando sem os seus números do Instagram. Conecte em Ajustes para o prompt usar o que já funciona com você.</p>
          )}
          <Pilulas rotulo="Formato" opcoes={FORMATOS} valor={formato} aoEscolher={setFormato} />
          <Field label="Tema" htmlFor="estudio-tema">
            <TextInput
              id="estudio-tema"
              type="multiline"
              rows={3}
              value={tema}
              onChange={setTema}
              placeholder="Ex.: por que o escritório perde cliente no WhatsApp"
              fullWidth
            />
          </Field>

          {referencias.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <span style={TEXTO}>
                Referências (até {MAXIMO_DE_REFERENCIAS}) · {usadas.length} escolhida{usadas.length === 1 ? '' : 's'}
              </span>
              <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                {referencias.map((r) => {
                  const ativa = escolhidas.includes(r.id);
                  return (
                    <Button
                      key={r.id}
                      size="sm"
                      variant={ativa ? 'primary' : 'secondary'}
                      iconLeft={ativa ? 'check' : 'plus'}
                      onClick={() => alternar(r.id)}
                      style={{ borderRadius: 'var(--r-pill)', maxWidth: '100%' }}
                    >
                      <span aria-label={`Usar referência: ${legendaCurta(r.legenda, 40)}`}>
                        @{r.usuario} · {legendaCurta(r.legenda, 28)}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Button variant="primary" size="lg" iconLeft="sparkles" onClick={() => montar()}>
              Montar prompt
            </Button>
          </div>
        </div>
      </Card>

      {prompt && (
        <Card title="Prompt" subtitle="Copie, cole na IA e traga a resposta de volta aqui">
          <div style={COLUNA}>
            <Field label="Prompt" htmlFor="estudio-prompt">
              <textarea
                id="estudio-prompt"
                ref={campoDoPrompt}
                readOnly
                value={prompt}
                rows={8}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  padding: 'var(--sp-5)',
                  borderRadius: 'var(--r-control)',
                  border: 'var(--bw-hairline) solid var(--border-default)',
                  background: 'var(--surface-input)',
                  color: 'var(--text-body)',
                  font: 'var(--type-body)',
                }}
              />
            </Field>
            <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="primary" iconLeft="copy" onClick={() => void copiar()}>
                Copiar prompt
              </Button>
              {copiado && <span style={{ ...TEXTO, color: 'var(--green-500)' }}>{copiado}</span>}
            </div>
            <Field label="Colar a resposta" htmlFor="estudio-resposta">
              <TextInput
                id="estudio-resposta"
                type="multiline"
                rows={4}
                value={resposta}
                onChange={setResposta}
                placeholder="Cole aqui o que a IA respondeu"
                fullWidth
              />
            </Field>
            <div>
              <Button variant="secondary" iconLeft="clipboard-paste" disabled={!resposta.trim()} onClick={lerResposta}>
                Ler resposta
              </Button>
            </div>
          </div>
        </Card>
      )}

      {erro && (
        <p role="alert" style={{ ...FORTE, color: 'var(--orange-500)' }}>
          {erro}
        </p>
      )}

      {gerado && (
        <Resultado
          gerado={gerado}
          gancho={gancho}
          aoEscolherGancho={setGancho}
          ajuste={ajuste}
          aoMudarAjuste={setAjuste}
          aoAjustar={() => montar(ajuste.trim())}
          aoSalvar={() => void salvar()}
        />
      )}
    </>
  );
}

function Resultado({
  gerado,
  gancho,
  aoEscolherGancho,
  ajuste,
  aoMudarAjuste,
  aoAjustar,
  aoSalvar,
}: {
  gerado: Gerado;
  gancho: number;
  aoEscolherGancho: (i: number) => void;
  ajuste: string;
  aoMudarAjuste: (v: string) => void;
  aoAjustar: () => void;
  aoSalvar: () => void;
}) {
  return (
    <Card title={gerado.formato === 'reel' ? 'Roteiro de Reel' : 'Carrossel'} subtitle="Escolha o gancho, ajuste se quiser e salve">
      <div style={COLUNA}>
        <div role="group" aria-label="Ganchos" style={{ display: 'grid', gap: 'var(--sp-3)' }}>
          {gerado.ganchos.map((g, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === gancho}
              onClick={() => aoEscolherGancho(i)}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                padding: 'var(--sp-5) var(--sp-6)',
                borderRadius: 'var(--r-card)',
                border: `var(--bw-hairline) solid ${i === gancho ? 'var(--border-accent)' : 'var(--border-hairline)'}`,
                background: i === gancho ? 'var(--accent-soft)' : 'var(--surface-raised)',
                boxShadow: i === gancho ? 'var(--glow-accent)' : 'none',
                ...FORTE,
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {gerado.formato === 'carrossel' ? (
          <ol style={{ margin: 0, paddingLeft: 'var(--sp-10)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <li style={FORTE}>{gerado.ganchos[gancho]}</li>
            {gerado.cards.map((c, i) => (
              <li key={i} style={{ ...FORTE, fontWeight: 'var(--fw-regular)', whiteSpace: 'pre-line' }}>
                {c}
              </li>
            ))}
            <li style={FORTE}>{gerado.cta}</li>
          </ol>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {gerado.blocos.map((b, i) => (
              <div key={i} style={{ padding: 'var(--sp-5)', borderRadius: 'var(--r-nav)', background: 'var(--surface-raised)' }}>
                <p style={{ ...FORTE, whiteSpace: 'pre-line' }}>{b.fala}</p>
                <p style={{ ...TEXTO, marginTop: 'var(--sp-2)' }}>
                  <Icon name="type" size={12} /> {b.tela}
                </p>
              </div>
            ))}
            <p style={FORTE}>CTA: {gerado.cta}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
            <Field label="Pedir ajuste" htmlFor="estudio-ajuste">
              <TextInput id="estudio-ajuste" value={ajuste} onChange={aoMudarAjuste} placeholder="mais curto, mais polêmico…" fullWidth />
            </Field>
          </div>
          <Button variant="secondary" iconLeft="refresh-cw" disabled={!ajuste.trim()} onClick={aoAjustar}>
            Montar prompt de ajuste
          </Button>
          <Button variant="primary" iconLeft="save" onClick={aoSalvar}>
            Salvar como peça
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ── Referências ─────────────────────────────────────────────────────────── */

function Referencias() {
  const { banco, adicionarPerfilDeReferencia, removerReferencia } = useBanco();
  const [entrada, setEntrada] = React.useState('');
  const [erro, setErro] = React.useState<string | null>(null);
  const [lendo, setLendo] = React.useState(false);

  async function adicionar() {
    const usuario = normalizarUsuario(entrada);
    if (!usuario) {
      setErro('Esse @ não parece um perfil do Instagram.');
      return;
    }
    setLendo(true);
    setErro(null);
    try {
      // Lê antes de guardar: um @ que a Meta não abre não vira bloco vazio.
      await lerReferencia(usuario);
      await adicionarPerfilDeReferencia(usuario);
      setEntrada('');
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setLendo(false);
    }
  }

  return (
    <>
      <Card title="Perfis de referência" subtitle="Contas profissionais de criadores que você quer estudar">
        <div style={COLUNA}>
          <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
              <Field label="@ do perfil" htmlFor="estudio-perfil">
                <TextInput id="estudio-perfil" value={entrada} onChange={setEntrada} placeholder="@criador ou link do perfil" fullWidth />
              </Field>
            </div>
            <Button variant="primary" iconLeft="plus" disabled={lendo} onClick={() => void adicionar()}>
              Adicionar
            </Button>
          </div>
          {erro && (
            <p role="alert" style={{ ...FORTE, color: 'var(--orange-500)' }}>
              {erro}
            </p>
          )}
        </div>
      </Card>

      <MinhasReferencias referencias={banco.referencias} aoRemover={(id) => void removerReferencia(id)} />

      {banco.perfisDeReferencia.map((p) => (
        <BlocoDoPerfil key={p.id} id={p.id} usuario={p.usuario} />
      ))}
    </>
  );
}

function MinhasReferencias({ referencias, aoRemover }: { referencias: Referencia[]; aoRemover: (id: string) => void }) {
  return (
    <section aria-label="Minhas referências">
      <Card title="Minhas referências" subtitle={referencias.length ? `${referencias.length} guardada${referencias.length === 1 ? '' : 's'}` : 'Guarde posts dos perfis abaixo com o porquê'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {referencias.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                gap: 'var(--sp-5)',
                alignItems: 'center',
                padding: 'var(--sp-4) var(--sp-5)',
                borderRadius: 'var(--r-nav)',
                background: 'var(--surface-raised)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={r.link} target="_blank" rel="noreferrer" style={{ ...FORTE, display: 'block', overflowWrap: 'anywhere' }}>
                  {legendaCurta(r.legenda, 80)}
                </a>
                <span style={{ ...TEXTO, display: 'block' }}>
                  @{r.usuario} · {formatarNumero(r.curtidas)} curtidas · {formatarNumero(r.comentarios)} comentários
                </span>
                <span style={{ display: 'block', font: 'var(--type-body)', color: 'var(--purple-400)' }}>{r.porQue}</span>
              </div>
              <IconButton icon="trash-2" label={`Tirar referência ${legendaCurta(r.legenda, 30)}`} variant="ghost" size={34} onClick={() => aoRemover(r.id)} />
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function BlocoDoPerfil({ id, usuario }: { id: string; usuario: string }) {
  const { banco, removerPerfilDeReferencia, guardarReferencia } = useBanco();
  const desktop = useLarguraDesktop() !== false;
  const [perfil, setPerfil] = React.useState<PerfilLido | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState<PostDeReferencia | null>(null);
  const [porQue, setPorQue] = React.useState('');

  React.useEffect(() => {
    let vivo = true;
    lerReferencia(usuario)
      .then((p) => vivo && setPerfil(p))
      .catch((e) => vivo && setErro(mensagemDe(e)));
    return () => {
      vivo = false;
    };
  }, [usuario]);

  const guardados = new Set(banco.referencias.map((r) => r.postId));

  async function salvar() {
    if (!guardando || !perfil || !porQue.trim()) return;
    await guardarReferencia({
      usuario: perfil.usuario,
      postId: guardando.id,
      link: guardando.link,
      legenda: guardando.legenda,
      formato: guardando.formato,
      curtidas: guardando.curtidas,
      comentarios: guardando.comentarios,
      seguidoresDoPerfil: perfil.seguidores,
      ...(guardando.miniatura ? { miniatura: guardando.miniatura } : {}),
      porQue: porQue.trim(),
    });
    setGuardando(null);
    setPorQue('');
  }

  return (
    <Card
      title={`@${usuario}`}
      subtitle={perfil ? `${perfil.nome ? `${perfil.nome} · ` : ''}${formatarNumero(perfil.seguidores)} seguidores` : erro ?? 'Lendo os posts…'}
    >
      <div style={COLUNA}>
        <div>
          <Button variant="ghost" size="sm" iconLeft="trash-2" onClick={() => void removerPerfilDeReferencia(id)}>
            Deixar de acompanhar
          </Button>
        </div>
        {guardando && (
          <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-end', flexWrap: 'wrap', padding: 'var(--sp-5)', borderRadius: 'var(--r-card)', background: 'var(--surface-raised)' }}>
            <div style={{ flex: '1 1 var(--grid-min)', minWidth: 0 }}>
              <Field label="Por que funciona?" htmlFor={`porque-${id}`} help={legendaCurta(guardando.legenda, 80)}>
                <TextInput id={`porque-${id}`} value={porQue} onChange={setPorQue} placeholder="gancho com número, polêmica no 1º card…" fullWidth />
              </Field>
            </div>
            <Button variant="primary" iconLeft="bookmark" disabled={!porQue.trim()} onClick={() => void salvar()}>
              Salvar referência
            </Button>
            <Button variant="ghost" onClick={() => setGuardando(null)}>
              Cancelar
            </Button>
          </div>
        )}
        {perfil && perfil.posts.length === 0 && <p style={TEXTO}>Esse perfil ainda não tem posts.</p>}
        {perfil && perfil.posts.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(calc(var(--grid-min) * 0.9), 1fr))' : 'repeat(2, minmax(0, 1fr))',
              gap: 'var(--card-gap)',
            }}
          >
            {ordenarReferencia(perfil).map(({ post, razao }) => (
              <CartaoDeReferencia
                key={post.id}
                post={post}
                razao={razao}
                guardado={guardados.has(post.id)}
                aoGuardar={() => {
                  setGuardando(post);
                  setPorQue(banco.referencias.find((r) => r.postId === post.id)?.porQue ?? '');
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function CartaoDeReferencia({
  post,
  razao,
  guardado,
  aoGuardar,
}: {
  post: PostDeReferencia;
  razao: number | null;
  guardado: boolean;
  aoGuardar: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        borderRadius: 'var(--r-card)',
        border: `var(--bw-hairline) solid ${guardado ? 'var(--border-accent)' : 'var(--border-hairline)'}`,
        background: 'var(--surface-card)',
        boxShadow: guardado ? 'var(--glow-accent)' : 'var(--shadow-card)',
      }}
    >
      <a href={post.link} target="_blank" rel="noreferrer" aria-label={`Abrir post: ${legendaCurta(post.legenda, 40) || 'sem legenda'}`} style={{ position: 'relative', display: 'block' }}>
        {post.miniatura ? (
          <img src={post.miniatura} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', display: 'block' }} />
        ) : (
          <span style={{ width: '100%', aspectRatio: '4 / 5', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-raised)', color: 'var(--text-subtle)' }}>
            <Icon name="image" size={28} />
          </span>
        )}
        {razao !== null && (
          <span style={{ position: 'absolute', top: 'var(--sp-4)', right: 'var(--sp-4)' }}>
            <Badge tone={razao >= 2 ? 'delivered' : 'neutral'} dot={false}>
              {vezes(razao)}
            </Badge>
          </span>
        )}
      </a>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', padding: 'var(--sp-5)' }}>
        <span style={TEXTO}>
          {formatarNumero(post.curtidas)} curtidas · {formatarNumero(post.comentarios)} comentários
        </span>
        <span style={{ ...TEXTO, color: 'var(--text-body)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {legendaCurta(post.legenda, 90)}
        </span>
        <Button variant={guardado ? 'secondary' : 'outline'} size="sm" iconLeft={guardado ? 'check' : 'bookmark'} onClick={aoGuardar}>
          <span aria-label={`Guardar ${legendaCurta(post.legenda, 60)}`}>{guardado ? 'Guardado' : 'Guardar'}</span>
        </Button>
      </div>
    </div>
  );
}
