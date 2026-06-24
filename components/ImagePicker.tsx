"use client";

import { useRef, useState } from "react";

/** Pick a photo from disk, center-crop to a square, downscale, and emit a
 * base64 JPEG data URL. No upload/storage infra — the data URL is stored
 * directly on the user row (works locally and on serverless). */
export function ImagePicker({
  value,
  onChange,
  size = 96,
}: {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const onFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Görsel dosyası seç.");
      return;
    }
    setBusy(true);
    try {
      onChange(await resizeToDataUrl(file, 512, 0.85));
    } catch {
      setError("Görsel okunamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={pick}
        aria-label="Fotoğraf seç"
        className="relative shrink-0 overflow-hidden rounded-full border border-white/15 bg-ink-soft"
        style={{ width: size, height: size }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-cream-faint">
            <CameraIcon />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 font-label text-[10px] uppercase tracking-[0.12em] text-cream">
            …
          </span>
        )}
      </button>

      <div className="space-y-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={pick}
            className="rounded-full border border-white/20 px-4 py-1.5 font-label text-[11px] uppercase tracking-[0.12em] text-cream hover:border-red hover:text-red"
          >
            {value ? "Değiştir" : "Fotoğraf yükle"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-full px-3 py-1.5 font-label text-[11px] uppercase tracking-[0.12em] text-cream-faint hover:text-red"
            >
              Kaldır
            </button>
          )}
        </div>
        {error ? (
          <p className="font-body text-xs text-red">{error}</p>
        ) : (
          <p className="font-body text-xs text-cream-faint">JPG/PNG · kare olarak kırpılır</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function resizeToDataUrl(file: File, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const target = Math.min(max, side);
        const canvas = document.createElement("canvas");
        canvas.width = target;
        canvas.height = target;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("ctx"));
        ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2l1.2-1.8a1 1 0 0 1 .83-.45h4.94a1 1 0 0 1 .83.45L15.5 7h2A1.5 1.5 0 0 1 19 8.5v9A1.5 1.5 0 0 1 17.5 19h-13A1.5 1.5 0 0 1 3 17.5z" strokeLinejoin="round" />
      <circle cx="11" cy="12.5" r="3.2" />
    </svg>
  );
}
