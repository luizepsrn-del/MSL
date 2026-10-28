import React from 'react';

/**
 * Ditado por voz, no navegador.
 *
 * ## O que isto custa, dito sem rodeio
 *
 * O reconhecimento **não acontece neste aparelho**. A Web Speech API manda o
 * áudio para um servidor — da Apple no Safari, do Google no Chrome — e recebe
 * o texto de volta. Enquanto o microfone estiver ligado, o que eu falo sai
 * daqui.
 *
 * Isso contradiz o que o cartão do agente prometia ("nada sai deste
 * aparelho"), e a saída não é esconder a contradição: é o cartão passar a
 * dizer a verdade, e o ditado ser uma escolha por uso — botão que eu aperto,
 * nunca microfone aberto por conta própria. Os dados continuam locais; o que
 * viaja é a frase ditada, e só enquanto eu estiver ditando.
 *
 * ## Por que o tipo é declarado aqui
 *
 * `SpeechRecognition` não existe na biblioteca de tipos do TypeScript, e no
 * Safari o nome ainda é `webkitSpeechRecognition`. O mínimo que este arquivo
 * usa está declarado abaixo — menos que um `any`, que apagaria justamente os
 * campos cujo formato eu preciso acertar.
 */

interface ResultadoDeFala {
  readonly isFinal: boolean;
  readonly length: number;
  item(i: number): { readonly transcript: string };
  readonly [i: number]: { readonly transcript: string };
}

interface EventoDeFala extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [i: number]: ResultadoDeFala;
  };
}

interface EventoDeErroDeFala extends Event {
  readonly error: string;
}

interface Reconhecedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: EventoDeFala) => void) | null;
  onerror: ((e: EventoDeErroDeFala) => void) | null;
  onend: (() => void) | null;
}

type FabricaDeReconhecedor = new () => Reconhecedor;

function fabrica(): FabricaDeReconhecedor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: FabricaDeReconhecedor;
    webkitSpeechRecognition?: FabricaDeReconhecedor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Existe ditado neste navegador? Decidido uma vez, fora do React. */
export const DITADO_DISPONIVEL = typeof window !== 'undefined' && fabrica() !== undefined;

export type EstadoDoDitado = 'indisponivel' | 'parado' | 'ouvindo';

/**
 * A mensagem para cada falha, em português e dizendo o que fazer.
 *
 * `no-speech` não é erro: é silêncio. Tratá-lo como falha encheria a tela de
 * aviso vermelho toda vez que eu apertasse o botão e pensasse antes de falar.
 */
function recado(erro: string): string | undefined {
  switch (erro) {
    case 'no-speech':
    case 'aborted':
      return undefined;
    case 'not-allowed':
    case 'service-not-allowed':
      return 'O navegador bloqueou o microfone. Libere o acesso nas permissões do site.';
    case 'network':
      return 'O ditado precisa de internet para transcrever, e a rede falhou.';
    case 'audio-capture':
      return 'Nenhum microfone encontrado.';
    default:
      return 'O ditado parou por um erro do navegador.';
  }
}

export interface Ditado {
  estado: EstadoDoDitado;
  erro?: string;
  /** liga se estiver parado, desliga se estiver ouvindo */
  alternar(): void;
}

/**
 * O ditado ligado a um campo de texto.
 *
 * `aoTexto` recebe a frase da sessão inteira a cada atualização, já com a
 * parte provisória — é isso que faz o texto aparecer enquanto eu falo em vez
 * de surgir pronto no fim. Quem chama decide onde encaixar.
 */
export function useDitado(aoTexto: (frase: string, finalizado: boolean) => void): Ditado {
  const [estado, setEstado] = React.useState<EstadoDoDitado>(
    DITADO_DISPONIVEL ? 'parado' : 'indisponivel',
  );
  const [erro, setErro] = React.useState<string | undefined>();
  const reconhecedor = React.useRef<Reconhecedor | null>(null);

  // A referência evita recriar o reconhecedor a cada letra digitada: `aoTexto`
  // é recriada em todo render da tela, e ela está dentro dos manipuladores.
  const aoTextoRef = React.useRef(aoTexto);
  aoTextoRef.current = aoTexto;

  // Soltar o microfone ao sair da tela. Sem isto o indicador de gravação do
  // sistema fica aceso depois de eu navegar para outro lugar.
  React.useEffect(() => () => reconhecedor.current?.abort(), []);

  const alternar = React.useCallback(() => {
    if (estado === 'indisponivel') return;

    if (reconhecedor.current) {
      reconhecedor.current.stop();
      return;
    }

    const Fabrica = fabrica();
    if (!Fabrica) return;

    const r = new Fabrica();
    r.lang = 'pt-BR';
    // `continuous` desligado de propósito: o reconhecedor encerra sozinho na
    // pausa, e microfone que fica aberto esperando é o que eu menos quero aqui.
    r.continuous = false;
    r.interimResults = true;

    r.onresult = (e) => {
      let frase = '';
      let finalizado = false;
      for (let i = 0; i < e.results.length; i += 1) {
        frase += e.results[i][0].transcript;
        if (e.results[i].isFinal) finalizado = true;
      }
      aoTextoRef.current(frase.trim(), finalizado);
    };

    r.onerror = (e) => setErro(recado(e.error));

    r.onend = () => {
      reconhecedor.current = null;
      setEstado('parado');
    };

    try {
      r.start();
      reconhecedor.current = r;
      setErro(undefined);
      setEstado('ouvindo');
    } catch {
      // `start()` numa sessão que ainda não terminou estoura. Não é falha que
      // mereça recado: o estado volta para parado e o próximo toque funciona.
      reconhecedor.current = null;
      setEstado('parado');
    }
  }, [estado]);

  return { estado, erro, alternar };
}
