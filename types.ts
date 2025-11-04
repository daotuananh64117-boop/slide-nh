// FIX: Removed self-import which caused declaration conflicts.

export type AspectRatio = '16:9' | '9:16';
export type TransitionEffect = 'fade' | 'slide-left' | 'zoom-in';

export interface Scene {
  description: string;
}

export interface Slide {
  id: string;
  imageUrl: string | null; // Null khi đang tải
  transition: TransitionEffect;
  text: string;
  error?: string; // Để lưu trữ thông báo lỗi nếu tải thất bại
  statusText?: string; // Để hiển thị trạng thái tạm thời như "AI đang tìm kiếm..."
}
