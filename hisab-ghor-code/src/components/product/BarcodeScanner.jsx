import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, Zap, ZapOff } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import useBackClose from '@/hooks/useBackClose';


const ZXING_FORMATS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
  BarcodeFormat.AZTEC,
];

const NATIVE_FORMATS = [
  'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128',
  'code_39', 'code_93', 'itf', 'codabar', 'data_matrix', 'pdf417', 'aztec',
];

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);

  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState('init');
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const closeWithAnimation = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      onCloseRef.current?.();
    }, 240);
  };

  useBackClose(true, closeWithAnimation);

  useEffect(() => {
    let cancelled = false;
    let finished = false;

    const finish = (text) => {
      if (finished || cancelled) return;
      finished = true;
      try { controlsRef.current?.stop(); } catch {}
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      closeWithAnimation();
      onScan(text);
    };

    const start = async () => {
      try {
        // High resolution stream => small/blurry barcodes stay readable.
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30 },
          },
        };
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
          });
        }
        streamRef.current = stream;
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) setTorchAvailable(true);

        const advanced = [];
        if ((capabilities.focusMode || []).includes('continuous')) advanced.push({ focusMode: 'continuous' });
        if ((capabilities.exposureMode || []).includes('continuous')) advanced.push({ exposureMode: 'continuous' });
        if (advanced.length) { try { await track.applyConstraints({ advanced }); } catch {} }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => {});
        }
        setStatus('scanning');

        await new Promise((resolve) => {
          if (!video) return resolve();
          if (video.readyState >= 2) return resolve();
          video.addEventListener('loadeddata', resolve, { once: true });
          setTimeout(resolve, 800);
        });
        if (cancelled) return;
        setPreviewReady(true);

        // 1) Native BarcodeDetector — fastest, handles any position in frame.
        const Detector = typeof window !== 'undefined' ? window.BarcodeDetector : undefined;
        if (Detector) {
          try {
            const supported = await Detector.getSupportedFormats?.();
            const formats = supported
              ? NATIVE_FORMATS.filter(f => supported.includes(f))
              : NATIVE_FORMATS;
            const detector = new Detector(formats.length ? { formats } : undefined);
            const loop = async () => {
              if (cancelled || finished) return;
              try {
                const codes = await detector.detect(video);
                const value = codes?.[0]?.rawValue?.trim();
                if (value) return finish(value);
              } catch {}
              rafRef.current = requestAnimationFrame(loop);
            };
            rafRef.current = requestAnimationFrame(loop);
            return;
          } catch {}
        }

        // 2) ZXing fallback with TRY_HARDER + full-frame scanning.
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.ALSO_INVERTED, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 60 });
        readerRef.current = reader;
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          const text = result?.getText?.()?.trim();
          if (text) finish(text);
        });
        controlsRef.current = controls;
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { controlsRef.current?.stop(); } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleTorch = async () => {
    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;
      const newTorchState = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: newTorchState }] });
      setTorchOn(newTorchState);
    } catch {}
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black flex flex-col ${closing ? 'animate-camera-slide-out' : 'animate-camera-slide-in'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 flex-shrink-0"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
        <span className="text-white font-semibold text-sm">বারকোড স্ক্যান</span>
        <button onClick={closeWithAnimation} className="p-2 hover:bg-white/10 rounded-lg">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera view */}
      {status !== 'error' && (
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <div className="absolute inset-0 pointer-events-none bg-black/10" />
          {/* Corner indicators spanning most of the screen */}
          <div className="absolute inset-8 pointer-events-none flex items-center justify-center">
            <div className="w-full max-w-md aspect-[3/4] relative">
              <div className="absolute -top-0.5 -left-0.5 w-7 h-7 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-xl" />
              <div className="absolute -top-0.5 -right-0.5 w-7 h-7 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-xl" />
              <div className="absolute -bottom-0.5 -left-0.5 w-7 h-7 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-xl" />
              <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-xl" />
              {status === 'scanning' && previewReady && (
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400 animate-pulse" />
              )}
            </div>
          </div>
          {!previewReady && status === 'scanning' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50">
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              <span className="text-white/90 text-xs">স্ক্যানার তৈরি হচ্ছে...</span>
            </div>
          )}
          {status === 'scanning' && torchAvailable && (
            <button
              onClick={toggleTorch}
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center active:opacity-70"
            >
              {torchOn
                ? <Zap className="w-5 h-5 text-yellow-400" />
                : <ZapOff className="w-5 h-5 text-white" />}
            </button>
          )}
          {status === 'scanning' && (
            <div className="absolute bottom-8 left-0 right-0 text-center" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <p className="text-white/90 text-sm px-8">যেকোনো জায়গায় বারকোড বা QR কোড ধরুন — স্ক্যানার পুরো স্ক্রিন স্ক্যান করছে</p>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
          <p className="text-white/70 text-sm text-center">
            ক্যামেরা চালু করা যায়নি। অ্যাপে ক্যামেরা পারমিশন দেওয়া আছে কিনা যাচাই করুন।
          </p>
          <button
            onClick={closeWithAnimation}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium text-sm"
          >
            বন্ধ করুন
          </button>
        </div>
      )}
    </div>
  );
}
