# Acervo na Criação — o desenho

Data: 2026-09-24. Esquema hoje na versão 18; este trabalho sobe para 19.

## O pedido

Uma área de documentação dentro da Criação, que guarde documentos e imagens de
verdade — abríveis depois, dentro do MSL — e sirva de lugar para registrar o que
foi criado.

O pedido cobre três propósitos em pé de igualdade: biblioteca de arquivos,
base de conhecimento e registro das criações.

## O que já existia, e por que quase serve

A `Peca` já cobre texto longo: tem `tipo: 'documento'`, `corpo`, `estado` até
`publicado`, `etiquetas` e busca. O comentário dela no `esquema.ts` argumenta
contra coleções quase iguais: *"A alternativa seria cinco coleções quase iguais,
e a primeira regra nova só chegaria a uma delas."*

Esse argumento vale aqui. Uma coleção `documentos` com título, corpo e etiquetas
seria a sexta coleção quase igual. O que falta de verdade no sistema não é outro
texto: é o binário, que hoje não tem lugar nenhum.

Então "base de conhecimento" e "registro das criações" já têm casa — a peça. O
trabalho é dar casa ao arquivo, e ligar o arquivo à peça.

## A restrição que decidiu a arquitetura

O banco inteiro é um JSON só, em `localStorage` (~5 MB no total), espelhado como
um blob único no Redis a cada sincronização. Uma foto de celular em base64
estoura isso, e a sincronização passaria a mandar o acervo inteiro a cada toque.

Logo: **o byte não pode morar no banco.** O banco guarda a ficha; o byte mora
num acervo de objetos no servidor.

Descartado no caminho:

| caminho | por que não |
|---|---|
| só link externo (Drive/Notion) | o pedido é explícito: o arquivo fica salvo no MSL, e link quebra |
| IndexedDB local | não sincroniza, não entra no backup, e o Safari despeja em 7 dias fora da tela de início |
| base64 no banco | estoura o `localStorage` e infla toda sincronização |

Serviço escolhido: **Vercel Blob** — mesma conta e mesmo painel já em uso, uma
variável de ambiente nova (`BLOB_READ_WRITE_TOKEN`).

## O dado

`VERSAO_ESQUEMA` sobe para 19. Uma coleção nova e um campo opcional.

```ts
export interface Arquivo extends Registro {
  /** o nome que eu vejo e posso trocar */
  titulo: string;
  /** o nome de origem, preservado, porque é o que eu reconheço em Downloads */
  nomeOriginal: string;
  /** o media type declarado no envio: `image/png`, `application/pdf` */
  mime: string;
  /** bytes. Guardado porque o acervo não diz o tamanho sem uma ida à rede */
  tamanho: number;
  /** o endereço no acervo. Nunca uma URL: URL é credencial, e envelhece */
  chave: string;
  contexto: Contexto;
  descricao?: string;
  etiquetas?: string[];
  rotuloId?: string;
  projetoId?: string;
}
```

Na `Peca`:

```ts
/** ids de `arquivos`. Pode apontar para arquivo que não existe mais — o
 *  domínio ignora o órfão em vez de quebrar, como `projetoId` já faz. */
anexos?: string[];
```

O que não é guardado, de propósito:

- **o tipo** (imagem/pdf/html/texto/outro) — derivado do `mime`. Campo gravado
  poderia discordar do arquivo real, e situação derivada nunca se guarda.
- **a URL** — derivada da `chave` no momento de abrir.

`COLECOES` e `ROTULO_COLECAO` ganham `arquivos: ['arquivo', 'arquivos']`. Como
`juntar` é genérico sobre `COLECOES`, a sincronização entre aparelhos, a amostra
do Agente e o painel de Ajustes passam a contar arquivos sem uma linha a mais.

## A migração

18 → 19, aditiva, escrita antes de existir dado para migrar:
`arquivos: []`, e `anexos` fica ausente em toda peça atual.

## O domínio

`src/dominio/acervo.ts`, em Vitest antes de qualquer tela.

| função | o que decide |
|---|---|
| `tipoDoArquivo(mime)` | `imagem \| pdf \| html \| texto \| outro`, derivado |
| `abreNoNavegador(mime)` | se dá para ver dentro do MSL ou só baixar |
| `chaveDe(id, nomeOriginal)` | o endereço no acervo, sem acento e sem espaço |
| `validarArquivo(dados)` | espelha `validarPeca`: título, mime, tamanho > 0 |
| `filtrarArquivos(lista, filtro)` | busca, tipo, contexto, etiqueta |
| `resumirAcervo(lista)` | quantos e quanto ocupam, por tipo |
| `anexosDe(banco, peca)` | resolve ids em fichas, descartando órfãos |
| `LIMITE_POR_ARQUIVO` | 10 MB, recusado antes de subir |

`formatarTamanho(bytes)` entra em `src/formato`, não no domínio: formatação não
se espalha pela tela.

**Teto de 10 MB.** Cabe foto de celular, print, PDF de contrato e HTML; não cabe
vídeo. Mantém o envio dentro do limite de corpo da função da Vercel sem
malabarismo, e faz do 1 GB gratuito uma centena de arquivos com folga. Vídeo
exigiria envio em pedaços ou direto para o Blob, que é outro trabalho.

## O servidor

`src/servidor/acervo.ts`, com a mesma forma estreita do `Armazem`:

```ts
export interface Acervo {
  guardar(chave: string, bytes: ArrayBuffer, mime: string): Promise<void>;
  ler(chave: string): Promise<{ bytes: ArrayBuffer; mime: string } | null>;
  apagar(chave: string): Promise<void>;
}
```

`AcervoMemoria` (um `Map`) para o Vitest; `AcervoBlob` falando HTTP direto com
`blob.vercel-storage.com` via `fetch`, sem `@vercel/blob`, como o `ArmazemRedis`
já faz — *"sem SDK de propósito"*.

**Ressalva registrada:** o REST do Upstash é contrato público e documentado; o
do Vercel Blob não é — o contrato público deles é o SDK. "Sem SDK" custa mais
risco aqui do que custou no Redis. Segue sem SDK com o `x-api-version` fixado,
porque o `Acervo` é uma interface: se a superfície mudar, trocar por SDK mexe em
um arquivo e em nenhum teste.

Três rotas em `api/arquivo.ts`, todas atrás de `validarSessao`:

| rota | o que faz |
|---|---|
| `POST /api/arquivo` | recebe os bytes, confere o teto, grava, devolve a chave |
| `GET /api/arquivo?chave=…` | lê do acervo e devolve com o `Content-Type` certo |
| `DELETE /api/arquivo?chave=…` | apaga o binário |

O `GET` passa pela função em vez de devolver a URL pública do Blob. Custa banda
e um salto; ganha o arquivo ficar atrás da sessão. URL pública do Blob é legível
por quem a tiver, para sempre — o mesmo problema já nomeado no endereço iCal
("o endereço é uma senha"), e sem motivo para repetir.

## O que fica pior do que hoje

Dois, declarados e não escondidos:

- **O acervo não funciona offline.** O resto do MSL funciona, porque o banco
  está no `localStorage`. Arquivo exige rede. Cache no `sw.js` do que já foi
  aberto é fase própria, não brinde desta.
- **Apagar tem duas metades.** A ficha sai do banco com lápide; o binário sai do
  Blob por uma chamada que pode falhar. Se falhar, sobra byte órfão pagando
  armazenamento. É preferível ao inverso — ficha apontando para nada — e um
  "limpar órfãos" em Ajustes resolve depois.

## A biblioteca

Um componente novo, e só um: **`FileDrop`**, em `design-system/components/forms/`,
com `.prompt.md` ao lado e registro no `DESIGN.md`.

Prova de que nenhum existente serve: `core` tem Avatar, Badge, Button, Card,
Icon, IconButton, ProgressBar, Tag; `forms` tem Checkbox, Field, Radio,
SearchInput, Select, Switch, TextInput; `data`, `messaging` e `feedback` não
tratam entrada de arquivo. Nenhum recebe arquivo.

O resto da tela sai do que já existe: `Card`, `Icon`, `Badge`, `Tag`,
`ProgressBar`, `Modal`, `SearchInput`, `StatCard`.

Se a zona de arrastar precisar de borda tracejada e não houver token, o token
nasce em `design-system/tokens/` e o `DESIGN.md` muda **antes** do código.

## A tela

Na Criação, o trilho de tiles ganha uma segunda vista, **Acervo**:

- grade de arquivos, com busca e filtro por tipo, contexto e etiqueta
- `resumirAcervo` em `StatCard`: quantos arquivos e quanto ocupam
- imagem e PDF abrem no `Modal`; HTML e o resto baixam
- no editor da peça, uma faixa de anexos usando o mesmo `FileDrop`

## A exportação

Entra neste trabalho. Sem ela, `exportar()` deixaria de devolver tudo que existe
— e é ele que garante que o dado é meu.

Exportar passa a produzir um `.zip` com `banco.json` e uma pasta de arquivos,
escrito à mão sem dependência nova, no mesmo espírito do PDF que sai da
impressão do navegador. Importar aceita os dois: o `.zip` completo e o `.json`
puro de antes.

## As fases

Cada uma fecha sozinha, com `npm run verificar && npm run build` verde e um
commit pequeno em português.

1. **O dado** — esquema v19, migração 18→19, `dominio/acervo.ts`,
   `formatarTamanho` em `src/formato`, tudo em Vitest. Zero tela.
2. **O servidor** — `Acervo`, `AcervoMemoria`, `AcervoBlob`, as três rotas,
   testadas com o acervo em memória.
3. **O componente** — `DESIGN.md` primeiro, depois `FileDrop` e o `.prompt.md`.
4. **A tela** — vista Acervo na Criação, anexos no editor, `test:e2e`.
5. **A exportação** — o `.zip` com `banco.json` e a pasta de arquivos.
