@echo off
setlocal
cd /d "%~dp0"
title Password Strength Checker

where python >nul 2>nul
if %errorlevel%==0 (set PY=python) else (
    where py >nul 2>nul
    if %errorlevel%==0 (set PY=py) else (
        echo Python 3 was not found. Install it from https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

:menu
cls
echo ==============================
echo   Password Strength Checker
echo ==============================
echo   1. Check a password (terminal)
echo   2. Run unit tests
echo   3. Start the web app (secure local server)
echo   4. Run ALL tests (needs Node.js)
echo   5. Exit
echo.
set /p choice=Choose 1-5: 
if "%choice%"=="1" goto check
if "%choice%"=="2" goto tests
if "%choice%"=="3" goto web
if "%choice%"=="4" goto alltests
if "%choice%"=="5" goto end
goto menu

:check
echo.
%PY% password_checker.py
echo.
pause
goto menu

:tests
echo.
%PY% -m unittest -v
echo.
pause
goto menu

:web
echo.
echo Opening http://localhost:8000/  (press Ctrl+C here to stop the server)
start "" "http://localhost:8000/"
%PY% serve.py 8000
pause
goto menu

:alltests
echo.
where npm >nul 2>nul
if errorlevel 1 (echo Node.js is required: https://nodejs.org) else (call npm test)
echo.
pause
goto menu

:end
endlocal
