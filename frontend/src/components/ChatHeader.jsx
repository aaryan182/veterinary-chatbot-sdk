import PropTypes from 'prop-types';

/**
 * Chat Header component
 * Displays the chatbot title and close button
 */
function ChatHeader({ title, sessionId, onClose }) {
    return (
        <div className="chatbot-header">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-xl">🐾</span>
                </div>
                <div>
                    <h3 className="font-semibold text-lg">{title}</h3>
                    {sessionId && (
                        <p className="text-xs text-white/70 truncate max-w-[150px]">
                            Session: {sessionId.slice(0, 8)}...
                        </p>
                    )}
                </div>
            </div>
            <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 
                   flex items-center justify-center transition-colors"
                aria-label="Close chat"
            >
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
        </div>
    );
}

ChatHeader.propTypes = {
    title: PropTypes.string.isRequired,
    sessionId: PropTypes.string,
    onClose: PropTypes.func.isRequired,
};

ChatHeader.defaultProps = {
    sessionId: null,
};

export default ChatHeader;
