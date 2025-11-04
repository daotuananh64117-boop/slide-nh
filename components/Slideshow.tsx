import React, { useState, useEffect, useRef } from 'react';
import { Slide, AspectRatio } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon } from './Icons';

interface SlideshowProps {
  slides: Slide[];
  duration: number; // Duration per slide in seconds for autoplay
  aspectRatio: AspectRatio;
}

const Slideshow: React.FC<SlideshowProps> = ({ slides, duration, aspectRatio }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    resetTimeout();
    if (isPlaying && slides.length > 0) {
      timeoutRef.current = setTimeout(
        () => setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length),
        duration * 1000
      );
    }
    return () => {
      resetTimeout();
    };
  }, [currentIndex, isPlaying, duration, slides]);
  
  useEffect(() => {
    // Reset to first slide when slides array changes
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [slides]);

  if (slides.length === 0) {
    return (
      <div className={`w-full bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-500 ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
        Các hình ảnh được tạo của bạn sẽ xuất hiện ở đây.
      </div>
    );
  }

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === slides.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const currentSlide = slides[currentIndex];
  const hasImage = currentSlide && currentSlide.imageUrl;

  return (
    <div className="relative group">
      <div className={`w-full overflow-hidden bg-slate-800 rounded-lg shadow-lg relative ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
        {hasImage ? (
          <img src={currentSlide.imageUrl} alt={`Slide ${currentIndex + 1}`} className="w-full h-full object-cover transition-opacity duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="flex flex-col items-center gap-2 text-slate-500">
                <svg className="animate-spin h-8 w-8 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Đang tạo ảnh...</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className='absolute inset-0 bg-black/20'></div>
        <button onClick={goToPrevious} className="relative z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <button onClick={goToNext} className="relative z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white">
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent">
        <button onClick={togglePlay} className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white">
          {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
        </button>
        <div className="text-white text-sm bg-black/50 px-2 py-1 rounded-md">
          {currentIndex + 1} / {slides.length}
        </div>
      </div>
    </div>
  );
};

export default Slideshow;
