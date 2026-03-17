"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface ScannerModalProps {
  onScan: (decodedText: string) => void;
}

export default function ScannerModal({ onScan }: ScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode("reader");

    const config = {
      fps: 20,
      qrbox: { width: 250, height: 150 },
      aspectRatio: 1.0
    };

    scannerRef.current.start(
      { facingMode: "environment" },
      config,
      (text) => {
        onScan(text);
      },
      () => { /* silent failure */ }
    ).catch(err => {
      console.error(err);
      setError("Failed to start camera. Please ensure permissions are granted.");
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
      <div id="reader" className="w-full max-w-lg aspect-square rounded-[3rem] overflow-hidden bg-slate-900 relative shadow-2xl">
        <div className="absolute inset-0 border-[40px] border-slate-900/40 pointer-events-none"></div>
        <div className="absolute inset-[40px] border-2 border-blue-500/50 rounded-lg pointer-events-none animate-pulse"></div>
      </div>
      {error && <p className="text-rose-500 text-sm font-bold">{error}</p>}
      <p className="text-sm text-center text-slate-400 uppercase tracking-widest font-bold">Align code within the frame</p>
    </div>
  );
}
