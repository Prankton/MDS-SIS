import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, Scan, AlertCircle, Zap, RefreshCw, Flashlight, SwitchCamera, Image as ImageIcon } from 'lucide-react';
import { Item } from '../../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  availableItems?: Item[];
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  availableItems = []
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanStatus, setScanStatus] = useState<string>('Mempersiapkan scanner...');
  const [detectedFeedback, setDetectedFeedback] = useState<string | null>(null);

  // Audio beep feedback
  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1500;
        gain.gain.value = 0.2;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      }
    } catch {
      // AudioContext muted/unsupported
    }
  };

  const handleDetectedBarcode = useCallback((rawBarcode: string) => {
    const cleaned = rawBarcode.trim();
    if (!cleaned) return;
    playBeep();
    setDetectedFeedback(cleaned);
    setScanStatus(`Barcode terdeteksi: ${cleaned}`);
    // Show barcode immediately on screen before closing
    setTimeout(() => {
      onScan(cleaned);
      onClose();
    }, 350);
  }, [onScan, onClose]);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setIsInitializing(true);
    setCameraError(null);
    setScanStatus('Membuka sensor kamera...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Kamera tidak didukung oleh browser ini atau dibatasi dalam iframe.');
      setIsInitializing(false);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Attempt 1: Optimal mobile rear camera constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (firstErr) {
        console.warn('First getUserMedia attempt failed, trying fallback constraints:', firstErr);
        // Attempt 2: Minimal fallback (any available camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;

      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('autoplay', 'true');
        videoEl.muted = true;
        
        try {
          await videoEl.play();
        } catch (playErr) {
          console.warn('video.play() failed or waiting user interaction:', playErr);
        }
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as Record<string, any>;
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }

      setCameraActive(true);
      setIsInitializing(false);
      setScanStatus('Arahkan kamera tepat ke garis barcode');

      // Setup Barcode Detector loop if available
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
          });

          scanIntervalRef.current = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                stopCamera();
                handleDetectedBarcode(barcodes[0].rawValue);
              }
            } catch {
              // Frame scan error, ignore
            }
          }, 300);
        } catch (detectorErr) {
          console.warn('BarcodeDetector initialization error:', detectorErr);
        }
      }
    } catch (err: any) {
      console.error('Final camera access failure:', err);
      setIsInitializing(false);
      setCameraActive(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Izin akses kamera ditolak. Berikan izin kamera di browser Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Perangkat kamera tidak ditemukan pada HP/komputer ini.');
      } else {
        setCameraError('Kamera tidak dapat dibuka. Gunakan tombol "Ambil Foto Barcode" atau input manual.');
      }
    }
  }, [facingMode, handleDetectedBarcode, stopCamera]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('Could not toggle torch:', err);
      }
    }
  };

  // Switch between front and back camera
  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Open native mobile camera for snapshot capture
  const handleTriggerNativeCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanStatus('Memproses foto barcode...');

    // If BarcodeDetector is available, process image
    if ('BarcodeDetector' in window) {
      try {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        await new Promise((resolve) => { img.onload = resolve; });

        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        });
        const barcodes = await barcodeDetector.detect(img);
        URL.revokeObjectURL(objectUrl);

        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          handleDetectedBarcode(barcodes[0].rawValue);
          return;
        }
      } catch (err) {
        console.warn('Error detecting barcode from photo:', err);
      }
    }

    // If no direct detection from photo, open quick input with filename or prompt
    setScanStatus('Foto berhasil diambil. Silakan ketik angka barcode.');
    e.target.value = '';
  };

  // Start Camera when modal opens or facingMode changes
  useEffect(() => {
    if (isOpen) {
      setDetectedFeedback(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  const handleSelectBarcode = (code: string) => {
    handleDetectedBarcode(code);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleDetectedBarcode(manualInput.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-xl bg-[#14171d] border border-neutral-700 shadow-2xl text-white overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-[#0d0e12]">
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4 text-red-500" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono">Scanner Barcode Kamera</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg active:bg-neutral-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-black h-60 sm:h-64 flex items-center justify-center overflow-hidden border-b border-neutral-800">
          {/* Always mounted video element for immediate binding */}
          <video 
            ref={videoRef} 
            className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
            playsInline 
            muted 
            autoPlay
          />

          {cameraActive && (
            <>
              {/* Modern targeting reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                <div className="w-full max-w-[280px] h-32 sm:h-36 border-2 border-red-500 rounded-lg relative flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                  {/* Scanning beam */}
                  <div className="w-full h-0.5 bg-red-400 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
                  
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white -mt-0.5 -ml-0.5"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white -mt-0.5 -mr-0.5"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white -mb-0.5 -ml-0.5"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white -mb-0.5 -mr-0.5"></div>

                  <div className="absolute top-1 left-2 text-[9px] font-mono text-red-400 uppercase tracking-widest font-bold bg-black/60 px-1 rounded">
                    SCANNING...
                  </div>
                </div>
              </div>

              {/* Immediate Detected Barcode Overlay */}
              {detectedFeedback && (
                <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center mb-2 font-black text-xl shadow-lg">
                    ✓
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    BARCODE TERDETEKSI:
                  </span>
                  <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-widest mt-1 bg-neutral-900 border border-neutral-700 px-4 py-1.5 rounded">
                    {detectedFeedback}
                  </span>
                </div>
              )}

              {/* In-camera Controls Toolbar (Flip Camera, Flashlight) */}
              <div className="absolute bottom-2 inset-x-2 flex items-center justify-between px-2 py-1 bg-black/60 backdrop-blur-xs rounded-lg text-xs font-mono">
                <span className="text-[10px] text-neutral-300 truncate max-w-[180px]">
                  {scanStatus}
                </span>
                <div className="flex items-center gap-1">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-md flex items-center gap-1 min-h-[36px] min-w-[36px] justify-center transition ${
                        isTorchOn ? 'bg-amber-500 text-black font-bold' : 'bg-neutral-800 text-white hover:bg-neutral-700'
                      }`}
                      title="Lampu Flash"
                    >
                      <Flashlight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="p-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-white min-h-[36px] min-w-[36px] flex items-center justify-center transition"
                    title="Ganti Kamera Depan/Belakang"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {!cameraActive && (
            <div className="absolute inset-0 p-6 text-center flex flex-col items-center justify-center space-y-3 bg-[#0a0b0d]">
              {isInitializing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-neutral-300 font-mono">Mengaktifkan kamera perangkat...</p>
                </div>
              ) : (
                <>
                  <Camera className="w-10 h-10 text-neutral-600 mx-auto" />
                  <p className="text-xs text-neutral-300 max-w-xs font-medium">
                    {cameraError || 'Kamera belum dapat diaktifkan.'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center pt-1">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 rounded-lg text-xs font-bold font-mono text-white flex items-center gap-1.5 min-h-[44px]"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-red-400" />
                      <span>Coba Buka Kamera Lagi</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerNativeCapture}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg text-xs font-bold font-mono text-white flex items-center gap-1.5 min-h-[44px]"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Buka Kamera HP (Foto)</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Hidden native camera capture input for instant mobile fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileCapture}
          className="hidden"
        />

        {/* Mobile Quick Action Buttons & Fallbacks */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Quick Native Photo Snap (Mobile-friendly alternative) */}
          <div className="flex items-center justify-between bg-[#0a0b0d] p-2.5 rounded-lg border border-neutral-800">
            <div className="flex items-center gap-2 text-xs">
              <Camera className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-300 text-[11px]">Ada kendala video stream?</span>
            </div>
            <button
              type="button"
              onClick={handleTriggerNativeCapture}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 text-xs font-mono font-semibold rounded-md border border-neutral-700 flex items-center gap-1 min-h-[36px]"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Ambil Foto</span>
            </button>
          </div>

          {/* Manual Barcode Input */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1.5">
              Input Angka Barcode Manual / Scanner Laser
            </label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Contoh: 8991002101112"
                className="flex-1 bg-[#0a0b0d] border border-neutral-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white focus:outline-hidden focus:border-red-500 min-h-[44px]"
                autoFocus
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-xs font-bold uppercase rounded-lg text-white tracking-wider min-h-[44px] flex items-center justify-center shrink-0"
              >
                Scan
              </button>
            </form>
          </div>

          {/* Available Items List for Fast 1-Tap Select */}
          {availableItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase text-neutral-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Pilih Cepat Barang ({availableItems.length} Produk Terdaftar)
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {availableItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectBarcode(item.barcode)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-[#0a0b0d] hover:bg-[#1c1f26] active:bg-[#252a33] border border-neutral-800 text-left transition min-h-[50px] group"
                  >
                    <div className="pr-2">
                      <div className="text-xs font-semibold text-white group-hover:text-red-400 transition">
                        {item.name}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        {item.barcode} • 1 Dus = {item.boxPerDus} Box ({item.boxPerDus * item.pcsPerBox} Pcs)
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-neutral-800 text-neutral-300 group-hover:bg-red-950 group-hover:text-red-300 font-bold shrink-0">
                      PILIH
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
