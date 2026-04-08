@echo off
setlocal
cd /d "%~dp0"

rem Always relaunch minimized unless explicitly marked.
if /I not "%~1"=="__min" (
  start "" /min cmd /c ""%~f0" __min"
  exit /b
)

echo Starting Auditor Analysis Framework (single-server local mode)...
echo.

if not exist "dist\index.html" (
  echo Frontend build not found. Building frontend now...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )

  call npm run build
  if errorlevel 1 (
    echo Frontend build failed.
    pause
    exit /b 1
  )
)

echo Opening app in your default browser...
start "" "http://localhost:5000"

echo Running backend server on http://localhost:5000
python api.py

endlocal
