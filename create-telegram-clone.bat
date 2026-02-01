@echo off
echo Creating Telegram Clone Project...

:: Create main project directory
mkdir telegram-clone
cd telegram-clone

:: Create client (React)
echo Creating React client...
npx create-react-app client
cd client

:: Install additional packages
npm install socket.io-client axios react-router-dom react-hot-toast

cd ..

:: Create server (Node.js)
echo Creating Node.js server...
mkdir server
cd server

:: Initialize package.json
npm init -y

:: Install server packages
npm install express socket.io cors dotenv bcryptjs jsonwebtoken uuid multer

:: Create basic server file
echo const express = require('express'); > server.js
echo const http = require('http'); >> server.js
echo const socketIo = require('socket.io'); >> server.js
echo const cors = require('cors'); >> server.js
echo. >> server.js
echo const app = express(); >> server.js
echo const server = http.createServer(app); >> server.js
echo const io = socketIo(server, { >> server.js
echo     cors: { >> server.js
echo         origin: "http://localhost:3000", >> server.js
echo         methods: ["GET", "POST"] >> server.js
echo     } >> server.js
echo }); >> server.js
echo. >> server.js
echo app.use(cors()); >> server.js
echo app.use(express.json()); >> server.js
echo. >> server.js
echo const PORT = process.env.PORT ^|^| 5000; >> server.js
echo server.listen(PORT, () =^> console.log(`Server running on port ${PORT}`)); >> server.js

cd ..

:: Create start scripts
echo @echo off > start-server.bat
echo cd server >> start-server.bat
echo node server.js >> start-server.bat

echo @echo off > start-client.bat
echo cd client >> start-client.bat
echo npm start >> start-client.bat

echo.
echo ✅ Telegram Clone project created successfully!
echo.
echo To start the project:
echo 1. Run start-server.bat
echo 2. Run start-client.bat
echo.
pause