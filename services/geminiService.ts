import { GoogleGenAI, Type } from "@google/genai";
import { Scene, AspectRatio } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sceneGenerationSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        image_prompt: {
          type: Type.STRING,
          description: 'Một lời nhắc chi tiết, giàu hình ảnh cho trình tạo ảnh AI để tạo một bức tranh cho cảnh này. Lời nhắc nên mang tính mô tả và nghệ thuật.',
        },
        caption: {
          type: Type.STRING,
          description: 'Một phụ đề ngắn, hấp dẫn hoặc một đoạn tường thuật cho slide này, trực tiếp từ hoặc lấy cảm hứng từ kịch bản.',
        },
      },
      required: ['image_prompt', 'caption'],
    },
};

export const generateScenesFromScript = async (script: string): Promise<Scene[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Phân tích kịch bản sau và chia nó thành một chuỗi các cảnh riêng biệt cho trình chiếu. Đối với mỗi cảnh, hãy tạo một lời nhắc mô tả cho trình tạo ảnh AI và một phụ đề ngắn. Lời nhắc hình ảnh phải sống động và chi tiết. Phụ đề phải ngắn gọn. Trả về kết quả dưới dạng một mảng JSON.

      KỊCH BẢN:
      ---
      ${script}
      ---
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: sceneGenerationSchema,
      },
    });
    
    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error("API trả về phản hồi trống.");
    }

    const scenes = JSON.parse(jsonText);
    return scenes as Scene[];

  } catch (error) {
    console.error("Error generating scenes:", error);
    throw new Error("Không thể phân tích kịch bản thành các cảnh. AI có thể không hiểu đầu vào. Vui lòng thử diễn đạt lại kịch bản của bạn.");
  }
};


export const generateImageFromPrompt = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `Tạo một hình ảnh điện ảnh, chất lượng cao. ${prompt}`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      return response.generatedImages[0].image.imageBytes;
    } else {
      throw new Error("Tạo ảnh thất bại, không có ảnh nào được trả về.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Không thể tạo ảnh cho lời nhắc.");
  }
};