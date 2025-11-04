import React, { useState } from 'react';
import ScriptInput from './components/ScriptInput';
import Slideshow from './components/Slideshow';
import { FilmIcon, DownloadIcon } from './components/Icons';
import { AspectRatio, Slide, Scene } from './types';
import { generateScenesFromScript, generateImageForScene } from './services/geminiService';

function App() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(60); // Default to 60 seconds (1 minute)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleGenerate = async (script: string) => {
    if (!script.trim()) {
      setError("Vui lòng nhập một kịch bản.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSlides([]);

    try {
      // 1. Generate scenes from the script
      const scenes: Scene[] = await generateScenesFromScript(script);
      
      if (!scenes || scenes.length === 0) {
        throw new Error("Không thể tạo cảnh nào từ kịch bản được cung cấp.");
      }

      // 2. Create placeholder slides
      const placeholderSlides = scenes.map(scene => ({
        imageUrl: '',
        caption: scene.caption
      }));
      setSlides(placeholderSlides);

      // 3. Generate image for each scene one by one and update the slide
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        try {
            const imageUrl = await generateImageForScene(scene.image_prompt, aspectRatio);
            setSlides(prevSlides => {
              const newSlides = [...prevSlides];
              newSlides[i] = { ...newSlides[i], imageUrl };
              return newSlides;
            });
        } catch (imageError) {
            console.error(`Failed to generate image for scene ${i}:`, imageError);
            // We can decide to show a broken image or skip this slide.
            // For now, we'll just leave it without an image.
        }
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không mong muốn.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (slides.length === 0 || slides.some(s => !s.imageUrl)) {
      setError("Vui lòng đợi tất cả hình ảnh được tạo xong trước khi tải về.");
      return;
    }
    setIsDownloading(true);
    setError(null);
  
    try {
      const canvas = document.createElement('canvas');
      const aspectRatioParts = aspectRatio.split(':').map(Number);
      const canvasWidth = 1280; // Standard HD width
      const canvasHeight = Math.round((canvasWidth * aspectRatioParts[1]) / aspectRatioParts[0]);
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
  
      if (!ctx) {
        throw new Error("Không thể tạo video. Canvas context không được hỗ trợ.");
      }
  
      const stream = canvas.captureStream(30); // 30 FPS
      
      const options = { mimeType: 'video/mp4; codecs=avc1' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.warn('video/mp4; codecs=avc1 not supported, falling back to webm.');
          options.mimeType = 'video/webm; codecs=vp9';
      }
  
      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
  
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
  
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'trinh-chieu.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
      };
  
      recorder.start();
  
      for (const slide of slides) {
        const image = new Image();
        image.crossOrigin = "anonymous";
        const imageLoaded = new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
        image.src = slide.imageUrl;
        await imageLoaded;
  
        // Draw image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
        // Draw caption overlay (gradient)
        const gradientHeight = Math.min(canvas.height * 0.4, 150);
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - gradientHeight);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);
  
        // Draw caption text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        const fontSize = Math.max(16, canvas.width / 45);
        ctx.font = `500 ${fontSize}px sans-serif`;
        
        const words = slide.caption.split(' ');
        let line = '';
        const lines = [];
        const maxWidth = canvas.width * 0.9;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
  
        const lineHeight = fontSize * 1.3;
        const startY = canvas.height - (lines.length * lineHeight) - (fontSize * 0.8);
  
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i].trim(), canvas.width / 2, startY + (i * lineHeight));
        }
  
        await new Promise(resolve => setTimeout(resolve, duration * 1000));
      }
  
      recorder.stop();
  
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi tạo video.");
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
            <FilmIcon className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
              Trình tạo trình chiếu AI
            </h1>
          </div>
          <p className="mt-3 text-lg text-slate-400">
            Biến kịch bản của bạn thành một trình chiếu trực quan tuyệt đẹp.
          </p>
        </header>

        <main className="max-w-2xl mx-auto">
          <div className="bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-700">
            <ScriptInput 
              onGenerate={handleGenerate} 
              isLoading={isLoading}
              duration={duration}
              onDurationChange={setDuration}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
            />
          </div>

          {error && (
            <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md text-center">
              {error}
            </div>
          )}

          <div className="mt-8">
            <Slideshow slides={slides} duration={duration} aspectRatio={aspectRatio} />
            {slides.length > 0 && !isLoading && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 disabled:bg-green-500/50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isDownloading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang tạo video...
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-5 h-5 mr-2" />
                      Tải về video (.mp4)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </main>
        
        <footer className="text-center mt-12 text-slate-500 text-sm">
          <p>Được cung cấp bởi API Google Gemini. Giao diện được lấy cảm hứng từ các công cụ tạo video AI khác nhau.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;