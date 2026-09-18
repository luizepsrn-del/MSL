import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// The design system's stylesheet is imported once, here, and nowhere else.
import '../design-system/styles.css';

import { createElement, icons } from 'lucide';

import { ThemeProvider } from './theme';
import { ProvedorBanco } from './dados/BancoContexto';
import { App } from './App';

/**
 * Os ícones passam a viajar no pacote, e não a vir de um CDN.
 *
 * Sem isto o sistema instalado abre sem um ícone sequer quando não há rede —
 * que é justamente quando ele precisa abrir.
 *
 * O conjunto inteiro, e não uma lista curada: metade dos nomes usados aqui
 * está dentro de ternário ou de tabela, onde nenhum recorte por texto os
 * acharia. Ícone que falta não estoura — desenha um quadrado vazio, calado.
 * Isso já mordeu uma vez neste projeto e não vale a economia.
 *
 * Importado de forma estática, e não em pedaço à parte: `Icon` espera por
 * `window.lucide` por dois segundos e depois desiste, desenhando um quadrado
 * vazio para sempre. Num telefone em rede ruim esse prazo estoura. Assim ele
 * está pronto antes do primeiro render, sempre — o preço é o pacote maior na
 * primeira visita, e o operário de serviço guarda isso para as seguintes.
 *
 * O contrato é o mesmo; só a origem mudou.
 */
window.lucide = {
  icons,
  // A biblioteca declara `unknown` porque não conhece os tipos do Lucide; o
  // estreitamento acontece aqui, num lugar só.
  createElement: (node) => createElement(node as Parameters<typeof createElement>[0]),
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ProvedorBanco>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProvedorBanco>
    </ThemeProvider>
  </React.StrictMode>,
);
