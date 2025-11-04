import React from 'react';
import { SparklesIcon, LandscapeIcon, PortraitIcon } from './Icons';
import { AspectRatio } from '../types';

interface ScriptInputProps {
  onGenerate: (script: string) => void;
  isLoading: boolean;
  duration: number;
  onDurationChange: (duration: number) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
}

const ScriptInput: React.FC<ScriptInputProps> = ({ 
  onGenerate, 
  isLoading, 
  duration, 
  onDurationChange,
  aspectRatio,
  onAspectRatioChange,
}) => {
  const [script, setScript] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(script);
  };
  
  const exampleScript = `Mặt trời mọc trên những ngọn núi sương mù. Một nhà thám hiểm dũng cảm bắt đầu cuộc hành trình vào một khu rừng rậm rạp. Dòng sông chảy xiết chắn ngang con đường. Sau khi vượt qua, họ phát hiện ra một tàn tích cổ xưa ẩn sau một thác nước. Bên trong, những bức tường được bao phủ bởi những hình khắc phát sáng. Nhà thám hiểm tìm thấy một chiếc la bàn bí ẩn ở trung tâm.`;

  // Derived state from duration prop
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newMinutes = parseInt(e.target.value, 10);
    if (isNaN(newMinutes)) newMinutes = 0;

    // Clamp and validate
    if (newMinutes > 60) newMinutes = 60;
    if (newMinutes < 0) newMinutes = 0;

    let newSeconds = seconds;
    // If user sets 60 mins, seconds must be 0.
    if (newMinutes === 60) {
        newSeconds = 0;
    }

    const totalSeconds = newMinutes * 60 + newSeconds;
    onDurationChange(Math.max(1, totalSeconds));
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newSeconds = parseInt(e.target.value, 10);
      if (isNaN(newSeconds)) newSeconds = 0;

      // Clamp and validate
      if (newSeconds > 59) newSeconds = 59;
      if (newSeconds < 0) newSeconds = 0;
      
      // If minutes is already 60, don't allow seconds to be > 0.
      if (minutes === 60) {
        newSeconds = 0;
      }
      
      const totalSeconds = minutes * 60 + newSeconds;
      onDurationChange(Math.max(1, totalSeconds));
  };


  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="ví dụ: Một hiệp sĩ dũng cảm tiến vào khu rừng tối..."
        className="w-full h-48 p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-200 resize-none text-gray-300 placeholder-gray-500"
        disabled={isLoading}
      />
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <button 
          type="button" 
          onClick={() => setScript(exampleScript)}
          disabled={isLoading}
          className="text-sm text-indigo-400 hover:text-indigo-300 self-start transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
          Thử ví dụ
        </button>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-600 rounded-md p-1">
                <button type="button" onClick={() => onAspectRatioChange('16:9')} disabled={isLoading} className={`p-1.5 rounded-sm transition-colors ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-slate-700'}`} aria-label="Ngang 16:9">
                    <LandscapeIcon className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => onAspectRatioChange('9:16')} disabled={isLoading} className={`p-1.5 rounded-sm transition-colors ${aspectRatio === '9:16' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-slate-700'}`} aria-label="Dọc 9:16">
                    <PortraitIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="duration_min" className="text-sm text-gray-400">Thời lượng:</label>
              <div className="flex items-center bg-slate-800 border border-slate-600 rounded-md focus-within:ring-2 focus-within:ring-indigo-500">
                <input
                  type="number"
                  id="duration_min"
                  value={minutes}
                  onChange={handleMinutesChange}
                  min="0"
                  max="60"
                  disabled={isLoading}
                  className="w-10 bg-transparent text-center p-1.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Thời lượng slide tính bằng phút"
                />
                <span className="text-gray-500 -mx-1">:</span>
                <input
                  type="number"
                  id="duration_sec"
                  value={seconds}
                  onChange={handleSecondsChange}
                  min="0"
                  max="59"
                  disabled={isLoading}
                  className="w-10 bg-transparent text-center p-1.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Thời lượng slide tính bằng giây"
                />
              </div>
            </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:bg-indigo-500/50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang xử lý...
          </>
        ) : (
          <>
            <SparklesIcon className="w-5 h-5 mr-2" />
            Tạo trình chiếu
          </>
        )}
      </button>
    </form>
  );
};

export default ScriptInput;