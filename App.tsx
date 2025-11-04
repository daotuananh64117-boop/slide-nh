import React, { useState } from 'react';
import ScriptInput from './components/ScriptInput';
import Slideshow from './components/Slideshow';
import { FilmIcon, DownloadIcon } from './components/Icons';
import { AspectRatio, Slide, Scene } from './types';
import { generateScenesFromScript, generateImageForScene } from './services/geminiService';

const App: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState(60); // Default to 60 seconds (1 minute)
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
      const placeholderSlides = scenes.map(() => ({
        imageUrl: '',
      }));
      setSlides(placeholderSlides);

      // 3. Generate images for all scenes in parallel
      const imageGenerationPromises = scenes.map((scene, index) =>
        generateImageForScene(scene.image_prompt, aspectRatio)
          .then(imageUrl => {
            setSlides(prevSlides => {
              const newSlides = [...prevSlides];
              newSlides[index] = { imageUrl };
              return newSlides;
            });
          })
          .catch(imageError => {
            console.error(`Failed to generate image for scene ${index}:`, imageError);
            // The slide for this index will remain a placeholder, showing the loading spinner.
          })
      );

      await Promise.allSettled(imageGenerationPromises);

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
      
      let fileExtension = 'mp4';
      let mimeType = 'video/mp4; codecs=avc1.42E01E';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.warn(`${mimeType} not supported, falling back to vp9.`);
          mimeType = 'video/webm; codecs=vp9';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            console.warn(`${mimeType} not supported, falling back to vp8.`);
            mimeType = 'video/webm; codecs=vp8';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              throw new Error("Không có loại MIME video nào được hỗ trợ (mp4/webm vp9/webm vp8) để ghi.");
            }
          }
          fileExtension = 'webm';
      }
  
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
  
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
  
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trinh-chieu.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
      };
  
      recorder.start();
      
      // FIX: Removed shadowed slideDuration variable. The loop below will use the one from the component scope.
  
      for (const slide of slides) {
        const image = new Image();
        image.crossOrigin = "anonymous";
        const imageLoaded = new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = reject;
        });
        image.src = slide.imageUrl;
        await imageLoaded;
  
        // Draw image while maintaining aspect ratio
        ctx.fillStyle = '#000'; // Black background for letterboxing
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const hRatio = canvas.width / image.width;
        const vRatio = canvas.height / image.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (canvas.width - image.width * ratio) / 2;
        const centerShiftY = (canvas.height - image.height * ratio) / 2;  

        ctx.drawImage(image, 0, 0, image.width, image.height,
                      centerShiftX, centerShiftY, image.width * ratio, image.height * ratio);
  
        await new Promise(resolve => setTimeout(resolve, slideDuration * 1000));
      }
  
      recorder.stop();
  
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi tạo video.");
      setIsDownloading(false);
    }
  };

  const slideDuration = slides.length > 0 ? totalDuration / slides.length : 0;

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
              duration={totalDuration}
              onDurationChange={setTotalDuration}
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
            <Slideshow slides={slides} duration={slideDuration} aspectRatio={aspectRatio} />
            {slides.length > 0 && !isLoading && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || slides.some(s => !s.imageUrl)}
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
                      Tải về video
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