@echo off
title SmashZone Badminton - Spring Boot Backend
echo =======================================================================
echo   KHOI DONG BACKEND SPRING BOOT 3 (JAVA 17 LTS - PORT 8080)
echo   MySQL XAMPP Port 3306 - DB: web_badminton
echo =======================================================================

set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
set "PATH=%JAVA_HOME%\bin;C:\tools\apache-maven-3.9.6\bin;%PATH%"

cd /d "c:\Project\Web_badminton\backend"

echo Dang khoi chay Spring Boot...
java -jar target\web_badminton_backend-1.0.0.jar

pause
