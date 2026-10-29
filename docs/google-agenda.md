# Ligar o Google Agenda nos dois sentidos

Isto se faz **uma vez**. Depois o MSL conversa com o seu Google sozinho.

O que você vai obter no fim: um **Client ID** e um **Client Secret**, que vão em
duas variáveis na Vercel. Nenhum dos dois entra no código — o repositório é
público.

---

## 1. Criar o projeto no Google Cloud

1. Abra <https://console.cloud.google.com/>.
2. No seletor de projeto, em cima, clique em **Novo projeto**.
3. Nome: `My System Life`. Criar.
4. Espere terminar e **selecione o projeto novo** no seletor.

## 2. Ligar a API do Calendário

1. Menu ☰ › **APIs e serviços** › **Biblioteca**.
2. Procure por **Google Calendar API**.
3. Abra e clique em **Ativar**.

## 3. A tela de consentimento

> **O Google reorganizou esta parte.** O menu antigo chamava-se *Tela de
> consentimento OAuth* e tinha tudo numa página; o novo chama-se **Google Auth
> Platform** e reparte em *Personalização*, *Público-alvo*, *Acesso a dados* e
> *Verificação*. Abaixo vão os dois nomes de cada coisa — use o que aparecer
> na sua tela.

1. **APIs e serviços** › **Tela de permissão OAuth**. Se cair numa página
   chamada *Google Auth Platform*, é a nova, e está certo.
2. Se ele pedir para começar: tipo de usuário **Externo**, nome do app
   `My System Life`, e-mail de suporte e e-mail do desenvolvedor — os seus.
3. Vá em **Acesso a dados** (ou *Escopos*, no menu antigo) ›
   **Adicionar ou remover escopos**, procure por `calendar.events` e marque:

   ```
   https://www.googleapis.com/auth/calendar.events
   ```

   É o escopo que permite **ver e editar eventos**. Não peço a lista de agendas
   nem nada além disso.
4. Salvar.

## 4. Sair do modo de testes — o passo que o Google esconde

**Este é o passo que bloqueia todo mundo.** Enquanto o app está em *Testes*, o
Google recusa o acesso com esta tela:

> *Acesso bloqueado: o app não concluiu o processo de verificação do Google.
> Ele está em fase de testes e só pode ser acessado por testadores aprovados
> pelo desenvolvedor. Erro 403: access_denied*

Vá em **Público-alvo** (no menu antigo: a própria *Tela de consentimento
OAuth*, no bloco *Status da publicação*, lá em cima). Daí há **dois caminhos**,
e o primeiro é melhor:

### Caminho A — publicar o app (recomendado)

Clique em **PUBLICAR APP** e confirme.

O Google vai avisar que a verificação é necessária para escopos sensíveis.
**Confirme assim mesmo.** A verificação — aquela que pede vídeo e revisão —
serve para tirar a tela de aviso e para passar de 100 usuários. Você é um, e
passa pelo aviso uma vez.

Depois disso, ao conectar, você verá *"O Google não verificou este app"*.
Clique em **Avançado** › **Acessar My System Life (não seguro)**. É o seu
próprio app.

### Caminho B — continuar em testes, e se cadastrar como testador

Se o botão de publicar pedir campos que você não tem (política de privacidade,
domínio verificado), fique em *Testes* e, na mesma página **Público-alvo**,
vá em **Usuários de teste** › **Adicionar usuários** e ponha o seu próprio
e-mail. Salvar.

Funciona na hora. **O preço:** neste modo o Google expira o acesso a cada
7 dias, e você vai precisar clicar em *Conectar* de novo toda semana.

**Atenção:** quando o acesso expira, o cartão em Ajustes ainda diz
**"Conectada"** até o MSL tentar falar com o Google. Na primeira tentativa que
falhar o cartão passa a dizer **"Não conectada"**, mostra o aviso *"Reconecte a
agenda em Ajustes"* e volta a oferecer o botão **Conectar**. Se quem descobriu
foi um pedido ao agente, o cartão só percebe na próxima vez que você abrir
Ajustes. Clique em Conectar e autorize de novo. Se o cartão ainda estiver em "Conectada", clique em **Sincronizar agora**
para ele perceber.

## 5. Criar as credenciais

1. **APIs e serviços** › **Credenciais** › **Criar credenciais** ›
   **ID do cliente OAuth**.
2. Tipo de aplicativo: **Aplicativo da Web**.
3. Nome: `MSL`.
4. Em **URIs de redirecionamento autorizados**, clique em **Adicionar URI** e
   cole **exatamente** isto:

   ```
   https://msl-delta.vercel.app/api/google-callback
   ```

   Sem barra no fim. Se não bater caractere por caractere, o Google recusa.
5. Criar. Aparece uma janela com **ID do cliente** e **Chave secreta do
   cliente**. Deixe aberta — é o que vai para o passo 6.

## 6. Guardar as duas na Vercel

1. Abra <https://vercel.com/> › o projeto **MSL** › **Settings** ›
   **Environment Variables**.
2. Crie as duas, marcando os três ambientes (Production, Preview, Development):

   | Nome | Valor |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | o ID do cliente |
   | `GOOGLE_CLIENT_SECRET` | a chave secreta |

3. **Redeploy**: aba **Deployments** › o último › **⋯** › **Redeploy**.
   Variável nova só vale depois de uma publicação nova.

## 7. Conectar

No MSL, abra **Ajustes** e **role a página para baixo**. O cartão **Google
Agenda** fica no meio dela, abaixo da primeira tela — não é um item de menu, e
por isso é fácil não achar. Nele, clique em **Conectar**.

O Google vai mostrar uma tela dizendo que o app **não foi verificado**. É
esperado, e é o seu próprio app. Clique em **Avançado** › **Acessar My System
Life (não seguro)** e autorize.

Pronto. A partir daí:

- o que você criar no Google aparece no calendário do MSL;
- tarefa com prazo e peça com data de publicar viram evento no seu Google;
- mover no Google move aqui, e mover aqui move lá;
- e o agente, no menu **Agente**, também apaga, move e renomeia o que nasceu
  no Google. Isso está logo abaixo.

## O que o agente mexe no Google

Antes, o que nasceu no Google só aparecia no MSL, e para mudar era preciso
abrir o Google. Agora você pode pedir ao agente, usando o nome do compromisso:
*"apagar a reunião com o contador"*, *"renomear a reunião com o contador para
call de alinhamento"*, *"mudar a reunião com o contador para as 16h"*. Ele
mostra o que vai fazer e só faz depois do seu toque.

O que vale:

- **Apagar** funciona nos dois casos. Se **você organiza** o compromisso, ele
  é cancelado na agenda dos convidados que usam Google Agenda. Quem recebeu o
  convite por e-mail e não usa o Google pode continuar com ele. Se você é
  **só convidado**, ele sai
  apenas da sua agenda; os outros continuam com ele.
- **Mover e renomear** só funcionam no que **você organiza**. Se você é
  convidado, o agente diz que não é seu para mudar. O MSL nem tenta, porque o
  Google costuma recusar.
- **Ninguém recebe e-mail.** O MSL nunca avisa os convidados. Se você cancelar
  uma reunião que organiza, ela some da agenda deles, mas sem aviso. Se for
  preciso, avise você mesmo.
- **Compromisso que se repete: só aquele dia.** Apagar a reunião semanal de
  quinta tira a desta quinta. As próximas ficam. Para acabar com a série
  inteira, faça direto no Google.
- **Compromisso de vários dias não se move.** Pode apagar e renomear.
- **Só o título e o horário mudam.** Anotação e projeto não existem no Google.
- **Agenda assinada pelo endereço (iCal) não se mexe.** O MSL só mostra.
- **O que o próprio MSL espelhou também não.** Tarefa e peça que viraram
  evento você muda pela tarefa ou pela peça. Mudar só o evento seria desfeito
  na próxima sincronização.

Quando o agente tenta e não consegue, ele diz por quê. As razões possíveis: o
compromisso não existe mais; o Google não deixou; a conexão caiu; o compromisso
mudou lá no instante entre o agente olhar e gravar; ou é um compromisso do
próprio MSL. Há ainda um caso em que ele diz que **não sabe** se deu certo,
quando a resposta se perdeu no caminho. Nesse caso, olhe o Google antes de
pedir de novo.

---

## Se der errado

| O que aparece | O que é |
| --- | --- |
| **"Acesso bloqueado: … está em fase de testes"** · `403 access_denied` | O passo 4 não pegou. O app continua em *Testes* e o seu e-mail não está na lista de testadores. Volte ao passo 4 e faça o caminho A **ou** o B. |
| `redirect_uri_mismatch` | A URI do passo 5 não bate. Confira caractere por caractere, sem barra no fim. |
| `access_denied` sem mais nada | Você fechou a tela do Google sem autorizar. Tente de novo. |
| "O Google não verificou este app" | **Esperado no caminho A.** Avançado › Acessar. |
| "faltam as variáveis do Google" | As variáveis do passo 6 não chegaram — falta o **Redeploy**. |
| Pedindo para conectar toda semana | Você está no caminho B. É o preço dele; o caminho A resolve. |
| O cartão diz **"Não conectada"** (às vezes com o aviso *"Reconecte a agenda em Ajustes"*) e você já tinha conectado | O acesso expirou (a cada 7 dias no caminho B) ou foi revogado no Google. Clique em **Conectar** de novo. |
| O agente diz que a conexão caiu | O mesmo. Vá em Ajustes e clique em **Conectar**. |
| O agente diz que o compromisso é de outra pessoa e não muda | Você é convidado dele. Só quem organiza move ou renomeia. Apagar ele faz. |
| O agente diz que não sabe se deu certo | A resposta do Google se perdeu no caminho. Abra o Google e veja antes de repetir. |

## O que o MSL guarda, e onde

A credencial de acesso ao seu Google fica **no Redis do servidor**, presa à sua
conta — nunca no banco do aplicativo, nunca no navegador, e portanto **nunca no
arquivo que você exporta**. É o mesmo tratamento que o token de sessão recebe, e
pelo mesmo motivo: restaurar um backup num aparelho emprestado não pode entregar
o acesso à sua agenda.

Desconectar, em Ajustes, apaga a credencial do servidor. Os eventos que o MSL
criou no seu Google **ficam lá** — desconectar não é apagar a sua agenda.
