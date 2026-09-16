import React from 'react';

/**
 * Responde se a casca de desktop cabe na janela.
 *
 * O número **não** é escrito aqui: sai de `--bp-desktop`, que por sua vez é
 * derivado das medidas do shell — rail 224 + goteira 20 + mínimo de conteúdo
 * 960 + goteira 20. Veja DESIGN.md → Layout.
 *
 * Devolve `null` enquanto ainda não dá para saber. Isso importa: em
 * desenvolvimento o Vite injeta o CSS por JavaScript, então na primeira
 * avaliação o token ainda não existe. Ler uma vez e desistir escolhia desktop
 * para sempre — era assim que o iPhone continuava recebendo o rail de 224px
 * mesmo depois desta casca existir. Quem chama não renderiza casca nenhuma
 * enquanto for `null`, em vez de piscar a errada.
 */
export function useLarguraDesktop(): boolean | null {
  const [cabe, setCabe] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let vivo = true;
    let mq: MediaQueryList | null = null;
    const aoMudar = () => vivo && setCabe(mq!.matches);

    const tentar = () => {
      if (!vivo) return;
      mq = leMedia();
      if (!mq) {
        // O CSS ainda não chegou. Tenta de novo no próximo quadro.
        requestAnimationFrame(tentar);
        return;
      }
      setCabe(mq.matches);
      mq.addEventListener('change', aoMudar);
    };

    tentar();
    return () => {
      vivo = false;
      mq?.removeEventListener('change', aoMudar);
    };
  }, []);

  return cabe;
}

function leMedia(): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) return null;
  const valor = getComputedStyle(document.documentElement)
    .getPropertyValue('--bp-desktop')
    .trim();
  // Repetir o número aqui criaria uma segunda fonte de verdade — e a regra de
  // aderência reprova, com razão.
  if (!valor) return null;
  return window.matchMedia(`(min-width: ${valor})`);
}
