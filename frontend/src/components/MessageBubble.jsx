import PropTypes from 'prop-types';

/**
 * Message Bubble component
 * Renders individual chat messages
 */
function MessageBubble({ role, content, timestamp }) {
    const isUser = role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`message-bubble ${role}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
                {timestamp && (
                    <p
                        className={`text-xs mt-2 ${isUser ? 'text-white/70' : 'text-gray-400'
                            }`}
                    >
                        {new Date(timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                )}
            </div>
        </div>
    );
}

MessageBubble.propTypes = {
    role: PropTypes.oneOf(['user', 'assistant', 'system']).isRequired,
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.string,
};

MessageBubble.defaultProps = {
    timestamp: null,
};

export default MessageBubble;
