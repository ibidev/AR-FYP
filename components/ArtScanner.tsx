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

  // Auto-start camera when ready
  useEffect(() => {
    if (model && referenceEmbedding && !streamRef.current) {
      console.log('✅ Model and reference ready, starting camera');
      startCamera();
    }
  }, [model, referenceEmbedding]);

  const loadModelAndReference = async () => {
    try {
      console.log('Loading model...');
      setStatusMessage('Loading...');
      
      // Set backend
      await tf.setBackend('webgl');
      await tf.ready();
      
      // Load model (should be fast from preload)
      const loadedModel = await mobilenet.load();
      setModel(loadedModel);
      console.log('✓ Model loaded');
      
      // Load reference
      console.log('Loading reference...');
      const response = await fetch('/reference-embedding.json');
      if (!response.ok) {
        throw new Error('Reference not found');
      }
      
      const data = await response.json();
      
      // CRITICAL: Validate reference
      if (!data.embedding || !Array.isArray(data.embedding) || data.embedding.length === 0) {
        throw new Error('Invalid reference file');
      }
      
      setReferenceEmbedding(data.embedding);
      console.log('✓ Reference loaded:', data.embedding.length, 'features');
      
    } catch (error) {
      console.error('Setup error:', error);
      setStatusMessage('Error loading. Please refresh.');
    }
  };

  const startCamera = async () => {
    try {
      setStatusMessage('Starting camera...');
      console.log('Requesting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1200 },
          height: { ideal: 800 }
        } 
      });
      
      console.log('✓ Camera granted');
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to load
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(() => {
                console.log('✓ Video playing');
                resolve();
              });
            };
          }
        });
        
        setCameraActive(true);
        setStatusMessage('✓ Ready! Position art print');
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      let msg = 'Camera access denied';
      if (error.name === 'NotAllowedError') {
        msg = 'Please allow camera access';
      } else if (error.name === 'NotFoundError') {
        msg = 'No camera found';
      } else if (error.name === 'NotReadableError') {
        msg = 'Camera already in use';
      }
      setStatusMessage(msg);
    }
  };

  const handleScanArtPrint = async () => {
    if (!model || !videoRef.current || !referenceEmbedding || !canvasRef.current) {
      console.error('Not ready:', { model: !!model, video: !!videoRef.current, ref: !!referenceEmbedding });
      setStatusMessage('System not ready. Wait a moment.');
      return;
    }

    setIsVerifying(true);
    setStatusMessage('Analyzing art print...');

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No canvas context');
      }
      
      // Use smaller resolution for speed
      const targetWidth = 224;
      const targetHeight = 224;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      ctx.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);

      const img = tf.browser.fromPixels(canvas);
      const embedding = model.infer(img, true) as tf.Tensor;
      const data = await embedding.data();
      
      // CRITICAL: Validate embeddings before comparison
      if (!data || data.length === 0) {
        throw new Error('Failed to extract features');
      }
      
      if (data.length !== referenceEmbedding.length) {
        console.error('Embedding size mismatch!', {
          captured: data.length,
          reference: referenceEmbedding.length
        });
        throw new Error('Reference file incompatible');
      }
      
      const similarity = cosineSimilarity(Array.from(data), referenceEmbedding);
      
      console.log('Similarity:', (similarity * 100).toFixed(1) + '%');
      
      // Check if similarity is valid
      if (isNaN(similarity)) {
        throw new Error('Invalid similarity calculation');
      }
      
      const threshold = 0.92;

      console.log(`[ArtScanner] Similarity score: ${(similarity * 100).toFixed(2)}% | Threshold: ${(threshold * 100).toFixed(0)}%`);

      if (similarity > threshold) {
        setStatusMessage('✓ Art print verified!');

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        setTimeout(() => {
          onAuthenticated();
        }, 500);
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
    // Validate inputs
    if (!a || !b || a.length !== b.length || a.length === 0) {
      console.error('Invalid vectors for similarity', { aLen: a?.length, bLen: b?.length });
      return 0;
    }
    
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    // Prevent division by zero
    if (magA === 0 || magB === 0) {
      console.error('Zero magnitude vector');
      return 0;
    }
    
    return dot / (magA * magB);
  };

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen w-full relative overflow-hidden p-4"
      style={{
        background: `radial-gradient(ellipse 800px 1000px at center center,
          #B8FF3C 0%, #95E030 10%, #6FB828 20%, #4A8428 30%, #2D4D1A 40%,
          #1A2D14 50%, #1B1034 65%, #110822 80%, #0A0416 100%)`,
      }}
    >
      <div className="max-w-3xl w-full bg-black/40 backdrop-blur-sm rounded-3xl p-8 border-2 border-green-500">
        {/* Title */}
        <h2 
          className="text-white text-3xl font-bold text-center mb-6"
          style={{ fontFamily: 'Orbitron, system-ui, sans-serif' }}
        >
          Scan Art Print to Enter
        </h2>
        
        {/* Camera Preview Box */}
        <div className="relative bg-black rounded-2xl overflow-hidden mb-6 border-4 border-green-600 mx-auto"
          style={{ aspectRatio: '2/3', maxWidth: '360px' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Status Message */}
        <div className="bg-black/80 rounded-xl p-4 mb-6">
          <p 
            className="text-center text-white text-lg font-semibold"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {statusMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleScanArtPrint}
            disabled={!cameraActive || isVerifying}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black text-xl font-bold py-4 px-6 rounded-full transition-all active:scale-95"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {isVerifying ? 'Verifying...' : 'Scan Art Print'}
          </button>
          
          <button
            onClick={handleCancel}
            disabled={isVerifying}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white text-xl font-bold py-4 px-8 rounded-full transition-all active:scale-95"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Cancel
          </button>
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p 
            className="text-white/80 text-sm"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Make sure the art print is well-lit and centered in frame
          </p>
        </div>
      </div>
    </div>
  );
}
