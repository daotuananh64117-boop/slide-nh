import React, { useState } from 'react';
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
  const [script, setScript] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(script);
  };
  
  const exampleScript = `Một phi hành gia trẻ tên Alex chuẩn bị cho sứ mệnh có người lái đầu tiên lên sao Hỏa. Tiếng đếm ngược vang vọng trong buồng lái. Tên lửa phóng lên, đẩy Alex vào ghế khi Trái Đất thu nhỏ bên dưới. Sau nhiều tháng di chuyển, hành tinh đỏ hiện ra lớn dần qua cửa sổ. Alex thực hiện bước đi lịch sử đầu tiên lên bề mặt sao Hỏa, cắm một lá cờ bên cạnh tàu đổ bộ. Nhìn lại chấm xanh nhỏ bé trên bầu trời, một cảm giác kỳ diệu và cô đơn bao trùm lấy họ.`;

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
              <label htmlFor="duration" className="text-sm text-gray-400">Thời lượng (giây):</label>
              <input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => onDurationChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                min="1"
                max="60"
                disabled={isLoading}
                className="w-16 bg-slate-800 border border-slate-600 rounded-md p-1.5 text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                aria-label="Thời lượng slide tính bằng giây"
              />
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