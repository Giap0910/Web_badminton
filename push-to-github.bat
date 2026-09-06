@echo off
chcp 65001 >nul
title Day code len GitHub - Giap0910/Web_badminton

set "PATH=C:\tools\MinGit\cmd;C:\tools\MinGit\gcm;%PATH%"

echo ================================================================
echo    DANG TIEN HANH DAY TOAN BO CODE LEN GITHUB
echo    Repository: https://github.com/Giap0910/Web_badminton.git
echo ================================================================
echo.

cd /d "c:\Project\Web_badminton"

echo 1. Kiem tra trang thai Git...
git status --short

echo.
echo 2. Dang day len nhanh main...
echo (Neu co cua so trinh duyet hien ra, ban chi can bam "Authorize" de dang nhap GitHub)
echo.

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================================
    echo    DA DAY MA NGUON LEN GITHUB THANH CONG!
    echo    Xem tai: https://github.com/Giap0910/Web_badminton
    echo ================================================================
) else (
    echo.
    echo [!] Co loi xay ra khi push. Vui long kiem tra lai quyen truy cap GitHub.
)

echo.
pause
