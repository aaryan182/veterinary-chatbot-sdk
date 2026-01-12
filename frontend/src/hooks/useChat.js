import { useState, useEffect, useCallback } from 'react';
import { chatApi } from '../services/api';
import { generateId } from '../utils/helpers';

/**
 * useChat Hook
 * Manages chat state and API interactions
 */
export function useChat(apiBaseUrl) {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sessionId, setSessionId] = useState(null);

    // Initialize chat session
    useEffect(() => {
        const initSession = async () => {
            try {
                setIsLoading(true);
                const session = await chatApi.createSession(apiBaseUrl);
                setSessionId(session.sessionId);
                setError(null);
            } catch (err) {
                setError('Failed to connect to chat service. Please try again.');
                console.error('Session initialization error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        initSession();
    }, [apiBaseUrl]);

    // Send message
    const sendMessage = useCallback(
        async (content) => {
            if (!sessionId || !content.trim()) {
                return;
            }

            const userMessage = {
                id: generateId(),
                role: 'user',
                content: content.trim(),
                timestamp: new Date().toISOString(),
            };

            // Add user message immediately
            setMessages((prev) => [...prev, userMessage]);
            setIsLoading(true);
            setError(null);

            try {
                const response = await chatApi.sendMessage(
                    apiBaseUrl,
                    sessionId,
                    content
                );

                const assistantMessage = {
                    id: generateId(),
                    role: 'assistant',
                    content: response.message.content,
                    timestamp: response.message.timestamp,
                };

                setMessages((prev) => [...prev, assistantMessage]);
            } catch (err) {
                setError('Failed to get response. Please try again.');
                console.error('Send message error:', err);
            } finally {
                setIsLoading(false);
            }
        },
        [apiBaseUrl, sessionId]
    );

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Clear messages
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        messages,
        isLoading,
        error,
        sessionId,
        sendMessage,
        clearError,
        clearMessages,
    };
}

export default useChat;
