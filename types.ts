export type AspectRatio = '16:9' | '9:16';
export type TransitionEffect = 'fade' | 'slide-left' | 'zoom-in';

export interface Scene {
  description: string;
}

export interface Slide {
  id: string;
  imageUrl: string;
  transition: TransitionEffect;
  text: string;
  error?: string;
}