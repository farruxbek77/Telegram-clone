const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, 'Message text is required'],
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    chatId: {
        type: String,
        default: 'general',
        index: true // For faster queries
    },
    room: {
        type: String,
        default: 'general'
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'system'],
        default: 'text'
    },
    fileUrl: {
        type: String // For image/file messages
    },
    fileName: {
        type: String // Original file name
    },
    fileSize: {
        type: Number // File size in bytes
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message' // For reply functionality
    },
    edited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for better performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

// Populate sender info when querying
messageSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'sender',
        select: 'username phone avatar firstName lastName isOnline lastSeen'
    }).populate({
        path: 'replyTo',
        select: 'text sender messageType createdAt',
        populate: {
            path: 'sender',
            select: 'username avatar'
        }
    });
    next();
});

// Virtual for message status
messageSchema.virtual('isRead').get(function () {
    return this.readBy && this.readBy.length > 0;
});

// Method to mark message as read
messageSchema.methods.markAsRead = function (userId) {
    if (!this.readBy.find(read => read.user.toString() === userId.toString())) {
        this.readBy.push({ user: userId });
        return this.save();
    }
    return Promise.resolve(this);
};

module.exports = mongoose.model('Message', messageSchema);