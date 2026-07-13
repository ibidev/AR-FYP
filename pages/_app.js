import '../styles/globals.css'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  // Warm the serverless chat + voice functions on first load so the first real
  // message doesn't pay a cold-start penalty (matters most on demo day).
  useEffect(() => {
    const warm = (url) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warmup: true }),
      }).catch(() => {})
    warm('/api/chat')
    warm('/api/speak')
  }, [])

  return <Component {...pageProps} />
}
