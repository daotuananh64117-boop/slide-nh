import { GoogleGenAI, Type, Modality } from '@google/genai';
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

export const generateImageForScene = async (description: string): Promise<string> => {
  // Helper function to abstract the actual image generation call
  const createImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (response.promptFeedback?.blockReason) {
      throw new Error(`Bị chặn: ${response.promptFeedback.blockReason}. ${response.promptFeedback.blockReasonMessage || ''}`);
    }

    const firstCandidate = response.candidates?.[0];

    if (!firstCandidate || firstCandidate.finishReason === 'RECITATION' || firstCandidate.finishReason === 'SAFETY') {
      throw new Error(`Lý do an toàn hoặc trích dẫn.`);
    }

    for (const part of firstCandidate.content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    
    throw new Error("Không có dữ liệu hình ảnh nào được trả về từ AI.");
  };

  const initialPrompt = `Một bức tranh kỹ thuật số theo phong cách điện ảnh, hoành tráng, đầy cảm hứng về: "${description}". Hình ảnh nên gợi lên cảm giác kính sợ và thiêng liêng.`;
  
  try {
    // First attempt with the original description
    return await createImage(initialPrompt);
  } catch (initialError: any) {
    console.warn(`Lần thử tạo hình ảnh đầu tiên thất bại cho "${description}": ${initialError.message}. Thử lại với lời nhắc được đơn giản hóa.`);

    try {
      // Fallback: Use a text model to simplify the abstract description into a visual one.
      const simplifierResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Tóm tắt khái niệm trừu tượng hoặc phức tạp sau đây thành một mô tả cảnh đơn giản, trực quan, phù hợp để tạo hình ảnh. Tập trung vào các yếu tố cụ thể, mang tính biểu tượng. Trả về một cụm từ ngắn gọn bằng tiếng Việt. Khái niệm: "${description}"`,
      });
      const simplifiedDescription = simplifierResponse.text.trim();

      if (!simplifiedDescription) {
        throw new Error("Không thể đơn giản hóa mô tả.");
      }
      
      console.log(`Mô tả được đơn giản hóa: "${simplifiedDescription}"`);
      
      const fallbackPrompt = `Một bức tranh kỹ thuật số theo phong cách điện ảnh, hoành tráng, đầy cảm hứng về khái niệm mang tính biểu tượng của: "${simplifiedDescription}". Hình ảnh nên gợi lên cảm giác kính sợ và thiêng liêng.`;

      // Second attempt with the simplified description
      return await createImage(fallbackPrompt);

    } catch (fallbackError: any) {
      console.error(`Lần thử tạo hình ảnh thứ hai cũng thất bại cho "${description}":`, fallbackError);
      
      let userMessage = `Không thể tạo hình ảnh cho cảnh: "${description}".`;
      if (initialError.message.includes('bị chặn') || (fallbackError.message && fallbackError.message.includes('bị chặn'))) {
          userMessage = `Không thể tạo hình ảnh cho cảnh "${description}" vì nội dung bị chặn, ngay cả sau khi thử đơn giản hóa nó. Vui lòng sửa đổi mô tả cảnh này.`;
      } else if (initialError.message.includes('an toàn') || (fallbackError.message && fallbackError.message.includes('an toàn'))) {
          userMessage = `Không thể tạo hình ảnh cho cảnh "${description}" vì lý do an toàn, ngay cả sau khi thử đơn giản hóa nó. Vui lòng sửa đổi mô tả cảnh này.`;
      }
      throw new Error(userMessage);
    }
  }
};

export const generateScenesFromScript = async (script: string): Promise<Scene[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Phân tích kịch bản sau đây và chỉ trích xuất những câu mô tả cảnh hoặc hành động có thể hình dung được. Bỏ qua mọi câu hỏi, lời kêu gọi hành động, lời chào hoặc văn bản phi mô tả khác không thể minh họa bằng hình ảnh. Chia các câu có thể hình dung được thành một chuỗi các cảnh riêng biệt. Mỗi cảnh nên tương ứng với một câu hoặc một ý tưởng hoàn chỉnh. Trả về kết quả dưới dạng một mảng các đối tượng JSON. Kịch bản: "${script}"`,
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

    if (!Array.isArray(scenes)) { // Allow empty array if no visual scenes are found
      throw new Error("AI không thể tạo ra bất kỳ cảnh nào từ kịch bản được cung cấp.");
    }
    
    // Validate that scenes have the correct structure, even if the array is empty
    const validScenes = scenes.filter(scene => typeof scene.description === 'string');
    if(validScenes.length !== scenes.length) {
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