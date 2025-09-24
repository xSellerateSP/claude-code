@echo off
echo.
echo ===============================================
echo    MATRIX TERMINAL - Starting Local Server
echo ===============================================
echo.

REM Try Python 3 first, then fallback to python
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting server with Python...
    python server.py
) else (
    echo Python not found in PATH, trying py command...
    py --version >nul 2>&1
    if %errorlevel% == 0 (
        py server.py
    ) else (
        echo.
        echo ERROR: Python not found!
        echo Please install Python 3.x and add it to your PATH
        echo Or run manually: python server.py
        echo.
        pause
    )
)

pause