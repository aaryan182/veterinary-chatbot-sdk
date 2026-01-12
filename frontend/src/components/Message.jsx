import { memo, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Format timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted time
 */
const formatTime = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Parse basic markdown-like formatting
 * Supports: **bold**, *italic*, `code`, and line breaks
 * @param {string} text - Text to parse
 * @returns {JSX.Element[]} Parsed elements
 */
const parseMarkdown = (text) => {
    if (!text) return null;

    // Split by line breaks first
    const lines = text.split('\n');

    return lines.map((line, lineIndex) => {
        // Check for bullet points
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');

        // Parse inline formatting
        const parts = [];
        let remaining = line;
        let key = 0;

        // Process formatting patterns
        const patterns = [
            { regex: /\*\*(.+?)\*\*/g, render: (match) => <strong key={key++} className="font-semibold">{match}</strong> },
            { regex: /\*(.+?)\*/g, render: (match) => <em key={key++} className="italic">{match}</em> },
            { regex: /`(.+?)`/g, render: (match) => <code key={key++} className="bg-gray-200 px-1 rounded text-sm font-mono">{match}</code> },
        ];

        // Simple text rendering with pattern matching
        let lastIndex = 0;
        const elements = [];

        // Match bold patterns
        const boldRegex = /\*\*(.+?)\*\*/g;
        let match;
        let tempText = line;

        while ((match = boldRegex.exec(line)) !== null) {
            if (match.index > lastIndex) {
                elements.push(<span key={key++}>{line.slice(lastIndex, match.index)}</span>);
            }
            elements.push(<strong key={key++} className="font-semibold">{match[1]}</strong>);
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < line.length) {
            elements.push(<span key={key++}>{line.slice(lastIndex)}</span>);
        }

        const content = elements.length > 0 ? elements : line;

        return (
            <span key={lineIndex} className={`block ${isBullet ? 'ml-2' : ''} ${lineIndex > 0 ? 'mt-1' : ''}`}>
                {content}
            </span>
        );
    });
};

/**
 * User Avatar Component
 */
const UserAvatar = memo(function UserAvatar() {
    return (
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd" />
            </svg>
        </div>
    );
});

/**
 * Bot Avatar Component
 */
const BotAvatar = memo(function BotAvatar() {
    return (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <span className="text-base" role="img" aria-label="Bot">🐾</span>
        </div>
    );
});

/**
 * Message Component
 * Displays individual chat messages with appropriate styling
 */
function Message({ role, content, timestamp, isError }) {
    const isUser = role === 'user';
    const formattedTime = useMemo(() => formatTime(timestamp), [timestamp]);
    const parsedContent = useMemo(() => parseMarkdown(content), [content]);

    return (
        <div
            className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            role="article"
            aria-label={`${isUser ? 'You' : 'Assistant'} said`}
        >
            {/* Avatar */}
            {isUser ? <UserAvatar /> : <BotAvatar />}

            {/* Message Bubble */}
            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <div
                    className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser
                            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-br-md'
                            : isError
                                ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                                : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                        }
          `}
                >
                    {/* Error Icon */}
                    {isError && (
                        <div className="flex items-center gap-2 mb-2 text-red-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-medium">Error</span>
                        </div>
                    )}

                    {/* Message Content */}
                    <div className="whitespace-pre-wrap break-words">
                        {parsedContent}
                    </div>
                </div>

                {/* Timestamp */}
                <span
                    className={`text-xs mt-1 ${isUser ? 'text-gray-400' : 'text-gray-400'}`}
                    aria-label={`Sent at ${formattedTime}`}
                >
                    {formattedTime}
                </span>
            </div>
        </div>
    );
}

Message.propTypes = {
    role: PropTypes.oneOf(['user', 'bot']).isRequired,
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.string,
    isError: PropTypes.bool,
};

Message.defaultProps = {
    timestamp: null,
    isError: false,
};

export default memo(Message);
