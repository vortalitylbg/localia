@echo off
title Localify Dev

set backendPath=C:\Users\charr\Desktop\Codage\Sites web\Localify\backend
set frontendPath=C:\Users\charr\Desktop\Codage\Sites web\Localify\frontend

wt ^
new-tab --title "Control" cmd /k "%~dp0control.bat" ^
; split-pane -H --title "Backend" cmd /k "%~dp0backend-runner.bat" ^
; split-pane -V --title "Frontend" cmd /k "%~dp0frontend-runner.bat"