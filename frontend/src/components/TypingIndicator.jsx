import { memo } from 'react';

/**
 * TypingIndicator Component
 * Animated dots to show the bot is typing/thinking
 */
function TypingIndicator() {
    return (
        <div
            className="flex gap-3 animate-fade-in"
            role="status"
            aria-label="Assistant is typing"
        >
            {/* Bot Avatar */}
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-base" role="img" aria-hidden="true">🐾</span>
            </div>

            {/* Typing Bubble */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-white rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                />
                <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                />
                <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                />
                <span className="sr-only">Assistant is typing...</span>
            </div>
        </div>
    );
}

export default memo(TypingIndicator);
