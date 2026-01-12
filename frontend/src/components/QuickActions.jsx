/**
 * Quick Actions component
 * Predefined quick action buttons for common queries
 */
function QuickActions() {
    const actions = [
        'My pet won\'t eat',
        'Vaccination schedule',
        'Common symptoms',
        'Emergency signs',
        'Pet nutrition tips',
    ];

    return (
        <div className="quick-actions">
            {actions.map((action) => (
                <button
                    key={action}
                    className="quick-action-btn"
                    onClick={() => {
                        // This will be handled by the parent component
                        // For now, we'll just show them as UI elements
                        const event = new CustomEvent('quickAction', { detail: action });
                        window.dispatchEvent(event);
                    }}
                >
                    {action}
                </button>
            ))}
        </div>
    );
}

export default QuickActions;
