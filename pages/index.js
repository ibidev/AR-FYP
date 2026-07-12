import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'

// Lazy-load the WebGL hero so first paint never waits on three.js.
// Reuse Rick3DViewer (the same viewer used on /experience, which renders reliably)
// in transparent mode so it sits inside the CSS portal rings.
const Rick3DViewer = dynamic(() => import('../components/Rick3DViewer'), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '500 11px/1 ui-monospace, Menlo, monospace', letterSpacing: '.2em', color: 'rgba(255,255,255,.45)' }}>
      LOADING TWIN
    </div>
  ),
})

const TEAM = [
  { name: 'Ibrahim Farooq Sial', initials: 'IF', role: 'LEAD · THE TWIN' },
  { name: 'Aman', initials: 'A', role: 'TEAM' },
  { name: 'Sara', initials: 'S', role: 'TEAM' },
  { name: 'Areeba', initials: 'A', role: 'TEAM' },
]

const STEPS = [
  { n: '01', t: 'SCAN THE PRINT', d: 'Point your phone at the printed art frame. On-device image matching unlocks the portal — no QR code, no app store.' },
  { n: '02', t: 'MEET THE TWIN', d: "Ibrahim's photoreal 3D model renders instantly in WebGL — with idle, thinking and talking animation states." },
  { n: '03', t: 'TALK & PLAY', d: 'Chat by text or mic — English, Urdu or Roman Urdu. Every reply is spoken in his cloned voice. Then lose at Tic-Tac-Toe.' },
]

const TECH = [
  { t: 'IMAGE TRACKING', d: 'TensorFlow.js MobileNet embeddings, matched fully in-browser. Nothing leaves the device.' },
  { t: 'REAL-TIME 3D', d: 'Three.js with a custom render loop. Compressed GLTF, lazy-loaded — first paint never waits for the model.' },
  { t: 'CONVERSATION', d: 'An LLM behind Vercel serverless routes, persona-locked to Ibrahim. Replies in whatever language you use.' },
  { t: 'VOICE', d: "An ElevenLabs clone of Ibrahim's real voice, timed against the talking animation for lip-sync." },
]

export default function Home() {
  // scroll-triggered reveals
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'))
    els.forEach((el) => {
      el.style.transition = 'opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1)'
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight * 1.1) return // already near view — leave shown
      el.style.opacity = '0'
      el.style.transform = 'translateY(22px)'
    })
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1'
          e.target.style.transform = 'translateY(0)'
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.12 })
    els.forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.top >= window.innerHeight * 1.1) io.observe(el)
    })
    const failsafe = setTimeout(() => els.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'translateY(0)' }), 1500)
    return () => { io.disconnect(); clearTimeout(failsafe) }
  }, [])

  return (
    <>
      <Head>
        <title>AR Digital Twin — Scan a Print, Meet the Twin</title>
        <meta name="description" content="A real-time 3D digital twin of Ibrahim that lives in your browser — talks in his cloned voice, plays Tic-Tac-Toe. FYP, IoBM Karachi." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="lp-root">
        {/* ============ HERO ============ */}
        <section className="lp-hero">
          <nav className="lp-nav">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="lp-navdot" />
              <span className="lp-orb" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.22em', color: '#f2efeb' }}>DIGITAL&nbsp;TWIN</span>
              <span className="lp-mono" style={{ fontSize: 10, letterSpacing: '.18em', color: 'rgba(242,239,235,.4)', padding: '3px 8px', border: '1px solid rgba(242,239,235,.15)', borderRadius: 99 }}>FYP&nbsp;&apos;26</span>
            </div>
            <Link href="/experience" className="lp-cta" style={{ fontSize: 11, padding: '11px 20px' }}>LAUNCH</Link>
          </nav>

          <div className="lp-herobody">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26, minWidth: 0 }}>
              <div className="lp-mono" style={{ fontSize: 11, letterSpacing: '.28em', color: '#ff5e00' }}>A FINAL YEAR PROJECT · IOBM KARACHI</div>
              <h1 className="lp-orb" style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(34px, 5.4vw, 76px)', lineHeight: 1.04, letterSpacing: '.01em', color: '#f2efeb' }}>
                SCAN A PRINT.<br />MEET <span style={{ color: '#ff5e00', textShadow: '0 0 34px rgba(255,94,0,.45)' }}>THE TWIN.</span>
              </h1>
              <p style={{ margin: 0, maxWidth: '46ch', fontSize: 'clamp(15px, 1.3vw, 18px)', lineHeight: 1.65, color: 'rgba(242,239,235,.66)' }}>
                A real-time 3D twin of Ibrahim that lives in your browser. It listens, answers in his actual cloned voice — and it will trash-talk you at Tic-Tac-Toe.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                <Link href="/experience" className="lp-cta" style={{ fontSize: 12, padding: '16px 26px', boxShadow: '0 0 28px rgba(255,94,0,.35)' }}>LAUNCH THE EXPERIENCE</Link>
                <a href="#how" className="lp-cta-ghost" style={{ fontSize: 12, padding: '15px 24px' }}>HOW IT WORKS ↓</a>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {['NO APP INSTALL', 'BROWSER WEBGL', 'VOICE-CLONED'].map((t) => (
                  <span key={t} className="lp-tag">{t}</span>
                ))}
              </div>
            </div>

            {/* portal + avatar */}
            <div className="lp-portalwrap">
              <div className="lp-ring" style={{ width: 'min(88%, 520px)', background: 'radial-gradient(circle, rgba(255,94,0,.16) 0%, rgba(255,94,0,.05) 45%, transparent 70%)', filter: 'blur(2px)', animation: 'lp-portalPulse 5s ease-in-out infinite' }} />
              <div className="lp-ring" style={{ width: 'min(82%, 480px)', border: '1px solid rgba(255,94,0,.4)', borderTopColor: 'transparent', borderBottomColor: 'transparent', animation: 'lp-portalSpin 14s linear infinite' }} />
              <div className="lp-ring" style={{ width: 'min(70%, 410px)', border: '1px dashed rgba(255,94,0,.3)', animation: 'lp-portalSpinRev 22s linear infinite' }} />
              <div className="lp-ring" style={{ width: 'min(94%, 560px)', border: '1px solid rgba(255,94,0,.14)' }} />

              <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                <Rick3DViewer isPlayingAudio={false} isThinking={false} isLoading={false} transparent modelUrl="/models/ib.glb" />
              </div>

              <div className="lp-mono" style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 10, letterSpacing: '.2em', color: 'rgba(242,239,235,.4)', whiteSpace: 'nowrap' }}>DRAG TO SPIN — LIVE WEBGL, NOT VIDEO</div>
            </div>
          </div>
        </section>

        {/* marquee divider */}
        <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,94,0,.25)', borderBottom: '1px solid rgba(255,94,0,.25)', background: '#0a0a0a', padding: '14px 0' }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'lp-marqueeMove 26s linear infinite' }}>
            {[0, 1].map((i) => (
              <span key={i} className="lp-orb" style={{ fontWeight: 700, fontSize: 15, letterSpacing: '.34em', color: 'rgba(242,239,235,.35)', whiteSpace: 'nowrap', paddingRight: 8 }}>
                SCAN · MEET · TALK · PLAY · SCAN · MEET · TALK · PLAY · SCAN · MEET · TALK · PLAY ·&nbsp;
              </span>
            ))}
          </div>
        </div>

        {/* ============ HOW IT WORKS ============ */}
        <section id="how" style={{ padding: 'clamp(72px, 10vw, 130px) clamp(20px, 5vw, 56px)', maxWidth: 1200, margin: '0 auto' }}>
          <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 'clamp(40px, 5vw, 64px)' }}>
            <div className="lp-mono" style={{ fontSize: 11, letterSpacing: '.28em', color: '#ff5e00' }}>HOW IT WORKS</div>
            <h2 className="lp-orb" style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(26px, 3.6vw, 46px)', lineHeight: 1.1, color: '#f2efeb' }}>Three steps. Zero installs.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {STEPS.map((s) => (
              <div key={s.n} data-reveal className="lp-card">
                <div className="lp-num">{s.n}</div>
                <div className="lp-orb" style={{ fontWeight: 700, fontSize: 16, letterSpacing: '.12em', color: '#f2efeb' }}>{s.t}</div>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: 'rgba(242,239,235,.6)' }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ TECH ============ */}
        <section style={{ background: '#0a0a0a', borderTop: '1px solid rgba(242,239,235,.08)', borderBottom: '1px solid rgba(242,239,235,.08)' }}>
          <div style={{ padding: 'clamp(72px, 10vw, 130px) clamp(20px, 5vw, 56px)', maxWidth: 1200, margin: '0 auto' }}>
            <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 34 }}>
              <div className="lp-mono" style={{ fontSize: 11, letterSpacing: '.28em', color: '#ff5e00' }}>UNDER THE HOOD</div>
              <h2 className="lp-orb" style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(26px, 3.6vw, 46px)', lineHeight: 1.1, color: '#f2efeb' }}>Serverless. Edge-cached. GPU-rendered.</h2>
            </div>

            <div data-reveal className="lp-mono" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, fontSize: 11.5, letterSpacing: '.12em', color: 'rgba(242,239,235,.55)', marginBottom: 'clamp(36px, 5vw, 56px)', padding: '16px 20px', border: '1px dashed rgba(255,94,0,.35)', background: 'rgba(255,94,0,.04)' }}>
              {['CAMERA', 'IMAGE MATCH', 'WEBGL SCENE', 'LLM', 'CLONED VOICE'].map((s, i, arr) => (
                <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <span>{s}</span>{i < arr.length - 1 && <span style={{ color: '#ff5e00' }}>→</span>}
                </span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 18 }}>
              {TECH.map((c) => (
                <div key={c.t} data-reveal style={{ borderLeft: '2px solid #ff5e00', padding: '6px 0 6px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="lp-orb" style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.14em', color: '#f2efeb' }}>{c.t}</div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(242,239,235,.6)' }}>{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ TEAM + CTA ============ */}
        <section id="enter" style={{ padding: 'clamp(72px, 10vw, 130px) clamp(20px, 5vw, 56px) 0', maxWidth: 1200, margin: '0 auto' }}>
          <div data-reveal style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 'clamp(36px, 5vw, 56px)' }}>
            <div className="lp-mono" style={{ fontSize: 11, letterSpacing: '.28em', color: '#ff5e00' }}>THE TEAM</div>
            <h2 className="lp-orb" style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(26px, 3.6vw, 46px)', lineHeight: 1.1, color: '#f2efeb' }}>Built in 8 months by four people.</h2>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(242,239,235,.55)' }}>Computer Science · Institute of Business Management, Karachi · Class of 2026</p>
          </div>

          <div>
            {TEAM.map((m) => (
              <div key={m.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 14, border: '1px solid rgba(242,239,235,.12)', background: '#111', padding: '14px 22px 14px 14px', margin: '0 14px 14px 0' }}>
                <div className="lp-orb" style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,94,0,.12)', border: '1px solid rgba(255,94,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#ff5e00' }}>{m.initials}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5, color: '#f2efeb' }}>{m.name}</span>
                  <span className="lp-mono" style={{ fontSize: 10.5, letterSpacing: '.12em', color: 'rgba(242,239,235,.45)' }}>{m.role}</span>
                </div>
              </div>
            ))}
          </div>

          {/* final CTA */}
          <div data-reveal style={{ position: 'relative', marginTop: 'clamp(56px, 8vw, 96px)', padding: 'clamp(64px, 9vw, 120px) 20px', textAlign: 'center', overflow: 'hidden', borderTop: '1px solid rgba(242,239,235,.1)' }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 'min(90vw, 640px)', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,94,0,.14) 0%, transparent 62%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 'min(70vw, 480px)', aspectRatio: '1', borderRadius: '50%', border: '1px dashed rgba(255,94,0,.3)', transform: 'translate(-50%, -50%)', animation: 'lp-portalSpin 30s linear infinite', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
              <div className="lp-orb" style={{ fontWeight: 900, fontSize: 'clamp(38px, 7vw, 92px)', lineHeight: 1, color: '#f2efeb', letterSpacing: '.02em' }}>SCAN TO <span style={{ color: '#ff5e00', textShadow: '0 0 40px rgba(255,94,0,.5)' }}>ENTER</span></div>
              <p style={{ margin: 0, maxWidth: '42ch', fontSize: 15, lineHeight: 1.6, color: 'rgba(242,239,235,.6)' }}>Find the printed frame, point your camera, and say hi. He&apos;s expecting you.</p>
              <Link href="/experience" className="lp-cta" style={{ fontSize: 13, padding: '18px 34px', boxShadow: '0 0 34px rgba(255,94,0,.4)' }}>LAUNCH THE EXPERIENCE</Link>
            </div>
          </div>

          <footer className="lp-mono" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, padding: '26px 0 34px', borderTop: '1px solid rgba(242,239,235,.08)', fontSize: 10.5, letterSpacing: '.14em', color: 'rgba(242,239,235,.35)' }}>
            <span>© 2026 AR DIGITAL TWIN — FYP, IOBM KARACHI</span>
            <span>NEXT.JS · THREE.JS · VERCEL</span>
          </footer>
        </section>
      </div>
    </>
  )
}
