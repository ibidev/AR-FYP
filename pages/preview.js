import Head from 'next/head'
import RickChatbot from '../components/RickChatbot'

// Preview route: shows the full 3D avatar + chat experience WITHOUT the scanner gate.
// For development/demo viewing only — the real entry point is / (scan to enter).
export default function Preview() {
  return (
    <>
      <Head>
        <title>Ibrahim AI — Preview</title>
        <meta name="description" content="Preview the AR avatar without scanning" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <RickChatbot />
    </>
  )
}
