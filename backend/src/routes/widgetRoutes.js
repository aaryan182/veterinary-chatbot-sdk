import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Static Files Routes
 * Serves the chatbot widget files with proper CORS and caching headers
 */

const router = express.Router();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to widget dist folder (adjust based on your build output location)
const widgetDistPath = path.resolve(__dirname, '../../../frontend/dist/widget');

/**
 * Widget files static serving middleware
 * Serves files from the frontend widget build directory
 */
const widgetStaticMiddleware = express.static(widgetDistPath, {
    // Cache settings
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',

    // Set proper headers
    setHeaders: (res, filePath) => {
        // CORS headers for cross-origin script loading
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');

        // Content type based on file extension
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (filePath.endsWith('.map')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }

        // Cache control
        if (process.env.NODE_ENV === 'production') {
            // Cache for 1 day in production, but allow revalidation
            res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
        } else {
            // No cache in development
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }

        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
    },
});

/**
 * @route   GET /widget/chatbot.js
 * @desc    Serve the chatbot widget JavaScript file
 * @access  Public
 */
router.use('/', widgetStaticMiddleware);

/**
 * @route   GET /widget/info
 * @desc    Get widget information
 * @access  Public
 */
router.get('/info', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'Veterinary Chatbot Widget',
            version: '1.0.0',
            scriptUrl: `${req.protocol}://${req.get('host')}/widget/chatbot.js`,
            documentation: `${req.protocol}://${req.get('host')}/api/v1/docs`,
            usage: {
                basic: `<script src="${req.protocol}://${req.get('host')}/widget/chatbot.js" data-auto-init="true" data-api-base-url="${req.protocol}://${req.get('host')}/api/v1"></script>`,
                advanced: `<script>
  window.VetChatbotConfig = {
    apiBaseUrl: '${req.protocol}://${req.get('host')}/api/v1',
    position: 'bottom-right',
    title: 'Vet Assistant'
  };
</script>
<script src="${req.protocol}://${req.get('host')}/widget/chatbot.js"></script>`,
            },
        },
    });
});

/**
 * @route   GET /widget/embed-code
 * @desc    Get ready-to-use embed code
 * @access  Public
 */
router.get('/embed-code', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const position = req.query.position || 'bottom-right';
    const title = req.query.title || 'Vet Assistant';

    const embedCode = `<!-- Veterinary Chatbot Widget -->
<script>
  window.VetChatbotConfig = {
    apiBaseUrl: '${baseUrl}/api/v1',
    position: '${position}',
    title: '${title}',
    autoInit: true
  };
</script>
<script src="${baseUrl}/widget/chatbot.js"></script>
<!-- End Veterinary Chatbot Widget -->`;

    // Return as plain text for easy copying
    if (req.query.format === 'text') {
        res.setHeader('Content-Type', 'text/plain');
        res.send(embedCode);
        return;
    }

    res.json({
        success: true,
        data: {
            embedCode,
            scriptUrl: `${baseUrl}/widget/chatbot.js`,
            apiUrl: `${baseUrl}/api/v1`,
        },
    });
});

export default router;
