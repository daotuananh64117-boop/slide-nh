import React, { useState, useEffect, useRef } from 'react';
import { Slide, AspectRatio, TransitionEffect } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon, ExclamationTriangleIcon } from './Icons';

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

const SlideContent: React.FC<{ slide: Slide }> = ({ slide }) => {
  if (slide.error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-slate-800/80">
        <ExclamationTriangleIcon className="w-12 h-12 mb-2 text-red-400" />
        <p className="font-semibold text-red-300">{slide.error}</p>
        <p className="text-sm text-red-400/80 mt-2 max-w-full truncate">Cảnh: "{slide.text}"</p>
      </div>
    );
  }

  if (!slide.imageUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-800/80">
        <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {slide.statusText && <p className="text-sm text-slate-300 mt-4 text-center max-w-xs">{slide.statusText}</p>}
      </div>
    );
  }
  
  // Chỉ hiển thị lớp phủ văn bản nếu hình ảnh được tải thành công
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-white text-base md:text-lg text-center font-semibold drop-shadow-md">{slide.text}</p>
    </div>
  );
};


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

    if (slides.length > 0) {
      // If there's no active slide yet, initialize with the first one.
      if (transitionState.length === 0) {
        setTransitionState([{ slide: slides[0], classes: 'slide active' }]);
      } else {
        // Otherwise, update the slide data in the transition state in case imageURLs loaded in.
        setTransitionState(current => 
          current.map(ts => {
            const updatedSlide = slides.find(s => s.id === ts.slide.id);
            return updatedSlide ? { ...ts, slide: updatedSlide } : ts;
          })
        );
      }
    } else {
      setTransitionState([]);
    }
    
    // Only reset index if it's out of bounds
    if (currentIndex >= slides.length) {
        setCurrentIndex(0);
    }
    
  }, [slides]);

  // Effect for progress bar animation.
  useEffect(() => {
    if (progressAnimationRef.current) {
      cancelAnimationFrame(progressAnimationRef.current);
    }
    
    const currentSlide = slides[currentIndex];
    const canPlay = isPlaying && duration > 0 && slides.length > 0 && currentSlide && currentSlide.imageUrl;

    if (canPlay) {
      slideStartTimeRef.current = performance.now() - (progress / 100) * (duration * 1000);
      
      const animateProgress = (timestamp: number) => {
        const elapsed = timestamp - slideStartTimeRef.current;
        const newProgress = Math.min(100, (elapsed / (duration * 1000)) * 100);
        setProgress(newProgress);

        if (newProgress < 100) {
          progressAnimationRef.current = requestAnimationFrame(animateProgress);
        }
      };
      progressAnimationRef.current = requestAnimationFrame(animateProgress);
    } else if (!isPlaying) {
      // Don't reset to 0, just pause the animation
      if (progressAnimationRef.current) cancelAnimationFrame(progressAnimationRef.current);
    } else {
       setProgress(0);
    }

    return () => {
      if (progressAnimationRef.current) {
        cancelAnimationFrame(progressAnimationRef.current);
      }
    };
  }, [isPlaying, currentIndex, duration, slides]);
  
  const runTransition = (newIndex: number) => {
    const oldIndex = currentIndex;
    const currentSlide = slides[oldIndex];
    const nextSlide = slides[newIndex];

    if (newIndex === oldIndex || slides.length < 2 || !currentSlide || !nextSlide) return;
    
    if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    if (autoplayTimeoutRef.current) clearTimeout(autoplayTimeoutRef.current);
    if (progressAnimationRef.current) cancelAnimationFrame(progressAnimationRef.current);
    setProgress(0);

    const transitionEffect = slides[newIndex].transition;
    const { in: inClass, out: outClass } = getTransitionClasses(transitionEffect);
    
    setTransitionState(currentState => {
        const currentActive = currentState.find(s => s.classes.includes('active'));
        if (!currentActive) {
           return [{ slide: slides[newIndex], classes: `slide active ${inClass}` }];
        }

        const previous = { ...currentActive, classes: `slide previous ${outClass}` };
        const next = { slide: slides[newIndex], classes: `slide active ${inClass}` };
        
        return [previous, next];
    });

    setCurrentIndex(newIndex);

    cleanupTimeoutRef.current = setTimeout(() => {
      setTransitionState(currentState => {
        const active = currentState.find(s => s.classes.includes('active'));
        return active ? [{...active, classes: 'slide active'}] : [];
      });
    }, 1000);
  };

  // Autoplay effect
  useEffect(() => {
    if (autoplayTimeoutRef.current) clearTimeout(autoplayTimeoutRef.current);
    
    const currentSlide = slides[currentIndex];
    const canPlay = isPlaying && slides.length > 1 && duration > 0 && currentSlide && currentSlide.imageUrl;

    if (canPlay) {
      autoplayTimeoutRef.current = setTimeout(() => {
        const newIndex = (currentIndex + 1) % slides.length;
        runTransition(newIndex);
      }, (duration * 1000) * (1 - progress / 100)); // Account for current progress
    }
    return () => {
      if (autoplayTimeoutRef.current) clearTimeout(autoplayTimeoutRef.current);
    };
  }, [currentIndex, isPlaying, duration, slides, progress]);

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
    // Cannot play if the current slide has an error or is loading
    const currentSlide = slides[currentIndex];
    if (!currentSlide || !currentSlide.imageUrl) return;
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
            key={slide.id}
            className={classes}
            style={{ 
              backgroundImage: slide.imageUrl ? `url(${slide.imageUrl})` : 'none',
              backgroundColor: '#1e293b'
            }}
          >
            <SlideContent slide={slide} />
          </div>
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
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                onClick={() => handleProgressClick(index)}
                className="flex-1 h-full bg-white/30 rounded-full overflow-hidden"
                role="button"
                aria-label={`Go to slide ${index + 1}`}
              >
                <div 
                  className={`h-full rounded-full ${slide.error ? 'bg-red-500' : 'bg-white'}`}
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
          <button onClick={togglePlay} disabled={!slides[currentIndex]?.imageUrl} className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed">
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
