'use client';
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

// ── Change this to whatever secret you want printed on the QR code ──
const QR_SECRET = 'IBRAHIM-AR-2026';

interface ArtScannerProps {
  onAuthenticated: () => void;
}

export default function ArtScanner({ onAuthenticated }: ArtScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authenticatedRef = useRef(false);
  const [status, setStatus] = useState('Starting camera...');

  useEffect(() => {
    startCamera();
    return () => stopAll();
  }, []);

  const stopAll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>(resolve => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => videoRef.current!.play().then(resolve);
          }
        });
        setStatus('Point the QR code at the camera');
        intervalRef.current = setInterval(scanFrame, 250);
      }
    } catch (err: any) {
      const msg =
        err.name === 'NotAllowedError' ? 'Please allow camera access and refresh' :
        err.name === 'NotFoundError'   ? 'No camera found on this device' :
        'Camera error — please refresh';
      setStatus(msg);
    }
  };

  const scanFrame = () => {
    if (authenticatedRef.current) return;
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code) {
      if (code.data === QR_SECRET) {
        authenticatedRef.current = true;
        setStatus('✓ Verified! Loading...');
        stopAll();
        setTimeout(() => onAuthenticated(), 600);
      } else {
        setStatus('Wrong QR code — use the correct one.');
        setTimeout(() => setStatus('Point the QR code at the camera'), 2000);
      }
    }
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
      <div className="max-w-xl w-full bg-black/50 backdrop-blur-sm rounded-3xl p-8 border-2 border-green-500">
        <h2
          className="text-white text-3xl font-bold text-center mb-6"
          style={{ fontFamily: 'Orbitron, system-ui, sans-serif' }}
        >
          Scan to Enter
        </h2>

        {/* Camera view */}
        <div
          className="relative bg-black rounded-2xl overflow-hidden mb-6 border-4 border-green-600 mx-auto"
          style={{ aspectRatio: '4/3', maxWidth: '420px' }}
        >
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

          {/* Targeting overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="border-4 border-green-400 rounded-xl"
              style={{
                width: '55%',
                aspectRatio: '1/1',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              }}
            />
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Status */}
        <div className="bg-black/80 rounded-xl p-4 mb-6">
          <p
            className="text-center text-white text-base font-semibold"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {status}
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => { stopAll(); window.location.href = '/'; }}
            className="bg-red-500 hover:bg-red-600 text-white text-lg font-bold py-3 px-8 rounded-full transition-all active:scale-95"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Cancel
          </button>
        </div>

        <p
          className="text-center text-white/50 text-sm mt-4"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          Hold the QR code steady inside the green frame
        </p>
      </div>
    </div>
  );
}
