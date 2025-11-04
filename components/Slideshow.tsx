import React, { useState, useEffect, useRef } from 'react';
import { Slide, AspectRatio, TransitionEffect } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon } from './Icons';

interface SlideshowProps {
  slides: Slide[];
  duration: number; // Duration per slide in seconds for autoplay
  aspectRatio: AspectRatio;
}

const getTransitionClasses = (transition: TransitionEffect): { in: string, out: string } => {
  switch (transition) {
    case 'slide-left':
      return { in: 'slide-left-in', out: 'slide-left-out' };
    case 'zoom-in':
      return { in: 'zoom-in-in', out: 'zoom-in-out' };
    case 'fade':
    default:
      return { in: 'fade-in', out: 'fade-out' };
  }
}

const Slideshow: React.FC<SlideshowProps> = ({ slides, duration, aspectRatio }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transitionState, setTransitionState] = useState<{ slide: Slide, classes: string }[]>([]);
  const autoplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [progress, setProgress] = useState(0);
  const progressAnimationRef = useRef<number | null>(null);
  const slideStartTimeRef = useRef<number>(0);

  // Effect to initialize or reset the slideshow when the slides prop changes.
  useEffect(() => {
    if (autoplayTimeoutRef.current) clearTimeout(autoplayTimeoutRef.current);
    if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    if (progressAnimationRef.current) cancelAnimationFrame(progressAnimationRef.current);
    setProgress(0);

    if (slides.length > 0 && slides[0].imageUrl) {
      setTransitionState([{ slide: slides[0], classes: 'slide active' }]);
    } else {
      setTransitionState([]);
    }
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [slides]);

  // Effect for progress bar animation.
  useEffect(() => {
    if (progressAnimationRef.current) {
      cancelAnimationFrame(progressAnimationRef.current);
    }

    if (isPlaying && duration > 0 && slides.length > 0) {
      slideStartTimeRef.current = performance.now();
      
      const animateProgress = (timestamp: number) => {
        const elapsed = timestamp - slideStartTimeRef.current;
        const newProgress = Math.min(100, (elapsed / (duration * 1000)) * 100);
        setProgress(newProgress);

        if (newProgress < 100) {
          progressAnimationRef.current = requestAnimationFrame(animateProgress);
        }
      };

      progressAnimationRef.current = requestAnimationFrame(animateProgress);
    } else {
      setProgress(0); // Reset progress if paused or no duration.
    }

    return () => {
      if (progressAnimationRef.current) {
        cancelAnimationFrame(progressAnimationRef.current);
      }
    };
  }, [isPlaying, currentIndex, duration, slides.length]);
  
  const runTransition = (newIndex: number) => {
    const oldIndex = currentIndex;
    if (newIndex === oldIndex || slides.length < 2 || !slides[oldIndex]?.imageUrl || !slides[newIndex]?.imageUrl) return;
    
    if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    if (autoplayTimeoutRef.current) clearTimeout(autoplayTimeoutRef.current);
    if (progressAnimationRef.current) cancelAnimationFrame(progressAnimationRef.current);
    setProgress(0);

    const transitionEffect = slides[newIndex].transition;
    const { in: inClass, out: outClass } = getTransitionClasses(transitionEffect);
    
    setTransitionState(currentState => {
        const currentActive = currentState.find(s => s.classes.includes('active'));
        if (!currentActive) return []; // Should not happen if initialized correctly.

        const previous = { ...currentActive, classes: `slide previous ${outClass}` };
        const next = { slide: slides[newIndex], classes: `slide active ${inClass}` };
        
        return [previous, next];
    });

    setCurrentIndex(newIndex);

    cleanupTimeoutRef.current = setTimeout(() => {
      // After the animation, clean up the state to only contain the new active slide.
      setTransitionState(currentState => {
        const active = currentState.find(s => s.classes.includes('active'));
        // Strip the animation class so it doesn't re-run.
        return active ? [{...active, classes: 'slide active'}] : [];
      });
    }, 1000); // Must match CSS animation duration
  };

  // Autoplay effect, separated from other logic.
  useEffect(() => {
    if (autoplayTimeoutRef.current) clearTimeout(autoplayTimeoutRef.current);
    if (isPlaying && slides.length > 1 && duration > 0) {
      autoplayTimeoutRef.current = setTimeout(() => {
        const newIndex = (currentIndex + 1) % slides.length;
        runTransition(newIndex);
      }, duration * 1000);
    }
    return () => {
      if (autoplayTimeoutRef.current) clearTimeout(autoplayTimeoutRef.current);
    };
  }, [currentIndex, isPlaying, duration, slides]);

  // Cleanup all timeouts on component unmount.
  useEffect(() => {
    return () => {
      if (autoplayTimeoutRef.current) clearTimeout(autoplayTimeoutRef.current);
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
      if (progressAnimationRef.current) cancelAnimationFrame(progressAnimationRef.current);
    }
  }, []);
  
  if (slides.length === 0) {
    return (
      <div className={`w-full bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-500 ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
        Các hình ảnh được tạo của bạn sẽ xuất hiện ở đây.
      </div>
    );
  }

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
    runTransition(newIndex);
    setIsPlaying(false);
  };

  const goToNext = () => {
    const newIndex = (currentIndex + 1) % slides.length;
    runTransition(newIndex);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleProgressClick = (index: number) => {
    if (index !== currentIndex) {
      runTransition(index);
      setIsPlaying(false);
    }
  };
  
  return (
    <div className="relative group">
      <div className={`w-full overflow-hidden bg-slate-800 rounded-lg shadow-lg relative ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
        {transitionState.map(({ slide, classes }) => (
          <div
            key={slide.imageUrl} // Use stable image URL as key
            className={classes}
            style={{ backgroundImage: `url(${slide.imageUrl})` }}
          />
        ))}
      </div>

      {/* Controls */}
      {slides.length > 1 && (
        <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className='absolute inset-0 bg-black/20'></div>
          <button onClick={goToPrevious} className="relative z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <button onClick={goToNext} className="relative z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white">
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent">
        {slides.length > 1 && (
          <div className="w-full h-1.5 flex items-center gap-1 cursor-pointer mb-3">
            {slides.map((_, index) => (
              <div
                key={index}
                onClick={() => handleProgressClick(index)}
                className="flex-1 h-full bg-white/30 rounded-full overflow-hidden"
                role="button"
                aria-label={`Go to slide ${index + 1}`}
              >
                <div 
                  className="h-full bg-white rounded-full"
                  style={{ 
                    width: index < currentIndex ? '100%' : (index === currentIndex ? `${progress}%` : '0%'),
                    transition: index === currentIndex ? 'width 50ms linear' : 'none'
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={togglePlay} className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white">
            {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
          </button>
          <div className="text-white text-sm bg-black/50 px-2 py-1 rounded-md">
            {currentIndex + 1} / {slides.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Slideshow;