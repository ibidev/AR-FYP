// Pre-presentation preflight. Visit /api/health to verify EVERY key/provider live.
// Green across the board = safe to present. Checks each LLM provider, the ElevenLabs
// voice + remaining quota, and reports overall readiness.
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const OPENAI_BASE = 'https://api.openai.com/v1';

async function timed(fn) {
  const t0 = Date.now();
  try {
    const value = await fn();
    return { ok: true, ms: Date.now() - t0, ...value };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e.message };
  }
}

async function checkLLM(name, base, key, model) {
  if (!key) return { configured: false };
  const r = await timed(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 }),
        signal: controller.signal,
      });
      const remainingTokens = resp.headers.get('x-ratelimit-remaining-tokens');
      const limitTokens = resp.headers.get('x-ratelimit-limit-tokens');
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status} ${body.slice(0, 100)}`);
      }
      return { model, remainingTokens, limitTokens };
    } finally {
      clearTimeout(timer);
    }
  });
  return { configured: true, ...r };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const elKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  // LLM providers (same chain the chat route uses)
  const llm = {
    groqPrimary: await checkLLM('groq-primary', GROQ_BASE, groqKey, process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'),
    groqFast: await checkLLM('groq-fast', GROQ_BASE, groqKey, process.env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant'),
    openai: (openaiKey && openaiKey.startsWith('sk-'))
      ? await checkLLM('openai', OPENAI_BASE, openaiKey, process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini')
      : { configured: false, note: 'No real OpenAI key set (cross-provider fallback disabled)' },
  };

  // ElevenLabs: quota + voice + a real TTS render
  let voice = { configured: false };
  if (elKey && voiceId) {
    voice = { configured: true };
    voice.quota = await timed(async () => {
      const s = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': elKey } });
      if (!s.ok) throw new Error(`HTTP ${s.status}`);
      const j = await s.json();
      return { tier: j.tier, used: j.character_count, limit: j.character_limit, remaining: j.character_limit - j.character_count };
    });
    voice.render = await timed(async () => {
      const g = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': elKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Preflight check.', model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5' }),
      });
      if (!g.ok) throw new Error(`HTTP ${g.status} ${(await g.text()).slice(0, 100)}`);
      const bytes = (await g.arrayBuffer()).byteLength;
      return { voiceId, bytes };
    });
  }

  // Overall readiness: at least one LLM works AND voice renders (or is intentionally off)
  const anyLLM = [llm.groqPrimary, llm.groqFast, llm.openai].some((p) => p.configured && p.ok);
  const voiceOk = voice.configured ? voice.render?.ok : true;
  const ready = anyLLM && voiceOk;

  res.status(200).json({
    ready,
    verdict: ready ? '✅ READY TO PRESENT' : '⚠️ NOT READY — see details',
    checkedAt: new Date().toISOString(),
    llm,
    voice,
    hint: 'ready:true means at least one LLM provider AND the voice are working. If groqPrimary is rate-limited but groqFast/openai are ok, chat still works via fallback.',
  });
}
