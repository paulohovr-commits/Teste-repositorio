# Como construir um Cérebro de YouTube

Instruções para o Claude Code construir, do zero, um sistema que baixa e guarda a transcrição de todos os vídeos de um ou mais canais do YouTube, sem tomar bloqueio.

## Para você, que recebeu este arquivo

1. Crie uma pasta vazia (por exemplo `Cerebro Youtube`) e coloque este arquivo dentro.
2. Abra o Claude Code nessa pasta e escreva: **"Leia o cerebro-youtube-instrucoes.md e construa o cérebro para o canal @fulano."**
3. Tenha à mão:
   - um computador de casa ou do escritório (não um servidor em nuvem, explico abaixo o porquê);
   - um navegador onde você esteja logado no YouTube;
   - opcional: uma chave da YouTube Data API (gratuita, criada no Google Cloud), que só é necessária se você quiser cortar por data, por exemplo "só vídeos de 2026 para cá".

O resto deste arquivo é para o Claude.

---

## Para o Claude: o que você vai construir

Um "cérebro de YouTube" é uma pasta com um arquivo Markdown por vídeo de um canal, cada um com título, data, link, descrição e a transcrição inteira. Com isso a pessoa consegue pesquisar por texto tudo o que um canal já disse, e usar esse material como contexto para outras tarefas.

A parte difícil não é baixar uma transcrição. É baixar centenas ou milhares delas sem que o YouTube bloqueie o IP da pessoa. Este documento existe por causa disso: ele traz o desenho que rodou em mais de vinte canais, alguns com mais de mil vídeos, sem nenhum bloqueio de IP nos registros, e os defeitos silenciosos que apareceram no caminho. Leia tudo antes de escrever código, porque várias decisões só fazem sentido juntas.

Construa só o que está descrito aqui. Classificação, resumo e tradução por IA aparecem no fim como camada opcional, e só entram se a pessoa pedir.

## O princípio que explica todas as regras

O YouTube bloqueia por IP quando o padrão de acesso parece de máquina: muitos pedidos em pouco tempo, intervalos regulares, pedidos em paralelo, cabeçalhos de script. O bloqueio pode durar de horas a dias e afeta o uso normal da pessoa naquele IP.

Por isso o custo de ir rápido é muito maior do que o custo de ir devagar. Um canal de 500 vídeos que termina em 8 horas é um sucesso. Um que tentou terminar em 20 minutos e travou no vídeo 60 é um prejuízo de dias. Todas as regras abaixo são consequência disso: o sistema deve se comportar como uma pessoa abrindo um vídeo de cada vez, com pausas irregulares, a partir de um navegador de verdade.

Sempre que você ficar em dúvida entre duas formas de implementar algo, escolha a que faz menos pedidos ao YouTube e a que é mais lenta.

## As regras de ritmo

Estes são os números que rodaram. Não os reduza para "otimizar", e não os troque por valores fixos: a aleatoriedade é parte da proteção.

| Regra | Valor | Por quê |
|---|---|---|
| Um vídeo por vez | sem paralelismo, sem threads, sem async | pedidos simultâneos do mesmo IP são o sinal mais claro de robô |
| Pausa entre vídeos | aleatória entre 25 e 40 segundos | intervalo fixo é detectável; uma pessoa não clica a cada 30,0s |
| A cada 10 vídeos | renovar os cookies do navegador e pausar de 60 a 90 segundos | sessão fresca, e uma pausa maior quebra o padrão |
| Tamanho do lote | 20 vídeos por execução do script | o script roda um lote e termina; quem chama de novo é a fila |
| Pausa entre lotes | aleatória entre 60 e 120 segundos | idem |
| Um canal por vez | os canais entram numa fila sequencial | dois canais ao mesmo tempo são dois robôs no mesmo IP |
| Uma fila por máquina e por rede | trava que impede duas execuções simultâneas | duas janelas de terminal rodando juntas desfazem tudo acima |
| Erro no lote | esperar 10 minutos antes de tentar de novo | insistir logo depois de um erro é o que transforma aviso em bloqueio |
| 5 erros seguidos | esperar 30 minutos | idem |

Com essas pausas, espere algo em torno de 60 a 70 vídeos por hora quando o trabalho é só transcrever (estimativa a partir das pausas). Na medição real com tradução e análise por IA em cada vídeo, o ritmo foi de 16 vídeos por hora. Diga isso à pessoa antes de começar, com a conta feita para o canal dela, para ela saber que é um trabalho de horas ou de uma noite, e não de minutos.

## De onde rodar

Rode na máquina da pessoa, na internet residencial ou do escritório dela. IPs de provedores de nuvem (AWS, Google Cloud, Azure e similares) costumam ser bloqueados pelo YouTube para esse tipo de acesso desde o primeiro pedido, e a própria biblioteca de transcrição avisa disso na documentação. Não proponha VPN, proxy rotativo nem servidor remoto. A estratégia aqui é ser um bom cidadão num IP normal, não se esconder.

Como é um trabalho longo, o computador precisa ficar acordado. No macOS, use `caffeinate`. Atenção: `caffeinate -w <PID>` morre junto com o processo que ele vigia, sem avisar. Se você reiniciar a fila, confira com `pmset -g assertions | grep caffeinate` se ele continua ativo. Em Windows e Linux, oriente a pessoa a desligar a suspensão automática durante a carga.

## Ferramentas

- **Python 3** com `youtube-transcript-api` (versão 1.x) e `requests`.
- **yt-dlp** atualizado. Ele é usado para três coisas: listar os vídeos do canal, extrair os cookies do navegador e servir de plano B para a legenda. Versão velha do yt-dlp é a causa mais comum de falha estranha; atualize antes de investigar qualquer outra coisa.
- **YouTube Data API v3** (`google-api-python-client`), opcional. É o caminho oficial do Google, tem cota gratuita e não corre risco de bloqueio. Use para datas de publicação e para metadados em lote, 50 vídeos por chamada.

Chaves e cookies nunca ficam escritos no código. Leia de variável de ambiente ou de um arquivo fora da pasta do projeto (por exemplo `~/.config/cerebro/`). Se a pasta virar repositório git, o arquivo de cookies e o de estado entram no `.gitignore`.

## Cookies do navegador

Os pedidos de transcrição vão com os cookies de um navegador real onde a pessoa está logada no YouTube, e com cabeçalhos de navegador. Sem isso, o YouTube trata o pedido como anônimo e bloqueia muito mais cedo.

Extraia os cookies para um arquivo com:

```bash
yt-dlp --cookies-from-browser chrome --cookies yt_cookies.txt --skip-download "https://www.youtube.com"
```

Rode isso no início de cada lote e de novo a cada 10 vídeos.

Pontos de atenção:

- No macOS, a primeira execução abre um pedido de acesso às Chaves (Keychain). A pessoa precisa clicar em "Permitir sempre", senão a fila para toda vez esperando o clique.
- No Windows, a extração a partir do Chrome costuma falhar por causa da criptografia de cookies das versões recentes. Se falhar, use `--cookies-from-browser firefox` com a pessoa logada no Firefox. (Isso vem da documentação do yt-dlp; o sistema original rodou só em macOS.)
- O arquivo de cookies é uma credencial da conta Google da pessoa. Trate como senha: não compartilhe, não suba para lugar nenhum, não imprima o conteúdo em log.
- Se a pessoa quiser ser conservadora, sugira usar um perfil do navegador logado numa conta Google secundária, e não a conta principal dela. Acesso automatizado com cookies de conta é um risco para a conta, por menor que seja no ritmo descrito aqui.

Monte a sessão HTTP assim, com um User-Agent atual e compatível com o navegador de onde os cookies vieram:

```python
import http.cookiejar, requests

def criar_sessao_com_cookies(cookies_file):
    s = requests.Session()
    s.headers.update({
        "User-Agent": "<User-Agent atual do navegador da pessoa>",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    })
    if cookies_file.exists():
        jar = http.cookiejar.MozillaCookieJar(str(cookies_file))
        jar.load(ignore_discard=True, ignore_expires=True)
        s.cookies = jar
    return s
```

## Estrutura de pastas

```
Cerebro Youtube/
  cerebro.py            um único script, serve qualquer canal
  fila.sh               roda os canais em sequência, lote após lote
  fila.pid              existe só enquanto a fila está viva
  fila.log
  Nome do Canal/
    canal.json          configuração do canal
    estado.json         o que já foi listado, processado e o que falhou
    .cerebro.lock       trava de execução única
    _INDEX.md           tabela de todos os vídeos
    videos/
      2026-03-14 Título do vídeo.md
```

Um script só, parametrizado pela pasta do canal. Não copie o script para cada canal: canal novo é uma pasta nova com um `canal.json`. Exemplo:

```json
{ "handle": "@fulano", "nome": "Nome do Canal", "idioma": "pt", "desde": "2026-01-01" }
```

`desde` é opcional. `idioma` define a preferência de legenda e o idioma dos títulos na listagem.

## O `estado.json` é o coração do sistema

Tudo é retomável. O script pode ser interrompido a qualquer momento (queda de luz, computador dormiu, Ctrl+C) e continuar de onde parou, sem refazer pedidos ao YouTube. Para isso o estado guarda:

- `todos_ids`: todos os vídeos que a última listagem encontrou;
- `processados`: id do vídeo, título, data e nome do arquivo gerado;
- `sem_transcricao`: contador de tentativas falhas por vídeo;
- `agendado_ate`: lives que ainda não foram ao ar, com a hora em que podem ser tentadas de novo.

Grave o estado depois de **cada** vídeo, não no fim do lote.

## Etapa 1: listar o canal

Um canal tem três abas e elas não se sobrepõem: `/videos`, `/streams` (lives) e `/shorts`. Liste as três e junte por id.

```bash
yt-dlp --flat-playlist --no-warnings \
  --extractor-args "youtube:lang=pt" \
  --print "%(id)s\t%(title)s\t%(timestamp)s" \
  "https://www.youtube.com/@fulano/videos"
```

Três armadilhas reais aqui:

1. **O idioma do título.** Sem `youtube:lang`, o YouTube devolve o título traduzido conforme o idioma da máquina, e um canal brasileiro aparece com títulos em inglês. Use `pt` ou `en`. Não use `pt-BR`: o yt-dlp rejeita esse código e a listagem volta vazia, o que faz o canal inteiro "sumir" sem erro.
2. **A data vem vazia.** O campo `timestamp` da listagem rápida volta `NA` na maioria dos canais. Se houver corte por data (`desde`), um filtro escrito em cima desse campo não filtra nada e passa em qualquer teste com dados falsos. A data confiável vem da Data API oficial (`videos().list(part="snippet", id=...)`, 50 ids por chamada, campo `publishedAt`), ou do `upload_date` do yt-dlp quando o vídeo é aberto individualmente.
3. **Vídeo sem data não é descartado.** Se a data não veio, o vídeo entra na fila e um aviso sobe na tela. Descartar por falta de dado faria vídeo novo desaparecer em silêncio.

Ignore itens com título "Private video" ou "Deleted video".

A listagem é barata (um punhado de pedidos por canal), então refaça no começo de cada execução. É ela que descobre vídeo novo.

## Etapa 2: buscar a transcrição

Primeiro a biblioteca de transcrição, com a sessão de cookies. Se ela falhar por um motivo que não seja "este vídeo não tem legenda", tente uma vez pelo yt-dlp, que baixa a legenda em VTT.

```python
from youtube_transcript_api import (YouTubeTranscriptApi, NoTranscriptFound,
                                    TranscriptsDisabled, IpBlocked, RequestBlocked)

class Bloqueado(Exception):
    pass

def obter_transcricao(video_id, cookies_file, idiomas=("pt", "pt-BR", "en")):
    try:
        api = YouTubeTranscriptApi(http_client=criar_sessao_com_cookies(cookies_file))
        lista = api.list(video_id)
        try:
            t = lista.find_transcript(list(idiomas))
        except Exception:
            t = lista.find_generated_transcript([tr.language_code for tr in lista])
        return " ".join(trecho.text for trecho in t.fetch())
    except (NoTranscriptFound, TranscriptsDisabled):
        return None                      # o vídeo realmente não tem legenda
    except (IpBlocked, RequestBlocked) as e:
        raise Bloqueado(str(e))          # sinal para parar tudo, ver abaixo
    except Exception:
        return obter_transcricao_via_ytdlp(video_id, cookies_file)
```

O plano B:

```bash
yt-dlp --no-warnings --write-auto-sub --write-sub --skip-download \
  --sub-lang "pt,pt-BR,en" --cookies yt_cookies.txt \
  -o "<pasta temporária>/sub.%(ext)s" "https://www.youtube.com/watch?v=<id>"
```

O VTT de legenda automática repete cada linha duas ou três vezes e traz marcações de tempo no meio do texto. Ao converter para texto, descarte cabeçalhos (`WEBVTT`, `Kind:`, `Language:`), linhas de tempo e linhas vazias, remova as tags entre `<` e `>` e elimine linha igual à anterior.

A pausa de 25 a 40 segundos acontece depois de **toda** tentativa de transcrição, tenha dado certo ou não.

Para a descrição e a data exata do vídeo:

```bash
yt-dlp --no-warnings --skip-download --print "%(upload_date)s\t%(description)s" "https://www.youtube.com/watch?v=<id>"
```

## Etapa 3: salvar a nota

Um Markdown por vídeo, com cabeçalho (título, data, url, canal, tipo: vídeo, live ou short), a descrição e a transcrição completa.

**O nome do arquivo precisa ser único por vídeo, não por título.** `data + título` colide: canais republicam o mesmo título no mesmo dia (short e vídeo longo, reenvio), e o segundo sobrescreve o primeiro sem erro. Pior: o disco do macOS e do Windows não diferencia maiúsculas de minúsculas, então "Is Finally Here" e "is Finally Here" viram o mesmo arquivo. Antes de gravar, confira se o nome já pertence a outro vídeo e, se pertencer, acrescente o id no fim: `2026-03-14 Título [abc123XYZ00].md`. Remova do nome os caracteres `< > : " / \ | ? *` e limite o tamanho a uns 100 caracteres.

## Como tratar cada tipo de falha

Distinguir os casos é o que mantém a fila andando sem insistir onde não deve.

- **Vídeo sem legenda** (`NoTranscriptFound`, `TranscriptsDisabled`, ou as duas vias voltaram vazias): some 1 no contador daquele vídeo. Com 3 tentativas, ele é "parqueado" e sai da fila para sempre. Sem esse limite, a fila nunca termina e fica batendo no YouTube pelos mesmos vídeos toda vez.
- **Live agendada, que ainda não aconteceu:** a aba `/streams` lista também as lives futuras, e elas falham exatamente como um vídeo sem legenda. Quando a transcrição falhar, confira `yt-dlp --skip-download --print "%(live_status)s"`. Se voltar `is_upcoming` ou `is_live`, ou se o erro falar em "live event will begin" ou "Premieres in", **não conte tentativa**: só tire o vídeo da fila por algumas horas. Do contrário, uma live marcada para a semana que vem queima as 3 tentativas antes de existir.
- **Live que acabou de terminar:** o YouTube leva de minutos a horas para gerar a legenda automática. Se o canal faz lives e a pessoa quer pegá-las logo, as tentativas precisam de pelo menos 1 hora de intervalo entre si, em vez de acontecerem em sequência.
- **Bloqueio de verdade** (`IpBlocked`, `RequestBlocked`, HTTP 429, página de "confirme que você não é um robô"): pare a fila inteira, na hora. Não tente o próximo vídeo, não tente o próximo canal, não troque de método para contornar. Avise a pessoa e só retome depois de pelo menos 24 horas, com um lote de teste de 1 vídeo. Insistir durante um bloqueio é o que o prolonga.
- **Erro genérico no lote** (rede caiu, script quebrou): 10 minutos de espera; no quinto erro seguido, 30 minutos.

## A fila

O script roda um lote de 20 e termina. Um shell script simples cuida do resto: para cada canal da lista, chama o script, espera de 60 a 120 segundos aleatórios, chama de novo, até não haver pendentes; então passa para o próximo canal.

Defeitos que apareceram em produção, todos silenciosos, e como evitar cada um:

1. **A fila "conclui" em segundos sem descobrir vídeo novo.** Se a fila conta os pendentes lendo o `estado.json` antes de rodar o script, ela lê a lista da execução anterior, encontra zero e dá o canal como pronto. A primeira chamada do script em cada canal é obrigatória, porque é ela que refaz a listagem. Só depois dela a contagem de pendentes vale.
2. **Duas execuções ao mesmo tempo.** Use uma trava de arquivo de verdade (`fcntl.flock` com `LOCK_EX | LOCK_NB` em Python, ou `mkdir` de um diretório de trava no shell) e saia se já houver outra rodando. Tarefa agendada que dispara enquanto a carga inicial ainda roda é o caso clássico.
3. **Saber se a fila está viva.** Não use `pgrep -f "fila.sh"`: ele casa com qualquer processo cuja linha de comando contenha o texto, inclusive o próprio comando de checagem, e a fila aparece "rodando" horas depois de ter terminado. Grave o PID num arquivo ao iniciar, apague ao sair (`trap ... EXIT`) e confira com `kill -0`.
4. **Não edite o `.sh` com a fila rodando.** O bash lê o script enquanto executa. Edite uma cópia e troque com `mv`.
5. **`estado.json` ilegível por um instante.** Se a fila lê o arquivo no momento em que o script está gravando, o JSON vem cortado. Trate como "tente de novo em 30 segundos", não como "zero pendentes".
6. **Registros órfãos.** Se alguém apaga um `.md`, o estado continua jurando que o vídeo foi processado e ele nunca volta. No começo de cada rodada, remova de `processados` as entradas cujo arquivo não existe mais.

## Conferência no fim da carga

Não declare a carga concluída só porque o log terminou sem erro. Confira e mostre os números à pessoa:

- a quantidade de entradas em `processados` é igual à quantidade de arquivos `.md` em `videos/`? Diferença aqui significa nome colidindo e nota sobrescrita;
- quantos vídeos foram listados, quantos processados, quantos parqueados sem legenda, quantos ficaram fora pelo corte de data. Os quatro números precisam fechar com o total;
- abra dois ou três arquivos ao acaso e veja se a transcrição é do vídeo do título.

## Ordem de construção e teste

Teste contra o YouTube de verdade desde o início, em doses pequenas. Vários dos defeitos acima passaram em teste com dados simulados e só apareceram na execução real.

1. Liste o canal e mostre à pessoa os totais por aba e, se houver corte por data, quantos ficam dentro. Peça a confirmação dela antes de transcrever qualquer coisa.
2. Rode um lote de 1 vídeo. Abra o arquivo gerado e confira.
3. Rode um lote de 5. Confira o estado, as pausas no log e a retomada (interrompa no meio e rode de novo).
4. Só então solte a fila completa, com o computador configurado para não dormir, e diga à pessoa a previsão de término.

Se houver mais de um canal, comece pelo menor: o cérebro já serve para alguma coisa nas primeiras horas, e qualquer problema aparece cedo.

## Atualização periódica

Depois da carga inicial, o mesmo script serve para manter o cérebro em dia: uma tarefa agendada semanal chama a fila, que refaz a listagem e processa só o que é novo. A trava de execução única impede que ela rode por cima de uma carga em andamento.

## Camada opcional: análise por IA

Só construa se a pessoa pedir. Com a transcrição em mãos, dá para chamar um modelo para gerar resumo em tópicos, categorias e tags de cada vídeo e gravar no cabeçalho da nota, além de um índice por categoria. Se o canal for em outro idioma, dá para guardar a tradução ao lado do original. Isso multiplica o tempo por vídeo (o ritmo cai para a casa de 16 por hora) e tem custo de API, então faça a estimativa de custo para o canal inteiro e mostre à pessoa antes de rodar. As categorias e o olhar da análise dependem do objetivo de cada um: pergunte, não invente.

Um filtro por tema (classificar por título e descrição antes de transcrever, para pular vídeos fora do assunto) também é possível, e economiza pedidos ao YouTube. Pegue título e descrição pela Data API, em lote, e em caso de dúvida inclua o vídeo.

## Limites

- Só vídeos públicos, para estudo e consulta da própria pessoa. A transcrição é conteúdo do dono do canal: o cérebro não é para republicar nem redistribuir.
- Os Termos de Serviço do YouTube restringem acesso automatizado fora da API oficial. O ritmo descrito aqui existe para não sobrecarregar o serviço, mas a decisão de usar é da pessoa, e ela deve saber disso. Diga isso a ela uma vez, de forma direta, antes da primeira carga.
- Para o canal **da própria pessoa**, a API oficial com login (OAuth) dá acesso às legendas e às métricas privadas sem nada disso. Se o canal for dela, ofereça esse caminho primeiro.
- Não existe garantia de "nenhum bloqueio". O que existe é um desenho que não tomou bloqueio de IP em milhares de vídeos. Se o YouTube mudar o comportamento, a resposta certa é parar e ir mais devagar, nunca acelerar ou contornar.
