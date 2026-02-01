require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram-clone');
        console.log('Connected to MongoDB');

        // Clear existing users
        await User.deleteMany({});
        console.log('Cleared existing users');

        // Create demo users
        const demoUsers = [
            {
                username: 'admin',
                email: 'admin@test.com',
                password: '123456'
            },
            {
                username: 'user1',
                email: 'user1@test.com',
                password: '123456'
            },
            {
                username: 'user2',
                email: 'user2@test.com',
                password: '123456'
            }
        ];

        for (const userData of demoUsers) {
            const user = new User(userData);
            await user.save();
            console.log(`Created user: ${userData.username}`);
        }

        console.log('Demo users created successfully!');
        console.lonLogin credentials: ');
        console.log('Email: admin@test.com, Password: 123456');
        console.log('Email: user1@test.com, Password: 123456');
        console.log('Email: user2@test.com, Password: 123456');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedUsers(); g('\