import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

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
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        fs.writeFileSync(path.join(process.cwd(), 'public', 'icon.png'), buffer);
        console.log("Icon generated successfully!");
        return;
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
}

generateAppIcon();
