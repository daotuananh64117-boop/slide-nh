import React, { useState } from 'react';
import ScriptInput from './components/ScriptInput';
import Slideshow from './components/Slideshow';
import { FilmIcon, DownloadIcon } from './components/Icons';
import { AspectRatio, Slide, TransitionEffect, Scene } from './types';
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
      // 1. Gọi AI của Gemini để phân tích kịch bản và tạo cảnh
      const scenes: Scene[] = await generateScenesFromScript(script);

      if (scenes.length === 0) {
        throw new Error("Không thể tạo cảnh nào. Vui lòng thử một kịch bản khác.");
      }
      
      const transitions: TransitionEffect[] = ['fade', 'slide-left', 'zoom-in'];

      // 2. Tạo cấu trúc slide ban đầu không có hình ảnh
      const initialSlides: Slide[] = scenes.map((scene, index) => ({
        id: `slide-${index}-${Date.now()}`,
        imageUrl: '', // Ban đầu trống, sẽ được điền vào dần dần
        text: scene.description,
        transition: transitions[Math.floor(Math.random() * transitions.length)],
      }));
      
      setSlides(initialSlides);
      setIsLoading(false); // Dừng tải chính, hiển thị các slide trống

      // 3. Tạo hình ảnh cho mỗi slide trong nền
      scenes.forEach(async (scene, index) => {
        try {
          const imageUrl = await generateImageForScene(scene.description);
          setSlides(prevSlides => 
            prevSlides.map((slide, i) => 
              i === index ? { ...slide, imageUrl, error: undefined } : slide
            )
          );
        } catch (imageError: any) {
          console.error(`Không thể tạo hình ảnh cho slide ${index + 1}:`, imageError);
          // Cập nhật slide cụ thể để hiển thị trạng thái lỗi
          setSlides(prevSlides => 
            prevSlides.map((slide, i) => 
              i === index ? { ...slide, imageUrl: 'error', error: imageError.message } : slide
            )
          );
        }
      });

    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không mong muốn.');
      setIsLoading(false); // Cũng dừng tải khi có lỗi ban đầu
    }
  };

  const handleDownload = async () => {
    if (slides.length === 0 || slides.some(s => !s.imageUrl || s.imageUrl === 'error')) {
      setError("Vui lòng đợi tất cả hình ảnh được tạo xong và không có lỗi trước khi tải về.");
      return;
    }
    setIsDownloading(true);
    setError(null);

    const TRANSITION_DURATION = 1.0; // in seconds
    const slideDuration = slides.length > 0 
      ? (totalDuration - (slides.length - 1) * TRANSITION_DURATION) / slides.length
      : 0;

    if (slideDuration <= 0) {
      setError(`Tổng thời lượng quá ngắn cho ${slides.length} slide và các hiệu ứng chuyển cảnh. Vui lòng tăng thời lượng.`);
      setIsDownloading(false);
      return;
    }
  
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

      const loadImage = (src: string): Promise<HTMLImageElement> => {
          return new Promise((resolve, reject) => {
              const img = new Image();
              // For base64 URLs, we don't need CORS or cache busting
              if (!src.startsWith('data:')) {
                  img.crossOrigin = "anonymous";
              }
              img.onload = () => resolve(img);
              img.onerror = () => reject(new Error(`Không thể tải hình ảnh.`));
              img.src = src;
          });
      };

      const drawImageFit = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, scale = 1, offsetX = 0, offsetY = 0) => {
          const canvas = ctx.canvas;
          const hRatio = canvas.width / img.width;
          const vRatio = canvas.height / img.height;
          const ratio = Math.max(hRatio, vRatio) * scale;
          const centerShiftX = (canvas.width - img.width * ratio) / 2;
          const centerShiftY = (canvas.height - img.height * ratio) / 2;
          ctx.drawImage(img, 0, 0, img.width, img.height,
                        centerShiftX + offsetX, centerShiftY + offsetY, img.width * ratio, img.height * ratio);
      };
        
      let fileExtension = 'mp4';
      let mimeType = 'video/mp4; codecs=avc1.42E01E';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm; codecs=vp9';
          fileExtension = 'webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm; codecs=vp8';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              throw new Error("Không có loại MIME video nào được hỗ trợ (mp4/webm vp9/webm vp8) để ghi.");
            }
          }
      }

      const stream = canvas.captureStream();
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3000000 });
      const chunks: Blob[] = [];
  
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
  
      await new Promise<void>(async (resolve, reject) => {
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
          resolve();
        };

        recorder.onerror = (event) => reject(new Error("Lỗi xảy ra trong quá trình ghi video."));
        
        try {
            const images = await Promise.all(slides.map(slide => loadImage(slide.imageUrl)));
            
            const totalVideoDurationMs = totalDuration * 1000;
            const slideDurationMs = slideDuration * 1000;
            const transitionDurationMs = TRANSITION_DURATION * 1000;
            const timePerSlideAndTransition = slideDurationMs + transitionDurationMs;

            const renderFrame = (elapsedTimeMs: number) => {
                const slideIndex = Math.min(images.length - 1, Math.floor(elapsedTimeMs / timePerSlideAndTransition));
                const timeIntoCurrentBlock = elapsedTimeMs - (slideIndex * timePerSlideAndTransition);
                const currentImage = images[slideIndex];

                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (slideIndex === images.length - 1 || timeIntoCurrentBlock <= slideDurationMs) {
                    const progress = Math.min(1, timeIntoCurrentBlock / slideDurationMs);
                    const scale = 1 + progress * 0.1; // Ken Burns effect
                    drawImageFit(ctx, currentImage, scale);
                } else {
                    const nextImage = images[slideIndex + 1];
                    const transition = slides[slideIndex + 1]?.transition;
                    const progress = (timeIntoCurrentBlock - slideDurationMs) / transitionDurationMs;
                    const previousImage = currentImage;

                    switch (transition) {
                        case 'fade':
                            ctx.globalAlpha = 1 - progress;
                            drawImageFit(ctx, previousImage, 1.1);
                            ctx.globalAlpha = progress;
                            drawImageFit(ctx, nextImage, 1);
                            ctx.globalAlpha = 1;
                            break;
                        case 'slide-left':
                            const moveX = canvas.width * progress;
                            drawImageFit(ctx, previousImage, 1.1, -moveX);
                            drawImageFit(ctx, nextImage, 1, canvas.width - moveX);
                            break;
                        case 'zoom-in':
                            drawImageFit(ctx, previousImage, 1.1);
                            ctx.globalAlpha = progress;
                            drawImageFit(ctx, nextImage, 0.5 + progress * 0.5);
                            ctx.globalAlpha = 1;
                            break;
                        default:
                            drawImageFit(ctx, previousImage, 1.1);
                            break;
                    }
                }
            };
            
            recorder.start();
            
            const FRAME_RATE = 30; // Giảm tốc độ khung hình để tăng hiệu suất
            const FRAME_DURATION_MS = 1000 / FRAME_RATE;
            let virtualTimeMs = 0;

            // Vòng lặp render chính xác hơn
            while (virtualTimeMs < totalVideoDurationMs) {
                renderFrame(virtualTimeMs);
                virtualTimeMs += FRAME_DURATION_MS;

                // Tạm dừng để event loop chạy, tránh làm treo trình duyệt
                if (Math.round(virtualTimeMs) % 250 < FRAME_DURATION_MS) {
                    await new Promise(r => setTimeout(r, 0));
                }
            }
            
            // Render khung hình cuối cùng để đảm bảo video có đủ thời lượng
            renderFrame(totalVideoDurationMs);
            
            if (recorder.state === 'recording') {
                recorder.stop(); // onstop sẽ gọi resolve()
            }

        } catch(err) {
            reject(err);
        }
      });
  
    } catch (err: any) {
      console.error("Lỗi khi tạo video:", err);
      setError(err.message || "Đã xảy ra lỗi không mong muốn khi tạo video.");
      setIsDownloading(false);
    }
  };

  const previewSlideDuration = slides.length > 0 ? totalDuration / slides.length : 0;

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
            <Slideshow slides={slides} duration={previewSlideDuration} aspectRatio={aspectRatio} />
            {slides.length > 0 && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || slides.some(s => !s.imageUrl || s.imageUrl === 'error')}
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
          <p>Hình ảnh được tạo bởi AI của Google. Giao diện được lấy cảm hứng từ các công cụ tạo video AI khác nhau.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;