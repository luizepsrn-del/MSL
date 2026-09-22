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
 * caminho. Quem pode furar essa fila é a pessoa, pelo aviso de versão nova —
 * é o que a mensagem `assumir` faz, logo abaixo.
 */

/**
 * A versão, carimbada no build por `scripts/carimbar-operario.mjs`.
 *
 * Ela era `'msl-v1'` escrita à mão, e nunca mudou. Como o nome da caixa vem
 * daqui, o `activate` nunca apagava nada e a cópia guardada de uma versão
 * anterior ficava válida para sempre — uma falha de rede numa abertura servia
 * o app inteiro do mês passado, e ele ficava.
 */
const VERSAO = '__VERSAO_DO_BUILD__';
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

/**
 * A pessoa pediu para assumir agora.
 *
 * O aviso de versão nova é quem manda esta mensagem, e só depois de ela
 * clicar. A regra de não trocar por baixo de uma sessão aberta continua
 * valendo para tudo o que ela não pediu.
 */
self.addEventListener('message', (evento) => {
  // `waitUntil`, e não a chamada solta: sem ele o operário pode ser desligado
  // antes de `skipWaiting` resolver, e a mensagem vira um pedido que ninguém
  // atendeu — o operário novo fica na fila e a caixa velha fica junto.
  if (evento.data?.tipo === 'assumir') evento.waitUntil(self.skipWaiting());
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

  // A conversa com o servidor nunca é guardada. Uma lista de sessões vinda do
  // cache mostraria aparelhos já revogados como se ainda estivessem lá.
  if (url.pathname.startsWith('/api/')) return;

  // Navegação: a rota é do roteador, não do servidor. `/app/tarefas` não
  // existe como arquivo — quem responde é sempre o index.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => guardar(pedido, resposta))
        .catch(async () => {
          // Nunca devolver `undefined`: `respondWith` exige uma resposta, e o
          // que acontece é a aba morrer com "Failed to convert value to
          // 'Response'" em vez de mostrar a tela guardada.
          //
          // **Só a caixa desta versão.** `caches.match` sem caixa procura em
          // todas, inclusive na da versão anterior, que ainda existe enquanto
          // o operário novo não terminou de assumir. Uma navegação que falhe
          // justo nesse instante — e ela falha, é quando o operário velho está
          // sendo desligado — ressuscitava o `index.html` antigo, que por sua
          // vez pede os pedaços antigos, que estão guardados. O app inteiro
          // voltava para a versão anterior depois de a nova já ter chegado.
          const caixa = await caches.open(CAIXA);
          const guardada = (await caixa.match('/index.html')) ?? (await caixa.match('/'));
          return guardada ?? new Response('Sem conexão e sem cópia guardada.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }),
    );
    return;
  }

  // Pedaço com hash no nome é imutável: se está guardado, está certo.
  if (url.pathname.startsWith('/assets/')) {
    evento.respondWith(
      caches.match(pedido).then(
        (guardado) =>
          guardado ??
          fetch(pedido)
            .then((resposta) => guardar(pedido, resposta))
            .catch(() => new Response('', { status: 504 })),
      ),
    );
    return;
  }

  // O resto: rede primeiro, cache quando ela falta.
  evento.respondWith(
    fetch(pedido)
      .then((resposta) => guardar(pedido, resposta))
      .catch(async () => {
        const guardada = await caches.match(pedido);
        return guardada ?? new Response('', { status: 504 });
      }),
  );
});
