const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    chatType: {
        type: String,
        enum: ['private', 'group', 'general'],
        default: 'private'
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        role: {
            type: String,
            enum: ['admin', 'member'],
            default: 'member'
        }
    }],
    chatName: {
        type: String,
        trim: true
    },
    chatAvatar: {
        type: String
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for better performance
chatSchema.index({ participants: 1 });
chatSchema.index({ lastActivity: -1 });

// Populate participants and last message
chatSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'participants.user',
        select: 'username phone avatar firstName lastName isOnline lastSeen'
    }).populate({
        path: 'lastMessage',
        select: 'text sender messageType createdAt',
        populate: {
            path: 'sender',
            select: 'username avatar'
        }
    });
    next();
});

// Static method to create private chat ID
chatSchema.statics.createPrivateChatId = function (userId1, userId2) {
    const sortedIds = [userId1, userId2].sort();
    return `private_${sortedIds[0]}_${sortedIds[1]}`;
};

// Method to add participant
chatSchema.methods.addParticipant = function (userId, role = 'member') {
    const existingParticipant = this.participants.find(
        p => p.user.toString() === userId.toString()
    );

    if (!existingParticipant) {
        this.participants.push({ user: userId, role });
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to remove participant
chatSchema.methods.removeParticipant = function (userId) {
    this.participants = this.participants.filter(
        p => p.user.toString() !== userId.toString()
    );
    return this.save();
};

module.exports = mongoose.model('Chat', chatSchema);