import React, { useState } from 'react';
import ScriptInput from './components/ScriptInput';
import Slideshow from './components/Slideshow';
import { FilmIcon, DownloadIcon } from './components/Icons';
import { AspectRatio, Slide, TransitionEffect, Scene } from './types';
import { parseScriptToScenes, getImageUrlForScene, generateSearchQueriesForScene } from './services/geminiService';

// Tiện ích tải ảnh với cơ chế thử lại, được điều chỉnh cho dịch vụ ảnh mới
const loadImageWithRetries = (src: string, retries: number = 2): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (retries > 0) {
        console.warn(`Không thể tải ảnh, đang thử lại... (${retries} lần thử còn lại)`);
        // Yêu cầu lại cùng một URL, tham số `?random` sẽ xử lý việc lấy ảnh mới.
        setTimeout(() => loadImageWithRetries(src, retries - 1).then(resolve).catch(reject), 500);
      } else {
        reject(new Error(`Không thể tải hình ảnh sau nhiều lần thử.`));
      }
    };
    img.src = src;
  });
};

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
      const scenes: Scene[] = parseScriptToScenes(script);

      if (scenes.length === 0) {
        throw new Error("Không thể tạo cảnh nào. Vui lòng thử một kịch bản khác.");
      }
      
      const transitions: TransitionEffect[] = ['fade', 'slide-left', 'zoom-in'];

      const initialSlides: Slide[] = scenes.map((scene, index) => ({
        id: `slide-${index}-${Date.now()}`,
        imageUrl: null,
        text: scene.description,
        transition: transitions[Math.floor(Math.random() * transitions.length)],
        statusText: 'Đang chuẩn bị...',
      }));
      
      setSlides(initialSlides);

      const imageLoadPromises = initialSlides.map(async (slide) => {
        try {
          // Lần thử 1: Tải trực tiếp dựa trên văn bản gốc
          setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, statusText: 'Đang tìm ảnh...' } : s));
          const initialImageUrl = getImageUrlForScene(slide.text, aspectRatio);
          const loadedImage = await loadImageWithRetries(initialImageUrl);
          setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, imageUrl: loadedImage.src, error: undefined, statusText: undefined } : s));
        } catch (err) {
          console.warn(`Lần thử 1 thất bại cho "${slide.text}". Đang dùng AI để tìm kiếm nâng cao.`);
          try {
            // Lần thử 2: Tạo truy vấn tìm kiếm kiểu Google bằng AI và thử lại
            setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, statusText: 'AI đang phân tích cảnh...' } : s));
            const newSearchQueries = await generateSearchQueriesForScene(slide.text);
            
            setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, statusText: `AI đang tìm: "${newSearchQueries}"` } : s));

            const rewrittenImageUrl = getImageUrlForScene(slide.text, aspectRatio, newSearchQueries);
            const loadedImage = await loadImageWithRetries(rewrittenImageUrl);
            setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, imageUrl: loadedImage.src, error: undefined, statusText: undefined } : s));
          } catch (rewriteErr) {
            console.warn(`Lần thử 2 (với truy vấn AI) thất bại cho "${slide.text}". Sử dụng ảnh dự phòng.`);
            try {
              // Lần thử 3: Sử dụng từ khóa chung, trung tính làm giải pháp cuối cùng
              setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, statusText: 'Đang tìm ảnh dự phòng...' } : s));
              const genericKeywords = 'abstract,texture,nature,background,pattern';
              const genericImageUrl = getImageUrlForScene('fallback', aspectRatio, genericKeywords);
              const genericLoadedImage = await loadImageWithRetries(genericImageUrl);

              setSlides(prev => 
                prev.map(s => s.id === slide.id ? { ...s, imageUrl: genericLoadedImage.src, error: undefined, statusText: undefined } : s)
              );
            } catch (genericErr) {
              console.error(`Tất cả các lần thử tải ảnh đều thất bại cho "${slide.text}".`, genericErr);
              setSlides(prev => 
                prev.map(s => s.id === slide.id ? { ...s, error: "Không thể tải ảnh.", statusText: undefined } : s)
              );
            }
          }
        }
      });
      // Đợi tất cả các nỗ lực tải ảnh được giải quyết
      await Promise.allSettled(imageLoadPromises);

    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không mong muốn.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    const validSlides = slides.filter(s => s.imageUrl);
    if (validSlides.length === 0) {
      setError("Không có slide hợp lệ nào để tải về.");
      return;
    }
     if (validSlides.length !== slides.length) {
      setError("Một số hình ảnh không thể tải. Vui lòng thử tạo lại trước khi tải về.");
      return;
    }

    setIsDownloading(true);
    setError(null);

    const FRAME_RATE = 30;
    const TRANSITION_DURATION = 1.0; // giây

    // Tính toán thời lượng thực tế dựa trên khung hình để đảm bảo độ chính xác
    const totalFrames = Math.round(totalDuration * FRAME_RATE);
    const actualTotalDuration = totalFrames / FRAME_RATE;
    
    const minDurationForTransitions = (validSlides.length > 1) ? (validSlides.length - 1) * TRANSITION_DURATION : 0;
    if (actualTotalDuration <= minDurationForTransitions) {
        setError(`Tổng thời lượng quá ngắn cho ${validSlides.length} slide. Cần ít nhất ${minDurationForTransitions.toFixed(1)} giây cho các hiệu ứng chuyển cảnh. Vui lòng tăng thời lượng.`);
        setIsDownloading(false);
        return;
    }
    const slideDuration = (actualTotalDuration - minDurationForTransitions) / validSlides.length;
  
    try {
      const canvas = document.createElement('canvas');
      const aspectRatioParts = aspectRatio.split(':').map(Number);
      const canvasWidth = 1280;
      const canvasHeight = Math.round((canvasWidth * aspectRatioParts[1]) / aspectRatioParts[0]);
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
  
      if (!ctx) {
        throw new Error("Không thể tạo video. Canvas context không được hỗ trợ.");
      }

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

      const stream = canvas.captureStream(FRAME_RATE);
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
            const images = await Promise.all(validSlides.map(slide => loadImageWithRetries(slide.imageUrl!)));
            
            // Tính toán dòng thời gian dựa trên khung hình chính xác
            const transitionFrames = Math.round(TRANSITION_DURATION * FRAME_RATE);
            const slideFrames = Math.round(slideDuration * FRAME_RATE);
            
            const frameTimeline: any[] = [];
            let currentFrame = 0;
            for (let i = 0; i < validSlides.length; i++) {
                frameTimeline.push({ type: 'slide', index: i, startFrame: currentFrame, endFrame: currentFrame + slideFrames });
                currentFrame += slideFrames;
                if (i < validSlides.length - 1) {
                    frameTimeline.push({ type: 'transition', fromIndex: i, toIndex: i + 1, startFrame: currentFrame, endFrame: currentFrame + transitionFrames });
                    currentFrame += transitionFrames;
                }
            }
            if (frameTimeline.length > 0) {
              frameTimeline[frameTimeline.length - 1].endFrame = totalFrames;
            }
            
            recorder.start();
            
            for (let i = 0; i < totalFrames; i++) {
                const event = frameTimeline.find(e => i >= e.startFrame && i < e.endFrame);
                
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (event) {
                    if (event.type === 'slide') {
                        const progress = (i - event.startFrame) / (event.endFrame - event.startFrame);
                        const scale = 1 + progress * 0.1; // Ken Burns
                        drawImageFit(ctx, images[event.index], scale);
                    } else if (event.type === 'transition') {
                        const progress = (i - event.startFrame) / (event.endFrame - event.startFrame);
                        const fromImage = images[event.fromIndex];
                        const toImage = images[event.toIndex];
                        const transition = validSlides[event.toIndex]?.transition;

                        switch (transition) {
                            case 'fade':
                                ctx.globalAlpha = 1 - progress;
                                drawImageFit(ctx, fromImage, 1.1);
                                ctx.globalAlpha = progress;
                                drawImageFit(ctx, toImage, 1);
                                ctx.globalAlpha = 1;
                                break;
                            case 'slide-left':
                                const moveX = canvas.width * progress;
                                drawImageFit(ctx, fromImage, 1.1, -moveX);
                                drawImageFit(ctx, toImage, 1, canvas.width - moveX);
                                break;
                            case 'zoom-in':
                                drawImageFit(ctx, fromImage, 1.1);
                                ctx.globalAlpha = progress;
                                drawImageFit(ctx, toImage, 0.5 + progress * 0.5);
                                ctx.globalAlpha = 1;
                                break;
                            default:
                                drawImageFit(ctx, fromImage, 1.1);
                                break;
                        }
                    }
                } else if (i >= totalFrames - 1 && images.length > 0) {
                     drawImageFit(ctx, images[images.length - 1], 1.1);
                }

                if (i % 10 === 0) {
                    await new Promise(r => setTimeout(r, 0));
                }
            }
            
            if (recorder.state === 'recording') {
                recorder.stop();
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
  
  const areAllImagesLoaded = slides.length > 0 && slides.every(s => s.imageUrl);

  const previewSlideDuration = slides.length > 0 ? totalDuration / slides.length : 0;

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
            <FilmIcon className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
              Trình tạo trình chiếu
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
                  disabled={isDownloading || !areAllImagesLoaded}
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
                 {!areAllImagesLoaded && !isDownloading && (
                    <p className="text-sm text-slate-400 mt-2">Đang tải hình ảnh, vui lòng đợi...</p>
                 )}
              </div>
            )}
          </div>
        </main>
        
        <footer className="text-center mt-12 text-slate-500 text-sm">
          <p>Hình ảnh được cung cấp miễn phí bởi Unsplash. Giao diện được lấy cảm hứng từ các công cụ tạo video AI khác nhau.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
