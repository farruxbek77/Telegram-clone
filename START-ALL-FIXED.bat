@echo off
echo ========================================
echo   TELEGRAM CLONE - ISHGA TUSHIRISH
echo ========================================
echo.
echo Server va Client ishga tushirilmoqda...
echo.

cd server
start "Telegram Server" cmd /k "npm start"

timeout /t 3 /nobreak >nul

cd ../client
start "Telegram Client" cmd /k "npm start"

echo.
echo ========================================
echo Ikkala terminal ham ochildi!
echo.
echo Server: http://localhost:5005
echo Client: http://localhost:3001
echo.
echo Login ma'lumotlari:
echo Farrux - farrux@test.com / 123456
echo Shohruh - shohruh@test.com / 123456
echo ========================================
