import React, { useState } from 'react';
import { generateScenesFromScript, generateImageFromPrompt } from './services/geminiService';
import { Slide as SlideType, Scene, AspectRatio } from './types';
import ScriptInput from './components/ScriptInput';
import Slideshow from './components/Slideshow';
import { FilmIcon, DownloadIcon } from './components/Icons';

const App: React.FC = () => {
  const [slides, setSlides] = useState<SlideType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [slideDuration, setSlideDuration] = useState<number>(5);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  const handleGenerate = async (script: string) => {
    if (!script.trim()) {
      setError('Kịch bản không được để trống.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSlides([]);
    setLoadingMessage('Đang phân tích kịch bản của bạn để tạo cảnh...');

    try {
      const scenes: Scene[] = await generateScenesFromScript(script);

      if (!scenes || scenes.length === 0) {
        throw new Error('Không thể tạo cảnh từ kịch bản được cung cấp.');
      }
      
      const generatedSlides: SlideType[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        setLoadingMessage(`Đang tạo ảnh ${i + 1} trên ${scenes.length}: "${scene.image_prompt.substring(0, 50)}..."`);
        
        const imageBase64 = await generateImageFromPrompt(scene.image_prompt, aspectRatio);
        const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
        
        const newSlide: SlideType = {
          imageUrl: imageUrl,
          caption: scene.caption,
        };

        generatedSlides.push(newSlide);
        setSlides([...generatedSlides]); 
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const drawSlideOnCanvas = (slide: SlideType, ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, width, height);

            const imgAspectRatio = img.width / img.height;
            const canvasAspectRatio = width / height;
            let drawWidth = width;
            let drawHeight = height;
            let x = 0;
            let y = 0;

            if (imgAspectRatio > canvasAspectRatio) {
                drawHeight = width / imgAspectRatio;
                y = (height - drawHeight) / 2;
            } else {
                drawWidth = height * imgAspectRatio;
                x = (width - drawWidth) / 2;
            }
            ctx.drawImage(img, x, y, drawWidth, drawHeight);

            const gradientHeight = Math.min(height * 0.4, 200);
            const gradient = ctx.createLinearGradient(0, height, 0, height - gradientHeight);
            gradient.addColorStop(0, 'rgba(0,0,0,0.8)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, height - gradientHeight, width, gradientHeight);
            
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const fontSize = Math.max(20, Math.min(width * 0.03, 36));
            ctx.font = `${fontSize}px "Segoe UI", sans-serif`;
            
            const text = slide.caption;
            const maxWidth = width * 0.9;
            const lines: string[] = [];
            let currentLine = '';
            const words = text.split(' ');
            
            for (const word of words) {
                const testLine = currentLine + word + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine !== '') {
                    lines.push(currentLine);
                    currentLine = word + ' ';
                } else {
                    currentLine = testLine;
                }
            }
            lines.push(currentLine);
            
            const lineHeight = fontSize * 1.2;
            const startY = height - (fontSize * 0.8);
            for (let i = lines.length - 1; i >= 0; i--) {
                ctx.fillText(lines[i].trim(), width / 2, startY - (lines.length - 1 - i) * lineHeight);
            }
            resolve();
        };
        img.onerror = (err) => reject(err);
        img.src = slide.imageUrl;
    });
  };

  const handleDownload = async () => {
    if (slides.length === 0 || isDownloading) return;
    setIsDownloading(true);
    setError(null);
    
    const [width, height] = aspectRatio === '16:9' ? [1280, 720] : [720, 1280];

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError("Không thể tạo canvas để xuất video.");
        setIsDownloading(false);
        return;
    }

    try {
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'trinh-chieu-truyen.webm';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsDownloading(false);
        };
        
        recorder.start();

        for(const slide of slides) {
            await drawSlideOnCanvas(slide, ctx, width, height);
            // Hold the frame for the specified duration
            await new Promise(resolve => setTimeout(resolve, slideDuration * 1000));
        }

        recorder.stop();
        
    } catch (err) {
      console.error("Video generation failed:", err);
      setError("Không thể xuất video. Vui lòng thử lại.");
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 font-sans flex flex-col">
      <header className="w-full p-4 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <FilmIcon className="w-8 h-8 text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Trình tạo slide truyện
          </h1>
        </div>
      </header>
      <main className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-semibold text-indigo-300">1. Viết kịch bản của bạn</h2>
            <p className="text-gray-400">
             Nhập câu chuyện, kịch bản hoặc chuỗi sự kiện của bạn vào bên dưới. AI sẽ chia nhỏ thành các cảnh riêng biệt, tạo phụ đề mô tả và tạo một hình ảnh độc đáo cho mỗi phần.
            </p>
            <ScriptInput 
              onGenerate={handleGenerate} 
              isLoading={isLoading} 
              duration={slideDuration} 
              onDurationChange={setSlideDuration}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
             />
          </div>
          <div className="flex flex-col gap-6">
             <h2 className="text-xl font-semibold text-indigo-300">2. Xem trình chiếu của bạn</h2>
            <div className="bg-slate-800 rounded-lg p-4 min-h-[400px] flex flex-col items-center justify-center border border-slate-700">
              {error && <div className="text-red-400 p-4 bg-red-900/20 rounded-md mb-4 self-stretch">{error}</div>}
              
              {isLoading && (
                <div className="flex flex-col items-center gap-4 text-center">
                   <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
                  <p className="text-lg font-medium text-indigo-300">Đang tạo trình chiếu...</p>
                  <p className="text-sm text-gray-400 max-w-sm">{loadingMessage}</p>
                </div>
              )}
              
              {!isLoading && slides.length > 0 && (
                <>
                  <Slideshow slides={slides} duration={slideDuration} aspectRatio={aspectRatio} />
                  <div className="mt-6">
                      <button
                          onClick={handleDownload}
                          disabled={isDownloading}
                          className="inline-flex items-center justify-center px-5 py-2.5 border border-slate-600 text-sm font-medium rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        {isDownloading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang tạo video...
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="w-5 h-5 mr-2" />
                                Tải video (.webm)
                            </>
                        )}
                      </button>
                  </div>
                </>
              )}
              
              {!isLoading && !error && slides.length === 0 && (
                <div className="text-center text-gray-500">
                  <FilmIcon className="w-16 h-16 mx-auto mb-4" />
                  <p>Trình chiếu của bạn sẽ xuất hiện ở đây.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full text-center p-4 text-xs text-slate-500 border-t border-slate-800">
        Hỗ trợ bởi Gemini API
      </footer>
    </div>
  );
};

export default App;