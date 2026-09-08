import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function ImageCropDialog({ open, imageSrc, onConfirm, onCancel }) {
  const { language } = useLanguage();
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const stateRef = useRef({ scale: 1, minScale: 1, ox: 0, oy: 0, cropSize: 280 });
  const dragRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const rafRef = useRef(null);

  // Draw everything on canvas
  const draw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const { scale: s, ox, oy, cropSize } = stateRef.current;

    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    // image center = canvas center + offset
    const ix = W / 2 - iw / 2 + ox;
    const iy = H / 2 - ih / 2 + oy;

    const cx = W / 2 - cropSize / 2;
    const cy = H / 2 - cropSize / 2;

    ctx.clearRect(0, 0, W, H);

    // Draw dimmed full image
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, ix, iy, iw, ih);
    ctx.restore();

    // Clip to crop box and draw bright image
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, cx, cy, cropSize, cropSize, 12);
    ctx.clip();
    ctx.globalAlpha = 1;
    ctx.drawImage(img, ix, iy, iw, ih);
    ctx.restore();

    // Draw crop border
    ctx.save();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(ctx, cx, cy, cropSize, cropSize, 12);
    ctx.stroke();
    ctx.restore();
  };

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const scheduleDraw = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  };

  // Load image and init
  useEffect(() => {
    if (!open || !imageSrc) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const cropSize = Math.min(canvas.width * 0.82, 300);
      const fit = Math.max(cropSize / img.naturalWidth, cropSize / img.naturalHeight);
      stateRef.current = { scale: fit, minScale: fit, ox: 0, oy: 0, cropSize };
      setScale(fit);
      setMinScale(fit);
      scheduleDraw();
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  // Redraw on scale change from slider
  useEffect(() => {
    scheduleDraw();
  }, [scale]);

  // Hide bottom nav when open
  useEffect(() => {
    if (open) {
      document.body.classList.add('crop-dialog-open');
    } else {
      document.body.classList.remove('crop-dialog-open');
    }
    return () => document.body.classList.remove('crop-dialog-open');
  }, [open]);

  // Set canvas size on mount
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }, [open]);

  // Touch / mouse drag
  const getPos = (e) => {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const handleDragStart = (e) => {
    const pos = getPos(e);
    dragRef.current = { sx: pos.x, sy: pos.y, ox: stateRef.current.ox, oy: stateRef.current.oy };
  };

  const clampOffset = (ox, oy) => {
    const canvas = canvasRef.current;
    if (!canvas) return { ox, oy };
    const { scale: s, cropSize } = stateRef.current;
    const img = imgRef.current;
    if (!img) return { ox, oy };
    const W = canvas.width;
    const H = canvas.height;
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    // crop box edges in canvas coords
    const cx = W / 2 - cropSize / 2;
    const cy = H / 2 - cropSize / 2;
    // image left/top given offset
    // ix = W/2 - iw/2 + ox  => must be <= cx  => ox <= cx - W/2 + iw/2
    // ix + iw >= cx + cropSize => W/2 - iw/2 + ox + iw >= cx + cropSize => ox >= cx + cropSize - W/2 - iw/2
    const maxOx = cx - W / 2 + iw / 2;
    const minOx = cx + cropSize - W / 2 - iw / 2;
    const maxOy = cy - H / 2 + ih / 2;
    const minOy = cy + cropSize - H / 2 - ih / 2;
    return {
      ox: Math.max(minOx, Math.min(maxOx, ox)),
      oy: Math.max(minOy, Math.min(maxOy, oy)),
    };
  };

  const handleDragMove = (e) => {
    if (!dragRef.current) return;
    const pos = getPos(e);
    const rawOx = dragRef.current.ox + pos.x - dragRef.current.sx;
    const rawOy = dragRef.current.oy + pos.y - dragRef.current.sy;
    const clamped = clampOffset(rawOx, rawOy);
    stateRef.current.ox = clamped.ox;
    stateRef.current.oy = clamped.oy;
    scheduleDraw();
  };

  const handleDragEnd = () => { dragRef.current = null; };

  // Zoom
  const applyScale = (newS) => {
    const clamped = Math.max(stateRef.current.minScale, Math.min(stateRef.current.minScale * 4, newS));
    // Scale offset proportionally so center stays stable
    const ratio = clamped / stateRef.current.scale;
    stateRef.current.ox *= ratio;
    stateRef.current.oy *= ratio;
    stateRef.current.scale = clamped;
    setScale(clamped);
    scheduleDraw();
  };

  // Confirm
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const { scale: s, ox, oy, cropSize } = stateRef.current;
    const W = canvas.width;
    const H = canvas.height;
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    const ix = W / 2 - iw / 2 + ox;
    const iy = H / 2 - ih / 2 + oy;
    const cx = W / 2 - cropSize / 2;
    const cy = H / 2 - cropSize / 2;

    // Source in natural coords
    const srcX = (cx - ix) / s;
    const srcY = (cy - iy) / s;
    const srcSize = cropSize / s;

    const out = document.createElement('canvas');
    out.width = 800; out.height = 800;
    out.getContext('2d').drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 800, 800);
    onConfirm(out.toDataURL('image/jpeg', 0.8));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black/80 flex-shrink-0">
        <button onClick={onCancel} className="p-1.5 rounded-lg text-white/80">
          <X className="w-5 h-5" />
        </button>
        <span className="font-semibold text-white">
          {language === 'bn' ? 'ছবি ক্রপ করুন' : 'Crop Photo'}
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full"
        style={{ touchAction: 'none', cursor: 'grab', display: 'block' }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      />

      {/* Zoom slider */}
      <div className="flex items-center gap-3 px-6 py-3 bg-black/80 flex-shrink-0">
        <button
          onClick={() => applyScale(stateRef.current.scale - stateRef.current.minScale * 0.3)}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
        >
          <ZoomOut className="w-4 h-4 text-white" />
        </button>
        <input
          type="range"
          min={minScale}
          max={minScale * 4}
          step={minScale * 0.02}
          value={scale}
          onChange={(e) => applyScale(parseFloat(e.target.value))}
          className="flex-1 accent-emerald-500"
          style={{ cursor: 'pointer' }}
        />
        <button
          onClick={() => applyScale(stateRef.current.scale + stateRef.current.minScale * 0.3)}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
        >
          <ZoomIn className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Confirm / Cancel */}
      <div className="flex justify-center gap-10 py-6 bg-black/80 flex-shrink-0" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <button onClick={onCancel} className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-6 h-6 text-red-400" />
        </button>
        <button onClick={handleConfirm} className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center">
          <Check className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}