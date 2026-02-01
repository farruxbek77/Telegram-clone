require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-clone');
        console.log('✅ Connected to MongoDB');

        // Clear existing users
        await User.deleteMany({});
        console.log('🗑️ Cleared existing users');

        // Create demo users
        const demoUsers = [
            {
                username: 'Admin',
                phone: '+998 90 123 45 67',
                firstName: 'Admin',
                lastName: 'User',
                bio: 'System administrator',
                avatar: 'https://ui-avatars.com/api/?name=Admin&background=0088cc&color=fff&size=200'
            },
            {
                username: 'JohnDoe',
                phone: '+998 91 234 56 78',
                firstName: 'John',
                lastName: 'Doe',
                bio: 'Software developer',
                avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=40a7e3&color=fff&size=200'
            },
            {
                username: 'JaneSmith',
                phone: '+998 93 345 67 89',
                firstName: 'Jane',
                lastName: 'Smith',
                bio: 'UI/UX Designer',
                avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=e74c3c&color=fff&size=200'
            },
            {
                username: 'AliceWonder',
                phone: '+998 94 456 78 90',
                firstName: 'Alice',
                lastName: 'Wonder',
                bio: 'Product Manager',
                avatar: 'https://ui-avatars.com/api/?name=Alice+Wonder&background=9b59b6&color=fff&size=200'
            },
            {
                username: 'BobBuilder',
                phone: '+998 95 567 89 01',
                firstName: 'Bob',
                lastName: 'Builder',
                bio: 'DevOps Engineer',
                avatar: 'https://ui-avatars.com/api/?name=Bob+Builder&background=f39c12&color=fff&size=200'
            }
        ];

        for (const userData of demoUsers) {
            const user = new User(userData);
            await user.save();
            console.log(`✅ Created user: ${userData.username} (${userData.phone})`);
        }

        console.log('\n🎉 Demo users created successfully!');
        console.log('\n📱 Login credentials (Phone numbers):');
        console.log('Phone: +998 90 123 45 67 (Admin)');
        console.log('Phone: +998 91 234 56 78 (JohnDoe)');
        console.log('Phone: +998 93 345 67 89 (JaneSmith)');
        console.log('Phone: +998 94 456 78 90 (AliceWonder)');
        console.log('Phone: +998 95 567 89 01 (BobBuilder)');
        console.log('\n✨ Or register with any new +998 XX XXX XX XX number!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
};

seedUsers();