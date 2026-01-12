import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './components/ChatWidget';
import './styles/index.css';

/**
 * @fileoverview Widget Entry Point
 * Self-initializing veterinary chatbot widget for embedding via script tag
 */

// =============================================================================
// Configuration
// =============================================================================

/**
 * Default widget configuration
 */
const DEFAULT_CONFIG = {
    containerId: 'vet-chatbot-root',
    apiBaseUrl: '/api/v1',
    position: 'bottom-right',
    title: 'Vet Assistant',
    autoOpen: false,
    enabled: true,
};

/**
 * Widget version
 */
const VERSION = '1.0.0';

// =============================================================================
// Widget State
// =============================================================================

let widgetRoot = null;
let widgetContainer = null;
let isInitialized = false;

// =============================================================================
// Stylesheet Injection
// =============================================================================

/**
 * Inject scoped reset styles for the widget
 * Prevents style conflicts with the host page
 */
function injectResetStyles() {
    const styleId = 'vet-chatbot-reset-styles';

    // Check if already injected
    if (document.getElementById(styleId)) {
        return;
    }

    const resetStyles = `
    /* Veterinary Chatbot Widget - Reset Styles */
    #vet-chatbot-root,
    #vet-chatbot-root *,
    #vet-chatbot-root *::before,
    #vet-chatbot-root *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    #vet-chatbot-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                   'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      color: #374151;
    }

    #vet-chatbot-root button {
      font-family: inherit;
      cursor: pointer;
      border: none;
      background: none;
    }

    #vet-chatbot-root input,
    #vet-chatbot-root textarea {
      font-family: inherit;
      font-size: inherit;
    }

    #vet-chatbot-root a {
      color: inherit;
      text-decoration: none;
    }

    #vet-chatbot-root ul,
    #vet-chatbot-root ol {
      list-style: none;
    }

    #vet-chatbot-root img {
      max-width: 100%;
      height: auto;
    }

    /* Prevent widget from being affected by host page styles */
    #vet-chatbot-root {
      all: initial;
      display: block;
      position: fixed;
      z-index: 2147483647;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = resetStyles;
    document.head.appendChild(styleElement);
}

/**
 * Load Inter font from Google Fonts
 */
function loadFont() {
    const fontId = 'vet-chatbot-font';

    if (document.getElementById(fontId)) {
        return;
    }

    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
}

// =============================================================================
// Widget Initialization
// =============================================================================

/**
 * Initialize the chatbot widget
 * 
 * @param {Object} userConfig - User configuration
 * @param {string} [userConfig.apiBaseUrl] - Backend API base URL
 * @param {string} [userConfig.position] - Widget position ('bottom-right' | 'bottom-left')
 * @param {string} [userConfig.title] - Widget header title
 * @param {string} [userConfig.containerId] - Custom container ID
 * @param {boolean} [userConfig.autoOpen] - Auto-open widget on load
 * @param {Object} [userConfig.context] - User context (userId, userName, petName)
 * @returns {Object} Widget control API
 * 
 * @example
 * // Initialize with configuration
 * const widget = VetChatbot.init({
 *   apiBaseUrl: 'https://api.yoursite.com/api/v1',
 *   position: 'bottom-right',
 *   title: 'Pet Health Assistant',
 *   context: {
 *     userName: 'John',
 *     petName: 'Buddy'
 *   }
 * });
 * 
 * // Control the widget
 * widget.open();
 * widget.close();
 * widget.destroy();
 */
function initWidget(userConfig = {}) {
    // Merge configurations
    const config = {
        ...DEFAULT_CONFIG,
        ...(typeof window !== 'undefined' ? window.VetChatbotConfig : {}),
        ...userConfig,
    };

    // Check if already initialized
    if (isInitialized && widgetRoot) {
        console.warn('[VetChatbot] Widget already initialized. Call destroy() first to reinitialize.');
        return getWidgetAPI();
    }

    // Check if disabled
    if (!config.enabled) {
        console.log('[VetChatbot] Widget is disabled via configuration.');
        return null;
    }

    // Inject styles and font
    injectResetStyles();
    loadFont();

    // Store config globally for API service
    if (typeof window !== 'undefined') {
        window.VetChatbotConfig = config;
    }

    // Create container
    widgetContainer = document.getElementById(config.containerId);

    if (!widgetContainer) {
        widgetContainer = document.createElement('div');
        widgetContainer.id = config.containerId;
        widgetContainer.setAttribute('data-vet-chatbot', 'true');
        widgetContainer.setAttribute('aria-label', 'Veterinary Chatbot Widget');
        document.body.appendChild(widgetContainer);
    }

    // Create React root and render
    widgetRoot = ReactDOM.createRoot(widgetContainer);

    widgetRoot.render(
        <React.StrictMode>
            <ChatWidget
                apiBaseUrl={config.apiBaseUrl}
                position={config.position}
                title={config.title}
                initialContext={config.context || {}}
            />
        </React.StrictMode>
    );

    isInitialized = true;

    console.log(`[VetChatbot] Widget v${VERSION} initialized`, {
        apiBaseUrl: config.apiBaseUrl,
        position: config.position,
    });

    return getWidgetAPI();
}

/**
 * Get widget control API
 * @returns {Object} Widget API
 */
function getWidgetAPI() {
    return {
        /**
         * Destroy the widget and clean up
         */
        destroy: () => {
            if (widgetRoot) {
                widgetRoot.unmount();
                widgetRoot = null;
            }
            if (widgetContainer && widgetContainer.parentNode) {
                widgetContainer.parentNode.removeChild(widgetContainer);
                widgetContainer = null;
            }
            isInitialized = false;
            console.log('[VetChatbot] Widget destroyed');
        },

        /**
         * Check if widget is initialized
         */
        isInitialized: () => isInitialized,

        /**
         * Get current configuration
         */
        getConfig: () => ({ ...window.VetChatbotConfig }),

        /**
         * Widget version
         */
        version: VERSION,

        /**
         * Reinitialize with new config
         */
        reinit: (newConfig) => {
            if (isInitialized) {
                getWidgetAPI().destroy();
            }
            return initWidget(newConfig);
        },
    };
}

// =============================================================================
// Auto Initialization
// =============================================================================

/**
 * Auto-initialize widget when DOM is ready
 */
function autoInit() {
    // Check for data attributes on script tag
    const scriptTag = document.currentScript ||
        document.querySelector('script[data-vet-chatbot]') ||
        document.querySelector('script[src*="chatbot.js"]');

    if (scriptTag) {
        const config = {
            apiBaseUrl: scriptTag.dataset.apiBaseUrl || scriptTag.getAttribute('data-api-base-url'),
            position: scriptTag.dataset.position || scriptTag.getAttribute('data-position'),
            title: scriptTag.dataset.title || scriptTag.getAttribute('data-title'),
            autoOpen: scriptTag.dataset.autoOpen === 'true',
            enabled: scriptTag.dataset.enabled !== 'false',
            context: {
                userId: scriptTag.dataset.userId,
                userName: scriptTag.dataset.userName,
                petName: scriptTag.dataset.petName,
                source: scriptTag.dataset.source || 'website',
            },
        };

        // Remove undefined values
        Object.keys(config).forEach(key => {
            if (config[key] === undefined || config[key] === null) {
                delete config[key];
            }
        });

        // Check for auto-init attribute
        const shouldAutoInit = scriptTag.hasAttribute('data-auto-init') ||
            scriptTag.dataset.autoInit === 'true' ||
            window.VetChatbotConfig?.autoInit;

        if (shouldAutoInit) {
            initWidget(config);
        }
    }

    // Also check global config
    if (window.VetChatbotConfig?.autoInit) {
        initWidget(window.VetChatbotConfig);
    }
}

// Run auto-init when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        // DOM already loaded, run immediately but in next tick
        setTimeout(autoInit, 0);
    }
}

// =============================================================================
// Export Global API
// =============================================================================

/**
 * Global VetChatbot API
 */
const VetChatbot = {
    /**
     * Initialize the widget
     */
    init: initWidget,

    /**
     * Get current widget instance API
     */
    getInstance: getWidgetAPI,

    /**
     * Destroy widget
     */
    destroy: () => getWidgetAPI().destroy(),

    /**
     * Check if initialized
     */
    isReady: () => isInitialized,

    /**
     * Version
     */
    version: VERSION,
};

// Expose to global scope
if (typeof window !== 'undefined') {
    window.VetChatbot = VetChatbot;
}

// Also export for module usage
export default VetChatbot;
export { initWidget as init, VERSION };
