import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

/**
 * Development Entry Point
 * Standard React app entry for local development and testing
 */

// Create root and render app
const rootElement = document.getElementById('root');

if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);

    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error('[VetChatbot] Root element not found. Make sure you have <div id="root"></div> in your HTML.');
}

// Hot Module Replacement for development
if (import.meta.hot) {
    import.meta.hot.accept();
}
