@echo off
title CertificaFlow - Estúdio de Certificados
echo ================================================================
echo  INICIANDO O CERTIFICAFLOW (ESTUDIO DE CERTIFICADOS)
echo ================================================================
echo Abrindo navegador em http://127.0.0.1:8000 ...
timeout /t 2 /nobreak >nul
start http://127.0.0.1:8000
python app.py
if errorlevel 1 (
    echo.
    echo Tentando com o caminho completo do Python...
    "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" app.py
)
pause
