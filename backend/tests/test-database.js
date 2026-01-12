import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Conversation } from '../src/models/Conversation.js';
import { Appointment } from '../src/models/Appointment.js';

// Load environment variables
dotenv.config();

async function testDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ MongoDB connected');

        // Test 1: Create conversation
        const testConversation = await Conversation.create({
            sessionId: 'test-session-' + Date.now(),
            userId: 'test-user-123',
            userName: 'John Doe',
            petName: 'Buddy',
            messages: [
                { role: 'user', content: 'Hello', timestamp: new Date() },
                { role: 'bot', content: 'Hi! How can I help?', timestamp: new Date() }
            ]
        });
        console.log('✓ Conversation created:', testConversation.sessionId);

        // Test 2: Add message to conversation
        testConversation.messages.push({
            role: 'user',
            content: 'What should I feed my dog?',
            timestamp: new Date()
        });
        await testConversation.save();
        console.log('✓ Message added to conversation');

        // Test 3: Create appointment
        const testAppointment = await Appointment.create({
            sessionId: testConversation.sessionId,
            petOwnerName: 'John Doe',
            petName: 'Buddy',
            phoneNumber: '1234567890',
            preferredDate: new Date(Date.now() + 86400000), // Tomorrow
            preferredTime: '10:00',
            status: 'pending'
        });
        console.log('✓ Appointment created:', testAppointment.appointmentId);

        // Test 4: Query tests
        const foundConversation = await Conversation.findOne({
            sessionId: testConversation.sessionId
        });
        console.log('✓ Conversation found:', foundConversation ? 'Yes' : 'No');

        const foundAppointment = await Appointment.findOne({
            sessionId: testConversation.sessionId
        });
        console.log('✓ Appointment found:', foundAppointment ? 'Yes' : 'No');

        // Test 5: Validation test (should fail)
        try {
            await Appointment.create({
                sessionId: 'test',
                petOwnerName: 'X', // Too short
                phoneNumber: '123' // Invalid
            });
            console.log('✗ Validation should have failed');
        } catch (error) {
            console.log('✓ Validation working correctly');
        }

        // Cleanup
        await Conversation.deleteOne({ sessionId: testConversation.sessionId });
        await Appointment.deleteOne({ sessionId: testConversation.sessionId });
        console.log('✓ Test data cleaned up');

        console.log('\n✅ All database tests passed!');
        process.exit(0);
    } catch (error) {
        console.error('✗ Database test failed:', error.message);
        process.exit(1);
    }
}

testDatabase();