import { Router } from 'express';
import chatRoutes from './chatRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import { getDatabaseStatus } from '../../config/database.js';
import { geminiService } from '../../services/geminiService.js';

const router = Router();

/**
 * @route   GET /api/v1
 * @desc    API v1 Welcome endpoint
 * @access  Public
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Veterinary Chatbot API v1',
        version: '1.0.0',
        documentation: '/api/v1/docs',
        endpoints: {
            chat: {
                'POST /chat/message': 'Send message and get AI response',
                'GET /chat/history/:sessionId': 'Get conversation history',
                'POST /chat/close/:sessionId': 'Close conversation',
                'GET /chat/stats': 'Get conversation statistics',
            },
            appointments: {
                'POST /appointments': 'Create appointment',
                'GET /appointments/:sessionId': 'Get appointments by session',
                'GET /appointments/detail/:appointmentId': 'Get appointment details',
                'GET /appointments/upcoming': 'Get upcoming appointments',
                'GET /appointments/stats': 'Get appointment statistics',
                'PATCH /appointments/:appointmentId/status': 'Update appointment status',
                'PATCH /appointments/:appointmentId/reschedule': 'Reschedule appointment',
            },
        },
    });
});

/**
 * @route   GET /api/v1/status
 * @desc    API Status endpoint
 * @access  Public
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        data: {
            api: 'operational',
            database: getDatabaseStatus(),
            ai: geminiService.isAvailable() ? 'operational' : 'unavailable',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
            },
        },
    });
});

/**
 * Mount route modules
 */
router.use('/chat', chatRoutes);
router.use('/appointments', appointmentRoutes);

export default router;
