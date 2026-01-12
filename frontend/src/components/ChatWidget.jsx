import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Message from './Message';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import AppointmentForm from './AppointmentForm';
import { useChatbot } from '../hooks/useChatbot';
import { useAppointmentBooking, BOOKING_STATES } from '../hooks/useAppointmentBooking';

/**
 * ChatWidget Component
 * Main floating chat widget with expandable chat window
 * Uses useChatbot and useAppointmentBooking hooks for state management
 */
function ChatWidget({
    apiBaseUrl,
    position = 'bottom-right',
    title = 'Vet Assistant',
    initialContext = {},
}) {
    // ==========================================================================
    // State & Hooks
    // ==========================================================================
    const [isOpen, setIsOpen] = useState(false);

    // Set global config for API service
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.VetChatbotConfig = {
                apiBaseUrl,
                ...initialContext,
            };
        }
    }, [apiBaseUrl, initialContext]);

    // Chatbot hook
    const {
        messages,
        isLoading,
        error,
        sessionId,
        isInitialized,
        appointmentMode,
        sendMessage,
        clearError,
        resetChat,
        exitAppointmentMode,
        addSystemMessage,
    } = useChatbot({
        initialContext,
        persistMessages: true,
        onAppointmentDetected: () => {
            startBooking();
        },
    });

    // Appointment booking hook
    const {
        bookingState,
        formData,
        formattedData,
        errors: formErrors,
        submitError,
        result: appointmentResult,
        isComplete: isFormComplete,
        progress: bookingProgress,
        updateField,
        validateField,
        startBooking,
        confirmAppointment,
        submitAppointment,
        cancelBooking,
        resetBooking,
        getPromptMessage,
    } = useAppointmentBooking({
        sessionId,
        initialData: {
            petName: initialContext.petName || '',
            petOwnerName: initialContext.userName || '',
        },
        onSuccess: (appointment) => {
            addSystemMessage(
                `✅ Appointment confirmed!\n\n` +
                `📋 Reference: ${appointment.appointmentId}\n` +
                `📅 Date: ${appointment.formattedDateTime || `${appointment.preferredDate} at ${appointment.preferredTime}`}\n` +
                `🐾 Pet: ${appointment.petName}\n\n` +
                `We'll contact you at ${appointment.phoneNumber} to confirm.`
            );
            exitAppointmentMode();
        },
        onError: (err) => {
            console.error('Appointment booking error:', err);
        },
        onCancel: () => {
            addSystemMessage('Appointment booking cancelled. Let me know if you need anything else!');
            exitAppointmentMode();
        },
    });

    // ==========================================================================
    // Refs
    // ==========================================================================
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // ==========================================================================
    // Effects
    // ==========================================================================

    // Auto-focus input when widget opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
        }
    }, [isOpen]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Clear error after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => clearError(), 5000);
            return () => clearTimeout(timer);
        }
    }, [error, clearError]);

    // ==========================================================================
    // Callbacks
    // ==========================================================================

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const toggleWidget = useCallback(() => {
        setIsOpen((prev) => !prev);
        if (error) clearError();
    }, [error, clearError]);

    const handleSendMessage = useCallback((messageText) => {
        sendMessage(messageText);
    }, [sendMessage]);

    const handleInputChange = useCallback(() => {
        // Input is controlled by ChatInput component
    }, []);

    const handleClearChat = useCallback(() => {
        resetChat();
        resetBooking();
    }, [resetChat, resetBooking]);

    // ==========================================================================
    // Render Helpers
    // ==========================================================================

    const isBookingActive = bookingState !== BOOKING_STATES.IDLE &&
        bookingState !== BOOKING_STATES.SUCCESS;

    const positionClasses = position === 'bottom-left'
        ? 'left-4 sm:left-6'
        : 'right-4 sm:right-6';

    // ==========================================================================
    // Render
    // ==========================================================================

    if (!isInitialized) {
        return null; // Don't render until initialized
    }

    return (
        <div
            className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50 font-sans`}
            role="region"
            aria-label="Chat widget"
        >
            {/* Chat Window */}
            {isOpen && (
                <div
                    className="chat-window mb-4 flex flex-col bg-white rounded-2xl shadow-2xl 
                     overflow-hidden animate-slide-up
                     w-[calc(100vw-2rem)] sm:w-[400px] 
                     h-[calc(100vh-8rem)] sm:h-[600px]
                     max-h-[600px]"
                    role="dialog"
                    aria-label="Chat conversation"
                    aria-modal="true"
                >
                    {/* Header */}
                    <header className="chat-header flex items-center justify-between px-4 py-3 
                           bg-gradient-to-r from-indigo-600 to-indigo-700 text-white
                           flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-xl" role="img" aria-label="Pet paw">🐾</span>
                            </div>
                            <div>
                                <h2 className="font-semibold text-lg">{title}</h2>
                                <p className="text-xs text-indigo-200">
                                    {isBookingActive ? 'Booking Appointment...' : 'Online • Ready to help'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Clear Chat Button */}
                            <button
                                onClick={handleClearChat}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                aria-label="Clear chat history"
                                title="Clear chat"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            {/* Close Button */}
                            <button
                                onClick={toggleWidget}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                aria-label="Close chat"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </header>

                    {/* Error Banner */}
                    {error && (
                        <div
                            className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-700 text-sm
                         flex items-center gap-2 animate-fade-in"
                            role="alert"
                        >
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd" />
                            </svg>
                            <span className="flex-1">{error}</span>
                            <button
                                onClick={clearError}
                                className="text-red-500 hover:text-red-700"
                                aria-label="Dismiss error"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Appointment Mode Indicator */}
                    {isBookingActive && (
                        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-indigo-700 text-sm
                           flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Booking appointment ({bookingProgress}%)</span>
                            </div>
                            <button
                                onClick={cancelBooking}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Messages Container */}
                    <div
                        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50
                       scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                        role="log"
                        aria-live="polite"
                        aria-label="Chat messages"
                    >
                        {messages.map((message) => (
                            <Message
                                key={message.id}
                                role={message.role}
                                content={message.content}
                                timestamp={message.timestamp}
                                isError={message.isError}
                            />
                        ))}

                        {/* Typing Indicator */}
                        {isLoading && <TypingIndicator />}

                        {/* Scroll anchor */}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Appointment Form (when booking is active) */}
                    {isBookingActive && (
                        <AppointmentForm
                            bookingState={bookingState}
                            formData={formData}
                            formattedData={formattedData}
                            errors={formErrors}
                            submitError={submitError}
                            appointmentResult={appointmentResult}
                            isFormComplete={isFormComplete}
                            updateField={updateField}
                            validateField={validateField}
                            confirmAppointment={confirmAppointment}
                            submitAppointment={submitAppointment}
                            cancelBooking={cancelBooking}
                            getPromptMessage={getPromptMessage}
                        />
                    )}

                    {/* Input Area (when not in booking mode) */}
                    {!isBookingActive && (
                        <ChatInput
                            ref={inputRef}
                            value=""
                            onChange={handleInputChange}
                            onSend={handleSendMessage}
                            isLoading={isLoading}
                            placeholder={appointmentMode
                                ? "Enter your appointment details..."
                                : "Type your message..."}
                        />
                    )}
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={toggleWidget}
                className={`
          w-14 h-14 sm:w-16 sm:h-16 rounded-full 
          bg-gradient-to-br from-indigo-500 to-indigo-600 
          text-white shadow-lg
          flex items-center justify-center
          transition-all duration-300 ease-out
          hover:scale-110 hover:shadow-xl
          active:scale-95
          focus:outline-none focus:ring-4 focus:ring-indigo-300
          ${isOpen ? 'rotate-0' : 'animate-bounce-slow'}
        `}
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
                aria-expanded={isOpen}
                aria-controls="chat-window"
            >
                {isOpen ? (
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                )}
            </button>

            {/* Notification Badge */}
            {!isOpen && messages.length > 1 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs 
                        rounded-full flex items-center justify-center font-medium
                        animate-pulse">
                    {messages.filter(m => m.role === 'bot').length}
                </span>
            )}
        </div>
    );
}

ChatWidget.propTypes = {
    apiBaseUrl: PropTypes.string.isRequired,
    position: PropTypes.oneOf(['bottom-right', 'bottom-left']),
    title: PropTypes.string,
    initialContext: PropTypes.shape({
        userId: PropTypes.string,
        userName: PropTypes.string,
        petName: PropTypes.string,
        source: PropTypes.string,
    }),
};

ChatWidget.defaultProps = {
    position: 'bottom-right',
    title: 'Vet Assistant',
    initialContext: {},
};

export default ChatWidget;
