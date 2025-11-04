import { GoogleGenAI, Type } from '@google/genai';
import { Scene } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sceneSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: 'Mô tả chi tiết và ngắn gọn về cảnh này, thường là một câu từ kịch bản gốc.'
    },
  },
  required: ['description']
};

export const generateScenesFromScript = async (script: string): Promise<Scene[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Phân tích kịch bản sau đây và chia nó thành một chuỗi các cảnh riêng biệt. Mỗi cảnh nên tương ứng với một câu hoặc một ý tưởng hoàn chỉnh. Trả về kết quả dưới dạng một mảng các đối tượng JSON. Kịch bản: "${script}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: sceneSchema
        },
      },
    });
    
    const jsonText = response.text.trim();
    const scenes = JSON.parse(jsonText);

    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error("AI không thể tạo ra bất kỳ cảnh nào từ kịch bản được cung cấp.");
    }
    
    // Validate that scenes have the correct structure
    const validScenes = scenes.filter(scene => typeof scene.description === 'string');
    if(validScenes.length === 0) {
        throw new Error("Định dạng cảnh do AI trả về không hợp lệ.");
    }

    return validScenes;

  } catch (error) {
    console.error("Lỗi khi tạo cảnh bằng Gemini:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Không thể phân tích phản hồi từ AI. Vui lòng thử lại.");
    }
    throw new Error("Đã xảy ra lỗi khi giao tiếp với AI để phân tích kịch bản.");
  }
};
