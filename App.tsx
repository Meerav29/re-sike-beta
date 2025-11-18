import React, { useState, useRef, useCallback } from 'react';
import { AppState, ClassificationResult } from './types';
import { classifyTrash } from './services/geminiService';
import CameraFeed from './components/CameraFeed';
import ResultDisplay from './components/ResultDisplay';
import { CameraIcon } from './components/icons/CameraIcon';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import { ErrorIcon } from './components/icons/ErrorIcon';
import { FlashIcon } from './components/icons/FlashIcon';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const startCamera = async () => {
    setAppState('requesting');
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        // FIX: The 'torch' capability is not in the standard TS lib, so we cast to any to check for it.
        if ((capabilities as any).torch) {
            setHasFlash(true);
        }
        videoTrackRef.current = videoTrack;
      }

      setStream(mediaStream);
      setAppState('scanning');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('Camera access denied. Please enable camera permissions in your browser settings.');
      setAppState('error');
    }
  };

  const stopCamera = useCallback(() => {
    if (videoTrackRef.current && hasFlash && isFlashOn) {
        // Best effort to turn off flash
        // FIX: The 'torch' constraint is not in the standard TS lib, so we cast to any.
        videoTrackRef.current.applyConstraints({ advanced: [{ torch: false } as any] }).catch(e => console.error("Could not turn off flash", e));
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    videoTrackRef.current = null;
    setIsFlashOn(false);
    setHasFlash(false);
  }, [stream, hasFlash, isFlashOn]);

  const toggleFlash = useCallback(async () => {
    if (videoTrackRef.current && hasFlash) {
        try {
            // FIX: The 'torch' constraint is not in the standard TS lib, so we cast to any.
            await videoTrackRef.current.applyConstraints({
                advanced: [{ torch: !isFlashOn } as any],
            });
            setIsFlashOn(current => !current);
        } catch (err) {
            console.error("Failed to toggle flash:", err);
            // Don't show a blocking error, just log it.
        }
    }
  }, [hasFlash, isFlashOn]);

  const captureAndClassify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setAppState('processing');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    
    stopCamera();

    const image_data_url = canvas.toDataURL('image/jpeg', 0.9);
    const base64_image = image_data_url.split(',')[1];

    try {
      const classificationResult = await classifyTrash(base64_image);
      if (classificationResult) {
        setResult(classificationResult);
        setAppState('result');
      } else {
        setError("Could not identify a recyclable item. Please center the item and try again.");
        setAppState('error');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      setAppState('error');
    }
  }, [videoRef, canvasRef, stopCamera]);

  const reset = () => {
    stopCamera();
    setAppState('idle');
    setResult(null);
    setError(null);
  };

  const renderContent = () => {
    switch (appState) {
      case 'idle':
        return (
          <div className="text-center flex flex-col items-center justify-center h-full p-4">
            <div className="bg-green-500 p-4 rounded-full mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Recyclopedia</h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-md">Scan your trash, save the planet. Instantly know where it goes.</p>
            <button onClick={startCamera} className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105">
              Start Scanning
            </button>
          </div>
        );
      case 'scanning':
        return (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
             <p className="absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white py-2 px-4 rounded-full z-20">Center an item to scan</p>
            <CameraFeed stream={stream} ref={videoRef} />
            {hasFlash && (
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={toggleFlash}
                  className="w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
                  aria-label={isFlashOn ? 'Turn off flash' : 'Turn on flash'}
                >
                  <FlashIcon on={isFlashOn} className="w-6 h-6" />
                </button>
              </div>
            )}
            <div className="absolute bottom-8 z-20">
              <button
                onClick={captureAndClassify}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg transition-transform transform hover:scale-110 active:scale-95"
                aria-label="Scan Item"
              >
                <CameraIcon className="w-10 h-10 text-gray-800" />
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>
        );
      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <SpinnerIcon className="w-16 h-16 text-green-400" />
            <h2 className="text-2xl font-semibold mt-4 text-white">Analyzing...</h2>
            <p className="text-gray-300 mt-2">Our AI is identifying your item.</p>
          </div>
        );
      case 'result':
        return result && <ResultDisplay result={result} onReset={reset} />;
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <ErrorIcon className="w-16 h-16 text-red-500" />
            <h2 className="text-2xl font-semibold mt-4 text-white">Oops!</h2>
            <p className="text-gray-300 mt-2 max-w-sm">{error}</p>
            <button onClick={reset} className="mt-8 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105">
              Try Again
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-900 overflow-hidden">
      <main className="w-full h-full flex flex-col items-center justify-center">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
