export type AspectRatio = '16:9' | '9:16';
export type TransitionEffect = 'fade' | 'slide-left' | 'zoom-in';

export interface Scene {
  description: string;
}

export interface Slide {
  imageUrl: string;
  transition: TransitionEffect;
  text: string;
}
