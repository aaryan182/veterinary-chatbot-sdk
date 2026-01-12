import ChatWidget from './components/ChatWidget';

/**
 * Main App component for development mode
 * Renders a demo page with the chatbot widget for testing
 */
function App() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Demo page content */}
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <header className="text-center mb-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl mb-6">
                        <span className="text-4xl" role="img" aria-label="Pet paw">🐾</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Veterinary Chatbot SDK
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        AI-powered pet health assistant widget for your veterinary clinic website
                    </p>
                </header>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-12">
                    {/* Feature Card 1 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            AI-Powered Chat
                        </h3>
                        <p className="text-gray-600">
                            Intelligent responses powered by Google Gemini AI, trained for veterinary assistance.
                        </p>
                    </div>

                    {/* Feature Card 2 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Appointment Booking
                        </h3>
                        <p className="text-gray-600">
                            Seamless appointment scheduling integrated directly into the chat experience.
                        </p>
                    </div>

                    {/* Feature Card 3 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Mobile Responsive
                        </h3>
                        <p className="text-gray-600">
                            Works perfectly on all devices - desktop, tablet, and mobile phones.
                        </p>
                    </div>

                    {/* Feature Card 4 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Easy Integration
                        </h3>
                        <p className="text-gray-600">
                            Single script embed or npm package - integrate in minutes.
                        </p>
                    </div>
                </div>

                {/* Integration Example */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-12">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                        Quick Integration
                    </h2>
                    <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-sm text-gray-300">
                            <code>{`<!-- Add to your HTML -->
<script src="https://your-cdn.com/chatbot.js"></script>
<script>
  VeterinaryChatbot.init({
    apiBaseUrl: 'https://your-api.com/api/v1',
    position: 'bottom-right',
    title: 'Vet Assistant'
  });
</script>`}</code>
                        </pre>
                    </div>
                </div>

                {/* Try it out section */}
                <div className="text-center py-8 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white">
                    <h2 className="text-2xl font-semibold mb-2">Try it out!</h2>
                    <p className="text-indigo-100 mb-4">
                        Click the chat button in the bottom-right corner to start a conversation.
                    </p>
                    <div className="inline-flex items-center gap-2 text-sm bg-white/20 px-4 py-2 rounded-full">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        Widget is active
                    </div>
                </div>
            </div>

            {/* Chatbot Widget */}
            <ChatWidget
                apiBaseUrl={import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}
                position="bottom-right"
                title="Vet Assistant"
            />
        </div>
    );
}

export default App;
