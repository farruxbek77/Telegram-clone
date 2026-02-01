# Telegram Clone - O'zbek tilida

## 🚀 Tezkor Ishga Tushirish

### 1-usul: Avtomatik (Eng oson)
```cmd
START-ALL.bat
```
Bu fayl avtomatik ravishda server va clientni ishga tushiradi.

### 2-usul: Qo'lda
**Terminal 1 - Server:**
```cmd
cd server
npm start
```

**Terminal 2 - Client:**
```cmd
cd client
npm start
```

## 📱 Kirish

- **Client:** http://localhost:3001
- **Server API:** http://localhost:5005

## ✨ Xususiyatlar

- ✅ Ro'yxatdan o'tish va kirish
- ✅ Real-time chat (Socket.io)
- ✅ Foydalanuvchilarni qidirish
- ✅ Online/Offline status
- ✅ Xabar yuborish va o'qish
- ✅ Rasm va video yuklash
- ✅ Typing indicator
- ✅ MongoDB kerak emas (JSON file database)

## 🔧 Texnologiyalar

### Backend
- Node.js + Express
- Socket.io (real-time)
- JWT (authentication)
- JSON file database (MongoDB o'rniga)
- Multer (file upload)

### Frontend
- React.js
- Socket.io-client
- Axios
- CSS3

## 📝 Test Foydalanuvchilar

Quyidagi test accountlardan foydalaning:

**👤 Farrux**
- Email: farrux@test.com
- Parol: 123456

**👤 Shohruh**
- Email: shohruh@test.com
- Parol: 123456

Yoki yangi account yaratishingiz mumkin!

## 🛠️ Muammolarni Hal Qilish

### Server ishlamayapti
```cmd
cd server
npm install
npm start
```

### Client ishlamayapti
```cmd
cd client
npm install
npm start
```

### Port band
Server yoki client portlari band bo'lsa:
```cmd
# Node jarayonlarini to'xtatish
taskkill /F /IM node.exe
```

### Dependencies o'rnatish
```cmd
# Server
cd server
npm install

# Client
cd client
npm install
```

## 📂 Fayl Tuzilishi

```
TG/
├── server/
│   ├── server-simple-fixed.js  # Asosiy server (MongoDB kerak emas)
│   ├── data/                   # JSON database
│   │   ├── users.json
│   │   ├── messages.json
│   │   └── chats.json
│   └── uploads/                # Yuklangan fayllar
├── client/
│   └── src/
│       ├── components/
│       └── services/
└── START-ALL.bat              # Avtomatik ishga tushirish
```

## 🎯 Keyingi Qadamlar

1. Guruh chatlari
2. Voice messages
3. Video calls
4. File sharing
5. Emoji va stickers
6. Message forwarding
7. User profiles
8. Settings page

## 💡 Yordam

Muammo bo'lsa:
1. Ikkala terminal ham ochiq ekanligiga ishonch hosil qiling
2. Server avval ishga tushishi kerak
3. Browser console'da xatolarni tekshiring
4. Server terminal'da xatolarni tekshiring

## 📞 Aloqa

Savollar bo'lsa, issue oching yoki pull request yuboring!

---
Made with ❤️ in Uzbekistan
