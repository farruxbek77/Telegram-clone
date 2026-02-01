@echo off
echo ========================================
echo   TELEGRAM CLONE - ISHGA TUSHIRISH
echo ========================================
echo.
echo MongoDB kerak emas - JSON database ishlatiladi
echo.
echo Server: http://localhost:5005
echo Client: http://localhost:3001
echo.
echo ========================================
echo.

echo Server ishga tushirilmoqda...
start "Telegram Server" cmd /k "cd server && npm start"

timeout /t 3 /nobreak >nul

echo Client ishga tushirilmoqda...
start "Telegram Client" cmd /k "cd client && npm start"

echo.
echo ========================================
echo Ikkala terminal ham ochildi!
echo Server: http://localhost:5005
echo Client: http://localhost:3001
echo ========================================
pause
