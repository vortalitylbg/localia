@echo off

set backendPath=C:\Users\charr\Desktop\Codage\Sites web\Localify\backend
set managerPath=C:\Users\charr\Desktop\Codage\Sites web\Localify\server_manager

:loop

if exist "%managerPath%\stop.txt" exit
if exist "%managerPath%\restart.txt" del "%managerPath%\restart.txt"

cd /d "%backendPath%"
node index.js

echo Backend stopped. Waiting restart...

:wait
timeout /t 1 >nul

if exist "%managerPath%\restart.txt" goto loop
if exist "%managerPath%\stop.txt" exit

goto wait