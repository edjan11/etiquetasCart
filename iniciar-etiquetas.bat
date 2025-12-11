@echo off
REM Vai até a pasta do projeto
cd /d "C:\Users\Usuario\Desktop\Repositórios\etiquetasCart-main\etiquetasCart-main"

REM Roda o servidor usando o npm start (que chama "node server.js")
call npm start

REM Mantém a janela aberta pra você ver erro/log
pause
