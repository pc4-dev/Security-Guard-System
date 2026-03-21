import { GoogleGenAI } from "@google/genai";
import fs from "fs";

async function generateAppIcon() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = "A modern security guard app icon with glassmorphism effect. Use orange (#F97316) and white (#FFFFFF) color combination. Clean, minimal icon featuring a shield with a checkmark. Glassmorphism style with soft transparency, blur, and subtle shadow. Rounded corners, centered layout, high contrast, premium, modern, app-ready, 1:1 aspect ratio. No text, no complex details.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        fs.writeFileSync("/public/icon.png", Buffer.from(base64Data, 'base64'));
        console.log("App icon generated and saved successfully.");
        return;
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
}

generateAppIcon();
