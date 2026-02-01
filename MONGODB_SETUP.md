# MongoDB O'rnatish va Ishga Tushirish

## 1. MongoDB o'rnatish

### Windows uchun:
1. https://www.mongodb.com/try/download/community saytiga o'ting
2. Windows versiyasini yuklab oling
3. MSI faylni ishga tushiring va o'rnating
4. MongoDB Compass ham o'rnatiladi (GUI)

### Yoki MongoDB Atlas (Cloud) ishlatish:
1. https://www.mongodb.com/atlas/database ga o'ting
2. Bepul account yarating
3. Cluster yarating
4. Connection string oling

## 2. MongoDB ishga tushirish

### Local MongoDB:
```bash
# MongoDB service ishga tushirish (Windows)
net start MongoDB

# Yoki manual ishga tushirish
mongod
```

### MongoDB Atlas:
- Connection string `.env` fayliga qo'ying

## 3. Loyihani ishga tushirish

### Server (MongoDB versiyasi):
```bash
cd server

# Dependencies o'rnatish
npm install

# Demo data yaratish (ixtiyoriy)
npm run seed-mongo

# Server ishga tushirish
npm run start-mongo
```

### Client:
```bash
cd client
npm install
npm start
```

## 4. Environment Variables

`.env` faylini tekshiring:
```
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
MONGODB_URI=mongodb://localhost:27017/telegram-clone
NODE_ENV=development
```

MongoDB Atlas uchun:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/telegram-clone
```

## 5. Test qilish

1. Server ishga tushganda: `✅ Connected to MongoDB`
2. Browser: http://localhost:3000
3. Demo phone numbers bilan login qiling

## Xatoliklar

### "MongoNetworkError":
- MongoDB service ishga tushmagan
- Connection string noto'g'ri

### "Authentication failed":
- MongoDB Atlas username/password noto'g'ri
- IP address whitelist-ga qo'shilmagan

### "Database not found":
- Avtomatik yaratiladi, xavotir olmang