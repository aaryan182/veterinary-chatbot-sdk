import { forwardRef, useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Maximum character limit for messages
 */
const MAX_CHARS = 2000;

/**
 * Maximum number of lines before scrolling
 */
const MAX_LINES = 4;

/**
 * ChatInput Component
 * Text input with auto-resize, character limit, and keyboard shortcuts
 */
const ChatInput = forwardRef(function ChatInput(
    { value, onChange, onSend, isLoading, placeholder, maxChars = MAX_CHARS },
    ref
) {
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef(null);
    const charCount = value.length;
    const isOverLimit = charCount > maxChars;
    const isEmpty = value.trim().length === 0;
    const canSend = !isEmpty && !isLoading && !isOverLimit;

    // Sync ref
    useEffect(() => {
        if (ref) {
            if (typeof ref === 'function') {
                ref(textareaRef.current);
            } else {
                ref.current = textareaRef.current;
            }
        }
    }, [ref]);

    /**
     * Auto-resize textarea based on content
     */
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';

        // Calculate line height and max height
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
        const maxHeight = lineHeight * MAX_LINES;

        // Set new height (capped at max)
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
    }, []);

    // Adjust height when value changes
    useEffect(() => {
        adjustTextareaHeight();
    }, [value, adjustTextareaHeight]);

    /**
     * Handle input change
     */
    const handleChange = useCallback((e) => {
        onChange(e.target.value);
    }, [onChange]);

    /**
     * Handle key down events
     * Enter to send, Shift+Enter for new line
     */
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (canSend) {
                onSend(value);
            }
        }
    }, [canSend, onSend, value]);

    /**
     * Handle send button click
     */
    const handleSendClick = useCallback(() => {
        if (canSend) {
            onSend(value);
        }
    }, [canSend, onSend, value]);

    /**
     * Handle focus events
     */
    const handleFocus = useCallback(() => setIsFocused(true), []);
    const handleBlur = useCallback(() => setIsFocused(false), []);

    return (
        <div
            className="chat-input-container border-t border-gray-200 bg-white p-3 sm:p-4 flex-shrink-0"
            role="form"
            aria-label="Message input"
        >
            {/* Character count (shown when near limit) */}
            {charCount > maxChars * 0.8 && (
                <div
                    className={`text-xs mb-2 text-right transition-colors ${isOverLimit ? 'text-red-500' : 'text-gray-400'
                        }`}
                    aria-live="polite"
                >
                    {charCount} / {maxChars}
                </div>
            )}

            {/* Input Container */}
            <div
                className={`
          flex items-end gap-2 bg-gray-100 rounded-xl p-2
          transition-all duration-200
          ${isFocused ? 'ring-2 ring-indigo-500/30 bg-white border border-indigo-200' : 'border border-transparent'}
          ${isOverLimit ? 'ring-2 ring-red-500/30 border-red-200' : ''}
        `}
            >
                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    disabled={isLoading}
                    rows={1}
                    className={`
            flex-1 bg-transparent resize-none outline-none
            text-sm text-gray-800 placeholder-gray-400
            min-h-[24px] max-h-[96px]
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
                    aria-label="Type your message"
                    aria-describedby={isOverLimit ? 'char-limit-warning' : undefined}
                />

                {/* Send Button */}
                <button
                    onClick={handleSendClick}
                    disabled={!canSend}
                    className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-indigo-500/50
            ${canSend
                            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:shadow-md active:scale-95'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }
          `}
                    aria-label="Send message"
                    title={!canSend ? (isLoading ? 'Sending...' : 'Type a message to send') : 'Send message'}
                >
                    {isLoading ? (
                        // Loading spinner
                        <svg
                            className="w-5 h-5 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    ) : (
                        // Send icon
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                        </svg>
                    )}
                </button>
            </div>

            {/* Helper text */}
            <p className="text-xs text-gray-400 mt-2 text-center hidden sm:block">
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Enter</kbd> to send,
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono ml-1">Shift+Enter</kbd> for new line
            </p>

            {/* Over limit warning (for screen readers) */}
            {isOverLimit && (
                <p id="char-limit-warning" className="sr-only">
                    Message exceeds the {maxChars} character limit
                </p>
            )}
        </div>
    );
});

ChatInput.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    onSend: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
    placeholder: PropTypes.string,
    maxChars: PropTypes.number,
};

ChatInput.defaultProps = {
    isLoading: false,
    placeholder: 'Type your message...',
    maxChars: MAX_CHARS,
};

export default ChatInput;
