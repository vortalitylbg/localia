@echo off
chcp 437 >nul
color 0A
title Localia Control

:loop

call :status

cls
echo ==================================
echo        LOCALIA DEV PANEL
echo ==================================
echo.
echo Backend  : %backend%
echo Frontend : %frontend%
echo.
echo ----------------------------------
echo 1 - Start servers
echo 2 - Stop servers
echo 3 - Restart servers
echo 4 - Open browser
echo 0 - Exit
echo ----------------------------------
echo.

choice /c 12340 /n /m "Choice: "

if errorlevel 5 exit
if errorlevel 4 goto browser
if errorlevel 3 goto restart
if errorlevel 2 goto stop
if errorlevel 1 goto start


:start
del stop.txt 2>nul
echo restart > restart.txt
goto loop


:stop
echo stop > stop.txt
del restart.txt 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000 :5173" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
goto loop


:restart
taskkill /F /IM node.exe >nul 2>&1
del stop.txt 2>nul
timeout /t 1 >nul
start "" "%~dp0localia-dev.bat"
exit


:browser
start http://localhost:5173
goto loop


:status

tasklist | find "node.exe" >nul
if %errorlevel%==0 (
set backend=RUNNING
set frontend=RUNNING
) else (
set backend=STOPPED
set frontend=STOPPED
)

exit /b