'use client';
import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

interface ArtScannerProps {
  onAuthenticated: () => void;
}

export default function ArtScanner({ onAuthenticated }: ArtScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [referenceEmbedding, setReferenceEmbedding] = useState<number[] | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    loadModelAndReference();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (model && referenceEmbedding && !streamRef.current) {
      startCamera();
    }
  }, [model, referenceEmbedding]);

  const loadModelAndReference = async () => {
    try {
      setStatusMessage('Loading...');
      await tf.setBackend('webgl');
      await tf.ready();
      const loadedModel = await mobilenet.load();
      setModel(loadedModel);

      const response = await fetch('/reference-embedding.json');
      if (!response.ok) throw new Error('Reference not found');
      const data = await response.json();
      if (!data.embedding || !Array.isArray(data.embedding) || data.embedding.length === 0) {
        throw new Error('Invalid reference file');
      }
      setReferenceEmbedding(data.embedding);
    } catch (error) {
      console.error('Setup error:', error);
      setStatusMessage('Error loading. Please refresh.');
    }
  };

  const startCamera = async () => {
    try {
      setStatusMessage('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1200 }, height: { ideal: 800 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(() => resolve());
            };
          }
        });
        setCameraActive(true);
        setStatusMessage('✓ Ready! Position art print');
      }
    } catch (error: any) {
      let msg = 'Camera access denied';
      if (error.name === 'NotAllowedError') msg = 'Please allow camera access';
      else if (error.name === 'NotFoundError') msg = 'No camera found';
      else if (error.name === 'NotReadableError') msg = 'Camera already in use';
      setStatusMessage(msg);
    }
  };

  const handleScanArtPrint = async () => {
    if (!model || !videoRef.current || !referenceEmbedding || !canvasRef.current) {
      setStatusMessage('System not ready. Wait a moment.');
      return;
    }
    setIsVerifying(true);
    setStatusMessage('Analyzing...');
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');
      canvas.width = 224;
      canvas.height = 224;
      ctx.drawImage(videoRef.current, 0, 0, 224, 224);

      const img = tf.browser.fromPixels(canvas);
      const embedding = model.infer(img, true) as tf.Tensor;
      const data = await embedding.data();

      if (!data || data.length === 0) throw new Error('Failed to extract features');
      if (data.length !== referenceEmbedding.length) throw new Error('Reference file incompatible');

      const similarity = cosineSimilarity(Array.from(data), referenceEmbedding);
      console.log(`[ArtScanner] Similarity: ${(similarity * 100).toFixed(2)}%`);

      if (isNaN(similarity)) throw new Error('Invalid similarity calculation');

      const threshold = 0.55;

      if (similarity > threshold) {
        setStatusMessage('✓ Art print verified!');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        setTimeout(() => onAuthenticated(), 500);
      } else {
        setStatusMessage(`Not recognized (${(similarity * 100).toFixed(1)}% match). Try again.`);
        setIsVerifying(false);
      }

      img.dispose();
      embedding.dispose();
    } catch (error) {
      console.error('Verification error:', error);
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Try again'}`);
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    window.location.href = '/';
  };

  const cosineSimilarity = (a: number[], b: number[]): number => {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full relative overflow-hidden p-4"
      style={{ background: 'radial-gradient(ellipse 800px 1000px at center 40%, #17121a 0%, #0d0d0d 55%, #0a0a0a 100%)' }}
    >
      <div
        className="max-w-3xl w-full p-8 rounded-2xl"
        style={{ background: '#111', border: '1px solid rgba(255,94,0,.3)' }}
      >
        <h2
          className="text-center mb-6"
          style={{ fontFamily: 'Orbitron, sans-serif', color: '#f2efeb', fontSize: 28, fontWeight: 900, letterSpacing: '.04em' }}
        >
          SCAN ART PRINT TO <span style={{ color: '#ff5e00', textShadow: '0 0 28px rgba(255,94,0,.45)' }}>ENTER</span>
        </h2>

        <div className="relative overflow-hidden mb-6 mx-auto"
          style={{ aspectRatio: '2/3', maxWidth: '360px', background: '#000', borderRadius: 14, border: '2px solid rgba(255,94,0,.5)' }}>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="mb-6" style={{ background: '#0a0a0a', border: '1px solid rgba(242,239,235,.1)', borderRadius: 10, padding: 16 }}>
          <p className="text-center" style={{ fontFamily: 'Inter, sans-serif', color: '#f2efeb', fontSize: 15, fontWeight: 500 }}>
            {statusMessage}
          </p>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={handleScanArtPrint}
            disabled={!cameraActive || isVerifying}
            className="flex-1 transition-all active:scale-95"
            style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, letterSpacing: '.14em', fontSize: 15, color: '#0d0d0d', background: (!cameraActive || isVerifying) ? '#333' : '#ff5e00', padding: '16px 24px', borderRadius: 6, border: 'none', cursor: (!cameraActive || isVerifying) ? 'not-allowed' : 'pointer', boxShadow: (!cameraActive || isVerifying) ? 'none' : '0 0 24px rgba(255,94,0,.35)' }}
          >
            {isVerifying ? 'VERIFYING…' : 'SCAN ART PRINT'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isVerifying}
            className="transition-all active:scale-95"
            style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, letterSpacing: '.14em', fontSize: 15, color: '#f2efeb', background: 'transparent', padding: '16px 28px', borderRadius: 6, border: '1px solid rgba(242,239,235,.25)', cursor: isVerifying ? 'not-allowed' : 'pointer' }}
          >
            CANCEL
          </button>
        </div>

        <div className="text-center">
          <p style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: 'rgba(242,239,235,.45)', fontSize: 11, letterSpacing: '.1em' }}>
            KEEP THE ART PRINT WELL-LIT AND CENTERED IN FRAME
          </p>
        </div>
      </div>
    </div>
  );
}
