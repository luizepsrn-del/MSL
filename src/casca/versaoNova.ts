import React from 'react';

/**
 * Saber que existe uma versão nova, e poder tomá-la.
 *
 * O operário de serviço não assume por baixo de uma sessão aberta — é uma
 * decisão do `public/sw.js`, e ela está certa. O preço dela é que a versão
 * nova fica esperando, e num app instalado na tela de início isso pode durar
 * dias: ele quase nunca navega, e sem navegação o navegador nem chega a
 * perguntar se há algo novo.
 *
 * Foi assim que uma visão nova simplesmente não apareceu no aparelho enquanto
 * já estava publicada. Então aqui: perguntar de tempos em tempos, avisar, e
 * deixar a troca na mão de quem está usando.
 */

/** De quanto em quanto tempo vale perguntar ao servidor se mudou algo. */
export const MINUTOS_ENTRE_PERGUNTAS = 30;

/** Quanto esperar o operário assumir antes de recarregar assim mesmo. */
export const SEGUNDOS_ATE_RECARREGAR = 3;

export interface VersaoNova {
  /** existe uma versão instalada esperando para assumir */
  tem: boolean;
  /** toma a versão nova e recarrega */
  atualizar: () => void;
}

/**
 * Decide se um operário recém-instalado é uma *atualização*.
 *
 * Sem `controlado`, a instalação é a primeira: não há versão anterior para
 * substituir, e avisar "tem uma versão nova" na primeira visita seria mentira.
 */
export function ehAtualizacao(estado: string, controlado: boolean): boolean {
  return estado === 'installed' && controlado;
}

export function useVersaoNova(): VersaoNova {
  const [esperando, setEsperando] = React.useState<ServiceWorker | null>(null);

  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let vivo = true;

    const anotar = (operario: ServiceWorker | null) => {
      if (operario && vivo) setEsperando(operario);
    };

    const olhar = (registro: ServiceWorkerRegistration) => {
      if (registro.waiting) {
        anotar(registro.waiting);
        return;
      }
      const novo = registro.installing;
      if (!novo) return;
      novo.addEventListener('statechange', () => {
        if (ehAtualizacao(novo.state, !!navigator.serviceWorker.controller)) anotar(novo);
      });
    };

    let relogio: number | undefined;
    let aoVoltar: (() => void) | undefined;

    void navigator.serviceWorker.getRegistration().then((registro) => {
      if (!registro || !vivo) return;

      olhar(registro);
      registro.addEventListener('updatefound', () => olhar(registro));

      const perguntar = () => void registro.update().catch(() => undefined);

      perguntar();
      relogio = window.setInterval(perguntar, MINUTOS_ENTRE_PERGUNTAS * 60_000);
      // Voltar para o app depois de um tempo é o momento mais provável de
      // haver algo novo, e num app instalado é quase o único.
      aoVoltar = () => {
        if (document.visibilityState === 'visible') perguntar();
      };
      document.addEventListener('visibilitychange', aoVoltar);
    });

    return () => {
      vivo = false;
      if (relogio !== undefined) window.clearInterval(relogio);
      if (aoVoltar) document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);

  return {
    tem: esperando !== null,

    /**
     * Toma a versão nova.
     *
     * **A recarga acontece aqui, e em lugar nenhum mais.** A primeira versão
     * disto recarregava em `controllerchange`, achando que quem assumia era
     * sempre a pessoa. Não é: o operário que estava esperando assume sozinho
     * quando o último cliente da versão anterior sai — numa recarga comum,
     * por exemplo — e aí a página se recarregava do nada. Foi visto: o aviso
     * apareceu e sumiu antes de dar para ler. Recarregar por conta própria
     * apaga o formulário que a pessoa estava preenchendo.
     *
     * Pedir para assumir é o que apaga a caixa velha; a recarga sozinha já
     * traria o código novo, porque a navegação busca o `index.html` na rede e
     * os pedaços novos têm nome novo.
     */
    atualizar: () => {
      if (!esperando) {
        window.location.reload();
        return;
      }

      let feito = false;
      const recarregar = () => {
        if (feito) return;
        feito = true;
        window.location.reload();
      };

      // Esperar o operário assumir antes de recarregar. Recarregar na linha
      // seguinte ao `postMessage` desfaz a página antes de a mensagem chegar:
      // a caixa velha ficava, e o operário novo continuava na fila.
      navigator.serviceWorker.addEventListener('controllerchange', recarregar, { once: true });
      esperando.postMessage({ tipo: 'assumir' });
      // Rede de segurança. Mesmo sem ele assumir, a recarga já traz o código
      // novo: a navegação busca o `index.html` na rede, e os pedaços novos
      // têm nome novo, que nenhuma caixa tem guardado.
      window.setTimeout(recarregar, SEGUNDOS_ATE_RECARREGAR * 1000);
    },
  };
}
