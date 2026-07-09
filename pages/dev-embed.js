import { useState, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

// Dev-only tool: generates public/reference-embedding.json from real photos of
// the target art print, using the exact same preprocessing as ArtScanner.tsx
// (224x224 canvas + MobileNet embedding), so the numbers are comparable.
// Not linked from the UI — visit /dev-embed directly.
export default function DevEmbed() {
  const [status, setStatus] = useState('Pick one or more photos of the target art print.');
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);

  const embedImage = async (model, file) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    const canvas = canvasRef.current;
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 224, 224);
    URL.revokeObjectURL(url);

    const tensor = tf.browser.fromPixels(canvas);
    const embedding = model.infer(tensor, true);
    const data = Array.from(await embedding.data());
    tensor.dispose();
    embedding.dispose();
    return data;
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setResult(null);
    setStatus('Loading MobileNet...');
    await tf.setBackend('webgl');
    await tf.ready();
    const model = await mobilenet.load();

    const embeddings = [];
    for (let i = 0; i < files.length; i++) {
      setStatus(`Embedding photo ${i + 1} of ${files.length}...`);
      embeddings.push(await embedImage(model, files[i]));
    }

    setStatus('Averaging...');
    const length = embeddings[0].length;
    const averaged = new Array(length).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < length; i++) averaged[i] += emb[i] / embeddings.length;
    }

    setResult(averaged);
    setStatus(`Done. Averaged ${embeddings.length} photo(s). Download the file below and replace public/reference-embedding.json.`);
  };

  const download = () => {
    const blob = new Blob([JSON.stringify({ embedding: result })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reference-embedding.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Reference Embedding Generator</h1>
      <p style={{ color: '#999', maxWidth: 560, marginBottom: 16, fontSize: 14 }}>
        Upload 3-5 photos of the actual art print you'll be scanning at presentation time — ideally
        shot the way you'll actually scan it (similar lighting, similar distance/angle). Averaging
        multiple shots makes the match more robust than a single photo.
      </p>
      <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ marginBottom: 16 }} />
      <p style={{ color: '#ff5e00', fontSize: 14 }}>{status}</p>
      {result && (
        <button
          onClick={download}
          style={{ marginTop: 12, padding: '10px 20px', background: '#ff5e00', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          Download reference-embedding.json
        </button>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
