# Telegram Clone

React va Node.js yordamida yaratilgan to'liq funksional Telegram clone ilovasi.

## Xususiyatlar

- 🔐 Foydalanuvchi autentifikatsiyasi (Login/Register)
- 💬 Real-time chat xabarlashuv
- 👥 Guruh chatlari
- 📷 Rasm va video yuklash
- 👤 Foydalanuvchi profili
- 🔍 Foydalanuvchi qidiruv
- ⚙️ Sozlamalar
- 🟢 Online status ko'rsatish
- ✓ Xabar statuslari (yuborildi, o'qildi)

## Texnologiyalar

### Frontend
- React.js
- Socket.io-client
- Axios
- CSS3

### Backend
- Node.js
- Express.js
- MongoDB
- Socket.io
- JWT Authentication
- Multer (fayl yuklash)

## O'rnatish

### Talablar
- Node.js (v14 yoki yuqori)
- MongoDB

### 1. Repositoriyani klonlash
```bash
git clone https://github.com/farruxbek77/Telegram-clone.git
cd Telegram-clone
```

### 2. Dependencies o'rnatish

Client uchun:
```bash
cd client
npm install
```

Server uchun:
```bash
cd server
npm install
```

### 3. Environment o'zgaruvchilarini sozlash

`server/.env` faylini yarating:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

`client/.env` faylini yarating:
```
REACT_APP_API_URL=http://localhost:5000
```

### 4. Ilovani ishga tushirish

Server:
```bash
cd server
npm start
```

Client:
```bash
cd client
npm start
```

Ilova `http://localhost:3000` da ochiladi.

## Loyiha strukturasi

```
telegram-clone/
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/     # React komponentlar
│       ├── context/        # Context API
│       └── services/       # API xizmatlari
├── server/                 # Node.js backend
│   ├── models/            # MongoDB modellari
│   ├── routes/            # API routes
│   ├── middleware/        # Middleware funksiyalar
│   └── uploads/           # Yuklangan fayllar
└── README.md
```

## Litsenziya

MIT

## Muallif

Farruxbek
