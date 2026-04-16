import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

export default function Calibrate() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('Loading model...');
  const [model, setModel] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const streamRef = useRef(null);
  const [mode, setMode] = useState('camera'); // 'camera' or 'upload'

  useEffect(() => {
    setup();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const setup = async () => {
    await tf.setBackend('webgl');
    await tf.ready();
    const loadedModel = await mobilenet.load();
    setModel(loadedModel);
    setStatus('Model ready! Choose camera or upload an image.');
  };

  const startCamera = async () => {
    setMode('camera');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(resolve);
          };
        });
        setCameraActive(true);
        setStatus('Camera ready! Point at your artwork and click Capture');
      }
    } catch (err) {
      setStatus('Camera error: ' + err.message);
    }
  };

  const captureFromCamera = async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;
    setStatus('Capturing...');
    try {
      const canvas = canvasRef.current;
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 224, 224);
      await generateAndDownload(canvas);
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  };

  const handleImageUpload = async (e) => {
    if (!model) return;
    const file = e.target.files[0];
    if (!file) return;
    setStatus('Processing uploaded image...');
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => { img.onload = resolve; });
      const canvas = canvasRef.current;
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 224, 224);
      await generateAndDownload(canvas);
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  };

  const generateAndDownload = async (canvas) => {
    try {
      const img = tf.browser.fromPixels(canvas);
      const embedding = model.infer(img, true);
      const data = await embedding.data();
      const embeddingArray = Array.from(data);
      const json = JSON.stringify({ embedding: embeddingArray });
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reference-embedding.json';
      a.click();
      setStatus('✅ Downloaded! Upload reference-embedding.json to public/ folder on GitHub');
      img.dispose();
      embedding.dispose();
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  };

  return (
    <div style={{ padding: 20, background: '#000', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ color: '#00ff00' }}>Calibrate Art Scanner</h1>
      <p>{status}</p>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          onClick={startCamera}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: mode === 'camera' ? '#00ff00' : '#333', color: mode === 'camera' ? '#000' : '#fff',
            fontSize: 16
          }}
        >
          📷 Use Camera
        </button>
        <button
          onClick={() => { setMode('upload'); setStatus('Upload an image of your artwork'); }}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: mode === 'upload' ? '#00ff00' : '#333', color: mode === 'upload' ? '#000' : '#fff',
            fontSize: 16
          }}
        >
          📁 Upload Image
        </button>
      </div>

      {/* Camera Mode */}
      {mode === 'camera' && (
        <div>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ width: '100%', maxWidth: 600, borderRadius: 8, marginBottom: 16 }} />
          <br />
          <button
            onClick={captureFromCamera}
            disabled={!cameraActive}
            style={{
              padding: '12px 24px', background: '#00ff00', color: '#000',
              fontSize: 18, borderRadius: 8, cursor: 'pointer', border: 'none'
            }}
          >
            Capture Reference
          </button>
        </div>
      )}

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={!model}
            style={{
              display: 'block', marginBottom: 16, color: '#fff',
              padding: '12px', background: '#333', borderRadius: 8,
              border: '1px solid #00ff00', cursor: 'pointer', fontSize: 16
            }}
          />
          <p style={{ color: '#999', fontSize: 14 }}>
            Select an image file of your artwork to generate the reference fingerprint
          </p>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
