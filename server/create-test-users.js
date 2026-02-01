const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Create data directory if not exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

async function createTestUsers() {
    const hashedPassword = await bcrypt.hash('123456', 10);

    const testUsers = [
        {
            id: '1',
            username: 'Ali',
            email: 'ali@test.com',
            phone: '+998901234567',
            password: hashedPassword,
            avatar: 'https://ui-avatars.com/api/?name=Ali&background=4CAF50&color=fff',
            isOnline: false,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            username: 'Vali',
            email: 'vali@test.com',
            phone: '+998901234568',
            password: hashedPassword,
            avatar: 'https://ui-avatars.com/api/?name=Vali&background=2196F3&color=fff',
            isOnline: false,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
        },
        {
            id: '3',
            username: 'Sardor',
            email: 'sardor@test.com',
            phone: '+998901234569',
            password: hashedPassword,
            avatar: 'https://ui-avatars.com/api/?name=Sardor&background=FF9800&color=fff',
            isOnline: false,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
        },
        {
            id: '4',
            username: 'Dilnoza',
            email: 'dilnoza@test.com',
            phone: '+998901234570',
            password: hashedPassword,
            avatar: 'https://ui-avatars.com/api/?name=Dilnoza&background=E91E63&color=fff',
            isOnline: false,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
        },
        {
            id: '5',
            username: 'Aziza',
            email: 'aziza@test.com',
            phone: '+998901234571',
            password: hashedPassword,
            avatar: 'https://ui-avatars.com/api/?name=Aziza&background=9C27B0&color=fff',
            isOnline: false,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }
    ];

    fs.writeFileSync(USERS_FILE, JSON.stringify(testUsers, null, 2));

    console.log('✅ Test foydalanuvchilar yaratildi!');
    console.log('\n📝 Login ma\'lumotlari:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    testUsers.forEach(user => {
        console.log(`👤 ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Parol: 123456`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
}

createTestUsers().catch(console.error);
