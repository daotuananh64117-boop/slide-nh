export type AspectRatio = '16:9' | '9:16';

export interface Scene {
  image_prompt: string;
  caption: string;
}

export interface Slide {
  imageUrl: string;
  caption: string;
}