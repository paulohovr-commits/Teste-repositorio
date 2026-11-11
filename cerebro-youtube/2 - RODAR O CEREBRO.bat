@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Cerebro de YouTube - RODANDO (pode minimizar, NAO feche esta janela)
call "%~dp0_achar_python.bat"
if not defined PY (
  echo Python nao encontrado. Clique primeiro em "1 - INSTALAR".
  pause
  exit /b 1
)
echo Atualizando o yt-dlp...
"%PY%" -m pip install --upgrade --quiet --disable-pip-version-check yt-dlp
echo.
echo  O Cerebro esta rodando. Pode minimizar esta janela, mas NAO feche.
echo  Se fechar sem querer, e so clicar de novo: ele continua de onde parou.
echo.
"%PY%" "%~dp0fila.py"
echo.
echo  A fila terminou ou parou. Leia a mensagem acima.
pause
