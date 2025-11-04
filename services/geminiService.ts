import { GoogleGenAI } from "@google/genai";
import { Scene, AspectRatio } from '../types';

let ai: GoogleGenAI | null = null;
const getAI = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            // Không khởi tạo nếu không có API key
            console.error("API key for Gemini is not configured.");
            return null;
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

/**
 * Phân tích kịch bản thành các cảnh bằng cách tách câu.
 * @param script Kịch bản đầy đủ do người dùng cung cấp.
 * @returns Một mảng các đối tượng Scene.
 */
export const parseScriptToScenes = (script: string): Scene[] => {
  if (!script.trim()) return [];
  // Tách câu dựa trên các dấu câu kết thúc câu. Giữ lại dấu câu.
  const sentences = script.match(/[^.!?]+[.!?]+/g) || [script];
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 5) // Lọc bỏ các đoạn quá ngắn
    .map(description => ({ description }));
};


/**
 * Sử dụng AI để tạo ra các truy vấn tìm kiếm giống như Google cho một cảnh phức tạp.
 * @param sceneDescription Mô tả cảnh gốc.
 * @returns Một chuỗi các truy vấn tìm kiếm được phân tách bằng dấu phẩy.
 */
export const generateSearchQueriesForScene = async (sceneDescription: string): Promise<string> => {
    const aiInstance = getAI();
    if (!aiInstance) {
        throw new Error("Dịch vụ AI không có sẵn để tạo truy vấn tìm kiếm.");
    }

    const prompt = `Analyze the following scene description from a script. Your task is to generate 3 to 5 highly descriptive, artistic search queries for a stock photo website like Unsplash. These queries should capture the visual elements, mood, and style of the scene.

RULES:
- ONLY output the search queries.
- The queries must be a single line of text.
- Each query must be separated by a comma.
- Do NOT add any intro, explanation, or quotation marks around the output.

SCENE: "${sceneDescription}"
SEARCH QUERIES:`;

    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        // Dọn dẹp phản hồi để an toàn hơn
        const queries = response.text.trim().replace(/"/g, '').replace(/\.$/, ''); // xóa dấu ngoặc kép và dấu chấm cuối câu
        if (!queries) {
          throw new Error("AI đã trả về truy vấn tìm kiếm trống.");
        }
        return queries;
    } catch (error) {
        console.error("Lỗi khi tạo truy vấn tìm kiếm bằng AI:", error);
        throw new Error("AI không thể tạo truy vấn tìm kiếm. Mô hình có thể không khả dụng hoặc yêu cầu đã bị chặn.");
    }
};


/**
 * Tạo một URL đến Pிக்.photos để lấy một hình ảnh ngẫu nhiên, miễn phí và phù hợp.
 * @param description Mô tả cảnh để trích xuất từ khóa (chỉ dùng nếu không có chuỗi truy vấn).
 * @param aspectRatio Tỷ lệ khung hình của hình ảnh.
 * @param query (Tùy chọn) Một chuỗi truy vấn tìm kiếm được tạo sẵn (ví dụ: từ AI).
 * @returns Một chuỗi URL trỏ đến một hình ảnh.
 */
export const getImageUrlForScene = (description: string, aspectRatio: AspectRatio, query?: string): string => {
  const [width, height] = aspectRatio === '16:9' ? [1280, 720] : [720, 1280];
  
  let searchTerms: string;

  if (query) {
      searchTerms = query;
  } else {
      // Trích xuất từ khóa đơn giản, loại bỏ các từ không cần thiết
      const stopwords = ['a', 'an', 'the', 'in', 'on', 'at', 'for', 'to', 'of', 'with', 'is', 'are', 'was', 'were', 'it', 'its', 'like'];
      const sceneKeywords = description
        .toLowerCase()
        .replace(/[^a-z\s]/g, '') // Chỉ giữ lại ký tự chữ và khoảng trắng
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopwords.includes(word)) // Lọc từ ngắn và stopwords
        .slice(0, 5); // Lấy tối đa 5 từ khóa
      
      if (sceneKeywords.length === 0) {
          searchTerms = 'inspirational'; 
      } else {
          searchTerms = [...new Set(sceneKeywords)].join(',');
      }
  }
      
  // Sử dụng dịch vụ pics.photos mới, đáng tin cậy hơn
  return `https://pics.photos/${width}/${height}?random&search=${encodeURIComponent(searchTerms)}`;
};
