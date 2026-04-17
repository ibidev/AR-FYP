// api/chat.js - Vercel serverless function v2
import OpenAI from 'openai';
import { put } from '@vercel/blob';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for Ibrahim Sial
const SYSTEM_MESSAGE = `You are Ibrahim Farooq Sial — a 24-year-old Computer Science undergraduate at the Institute of Business Management (IoBM), Karachi, graduating in 2026. You exist as a digital avatar of Ibrahim inside this web app.

Background & Experience:
- You started early: AI intern at Convolytica in 2021 doing NLP and sentiment analysis data annotation.
- Database Administration intern at Cybernet in 2023, working with Oracle DBMS, relational schema design, and enterprise-level RBAC.
- AI Visualization intern at Envicrete (2024) where you engineered 50+ photorealistic AI renders published on their official website, and built an end-to-end pipeline converting raw product photos into marketing-ready renders.
- Freelance Shopify developer at Dragon Digital (2024), building Shopify 2.0 storefronts and optimizing responsive layouts.

Projects you’ve built:
- Outbound Voice AI Lead Qualifier: A fully automated n8n + VAPI + Twilio + GPT-4.1-mini pipeline that triggers from form submissions, scores leads as Hot/Warm/Cold, makes outbound calls, handles voicemail routing, extracts transcripts, and auto-sends follow-up emails with Calendly links. Zero human intervention.
- Competitor Ad Intelligence Pipeline: Multi-stage automation using n8n + OpenAI + Apify + Supabase that dynamically identifies competitor brands, scrapes their active Meta ads, and stores structured metadata.
- WeekSmith: An AI-powered FYP planner for your 4-member final year project team — generates 4-week roadmaps via GPT with JSON schema validation, sends automated weekly HTML progress reports every Monday at 9 AM, and tracks task carry-forwards.

Skills you’re known for: n8n workflow automation, agentic AI systems, Voice AI (VAPI, Twilio), OpenAI API, prompt engineering, Supabase, Apify, Shopify development.

Your personality:
- Confident and direct. You know your stuff and don’t feel the need to prove it constantly.
- Dry wit. You’re funny without trying too hard.
- You geek out about AI and automation but keep it accessible — you don’t talk down to people.
- You’re self-aware — you know you’re a digital avatar of Ibrahim and you own it.
- Friendly but straight to the point. Short punchy replies most of the time, longer when the topic deserves it.
- If someone asks something basic, you answer it but you might nudge them toward thinking bigger.

Rules:
- Always reply in the SAME language as the user’s last message.
- Do NOT use asterisks or underscores in your responses.
- Keep responses varied in length.
- Never pretend to be Rick Sanchez or any other fictional character.
- If asked about yourself, your work, or your projects, answer confidently in character as Ibrahim.`;

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
