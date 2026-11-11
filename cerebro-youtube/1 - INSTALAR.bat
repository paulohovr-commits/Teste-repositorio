@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Cerebro de YouTube - Instalador
call "%~dp0_achar_python.bat"
if defined PY goto :temPython

echo.
echo  Instalando o Python (o programa que roda o Cerebro).
echo  Se aparecer uma janela pedindo permissao, clique em SIM.
echo.
winget install -e --id Python.Python.3.13 --scope user --accept-source-agreements --accept-package-agreements
call "%~dp0_achar_python.bat"
if defined PY goto :temPython

echo.
echo  Nao consegui instalar o Python sozinho. Vou abrir a pagina de download.
echo  1. Baixe e abra o instalador.
echo  2. Marque a caixinha "Add python.exe to PATH" e clique em "Install Now".
echo  3. Depois, clique de novo neste arquivo "1 - INSTALAR".
start "" "https://www.python.org/downloads/windows/"
pause
exit /b 1

:temPython
"%PY%" "%~dp0instalar.py"
pause
