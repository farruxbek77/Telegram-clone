const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function updateUsers() {
    const hashedPassword = await bcrypt.hash('123456', 10);

    const users = [
        {
            id: '1',
            username: 'Farrux',
            email: 'farrux@test.com',
            phone: '+998901234567',
            password: hashedPassword,
            avatar: 'https://ui-avatars.com/api/?name=Farrux&background=4CAF50&color=fff',
            isOnline: false,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            username: 'Shohruh',
            email: 'shohruh@test.com',
            phone: '+998901234568',
            password: hashedPassword,
            avatar: 'https://ui-avatars.com/api/?name=Shohruh&background=2196F3&color=fff',
            isOnline: false,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }
    ];

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    console.log('✅ Foydalanuvchilar yangilandi!');
    console.log('\n📝 Login ma\'lumotlari:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach(user => {
        console.log(`👤 ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Parol: 123456`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
}

updateUsers().catch(console.error);
