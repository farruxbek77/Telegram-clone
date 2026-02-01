const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [20, 'Username cannot exceed 20 characters']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        match: [/^\+998\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/, 'Please enter a valid Uzbek phone number']
    },
    firstName: {
        type: String,
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    bio: {
        type: String,
        trim: true,
        maxlength: [200, 'Bio cannot exceed 200 characters']
    },
    avatar: {
        type: String,
        default: function () {
            return `https://ui-avatars.com/api/?name=${this.username}&background=random&color=fff&size=200`;
        }
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    socketId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Update avatar when username changes
userSchema.pre('save', function (next) {
    if (this.isModified('username') && !this.avatar.includes('ui-avatars.com')) {
        this.avatar = `https://ui-avatars.com/api/?name=${this.username}&background=random&color=fff&size=200`;
    }
    next();
});

// Index for search optimization
userSchema.index({ username: 'text', firstName: 'text', lastName: 'text' });
userSchema.index({ phone: 1 });
userSchema.index({ isOnline: -1, lastSeen: -1 });

module.exports = mongoose.model('User', userSchema);