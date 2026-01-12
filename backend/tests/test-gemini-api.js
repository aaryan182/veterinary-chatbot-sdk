import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGeminiAPI() {
    const apiKey = process.env.GEMINI_API_KEY;

    console.log('='.repeat(50));
    console.log('GEMINI API KEY VERIFICATION');
    console.log('='.repeat(50));

    // Check if API key exists
    if (!apiKey) {
        console.log('❌ ERROR: GEMINI_API_KEY is not set in .env file');
        process.exit(1);
    }

    // Mask the key for display
    const maskedKey = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
    console.log(`\n📋 API Key: ${maskedKey}`);
    console.log(`📏 Key Length: ${apiKey.length} characters`);

    // Check if it's the placeholder value
    if (apiKey === 'your_gemini_api_key_here') {
        console.log('\n❌ ERROR: API key is still the placeholder value!');
        console.log('   Please get a real API key from: https://aistudio.google.com/app/apikey');
        process.exit(1);
    }

    console.log('\n🔄 Testing API connection...\n');

    try {
        // Initialize the Gemini client
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Make a simple test request
        const result = await model.generateContent('Say "Hello, the API is working!" in exactly those words.');
        const response = await result.response;
        const text = response.text();

        console.log('✅ SUCCESS! API connection verified.');
        console.log('\n📝 Test Response:');
        console.log(`   "${text.trim()}"`);
        console.log('\n' + '='.repeat(50));
        console.log('Your Gemini API key is valid and working!');
        console.log('='.repeat(50));

        process.exit(0);
    } catch (error) {
        console.log('❌ API ERROR:', error.message);
        console.log('\n📋 Error Details:');

        if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
            console.log('   → Your API key is INVALID.');
            console.log('   → Please get a new key from: https://aistudio.google.com/app/apikey');
        } else if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
            console.log('   → Your API quota has been EXHAUSTED.');
            console.log('   → Wait for quota reset or upgrade your plan.');
        } else if (error.message.includes('PERMISSION_DENIED')) {
            console.log('   → Permission denied. The API key may not have access to Gemini.');
            console.log('   → Enable the Generative Language API in Google Cloud Console.');
        } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            console.log('   → Network error. Check your internet connection.');
        } else {
            console.log('   → Unknown error. Full details:');
            console.log('   ', error);
        }

        console.log('\n' + '='.repeat(50));
        process.exit(1);
    }
}

testGeminiAPI();
