@echo off
setlocal
cd /d "%~dp0"

@REM rem Relaunch minimized once so the source launcher window does not pop in front.
@REM if /I not "%~1"=="__min" (
@REM   start "" /min cmd /c ""%~f0" __min"
@REM   exit /b
@REM )

echo Starting Auditor Analysis Framework (single-server local mode)...
echo.

set "VENV_PYTHON=%~dp0.venv\Scripts\python.exe"
if exist "%VENV_PYTHON%" (
  set "PYTHON_EXE=%VENV_PYTHON%"
  echo Using virtual environment Python: "%PYTHON_EXE%"
) else (
  set "PYTHON_EXE=python"
  echo Warning: .venv not found. Falling back to system Python.
)
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

set "SERVER_URL=http://localhost:5000"

set "BACKEND_PROCESS_RUNNING=0"

rem First guard: detect any existing python process already running api.py.
powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match '(?i)(^|[\"\s])api\.py([\"\s]|$)' }; if ($p) { exit 0 } else { exit 1 }"
if not errorlevel 1 set "BACKEND_PROCESS_RUNNING=1"

if "%BACKEND_PROCESS_RUNNING%"=="0" (
  echo Starting backend server in a separate window...
  echo A backend terminal will stay open so you can see any startup errors.
  start "Auditor Backend" /min /D "%~dp0" cmd /k ""%PYTHON_EXE%" "api.py""
  echo Waiting 2 seconds for server startup...
  timeout /t 2 /nobreak >nul
) else (
  echo Backend already running. Reusing existing server terminal.
)

echo Opening app in your default browser...
start "" "%SERVER_URL%"

endlocal
