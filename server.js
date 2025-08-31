import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Fallback for API key if .env fails
const API_KEY = process.env.ASSEMBLYAI_API_KEY || 'ca58edc7f0e742e484b897c186239c42';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Health check for proxied API path
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', path: '/api/health', timestamp: new Date().toISOString() });
});

app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, languageCode } = req.body;
    
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const apiKey = API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY' });
    }

    console.log('Starting transcription for language:', languageCode);

    const baseUrl = 'https://api.assemblyai.com';
    const headers = { authorization: apiKey };
    
    // Upload audio data
    console.log('Uploading audio to AssemblyAI...');
    const audioData = Buffer.from(audioBase64, 'base64');
    const uploadResponse = await axios.post(`${baseUrl}/v2/upload`, audioData, { 
      headers,
      timeout: 30000 // 30 second timeout
    });
    const audioUrl = uploadResponse.data.upload_url;
    console.log('Audio uploaded successfully');
    
    // Create transcript request
    console.log('Creating transcript request...');
    const transcriptData = {
      audio_url: audioUrl,
      speech_model: 'universal',
      language_code: languageCode || 'en_us'
    };
    
    const transcriptResponse = await axios.post(`${baseUrl}/v2/transcript`, transcriptData, { 
      headers,
      timeout: 30000
    });
    const transcriptId = transcriptResponse.data.id;
    console.log('Transcript request created, ID:', transcriptId);
    
    // Poll for completion with timeout
    const pollingEndpoint = `${baseUrl}/v2/transcript/${transcriptId}`;
    let transcriptResult;
    let attempts = 0;
    const maxAttempts = 60; // Max 60 seconds of polling
    
    while (attempts < maxAttempts) {
      const pollingResponse = await axios.get(pollingEndpoint, { 
        headers,
        timeout: 10000
      });
      transcriptResult = pollingResponse.data;
      
      if (transcriptResult.status === 'completed') {
        console.log('Transcription completed successfully');
        break;
      } else if (transcriptResult.status === 'error') {
        throw new Error(`Transcription failed: ${transcriptResult.error}`);
      } else {
        console.log(`Status: ${transcriptResult.status}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Transcription timeout - took too long to complete');
    }
    
    res.json({ text: transcriptResult.text });
  } catch (error) {
    console.error('Transcription error:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Local server running on http://localhost:${PORT}`);
  console.log(`🔑 API Key loaded: ${API_KEY ? 'Yes' : 'No'}`);
  console.log('📝 Health check: http://localhost:3001/health');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});
