import React, { useRef } from 'react';
import { Camera, Image } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

/**
 * Reusable camera/gallery chooser dialog.
 * Renders a modal with two options; picking one opens the native
 * camera (capture) or gallery file picker, then calls onSelect(file).
 * Caller handles cropping/compression afterwards.
 */
export default function PhotoChooser({ open, onOpenChange, onSelect }) {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onSelect(file);
  };

  const pick = (ref) => {
    onOpenChange(false);
    // Small delay so the dialog closes before the native picker opens
    setTimeout(() => ref.current?.click(), 50);
  };

  return (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6" onClick={() => onOpenChange(false)}>
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{bn ? 'নির্বাচন করুন' : 'Choose'}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 px-5 pb-5">
              <button
                type="button"
                onClick={() => pick(cameraRef)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 dark:bg-slate-700 py-6 active:opacity-70"
              >
                <Camera className="w-8 h-8 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'ক্যামেরা' : 'Camera'}</span>
              </button>
              <button
                type="button"
                onClick={() => pick(galleryRef)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 dark:bg-slate-700 py-6 active:opacity-70"
              >
                <Image className="w-8 h-8 text-emerald-600" />
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{bn ? 'গ্যালারি' : 'Gallery'}</span>
              </button>
            </div>
            <div className="border-t border-gray-100 dark:border-slate-700 px-5 py-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full py-2 text-sm font-bold text-blue-600 uppercase tracking-wide active:opacity-70"
              >
                {bn ? 'বাতিল' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
