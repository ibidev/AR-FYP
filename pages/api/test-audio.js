// Diagnostic endpoint — visit /api/test-audio in browser to test ElevenLabs
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    return res.status(200).json({
      status: 'error',
      issue: 'Missing env vars',
      ELEVENLABS_API_KEY: apiKey ? '✓ set' : '✗ MISSING',
      ELEVENLABS_VOICE_ID: voiceId ? '✓ set' : '✗ MISSING',
    });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Test audio.',
          model_id: 'eleven_multilingual_v2',
        }),
      }
    );

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (_) {}

      return res.status(200).json({
        status: 'error',
        elevenlabs_http_status: response.status,
        elevenlabs_error_body: errorBody,
        ELEVENLABS_API_KEY: '✓ set (first 8 chars): ' + apiKey.substring(0, 8) + '...',
        ELEVENLABS_VOICE_ID: voiceId,
      });
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return res.status(200).json({
      status: 'success',
      message: 'ElevenLabs is working! Audio generated.',
      audio_bytes: buffer.byteLength,
      audioUrl: `data:audio/mpeg;base64,${base64}`,
    });

  } catch (error) {
    return res.status(200).json({
      status: 'exception',
      error: error.message,
      ELEVENLABS_API_KEY: apiKey ? '✓ set' : '✗ MISSING',
      ELEVENLABS_VOICE_ID: voiceId,
    });
  }
}
