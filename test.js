import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

console.log('Environment test:');
console.log('ASSEMBLYAI_API_KEY:', process.env.ASSEMBLYAI_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

// Test AssemblyAI connection
async function testConnection() {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      console.log('❌ No API key found');
      return;
    }

    console.log('🔑 Testing AssemblyAI connection...');
    
    // Test with a simple GET request to check if API key is valid
    const response = await axios.get('https://api.assemblyai.com/v2/transcript', {
      headers: { authorization: apiKey },
      timeout: 10000
    });
    
    console.log('✅ API key is valid');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ API key is invalid');
    } else if (error.response?.status === 404) {
      console.log('✅ API key is valid (404 expected for empty transcript list)');
    } else {
      console.log('❌ Connection error:', error.message);
    }
  }
}

testConnection();
