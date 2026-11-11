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

## Instalação (uma vez)

```bash
python3 -m pip install -U "youtube-transcript-api>=1.0,<2" requests yt-dlp
```

Atualize o yt-dlp de tempos em tempos (versão velha é a causa mais comum de falha estranha):

```bash
python3 -m pip install -U yt-dlp
```

Configuração, fora da pasta do projeto:

```bash
mkdir -p ~/.config/cerebro && cp config.exemplo.json ~/.config/cerebro/config.json
```

Abra `~/.config/cerebro/config.json` e preencha:

- `navegador`: `chrome` (padrão), `firefox`, `edge`, `brave` ou `safari`, onde você está logado no
  YouTube. No Windows, se o Chrome falhar, use o Firefox.
- `user_agent`: o do seu navegador. No Chrome, abra `chrome://version` e copie a linha
  "User Agent".
- `youtube_api_key` (opcional): uma chave gratuita da YouTube Data API v3, criada no Google Cloud.
  Só é necessária para cortar por data ("só vídeos de 2026 para cá") sem gastar pedidos ao
  YouTube. Também pode vir da variável de ambiente `YOUTUBE_API_KEY`.

Os cookies são extraídos sozinhos para `~/.config/cerebro/yt_cookies.txt` no começo de cada lote
e a cada 10 vídeos. **No macOS**, na primeira vez aparece um pedido de acesso às Chaves (Keychain):
clique em **"Permitir sempre"**, senão a fila para toda vez esperando o clique.

## Passo a passo para um canal

**1. Criar o canal** (o `--desde` é opcional):

```bash
python3 cerebro.py novo @fulano "Nome do Canal" --idioma pt --desde 2026-01-01
```

Isso cria a pasta `Nome do Canal/` com o `canal.json` e põe o canal no `canais.txt`.
Use `--idioma pt` ou `en` (nunca `pt-BR`).

**2. Listar, sem transcrever nada.** Mostra os totais por aba (vídeos, lives, shorts), quantos
ficam dentro do corte de data e o tempo previsto:

```bash
python3 cerebro.py listar "Nome do Canal"
```

**3. Testar com 1 vídeo** e abrir o arquivo gerado em `Nome do Canal/videos/`:

```bash
python3 cerebro.py lote "Nome do Canal" --tamanho 1
```

**4. Testar com 5 vídeos.** Interrompa no meio com Ctrl+C e rode de novo: ele continua de onde
parou, sem refazer nada.

```bash
python3 cerebro.py lote "Nome do Canal" --tamanho 5
```

**5. Soltar a fila completa**, que roda todos os canais do `canais.txt`, um por vez, em lotes
de 20, até acabar. Para continuar rodando com o terminal fechado:

```bash
nohup ./fila.sh >/dev/null 2>&1 &
```

No Mac, a fila mantém o computador acordado sozinha (`caffeinate`). No Windows e no Linux, desligue
a suspensão automática enquanto a carga roda. Com mais de um canal, ponha o menor primeiro no
`canais.txt`: o cérebro já fica útil nas primeiras horas.

**6. Acompanhar:**

```bash
./fila.sh status
```

**7. Conferir no fim** (não acessa o YouTube). Mostra listados, transcritos, parqueados sem legenda,
fora do corte e pendentes, confere se a soma fecha e se há um `.md` para cada vídeo, e abre três
notas ao acaso para você ver se a transcrição é do vídeo do título:

```bash
python3 cerebro.py conferir "Nome do Canal"
```

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

Depois da carga inicial, a mesma fila só processa o que é novo. Para rodar todo domingo às 4h17,
abra `crontab -e` e acrescente (troque o caminho pelo da sua pasta):

```
17 4 * * 0 cd "/Users/voce/Cerebro Youtube" && ./fila.sh >/dev/null 2>&1
```

Se uma carga ainda estiver rodando, a trava faz a tarefa agendada sair sem fazer nada.

## Estrutura

```
cerebro.py            o único script, serve para qualquer canal
fila.sh               roda os canais em sequência, lote após lote
canais.txt            os canais da fila, um por linha, na ordem
fila.log              o registro de tudo
Nome do Canal/
  canal.json          {"handle": "@fulano", "nome": "...", "idioma": "pt", "desde": "2026-01-01"}
  estado.json         o que já foi listado, processado, o que falhou (gravado depois de cada vídeo)
  _INDEX.md           tabela de todos os vídeos transcritos
  videos/
    2026-03-14 Título do vídeo.md
```

Não edite o `fila.sh` com a fila rodando: o bash lê o script enquanto executa. Edite uma cópia e
troque com `mv`.
