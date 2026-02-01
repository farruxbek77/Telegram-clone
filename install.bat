@echo off
echo Installing server dependencies...
cd server
npm install
cd ..

echo Installing client dependencies...
cd client
npm install
cd ..

echo Installation complete!
echo.
echo To start the application:
echo 1. Run: start-server.bat
echo 2. Run: start-client.bat (in another terminal)
pause