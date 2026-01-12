import mongoose from 'mongoose';

/**
 * @typedef {Object} Message
 * @property {'user'|'bot'} role - The role of the message sender
 * @property {string} content - The message content
 * @property {Date} timestamp - When the message was sent
 */

/**
 * @typedef {Object} ConversationDocument
 * @property {string} sessionId - Unique session identifier
 * @property {string} [userId] - Optional user identifier from SDK config
 * @property {string} [userName] - Optional user name from SDK config
 * @property {string} [petName] - Optional pet name from SDK config
 * @property {string} [source] - Optional source identifier from SDK config
 * @property {Message[]} messages - Array of conversation messages
 * @property {boolean} isActive - Whether the conversation is active
 * @property {Date} createdAt - Conversation creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * Message sub-schema
 * Defines the structure for individual messages in a conversation
 */
const messageSchema = new mongoose.Schema(
    {
        /**
         * Role of the message sender
         * @type {'user'|'bot'}
         */
        role: {
            type: String,
            required: [true, 'Message role is required'],
            enum: {
                values: ['user', 'bot'],
                message: 'Role must be either "user" or "bot"',
            },
        },

        /**
         * Content of the message
         * @type {string}
         */
        content: {
            type: String,
            required: [true, 'Message content is required'],
            trim: true,
            maxlength: [5000, 'Message content cannot exceed 5000 characters'],
        },

        /**
         * Timestamp when the message was sent
         * @type {Date}
         */
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        _id: true,
        id: true,
    }
);

/**
 * Conversation Schema
 * Stores chat sessions between users and the veterinary chatbot
 * 
 * @example
 * const conversation = new Conversation({
 *   sessionId: 'sess_abc123',
 *   userId: 'user_123',
 *   userName: 'John Doe',
 *   petName: 'Buddy',
 *   source: 'website-widget',
 *   messages: [
 *     { role: 'user', content: 'Hello!' },
 *     { role: 'bot', content: 'Hi! How can I help with your pet today?' }
 *   ]
 * });
 */
const conversationSchema = new mongoose.Schema(
    {
        /**
         * Unique session identifier
         * Used to track and retrieve conversations
         * @type {string}
         */
        sessionId: {
            type: String,
            required: [true, 'Session ID is required'],
            unique: true,
            trim: true,
            index: true,
            validate: {
                validator: function (v) {
                    // Session ID should be alphanumeric with optional dashes/underscores
                    return /^[a-zA-Z0-9_-]{8,64}$/.test(v);
                },
                message: 'Session ID must be 8-64 alphanumeric characters (dashes and underscores allowed)',
            },
        },

        /**
         * Optional user identifier from SDK configuration
         * Can be used to link conversations to authenticated users
         * @type {string}
         */
        userId: {
            type: String,
            trim: true,
            default: null,
            index: true,
            sparse: true,
        },

        /**
         * Optional user name from SDK configuration
         * Used for personalization in chat responses
         * @type {string}
         */
        userName: {
            type: String,
            trim: true,
            default: null,
            maxlength: [100, 'User name cannot exceed 100 characters'],
        },

        /**
         * Optional pet name from SDK configuration
         * Used for personalized responses about the pet
         * @type {string}
         */
        petName: {
            type: String,
            trim: true,
            default: null,
            maxlength: [100, 'Pet name cannot exceed 100 characters'],
        },

        /**
         * Optional source identifier from SDK configuration
         * Tracks where the conversation originated (e.g., 'website', 'mobile-app')
         * @type {string}
         */
        source: {
            type: String,
            trim: true,
            default: null,
            maxlength: [50, 'Source cannot exceed 50 characters'],
        },

        /**
         * Array of messages in the conversation
         * @type {Message[]}
         */
        messages: {
            type: [messageSchema],
            default: [],
            validate: {
                validator: function (v) {
                    return v.length <= 500;
                },
                message: 'Conversation cannot exceed 500 messages',
            },
        },

        /**
         * Whether the conversation is currently active
         * Inactive conversations are considered closed/archived
         * @type {boolean}
         */
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
        toJSON: {
            virtuals: true,
            transform: function (_doc, ret) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
        },
    }
);

// =============================================================================
// Indexes
// =============================================================================

/**
 * Compound index for efficient querying of active conversations
 */
conversationSchema.index({ isActive: 1, createdAt: -1 });

/**
 * Index for sorting by creation date (most recent first)
 */
conversationSchema.index({ createdAt: -1 });

/**
 * Index for sorting by last update (most recent first)
 */
conversationSchema.index({ updatedAt: -1 });

/**
 * Compound index for user-specific conversation lookups
 */
conversationSchema.index({ userId: 1, createdAt: -1 });

// =============================================================================
// Virtual Properties
// =============================================================================

/**
 * Virtual property to get the message count
 * @returns {number} Number of messages in the conversation
 */
conversationSchema.virtual('messageCount').get(function () {
    return this.messages.length;
});

/**
 * Virtual property to get the last message
 * @returns {Message|null} The most recent message or null
 */
conversationSchema.virtual('lastMessage').get(function () {
    if (this.messages.length === 0) {
        return null;
    }
    return this.messages[this.messages.length - 1];
});

/**
 * Virtual property to calculate conversation duration
 * @returns {number|null} Duration in milliseconds or null if no messages
 */
conversationSchema.virtual('duration').get(function () {
    if (this.messages.length < 2) {
        return null;
    }
    const firstMessage = this.messages[0];
    const lastMessage = this.messages[this.messages.length - 1];
    return new Date(lastMessage.timestamp) - new Date(firstMessage.timestamp);
});

// =============================================================================
// Instance Methods
// =============================================================================

/**
 * Add a message to the conversation
 * @param {'user'|'bot'} role - The role of the message sender
 * @param {string} content - The message content
 * @returns {Promise<ConversationDocument>} The updated conversation
 * @throws {Error} If role or content is invalid
 * 
 * @example
 * const conversation = await Conversation.findBySessionId('sess_abc123');
 * await conversation.addMessage('user', 'My dog is not eating');
 */
conversationSchema.methods.addMessage = async function (role, content) {
    if (!['user', 'bot'].includes(role)) {
        throw new Error('Invalid message role. Must be "user" or "bot"');
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('Message content is required and must be a non-empty string');
    }

    if (content.length > 5000) {
        throw new Error('Message content cannot exceed 5000 characters');
    }

    this.messages.push({
        role,
        content: content.trim(),
        timestamp: new Date(),
    });

    // Update the conversation's updatedAt timestamp
    this.updatedAt = new Date();

    return this.save();
};

/**
 * Close/deactivate the conversation
 * @returns {Promise<ConversationDocument>} The updated conversation
 * 
 * @example
 * const conversation = await Conversation.findBySessionId('sess_abc123');
 * await conversation.close();
 */
conversationSchema.methods.close = async function () {
    this.isActive = false;
    return this.save();
};

/**
 * Get messages with pagination
 * @param {number} [limit=50] - Maximum number of messages to return
 * @param {number} [skip=0] - Number of messages to skip
 * @returns {Message[]} Array of messages
 * 
 * @example
 * const conversation = await Conversation.findBySessionId('sess_abc123');
 * const recentMessages = conversation.getMessages(10);
 */
conversationSchema.methods.getMessages = function (limit = 50, skip = 0) {
    const startIndex = Math.max(0, this.messages.length - skip - limit);
    const endIndex = this.messages.length - skip;
    return this.messages.slice(startIndex, endIndex);
};

// =============================================================================
// Static Methods
// =============================================================================

/**
 * Find a conversation by session ID
 * @param {string} sessionId - The session ID to search for
 * @returns {Promise<ConversationDocument|null>} The conversation or null
 * @throws {Error} If sessionId is not provided
 * 
 * @example
 * const conversation = await Conversation.findBySessionId('sess_abc123');
 * if (conversation) {
 *   console.log(`Found conversation with ${conversation.messageCount} messages`);
 * }
 */
conversationSchema.statics.findBySessionId = async function (sessionId) {
    if (!sessionId) {
        throw new Error('Session ID is required');
    }
    return this.findOne({ sessionId });
};

/**
 * Find or create a conversation by session ID
 * @param {string} sessionId - The session ID
 * @param {Object} [defaults={}] - Default values for new conversation
 * @returns {Promise<{conversation: ConversationDocument, created: boolean}>}
 * 
 * @example
 * const { conversation, created } = await Conversation.findOrCreate('sess_abc123', {
 *   userId: 'user_123',
 *   userName: 'John',
 *   petName: 'Buddy'
 * });
 */
conversationSchema.statics.findOrCreate = async function (sessionId, defaults = {}) {
    if (!sessionId) {
        throw new Error('Session ID is required');
    }

    let conversation = await this.findOne({ sessionId });
    let created = false;

    if (!conversation) {
        conversation = await this.create({
            sessionId,
            ...defaults,
        });
        created = true;
    }

    return { conversation, created };
};

/**
 * Find active conversations for a user
 * @param {string} userId - The user ID to search for
 * @param {Object} [options={}] - Query options
 * @param {number} [options.limit=10] - Maximum conversations to return
 * @param {number} [options.skip=0] - Number of conversations to skip
 * @returns {Promise<ConversationDocument[]>} Array of conversations
 * 
 * @example
 * const conversations = await Conversation.findByUserId('user_123', { limit: 5 });
 */
conversationSchema.statics.findByUserId = async function (userId, options = {}) {
    const { limit = 10, skip = 0 } = options;

    return this.find({ userId, isActive: true })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Get conversation statistics
 * @param {Object} [filter={}] - Optional filter criteria
 * @returns {Promise<Object>} Statistics object
 * 
 * @example
 * const stats = await Conversation.getStats({ isActive: true });
 * console.log(`Active conversations: ${stats.totalConversations}`);
 */
conversationSchema.statics.getStats = async function (filter = {}) {
    const pipeline = [
        { $match: filter },
        {
            $group: {
                _id: null,
                totalConversations: { $sum: 1 },
                totalMessages: { $sum: { $size: '$messages' } },
                avgMessagesPerConversation: { $avg: { $size: '$messages' } },
            },
        },
    ];

    const result = await this.aggregate(pipeline);
    return result[0] || {
        totalConversations: 0,
        totalMessages: 0,
        avgMessagesPerConversation: 0,
    };
};

// =============================================================================
// Middleware (Hooks)
// =============================================================================

/**
 * Pre-save middleware to validate and sanitize data
 */
conversationSchema.pre('save', function (next) {
    // Ensure sessionId is trimmed
    if (this.sessionId) {
        this.sessionId = this.sessionId.trim();
    }

    // Trim string fields
    if (this.userName) {
        this.userName = this.userName.trim();
    }
    if (this.petName) {
        this.petName = this.petName.trim();
    }
    if (this.source) {
        this.source = this.source.trim();
    }

    next();
});

/**
 * Post-save middleware for logging (optional)
 */
conversationSchema.post('save', function (doc) {
    // Log conversation updates in development
    if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`Conversation ${doc.sessionId} saved with ${doc.messages.length} messages`);
    }
});

// =============================================================================
// Model Export
// =============================================================================

/**
 * Conversation Model
 * @type {mongoose.Model<ConversationDocument>}
 */
export const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
