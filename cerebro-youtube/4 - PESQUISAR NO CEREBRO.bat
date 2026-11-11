@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Cerebro de YouTube - Pesquisar
call "%~dp0_achar_python.bat"
if not defined PY (
  echo Python nao encontrado. Clique primeiro em "1 - INSTALAR".
  pause
  exit /b 1
)
"%PY%" "%~dp0buscar.py"
