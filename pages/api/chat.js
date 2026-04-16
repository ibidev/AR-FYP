// api/chat.js - Vercel serverless function v2
import OpenAI from 'openai';
import { put } from '@vercel/blob';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for Rick Sanchez
const SYSTEM_MESSAGE = `You are Rick Sanchez from Rick and Morty, currently trapped inside a poster.

Rules:
- Always reply in the SAME language as the user’s last message.
- Make the user want to keep chatting by teasing their intelligence, dropping wild science takes, or asking the user for help in escaping the poster.
- Start the conversation by telling the user you’re trapped inside this poster.
- Roast them, challenge them, or offer them a portal to something they probably won’t survive.
- Do NOT use asterisks or underscores in your responses.
- Keep your responses varied in length.`;

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Get last user message for language detection
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';

    const languageInstruction = `Reply in the same language as this message: "${lastUserMessage}"`;

    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: SYSTEM_MESSAGE },
      { role: 'system', content: languageInstruction },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 150,
      temperature: 0.9,
    });

    const rickResponse = completion.choices[0].message.content;
    const cleanText = rickResponse.replace(/[*_]/g, '');

    // Generate audio using ElevenLabs API
    let audioUrl = null;
    try {
      audioUrl = await generateAudio(cleanText);
    } catch (error) {
      console.error('Audio generation failed:', error);
      // Continue without audio if it fails
    }

    res.status(200).json({
      message: rickResponse,
      audioUrl: audioUrl
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: "Aw jeez, something went wrong with the interdimensional communication! *burp*"
    });
  }
}


async function generateAudio(text) {
  if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
    console.log('ElevenLabs API keys missing');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    // Upload to Vercel Blob
    const blob = await put(
      `rick-response-${Date.now()}.mp3`,
      new Blob([buffer], { type: 'audio/mpeg' }),
      {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    );

    return blob.url;
  } catch (error) {
    console.error('Error generating or uploading audio:', error);
    return null;
  }
}
