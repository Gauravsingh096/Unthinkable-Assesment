import axios from 'axios'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' })
        return
    }
    const apiKey = process.env.ASSEMBLYAI_API_KEY
    if (!apiKey) {
        res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY' })
        return
    }
    try {
        const { audioBase64, languageCode } = req.body || {}
        if (!audioBase64) {
            res.status(400).json({ error: 'audioBase64 is required' })
            return
        }
        const baseUrl = 'https://api.assemblyai.com'
        const headers = { authorization: apiKey }

        // Upload audio data
        const audioData = Buffer.from(audioBase64, 'base64')
        const uploadResponse = await axios.post(`${baseUrl}/v2/upload`, audioData, { headers })
        const audioUrl = uploadResponse.data.upload_url

        // Create transcript request
        const transcriptData = {
            audio_url: audioUrl,
            speech_model: 'universal'
        }

        const transcriptResponse = await axios.post(`${baseUrl}/v2/transcript`, transcriptData, { headers })
        const transcriptId = transcriptResponse.data.id

        // Poll for completion
        const pollingEndpoint = `${baseUrl}/v2/transcript/${transcriptId}`
        let transcriptResult

        while (true) {
            const pollingResponse = await axios.get(pollingEndpoint, { headers })
            transcriptResult = pollingResponse.data

            if (transcriptResult.status === 'completed') {
                break
            } else if (transcriptResult.status === 'error') {
                throw new Error(`Transcription failed: ${transcriptResult.error}`)
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        res.status(200).json({ text: transcriptResult.text })
    } catch (e) {
        res.status(500).json({ error: String(e) })
    }
}


