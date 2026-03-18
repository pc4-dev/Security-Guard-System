import React, { useRef, useEffect, useState } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please ensure you have given permission.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        onCapture(imageData);
        onClose();
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4"
        >
          <div className="relative w-full max-w-lg aspect-[3/4] bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-white mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-white text-black rounded-full font-bold"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Controls */}
                <div className="absolute top-6 right-6 flex gap-4">
                  <button
                    onClick={toggleCamera}
                    className="p-3 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-all"
                  >
                    <RefreshCw className="w-6 h-6" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-3 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="absolute bottom-10 inset-x-0 flex justify-center">
                  <button
                    onClick={captureImage}
                    className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <div className="w-14 h-14 bg-white rounded-full border-2 border-black/10" />
                  </button>
                </div>
              </>
            )}
          </div>
          <p className="mt-6 text-white/50 text-sm font-medium uppercase tracking-widest">Live Viewfinder</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
