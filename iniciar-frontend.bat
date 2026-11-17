@echo off
cd /d "%~dp0frontend"
if not exist node_modules (
    echo Dependencias nao instaladas. Execute setup.bat primeiro.
    pause
    exit /b 1
)
call npm run dev
