@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

set "PDF=horarios_academicos.pdf"

where python >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado no PATH.
    pause
    exit /b 1
)

if not exist "%PDF%" (
    echo [ERRO] PDF nao encontrado: %CD%\%PDF%
    pause
    exit /b 1
)

python -c "import pymupdf, PIL" >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias...
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

echo Gerando imagens de "%PDF%"...
python fatiar_horarios.py "%PDF%" %*
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao gerar as imagens.
    pause
    exit /b 1
)

echo.
echo Concluido.
endlocal
