/**
 * Type definitions and JSDoc types for the Veterinary Chatbot SDK
 * 
 * These types can be used for documentation and IDE support.
 * For TypeScript projects, convert these to .d.ts files.
 */

/**
 * @typedef {Object} PetInfo
 * @property {string|null} name - Pet's name
 * @property {'dog'|'cat'|'bird'|'rabbit'|'other'|null} species - Pet species
 * @property {string|null} breed - Pet breed
 * @property {number|null} age - Pet age in years
 * @property {number|null} weight - Pet weight in kg
 */

/**
 * @typedef {Object} Message
 * @property {string} id - Unique message identifier
 * @property {'user'|'assistant'|'system'} role - Message sender role
 * @property {string} content - Message content
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} ChatSession
 * @property {string} sessionId - Unique session identifier
 * @property {string|null} userId - Optional user identifier
 * @property {PetInfo} petInfo - Pet information
 * @property {Message[]} messages - Conversation history
 * @property {'active'|'closed'|'archived'} status - Session status
 * @property {string} createdAt - Session creation timestamp
 * @property {string} lastActivityAt - Last activity timestamp
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} [message] - Response message
 * @property {Object} [data] - Response data
 * @property {Object} [error] - Error information
 */

/**
 * @typedef {Object} ApiError
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {Object} [details] - Error details
 */

/**
 * @typedef {Object} WidgetConfig
 * @property {string} [containerId='veterinary-chatbot-widget'] - Container element ID
 * @property {string} [apiBaseUrl] - API base URL
 * @property {'bottom-right'|'bottom-left'} [position='bottom-right'] - Widget position
 * @property {string} [primaryColor='#6366f1'] - Primary theme color
 * @property {string} [title='Pet Health Assistant'] - Widget title
 */

/**
 * @typedef {Object} SendMessageRequest
 * @property {string} message - User message content
 */

/**
 * @typedef {Object} CreateSessionRequest
 * @property {string} [userId] - Optional user identifier
 * @property {PetInfo} [petInfo] - Optional pet information
 * @property {Object} [metadata] - Optional metadata
 */

export const Types = {
    PetSpecies: /** @type {const} */ (['dog', 'cat', 'bird', 'rabbit', 'other']),
    MessageRole: /** @type {const} */ (['user', 'assistant', 'system']),
    SessionStatus: /** @type {const} */ (['active', 'closed', 'archived']),
    WidgetPosition: /** @type {const} */ (['bottom-right', 'bottom-left']),
};

export default Types;
