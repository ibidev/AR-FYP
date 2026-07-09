import Head from 'next/head'
import RickChatbot from '../components/RickChatbot'
import ArtScanner from '../components/ArtScanner'
import { useState } from 'react'

// The actual AR experience: scan the printed art to unlock, then meet the twin.
// Point the printed QR code at /experience so scanning goes straight here.
export default function Experience() {
  const [authenticated, setAuthenticated] = useState(false)

  return (
    <>
      <Head>
        <title>Ibrahim AI — Experience</title>
        <meta name="description" content="Scan to meet Ibrahim's digital twin" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {authenticated ? (
        <RickChatbot />
      ) : (
        <ArtScanner onAuthenticated={() => setAuthenticated(true)} />
      )}
    </>
  )
}
