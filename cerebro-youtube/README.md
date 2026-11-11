# Cérebro de YouTube

Guarda a transcrição de todos os vídeos de um ou mais canais do YouTube, um arquivo Markdown
por vídeo (título, data, link, descrição e transcrição inteira). Assim você pesquisa por texto tudo
o que um canal já disse.

O sistema foi feito para **não tomar bloqueio**: um vídeo por vez, pausas aleatórias, cookies do
seu navegador e uma fila que para tudo ao primeiro sinal de problema. Por isso ele é **lento de
propósito**: umas 60 a 70 transcrições por hora. Um canal de 500 vídeos é trabalho de uma noite.

O desenho completo, com o porquê de cada regra, está em [INSTRUCOES.md](INSTRUCOES.md).

## Antes de começar, leia isto

- **Rode no seu computador**, na internet de casa ou do escritório. Servidor em nuvem (AWS, Google
  Cloud, Azure, Codespaces e afins) costuma ser bloqueado pelo YouTube logo no primeiro pedido.
  Não use VPN nem proxy: a ideia é ser um bom cidadão num IP normal, não se esconder.
- **Termos de Serviço.** Os Termos do YouTube restringem acesso automatizado fora da API oficial.
  O ritmo lento existe para não sobrecarregar o serviço, mas a decisão de usar é sua. Use só com
  vídeos públicos, para estudo e consulta próprios: a transcrição é conteúdo do dono do canal e o
  cérebro não é para republicar nem redistribuir. Por isso a pasta `videos/` fica fora do git.
- **O canal é seu?** Então existe um caminho melhor: a API oficial com login (OAuth) dá acesso às
  suas legendas e métricas sem nada disso. Peça ao Claude para montar esse caminho.
- **Os cookies são uma credencial da sua conta Google.** Trate como senha. Se quiser ser
  conservador, use um perfil do navegador logado numa conta Google secundária.

## No Windows: quatro arquivos de clique duplo

1. **`1 - INSTALAR`**: instala o Python, os componentes e o Firefox, pede para você entrar no YouTube
   pelo Firefox uma vez, cadastra os canais, conta os vídeos e faz o teste com 1 e com 5 vídeos.
   Rode só na primeira vez, ou quando quiser cadastrar outro canal.
2. **`2 - RODAR O CEREBRO`**: baixa tudo, um canal por vez. Deixe a janela aberta (pode
   minimizar): enquanto ela estiver aberta, o computador não suspende. Se fechar, é só clicar de
   novo, ele continua de onde parou.
3. **`3 - VER COMO ESTA`**: diz se está rodando e mostra quantos vídeos já foram, quantos
   faltam e três amostras para você conferir.
4. **`4 - PESQUISAR NO CEREBRO`**: procura uma palavra ou assunto em todas as transcrições.

Na primeira vez, o Windows pode mostrar "O Windows protegeu o computador". Clique em
**Mais informações** e depois em **Executar assim mesmo**.

**Por que o Firefox?** No Windows, o Chrome protege os cookies de um jeito que impede este tipo de
programa de usá-los. Você entra no YouTube pelo Firefox uma vez e continua usando o Chrome no dia a dia.

## No Mac ou no Linux, pelo Terminal

```bash
python3 instalar.py
```

Depois, para rodar a fila e ver como está:

```bash
nohup python3 fila.py >/dev/null 2>&1 &
```

```bash
python3 fila.py status
```

No Mac, na primeira vez aparece um pedido de acesso às Chaves (Keychain): clique em
**"Permitir sempre"**, senão a fila para toda vez esperando o clique. A fila mantém o Mac acordado
sozinha (`caffeinate`).

## Comandos avulsos (para quem quer controlar cada passo)

```bash
python3 cerebro.py novo @fulano "Nome do Canal" --idioma pt --desde 2026-01-01
```

Para só os 10 vídeos mais recentes, troque `--desde 2026-01-01` por `--ultimos 10`.

```bash
python3 cerebro.py listar "Nome do Canal"
```

```bash
python3 cerebro.py lote "Nome do Canal" --tamanho 1
```

```bash
python3 cerebro.py conferir "Nome do Canal"
```

```bash
python3 buscar.py "assunto"
```

A configuração fica fora da pasta do projeto, em `~/.config/cerebro/config.json` (no Windows,
`C:\Users\<você>\.config\cerebro\`): navegador, User-Agent e, opcional, uma chave gratuita da
YouTube Data API v3 (`youtube_api_key`), útil para cortar por data sem gastar pedidos ao YouTube.
Os cookies ficam ali também, em `yt_cookies.txt`. Trate esse arquivo como senha.

## O que acontece em cada caso

| Situação | O que o sistema faz |
|---|---|
| Vídeo sem legenda | Tenta de novo depois de 12h. Na 3ª falha, "parqueia" e não tenta nunca mais. |
| Live que ainda não aconteceu | Tira da fila por 6h, **sem** contar tentativa. |
| Live que acabou de terminar | Tenta de novo a cada 1h (o YouTube demora para gerar a legenda). |
| Rede caiu, erro qualquer | A fila espera 10 minutos. Do 5º erro seguido em diante, 30 minutos. No 10º, para. |
| **Bloqueio do YouTube** | **Para tudo na hora** e grava `BLOQUEIO.json`. Por 24h, nada roda. Depois disso, o próximo lote é de 1 vídeo só, como teste; se passar, o ritmo normal volta. |
| Você apagou um `.md` | O vídeo volta para a fila na próxima rodada. |
| Dois vídeos com o mesmo título no mesmo dia | O segundo ganha o id no nome: `2026-03-14 Título [abc123XYZ00].md`. |

Em caso de bloqueio, **não insista, não use VPN e não troque de método**. Espere.

## Manter em dia (semanal)

Depois da carga inicial, a mesma fila só processa o que é novo. O jeito mais simples é clicar em
`2 - RODAR O CEREBRO` uma vez por semana. Se uma carga ainda estiver rodando, a trava faz a
segunda execução sair sem fazer nada.

## Estrutura

```
cerebro.py            o único script, serve para qualquer canal
fila.py               roda os canais em sequência, lote após lote
instalar.py           o instalador (chamado pelo 1 - INSTALAR)
buscar.py             a pesquisa (chamada pelo 4 - PESQUISAR)
canais.txt            os canais da fila, um por linha, na ordem
fila.log              o registro de tudo
Nome do Canal/
  canal.json          {"handle": "@fulano", "nome": "...", "idioma": "pt", "desde": "2026-01-01"}
  estado.json         o que já foi listado, processado, o que falhou (gravado depois de cada vídeo)
  _INDEX.md           tabela de todos os vídeos transcritos
  videos/
    2026-03-14 Título do vídeo.md
```

