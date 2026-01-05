@echo off
cd /d "C:\Users\Usuario\Desktop\Repositórios\etiquetasCart-main\etiquetasCart-main"
call npm start > log-etiquetas.txt 2>&1
@echo off
cd /d "%~dp0"
