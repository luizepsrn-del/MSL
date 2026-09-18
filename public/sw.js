/*
 * O operário de serviço.
 *
 * Existe por um motivo só: o sistema precisa abrir sem rede. Ele é instalado
 * na tela de início do iPhone e do Mac e usado todo dia, inclusive no metrô e
 * no avião. Sem isto, abrir sem sinal mostra a tela de dinossauro.
 *
 * Ele guarda arquivo, e não dado. Os meus dados vivem no armazenamento local,
 * e é o fato de estar instalado — não este arquivo — que os tira da regra dos
 * sete dias do Safari.
 *
 * Sem `skipWaiting` de propósito: uma versão nova assume no próximo
 * carregamento, e não por baixo de uma sessão aberta. Trocar os pedaços de
 * JavaScript enquanto a página está de pé é como um pedido some no meio do
 * caminho.
 */

const VERSAO = 'msl-v1';
const CAIXA = `caixa-${VERSAO}`;

/**
 * O mínimo para a primeira tela existir sem rede.
 *
 * Os pedaços com hash no nome não entram aqui — o nome muda a cada build.
 * Eles são guardados quando pedidos pela primeira vez, logo no primeiro uso
 * com rede.
 */
const ESSENCIAL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icones/icone-192.png',
  '/icones/icone-512.png',
  '/icones/apple-touch-icon.png',
  '/design-system/assets/favicon.svg',
];

/**
 * Os pedaços que o index carrega, lidos do próprio index.
 *
 * O nome deles tem hash e muda a cada build, então não dá para listá-los à
 * mão. Sem isto, só entram no cache quando pedidos — ou seja, a partir da
 * segunda visita. Quem instalasse e entrasse no avião em seguida abriria uma
 * tela branca, que é exatamente o caso que este arquivo existe para cobrir.
 */
async function pedacosDoIndex() {
  try {
    const html = await (await fetch('/index.html', { cache: 'reload' })).text();
    return [...html.matchAll(/["'](\/assets\/[A-Za-z0-9._-]+)["']/g)].map((m) => m[1]);
  } catch {
    // Sem rede na instalação não há o que guardar; a próxima visita resolve.
    return [];
  }
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const caixa = await caches.open(CAIXA);
      // `reload` para não guardar o que o navegador já tinha em cache HTTP, que
      // pode ser a versão anterior do index.
      await caixa.addAll(ESSENCIAL.map((url) => new Request(url, { cache: 'reload' })));
      const pedacos = await pedacosDoIndex();
      // Um a um: um pedaço que falhe não pode derrubar a instalação inteira.
      await Promise.all(pedacos.map((url) => caixa.add(url).catch(() => undefined)));
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CAIXA).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Guarda uma cópia sem travar a resposta que já está indo para a página. */
function guardar(pedido, resposta) {
  if (!resposta || resposta.status !== 200 || resposta.type !== 'basic') return resposta;
  const copia = resposta.clone();
  void caches.open(CAIXA).then((caixa) => caixa.put(pedido, copia));
  return resposta;
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;

  // Só GET, e só o que é deste site. POST não se guarda, e não há mais nada
  // vindo de fora desde que os ícones passaram a viajar no pacote.
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: a rota é do roteador, não do servidor. `/app/tarefas` não
  // existe como arquivo — quem responde é sempre o index.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => guardar(pedido, resposta))
        .catch(() => caches.match('/index.html').then((r) => r ?? caches.match('/'))),
    );
    return;
  }

  // Pedaço com hash no nome é imutável: se está guardado, está certo.
  if (url.pathname.startsWith('/assets/')) {
    evento.respondWith(
      caches.match(pedido).then(
        (guardado) =>
          guardado ?? fetch(pedido).then((resposta) => guardar(pedido, resposta)),
      ),
    );
    return;
  }

  // O resto: rede primeiro, cache quando ela falta.
  evento.respondWith(
    fetch(pedido)
      .then((resposta) => guardar(pedido, resposta))
      .catch(() => caches.match(pedido)),
  );
});
