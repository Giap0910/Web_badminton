@echo off
title SmashZone Badminton - React Vite Frontend
echo =======================================================================
echo   KHOI DONG FRONTEND REACT VITE (PORT 5173)
echo =======================================================================

set "PATH=C:\Program Files\nodejs;%PATH%"

cd /d "c:\Project\Web_badminton\frontend"

echo Dang khoi chay Vite Dev Server...
call "C:\Program Files\nodejs\npm.cmd" run dev

pause
