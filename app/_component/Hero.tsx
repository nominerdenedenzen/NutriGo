'use client';

import { useRef } from 'react';
import { Play, Camera } from 'lucide-react';

interface HeroProps {
  onPhotoCapture?: (file: File) => void;
}

export default function Hero({ onPhotoCapture }: HeroProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoCapture?.(file);
    }
  };

  return (
    <section className="bg-[#ECECE6] text-[#1A1C18] font-sans selection:bg-[#23291F] selection:text-[#ECECE6]">
      <main className="max-w-[1380px] mx-auto px-6 pt-10 pb-6">
        <div className="relative grid grid-cols-1 lg:grid-cols-12 items-center gap-8 py-4">
          <div className="hidden lg:flex lg:col-span-3 flex-col items-end gap-6 pr-4">
            {/* Leaf Pill Image */}
            <div className="w-48 h-28 rounded-full overflow-hidden shadow-sm border border-black/5">
              <img
                src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80"
                alt="Fresh green botanical leaf with dew"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Play Video Trigger */}
            <div className="flex items-center gap-3 self-center">
              <button
                aria-label="Play brand story video"
                className="w-12 h-12 rounded-full bg-[#1F241D] text-[#ECECE6] flex items-center justify-center hover:scale-105 transition shadow-md"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
              <span className="text-[10px] font-semibold uppercase tracking-wider leading-tight text-[#3E433B] max-w-[85px]">
                A stronger you starts here
              </span>
            </div>
          </div>

          {/* Center Headline & CTA */}
          <div className="lg:col-span-6 text-center flex flex-col items-center">
            <h1 className="font-display text-5xl sm:text-6xl xl:text-[68px] font-normal tracking-tight leading-[1.03] text-[#1A1C18] uppercase">
              Daily Nutrition
              <br />
              For A <span className="text-[#4A6B3E]">Healthier</span>
              <br />
              Brighter You
            </h1>

            {/* Hidden Camera / Image Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-7 inline-flex items-center gap-3 bg-[#1F241D] text-[#ECECE6] px-7 py-3.5 rounded-full text-xs font-medium tracking-widest uppercase hover:bg-[#2F362C] transition shadow-sm group cursor-pointer"
            >
              <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Scan Ingredients</span>
            </button>
          </div>
        </div>
      </main>
    </section>
  );
}
