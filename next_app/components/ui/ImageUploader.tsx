'use client';

import React, { useState, useRef } from 'react';

interface ImageUploaderProps {
  images: string[]; // base64 / WebP Data URLs
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUploader({ images, onChange, maxImages = 5 }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          // Target max width/height to keep it compact for localStorage & fast loads
          const MAX_DIMENSION = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIMENSION) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            }
          } else {
            if (height > MAX_DIMENSION) {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Draw image onto canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to WebP data URL with 0.7 quality
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFiles = async (fileList: FileList) => {
    const validFiles = Array.from(fileList).filter((file) =>
      file.type.startsWith('image/')
    );

    const availableSlots = maxImages - images.length;
    const filesToProcess = validFiles.slice(0, availableSlots);

    if (filesToProcess.length === 0) return;

    try {
      const compressionPromises = filesToProcess.map((file) => compressImage(file));
      const newImages = await Promise.all(compressionPromises);
      onChange([...images, ...newImages]);
    } catch (err) {
      console.error('Image compression failed:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          Product Media ({images.length}/{maxImages})
        </label>
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Drag & Drop Area */}
      {images.length < maxImages && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
            isDragging
              ? 'border-accent-500 bg-accent-500/10 scale-[1.01]'
              : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/10'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            className="hidden"
          />

          <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
            📸
          </div>

          <p className="text-sm font-semibold text-white text-center">
            Drag & drop your product image, or <span className="text-accent-400 group-hover:underline">browse</span>
          </p>
          <p className="text-xs text-slate-500 text-center mt-1">
            Supports JPEG, PNG, WebP (Auto-compressed to WebP)
          </p>
          <p className="text-[10px] text-slate-600 text-center mt-2 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-900">
            Optimized for Mobile & B2B Trust Badges
          </p>
        </div>
      )}

      {/* Thumbnails Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {images.map((image, idx) => (
            <div
              key={idx}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={`Product Thumbnail ${idx + 1}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(idx);
                  }}
                  className="h-8 w-8 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white shadow-lg transition-transform duration-200 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-2 py-0.5 rounded-md text-[10px] text-slate-300 font-semibold shadow-sm">
                {idx === 0 ? 'Primary' : `Image ${idx + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
