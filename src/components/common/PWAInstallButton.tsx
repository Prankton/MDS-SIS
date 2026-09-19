import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider transition shadow-sm"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Install PWA</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white text-xs font-semibold tracking-wider transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-lg bg-[#14171d] border border-neutral-700 p-5 shadow-2xl text-white">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-sm"></div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Install di iPhone / iPad</h3>
                </div>
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-neutral-300">
                <div className="flex items-start gap-2.5 bg-[#0a0b0d] p-3 rounded border border-neutral-800">
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-neutral-800 text-white font-mono font-bold">1</span>
                  <p>Ketuk tombol <strong className="text-white">Bagikan (Share)</strong> di bilah navigasi Safari.</p>
                </div>
                <div className="flex items-start gap-2.5 bg-[#0a0b0d] p-3 rounded border border-neutral-800">
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-neutral-800 text-white font-mono font-bold">2</span>
                  <p>Gulir ke bawah dan ketuk <strong className="text-white">Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5 bg-[#0a0b0d] p-3 rounded border border-neutral-800">
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-neutral-800 text-white font-mono font-bold">3</span>
                  <p>Aplikasi MD.SYS siap digunakan langsung secara offline di lapangan!</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white uppercase tracking-wider rounded"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
