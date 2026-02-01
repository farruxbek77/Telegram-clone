# 🎥 Video Upload Feature

Telegram chat ilovasiga video yuklash va ko'rish imkoniyati qo'shildi!

## ✨ Yangi Imkoniyatlar

### 📤 Video Yuklash
- Rasm tanlash tugmasi yonida yangi **video yuklash tugmasi** (🎥)
- Video faylni tanlash va oldindan ko'rish
- 50MB gacha video fayl yuklash imkoniyati
- Video yuklash jarayonini kuzatish

### 🎬 Video Ko'rish
- Chatda video xabarlarni to'liq boshqaruv tugmalari bilan ko'rish
- Play/pause, ovoz balandligi, vaqt ko'rsatkichi
- Video thumbnail (oldindan ko'rish rasmi)
- Responsive dizayn - barcha qurilmalarda ishlaydi

### 🔧 Texnik Xususiyatlar

#### Backend:
- `/api/upload/video` - video yuklash endpoint
- Video fayl turlarini tekshirish
- 50MB fayl hajmi cheklovi
- Socket.io orqali video xabarlarni uzatish

#### Frontend:
- Video tanlash va oldindan ko'rish
- Video player komponenti
- Yuklash jarayoni indikatori
- Responsive CSS stillar

## 🚀 Qanday Ishlatish

1. **Chatni oching**: http://localhost:3001
2. **Tizimga kiring**: "Kirish" tugmasini bosing
3. **Video yuklash**: Xabar yozish maydonida 🎥 tugmasini bosing
4. **Video tanlang**: Kompyuterdan video fayl tanlang
5. **Oldindan ko'ring**: Video preview da ko'rib chiqing
6. **Yuboring**: ✈️ tugmasini bosib video yuboring

## 📱 Qo'llab-quvvatlanadigan Formatlar

- **Video**: MP4, WebM, AVI, MOV, MKV
- **Hajm**: Maksimal 50MB
- **Rasm**: 5MB (oldingi kabi)

## 🎯 Xususiyatlar

- ✅ Video preview oldindan ko'rish
- ✅ Yuklash jarayoni ko'rsatkichi
- ✅ Video player boshqaruv tugmalari
- ✅ Responsive dizayn
- ✅ Xato xabarlar va validatsiya
- ✅ General va private chatlarda ishlaydi

## 🔄 Yangilanishlar

### Backend (server-simple.js):
```javascript
// Video upload endpoint qo'shildi
app.post('/api/upload/video', auth, upload.single('video'), ...)

// Socket message handling da video support
message.videoUrl = messageData.videoUrl || null;
```

### Frontend (Chat.js):
```javascript
// Video upload states
const [selectedVideo, setSelectedVideo] = useState(null);
const [videoPreview, setVideoPreview] = useState(null);

// Video handling functions
const handleVideoSelect = (event) => { ... }
const handleVideoUpload = async () => { ... }
```

### API Service:
```javascript
// Video upload API
export const videoAPI = {
    uploadVideo: (formData) => api.post('/upload/video', formData, ...)
};
```

Video yuklash funksiyasi to'liq ishga tushirildi va foydalanishga tayyor! 🎉