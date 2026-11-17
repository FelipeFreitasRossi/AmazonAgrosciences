@echo off
setlocal
cd /d "%~dp0"

echo.
echo === [1/2] Configurando o backend (Python + FastAPI) ===
cd backend
if not exist .venv (
    python -m venv .venv || goto :erro
)
call .venv\Scripts\activate.bat || goto :erro
python -m pip install --upgrade pip
python -m pip install -r requirements.txt || goto :erro
if not exist .env copy .env.example .env >nul
call deactivate
cd ..

echo.
echo === [2/2] Configurando o frontend (React + Vite) ===
cd frontend
call npm install || goto :erro
if not exist .env copy .env.example .env >nul
cd ..

echo.
echo Configuracao concluida.
echo Inicie o backend com iniciar-backend.bat e o frontend com iniciar-frontend.bat
pause
exit /b 0

:erro
echo.
echo Ocorreu um erro. Verifique as mensagens acima.
pause
exit /b 1
