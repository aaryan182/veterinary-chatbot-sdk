import PropTypes from 'prop-types';

/**
 * Toggle Button component
 * Floating action button to open/close the chat widget
 */
function ToggleButton({ isOpen, onClick }) {
    return (
        <button
            className="chatbot-toggle"
            onClick={onClick}
            aria-label={isOpen ? 'Close chat' : 'Open chat'}
            aria-expanded={isOpen}
        >
            {isOpen ? (
                <svg
                    className="w-6 h-6"
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
            ) : (
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                </svg>
            )}
        </button>
    );
}

ToggleButton.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
};

export default ToggleButton;
