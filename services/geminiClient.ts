import { GoogleGenAI } from "@google/genai";

// This file centralizes the GoogleGenAI client initialization.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
