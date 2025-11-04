import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Slide, AspectRatio } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon } from './Icons';

interface SlideshowProps {
  slides: Slide[];
  duration: number; // in seconds
  aspectRatio: AspectRatio;
}

const Slideshow: React.FC<SlideshowProps> = ({ slides, duration, aspectRatio }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);

  const resetTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
  }, []);
  
  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
  }, [slides.length]);

  useEffect(() => {
    if (isPlaying) {
      resetTimers();
      timerRef.current = window.setInterval(goToNext, duration * 1000);
      const startTime = Date.now();
      progressRef.current = window.setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const newProgress = Math.min(100, (elapsedTime / (duration * 1000)) * 100);
        setProgress(newProgress);
      }, 100);
    } else {
      resetTimers();
    }
    return () => resetTimers();
  }, [isPlaying, currentIndex, duration, goToNext, resetTimers]);

  useEffect(() => {
    if (slides.length > 0) {
      // Go to the latest generated slide but don't autoplay
      const newIndex = slides.length - 1;
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        setIsPlaying(false);
      }
    }
  }, [slides.length]);

  const goToPrevious = () => {
    setIsPlaying(false);
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const handleGoToNext = () => {
    setIsPlaying(false);
    goToNext();
  };
  
  const togglePlay = () => {
      setIsPlaying(!isPlaying);
  };
  
  if (!slides || slides.length === 0) {
    return null;
  }

  const currentSlide = slides[currentIndex];
  
  const containerClass = aspectRatio === '16:9'
      ? 'w-full max-w-2xl mx-auto flex flex-col gap-4'
      : 'w-full max-w-[280px] sm:max-w-xs mx-auto flex flex-col gap-4';

  const slideshowClass = aspectRatio === '16:9'
      ? 'relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden shadow-2xl shadow-slate-900/50'
      : 'relative aspect-[9/16] w-full bg-slate-900 rounded-lg overflow-hidden shadow-2xl shadow-slate-900/50';

  return (
    <div className={containerClass}>
      <div className={slideshowClass}>
        {currentSlide.imageUrl ? (
            <img src={currentSlide.imageUrl} alt={currentSlide.caption} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex items-center justify-center">
                 <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-slate-400"></div>
            </div>
        )}
        
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
          <div 
            className="h-full bg-indigo-400" 
            style={{ width: `${progress}%`, transition: isPlaying && progress > 1 ? 'width 0.1s linear' : 'none' }} 
          />
        </div>
        
        <div className="absolute inset-0 flex justify-between items-center p-2">
            <button 
                onClick={goToPrevious}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Slide trước"
            >
                <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <button 
                onClick={handleGoToNext}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Slide sau"
            >
                <ChevronRightIcon className="w-6 h-6" />
            </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
            <p className="text-white text-center text-sm md:text-base font-medium drop-shadow-lg">
                {currentSlide.caption}
            </p>
        </div>
      </div>
      <div className="flex justify-center items-center gap-6">
        <div className="text-sm text-gray-400">
          Slide {currentIndex + 1} / {slides.length}
        </div>
         <button
            onClick={togglePlay}
            className="p-2 rounded-full hover:bg-slate-700 text-white transition-all duration-200 focus:outline-none focus:ring-2 ring-offset-2 ring-offset-slate-900 focus:ring-white"
            aria-label={isPlaying ? "Tạm dừng trình chiếu" : "Phát trình chiếu"}
        >
            {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};

export default Slideshow;