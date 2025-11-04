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

  const prompt = `Phân tích kịch bản sau đây và chia nó thành một chuỗi các cảnh. Đối với mỗi cảnh, hãy tạo một lời nhắc hình ảnh chi tiết bằng tiếng Anh để tạo ra hình ảnh phù hợp nhất.
  
Kịch bản:
"${script}"

Trả lời ở định dạng JSON là một mảng các đối tượng, mỗi đối tượng chỉ có một khóa duy nhất là "image_prompt".`;
  
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
              }
            },
            required: ["image_prompt"]
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
 * This function has been modified to use a free placeholder image service (Lorem Picsum)
 * to meet the user's request for a faster, no-cost, no-API-key solution.
 * The images will be random and will not match the generated prompt.
 */
export async function generateImageForScene(prompt: string, aspectRatio: AspectRatio): Promise<string> {
  let width, height;

  if (aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  } else { // 9:16
    width = 720;
    height = 1280;
  }

  // Construct the URL for a random image from Lorem Picsum.
  // The random parameter ensures a new image is fetched each time.
  const imageUrl = `https://picsum.photos/${width}/${height}?random=${Math.random()}`;

  // Wrap in a Promise to maintain the async function signature.
  return Promise.resolve(imageUrl);
}
