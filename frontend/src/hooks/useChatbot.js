import { useState, useEffect, useCallback, useRef } from 'react';
import { sendMessage, getHistory } from '../services/apiService';

/**
 * @fileoverview useChatbot Hook
 * Manages all chatbot state and API interactions
 */

// =============================================================================
// Configuration
// =============================================================================

const STORAGE_KEYS = {
    SESSION_ID: 'vetChatbot_sessionId',
    MESSAGES: 'vetChatbot_messages',
    CONTEXT: 'vetChatbot_context',
};

/**
 * Generate a unique session ID
 * @returns {string}
 */
const generateSessionId = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 12);
    return `sess_${timestamp}${randomPart}`;
};

/**
 * Default welcome message
 */
const WELCOME_MESSAGE = {
    id: 'welcome_msg',
    role: 'bot',
    content: `Hello! 👋 I'm your Veterinary Assistant. I'm here to help with:

• Pet health questions
• Vaccination schedules  
• Nutrition advice
• Appointment booking

How can I assist you and your pet today?`,
    timestamp: new Date().toISOString(),
    isWelcome: true,
};

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useChatbot Hook
 * 
 * Manages chatbot state including messages, session, loading, and errors
 * 
 * @param {Object} options - Hook options
 * @param {Object} [options.initialContext] - Initial context (userId, userName, petName, source)
 * @param {boolean} [options.persistMessages=true] - Whether to persist messages in localStorage
 * @param {Function} [options.onAppointmentDetected] - Callback when appointment intent detected
 * @param {Function} [options.onError] - Error callback
 * 
 * @returns {Object} Chatbot state and methods
 * 
 * @example
 * const {
 *   messages,
 *   isLoading,
 *   error,
 *   sessionId,
 *   sendMessage,
 *   clearError,
 *   resetChat
 * } = useChatbot({ initialContext: { userName: 'John' } });
 */
export function useChatbot(options = {}) {
    const {
        initialContext = {},
        persistMessages = true,
        onAppointmentDetected,
        onError,
    } = options;

    // ==========================================================================
    // State
    // ==========================================================================
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sessionId, setSessionId] = useState('');
    const [context, setContext] = useState(initialContext);
    const [isInitialized, setIsInitialized] = useState(false);
    const [appointmentMode, setAppointmentMode] = useState(false);

    // Refs
    const messagesRef = useRef(messages);
    const abortControllerRef = useRef(null);

    // Keep ref in sync with state
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // ==========================================================================
    // Initialization
    // ==========================================================================

    useEffect(() => {
        const initializeSession = () => {
            try {
                // Get or create session ID
                let storedSessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);

                if (!storedSessionId) {
                    storedSessionId = generateSessionId();
                    localStorage.setItem(STORAGE_KEYS.SESSION_ID, storedSessionId);
                }

                setSessionId(storedSessionId);

                // Load stored context
                const storedContext = localStorage.getItem(STORAGE_KEYS.CONTEXT);
                if (storedContext) {
                    try {
                        const parsed = JSON.parse(storedContext);
                        setContext((prev) => ({ ...parsed, ...prev }));
                    } catch (e) {
                        // Invalid JSON, ignore
                    }
                }

                // Load stored messages if persistence is enabled
                if (persistMessages) {
                    const storedMessages = localStorage.getItem(
                        `${STORAGE_KEYS.MESSAGES}_${storedSessionId}`
                    );

                    if (storedMessages) {
                        try {
                            const parsed = JSON.parse(storedMessages);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                setMessages(parsed);
                            } else {
                                setMessages([WELCOME_MESSAGE]);
                            }
                        } catch (e) {
                            setMessages([WELCOME_MESSAGE]);
                        }
                    } else {
                        setMessages([WELCOME_MESSAGE]);
                    }
                } else {
                    setMessages([WELCOME_MESSAGE]);
                }

                setIsInitialized(true);
            } catch (err) {
                console.error('[useChatbot] Initialization error:', err);
                // Fallback to new session
                const newSessionId = generateSessionId();
                setSessionId(newSessionId);
                setMessages([WELCOME_MESSAGE]);
                setIsInitialized(true);
            }
        };

        // Read global config if available
        if (typeof window !== 'undefined' && window.VetChatbotConfig) {
            const globalContext = {
                userId: window.VetChatbotConfig.userId,
                userName: window.VetChatbotConfig.userName,
                petName: window.VetChatbotConfig.petName,
                source: window.VetChatbotConfig.source || 'widget',
            };
            setContext((prev) => ({ ...globalContext, ...prev }));
        }

        initializeSession();

        // Cleanup on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [persistMessages]);

    // ==========================================================================
    // Persist messages when they change
    // ==========================================================================

    useEffect(() => {
        if (persistMessages && sessionId && messages.length > 0 && isInitialized) {
            try {
                localStorage.setItem(
                    `${STORAGE_KEYS.MESSAGES}_${sessionId}`,
                    JSON.stringify(messages)
                );
            } catch (e) {
                console.warn('[useChatbot] Failed to persist messages:', e);
            }
        }
    }, [messages, sessionId, persistMessages, isInitialized]);

    // ==========================================================================
    // Persist context when it changes
    // ==========================================================================

    useEffect(() => {
        if (Object.keys(context).length > 0) {
            try {
                localStorage.setItem(STORAGE_KEYS.CONTEXT, JSON.stringify(context));
            } catch (e) {
                console.warn('[useChatbot] Failed to persist context:', e);
            }
        }
    }, [context]);

    // ==========================================================================
    // Send Message
    // ==========================================================================

    /**
     * Send a message to the chatbot
     * @param {string} messageText - Message content
     * @returns {Promise<void>}
     */
    const handleSendMessage = useCallback(async (messageText) => {
        if (!messageText?.trim() || isLoading || !sessionId) {
            return;
        }

        const trimmedMessage = messageText.trim();

        // Create user message object
        const userMessage = {
            id: `msg_${Date.now()}_user`,
            role: 'user',
            content: trimmedMessage,
            timestamp: new Date().toISOString(),
        };

        // Optimistic update - add user message immediately
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        setError(null);

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        try {
            const response = await sendMessage(sessionId, trimmedMessage, context);

            // Check if appointment was detected
            if (response.appointmentDetected) {
                setAppointmentMode(true);
                if (onAppointmentDetected) {
                    onAppointmentDetected(response);
                }
            }

            // Add bot response
            const botMessage = {
                id: `msg_${Date.now()}_bot`,
                role: 'bot',
                content: response.reply,
                timestamp: new Date().toISOString(),
                appointmentDetected: response.appointmentDetected,
            };

            setMessages((prev) => [...prev, botMessage]);

        } catch (err) {
            console.error('[useChatbot] Send message error:', err);

            const errorMessage = err.message || 'Failed to send message. Please try again.';
            setError(errorMessage);

            // Call error callback if provided
            if (onError) {
                onError(err);
            }

            // Add error message to chat
            const errorBotMessage = {
                id: `msg_${Date.now()}_error`,
                role: 'bot',
                content: 'Sorry, I encountered an error processing your message. Please try again.',
                timestamp: new Date().toISOString(),
                isError: true,
            };

            setMessages((prev) => [...prev, errorBotMessage]);

        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [sessionId, context, isLoading, onAppointmentDetected, onError]);

    // ==========================================================================
    // Load History
    // ==========================================================================

    /**
     * Load conversation history from server
     * @param {number} [limit=50] - Maximum messages to load
     * @returns {Promise<void>}
     */
    const loadHistory = useCallback(async (limit = 50) => {
        if (!sessionId) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await getHistory(sessionId, limit);

            if (response.messages && response.messages.length > 0) {
                // Format messages from server
                const formattedMessages = response.messages.map((msg) => ({
                    id: msg.id || `msg_${Date.now()}_${Math.random()}`,
                    role: msg.role === 'user' ? 'user' : 'bot',
                    content: msg.content,
                    timestamp: msg.timestamp,
                }));

                setMessages([WELCOME_MESSAGE, ...formattedMessages]);

                // Update context from conversation if available
                if (response.conversation) {
                    setContext((prev) => ({
                        ...prev,
                        userName: response.conversation.userName || prev.userName,
                        petName: response.conversation.petName || prev.petName,
                    }));
                }
            }
        } catch (err) {
            console.error('[useChatbot] Load history error:', err);
            // Don't show error for history load failure, just use local messages
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    // ==========================================================================
    // Utility Functions
    // ==========================================================================

    /**
     * Clear the current error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Reset chat to initial state with new session
     */
    const resetChat = useCallback(() => {
        // Abort any pending request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Clear storage
        if (sessionId) {
            localStorage.removeItem(`${STORAGE_KEYS.MESSAGES}_${sessionId}`);
        }
        localStorage.removeItem(STORAGE_KEYS.SESSION_ID);

        // Generate new session
        const newSessionId = generateSessionId();
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, newSessionId);

        // Reset state
        setSessionId(newSessionId);
        setMessages([WELCOME_MESSAGE]);
        setError(null);
        setIsLoading(false);
        setAppointmentMode(false);
    }, [sessionId]);

    /**
     * Update context
     * @param {Object} newContext - Context updates
     */
    const updateContext = useCallback((newContext) => {
        setContext((prev) => ({ ...prev, ...newContext }));
    }, []);

    /**
     * Exit appointment booking mode
     */
    const exitAppointmentMode = useCallback(() => {
        setAppointmentMode(false);
    }, []);

    /**
     * Add a system message (not persisted to server)
     * @param {string} content - Message content
     */
    const addSystemMessage = useCallback((content) => {
        const systemMessage = {
            id: `msg_${Date.now()}_system`,
            role: 'bot',
            content,
            timestamp: new Date().toISOString(),
            isSystem: true,
        };
        setMessages((prev) => [...prev, systemMessage]);
    }, []);

    // ==========================================================================
    // Return
    // ==========================================================================

    return {
        // State
        messages,
        isLoading,
        error,
        sessionId,
        context,
        isInitialized,
        appointmentMode,

        // Actions
        sendMessage: handleSendMessage,
        loadHistory,
        clearError,
        resetChat,
        updateContext,
        exitAppointmentMode,
        addSystemMessage,
    };
}

export default useChatbot;
