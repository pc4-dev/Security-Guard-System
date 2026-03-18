import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const geminiService = {
  async summarizeImage(base64Data: string, mimeType: string): Promise<string> {
    try {
      // Remove the data:image/jpeg;base64, prefix if present
      const base64Content = base64Data.split(',')[1] || base64Data;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Content,
                },
              },
              {
                text: "Please provide a concise summary of what is visible in this image. Focus on security-relevant details if any.",
              },
            ],
          },
        ],
      });

      return response.text || "No summary available.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Error generating summary.";
    }
  }
};
