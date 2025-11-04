import { GoogleGenAI, Type } from "@google/genai";
import { Scene, AspectRatio } from '../types';

// The API key is sourced from `process.env.API_KEY` and is assumed to be available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a list of scenes with image prompts and captions from a script.
 */
export async function generateScenesFromScript(script: string): Promise<Scene[]> {
  // Use gemini-2.5-flash for efficient text processing and JSON generation.
  const model = 'gemini-2.5-flash';

  const prompt = `Phân tích kịch bản sau đây và chia nó thành một chuỗi các cảnh. Đối với mỗi cảnh, hãy tạo một lời nhắc hình ảnh chi tiết để tạo hình ảnh và một chú thích ngắn gọn.
  
Kịch bản:
"${script}"

Trả lời ở định dạng JSON là một mảng các đối tượng, mỗi đối tượng có các khóa "image_prompt" và "caption". Lời nhắc hình ảnh phải bằng tiếng Anh để tạo hình ảnh tốt nhất. Chú thích phải bằng tiếng Việt.`;
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              image_prompt: {
                type: Type.STRING,
                description: "A detailed, descriptive English prompt for an AI image generator to create a scene from the script."
              },
              caption: {
                type: Type.STRING,
                description: "A short, descriptive Vietnamese caption for the scene."
              }
            },
            required: ["image_prompt", "caption"]
          }
        }
      }
    });

    const jsonText = response.text.trim();
    const scenes = JSON.parse(jsonText);
    return scenes;
  } catch (error) {
    console.error("Error generating scenes from script:", error);
    throw new Error("Không thể tạo cảnh từ kịch bản.");
  }
}

/**
 * Generates an image for a given scene prompt and aspect ratio.
 */
export async function generateImageForScene(prompt: string, aspectRatio: AspectRatio): Promise<string> {
  // Use imagen-4.0-generate-001 for high-quality image generation.
  const model = 'imagen-4.0-generate-001';

  try {
    const response = await ai.models.generateImages({
      model: model,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio,
        outputMimeType: 'image/jpeg'
      }
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error("Error generating image for scene:", error);
    throw new Error("Không thể tạo hình ảnh cho cảnh.");
  }
}
