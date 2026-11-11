#!/usr/bin/env bash
# Fila do Cérebro de YouTube: um canal por vez, lote após lote, até não haver pendentes.
#
#   ./fila.sh                     roda os canais de canais.txt, na ordem do arquivo
#   ./fila.sh "Canal A" "Canal B" roda só estes
#   ./fila.sh status              diz se a fila está viva e mostra o fim do log
#
# Para deixar rodando com o terminal fechado:
#   nohup ./fila.sh >/dev/null 2>&1 &
#
# NÃO edite este arquivo com a fila rodando: o bash lê o script enquanto executa.
# Edite uma cópia e troque com mv.

set -u
cd "$(dirname "$0")" || exit 1
DIR="$(pwd)"
LOG="$DIR/fila.log"
PIDFILE="$DIR/fila.pid"
TRAVA="$DIR/.fila.trava"
PY="${CEREBRO_PYTHON:-python3}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [fila] $*" >> "$LOG"; echo "[$(date '+%H:%M:%S')] [fila] $*"; }

fila_viva() {
  # pgrep -f casa com qualquer linha de comando que contenha o texto (inclusive a da própria
  # checagem). Por isso: PID gravado em arquivo e conferido com kill -0.
  [ -f "$PIDFILE" ] || return 1
  local pid
  pid="$(cat "$PIDFILE" 2>/dev/null)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

if [ "${1:-}" = "status" ]; then
  if fila_viva; then echo "Fila RODANDO (PID $(cat "$PIDFILE"))."; else echo "Fila parada."; fi
  if [ "$(uname)" = "Darwin" ]; then
    if pmset -g assertions 2>/dev/null | grep -q caffeinate; then echo "caffeinate ativo: o Mac não vai dormir."
    else echo "caffeinate NÃO está ativo."; fi
  fi
  [ -f "$DIR/BLOQUEIO.json" ] && { echo "ATENÇÃO: há um bloqueio registrado:"; cat "$DIR/BLOQUEIO.json"; echo; }
  echo "--- fim do fila.log ---"
  tail -n 25 "$LOG" 2>/dev/null
  exit 0
fi

# Uma fila por máquina: mkdir é atômico, então só uma execução consegue criar a trava.
if ! mkdir "$TRAVA" 2>/dev/null; then
  if fila_viva; then
    echo "Já existe uma fila rodando (PID $(cat "$PIDFILE")). Saindo sem fazer nada."
    exit 30
  fi
  log "trava velha de uma fila que morreu sem limpar; removendo"
  rm -rf "$TRAVA"
  mkdir "$TRAVA" || { echo "não consegui criar a trava"; exit 1; }
fi
echo $$ > "$PIDFILE"
limpar() { rm -f "$PIDFILE"; rmdir "$TRAVA" 2>/dev/null; }
trap limpar EXIT
trap 'log "fila interrompida"; exit 130' INT TERM

# Computador acordado. caffeinate -w vigia esta própria fila: vive enquanto ela viver.
if [ "$(uname)" = "Darwin" ] && command -v caffeinate >/dev/null; then
  caffeinate -dimsu -w $$ &
  log "caffeinate ativo (PID $!): o Mac não dorme enquanto a fila rodar"
else
  log "lembrete: desligue a suspensão automática do computador enquanto a carga roda"
fi

CANAIS=()
if [ $# -gt 0 ]; then
  CANAIS=("$@")
elif [ -f "$DIR/canais.txt" ]; then
  while IFS= read -r linha || [ -n "$linha" ]; do
    linha="${linha%%#*}"
    linha="$(echo "$linha" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [ -n "$linha" ] && CANAIS+=("$linha")
  done < "$DIR/canais.txt"
fi
if [ ${#CANAIS[@]} -eq 0 ]; then
  log "nenhum canal: crie um com 'python3 cerebro.py novo @fulano \"Nome\"'"
  exit 1
fi

pausa() { # pausa MIN MAX motivo, aleatória
  local s=$(( $1 + RANDOM % ($2 - $1 + 1) ))
  log "pausa de ${s}s ($3)"
  sleep "$s"
}

log "início da fila: ${#CANAIS[@]} canal(is): ${CANAIS[*]}"
total=${#CANAIS[@]}
n=0
for canal in "${CANAIS[@]}"; do
  n=$((n + 1))
  if [ ! -f "$DIR/$canal/canal.json" ]; then
    log "pulando '$canal': não tem canal.json"
    continue
  fi
  log "=== canal $n de $total: $canal ==="
  # A primeira chamada em cada canal é obrigatória e refaz a listagem: é ela que descobre
  # vídeo novo. A fila nunca conta pendentes lendo o estado.json por conta própria.
  primeira=1
  erros=0
  while :; do
    if [ $primeira -eq 1 ]; then
      "$PY" "$DIR/cerebro.py" lote "$canal" --listar 2>&1 | tee -a "$LOG"
    else
      "$PY" "$DIR/cerebro.py" lote "$canal" 2>&1 | tee -a "$LOG"
    fi
    rc=${PIPESTATUS[0]}
    case $rc in
      0)  primeira=0; erros=0; pausa 60 120 "entre lotes" ;;
      10) log "canal '$canal' em dia"; break ;;
      20) log "BLOQUEIO: a fila parou inteira. Retome só depois de 24 horas."; exit 20 ;;
      30) log "outra execução do cerebro.py está rodando; saindo"; exit 30 ;;
      130) log "interrompido"; exit 130 ;;
      *)
        erros=$((erros + 1))
        if [ $erros -ge 10 ]; then
          log "10 erros seguidos em '$canal'; parando a fila para alguém olhar o fila.log"
          exit 1
        elif [ $erros -ge 5 ]; then
          log "erro $erros seguido (código $rc); espera de 30 minutos"; sleep 1800
        else
          log "erro no lote (código $rc); espera de 10 minutos"; sleep 600
        fi
        ;;
    esac
  done
  [ $n -lt $total ] && pausa 60 120 "entre canais"
done
log "fila concluída"
exit 0
