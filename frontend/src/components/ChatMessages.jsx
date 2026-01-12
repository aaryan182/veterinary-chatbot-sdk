import PropTypes from 'prop-types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import QuickActions from './QuickActions';

/**
 * Chat Messages container
 * Displays the conversation history and loading states
 */
function ChatMessages({ messages, isLoading, error, messagesEndRef }) {
    const hasMessages = messages.length > 0;

    return (
        <div className="chatbot-messages">
            {!hasMessages && (
                <div className="text-center py-8">
                    <div className="text-4xl mb-4">🐕 🐈 🐇</div>
                    <h4 className="font-medium text-gray-700 mb-2">
                        Welcome to Pet Health Assistant!
                    </h4>
                    <p className="text-sm text-gray-500 mb-6">
                        Ask me anything about your pet&apos;s health, nutrition, or behavior.
                    </p>
                    <QuickActions />
                </div>
            )}

            {messages.map((msg, index) => (
                <MessageBubble
                    key={msg.id || index}
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                />
            ))}

            {isLoading && <TypingIndicator />}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 
                        px-4 py-3 rounded-xl text-sm animate-fade-in">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}

ChatMessages.propTypes = {
    messages: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string,
            role: PropTypes.oneOf(['user', 'assistant', 'system']).isRequired,
            content: PropTypes.string.isRequired,
            timestamp: PropTypes.string,
        })
    ).isRequired,
    isLoading: PropTypes.bool,
    error: PropTypes.string,
    messagesEndRef: PropTypes.object,
};

ChatMessages.defaultProps = {
    isLoading: false,
    error: null,
    messagesEndRef: null,
};

export default ChatMessages;
