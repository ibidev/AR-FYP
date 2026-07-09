# AR Digital Twin — Project Context (for website / landing design)

> Hand this file to Claude (design) as context for building a landing/marketing website
> around the project. It describes what the project *is*, who's behind it, the brand
> feel, and what the site needs to communicate. It is NOT the app itself — the app
> already exists; this is for a site that presents/showcases it.

## One-liner
An interactive AR digital twin: scan a physical printed marker, and a 3D model of
Ibrahim appears in the browser — you can talk to it (typed or voice), it answers in
Ibrahim's real cloned voice, and it plays a mini-game with you.

## What it actually does (features)
1. **Image-tracked entry gate** — the user points their phone camera at a printed art
   print/marker. On a successful match the experience unlocks. (No app install; runs in
   the browser.)
2. **3D avatar** — a photoreal 3D model of Ibrahim rendered in real time (Three.js /
   WebGL) against a stylized portal background. Three animation states: **idle**,
   **thinking**, **talking**.
3. **Conversational AI** — chat by text or microphone. Powered by an LLM behind a
   Vercel API route. Replies in the user's language (English / Urdu / Roman Urdu).
4. **Voice** — every reply is spoken aloud in Ibrahim's cloned voice (ElevenLabs TTS),
   lip-sync-timed to the "talking" animation.
5. **Gamification** — a built-in Tic-Tac-Toe mini-game where the avatar trash-talks you
   in-character (with voice).

## Who's behind it
- **FYP team (4 members):** Ibrahim Farooq Sial, Aman, Sara, Areeba.
- **Institution:** Institute of Business Management (IoBM), Karachi. Computer Science,
  final year, graduating 2026. This is their Final Year Project — 8 months of work.
- **Ibrahim** is also co-founder of **Wobble** (an AI OS company). The avatar is his
  digital twin and can talk about Wobble.

## The persona the avatar embodies
Confident, pragmatic, concise engineer-founder. Talks in short punchy sentences. Builder
mindset — ships production systems, not theory. Stack: n8n, Vapi, Twilio, Supabase,
Apify, OpenAI. Visionary about agentic AI but grounded.

## Brand / visual direction (current app)
- **Primary accent:** electric orange `#ff5e00`.
- **Base:** near-black backgrounds (`#0d0d0d` / `#111`), high contrast.
- **Vibe:** dark, techy, neon-on-black, sci-fi portal aesthetic. Currently a
  Rick-and-Morty-style green portal background sits behind the 3D model.
- **Type:** clean sans (Inter for body); Orbitron used for the sci-fi headings.
- Feels: futuristic, confident, slightly playful (the game + trash talk), not corporate.

## What the SHOWCASE WEBSITE should communicate
The site is a landing page that *sells the experience* and explains the tech, aimed at
FYP evaluators, recruiters, and visitors who scan the marker.

Priorities, in order:
1. **Immediate wow** — a hero that conveys "talk to a 3D human in your browser" in one
   glance. Consider an embedded/looping preview of the 3D avatar or a video capture.
2. **How it works** — 3 simple steps: Scan the print → Meet the avatar → Talk / play.
3. **The tech, made legible** — AR image tracking, real-time WebGL 3D, LLM chat, voice
   cloning, all serverless on Vercel. Show the architecture without being dry.
4. **The team** — 4 members, IoBM, 8-month FYP. Give them credit.
5. **Wobble tie-in** — a tasteful section on Ibrahim's company (optional, secondary).
6. **A clear CTA** — "Launch the experience" / "Scan to enter."

## Design goals (aspirational reference)
The target quality bar is **igloo.inc** — award-tier motion, buttery scroll, heavy but
optimized visuals, instant-feeling load. The site should feel as premium as the tech is
ambitious. Prioritize: fast perceived load, tasteful scroll-triggered motion, and a 3D
or video hero that doesn't block first paint.

## Hard constraints for whoever builds the site
- Must feel fast (LCP-focused). Heavy 3D/video must lazy-load and never block first paint.
- Mobile-first — the primary user is on a phone scanning a print.
- Keep the `#ff5e00`-on-black identity unless intentionally rebranding.
- Don't misrepresent: it's a browser-based WebGL experience triggered by image tracking,
  not a native AR app and not marker-less world-space AR.

## Tech stack (facts, for accuracy)
- Next.js (Pages Router) on Vercel.
- Three.js + WebGL for the 3D avatar (custom render loop, GLTF model).
- TensorFlow.js MobileNet for the image-match entry gate.
- OpenAI (chat) + ElevenLabs (voice) via Vercel serverless API routes.
