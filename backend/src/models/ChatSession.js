import mongoose from 'mongoose';

/**
 * Chat Session Schema
 * Stores conversation sessions for the veterinary chatbot
 */
const chatSessionSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        userId: {
            type: String,
            default: null,
        },
        petInfo: {
            name: { type: String, default: null },
            species: { type: String, enum: ['dog', 'cat', 'bird', 'rabbit', 'other', null], default: null },
            breed: { type: String, default: null },
            age: { type: Number, default: null },
            weight: { type: Number, default: null },
        },
        messages: [
            {
                role: {
                    type: String,
                    enum: ['user', 'assistant', 'system'],
                    required: true,
                },
                content: {
                    type: String,
                    required: true,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        metadata: {
            source: { type: String, default: 'widget' },
            userAgent: { type: String, default: null },
            ipAddress: { type: String, default: null },
        },
        status: {
            type: String,
            enum: ['active', 'closed', 'archived'],
            default: 'active',
        },
        lastActivityAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for efficient queries
chatSessionSchema.index({ lastActivityAt: -1 });
chatSessionSchema.index({ status: 1, lastActivityAt: -1 });
chatSessionSchema.index({ userId: 1 });

// Virtual for message count
chatSessionSchema.virtual('messageCount').get(function () {
    return this.messages.length;
});

// Update lastActivityAt before save
chatSessionSchema.pre('save', function (next) {
    this.lastActivityAt = new Date();
    next();
});

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;
