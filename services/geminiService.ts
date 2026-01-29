
import { GoogleGenAI } from "@google/genai";
import { CurrentConditions, HistoryPoint } from '../types';

export const analyzeWeatherConditions = async (current: CurrentConditions, history: HistoryPoint[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Simplify history for token efficiency (every 3rd hour)
    const simpleHistory = history.filter((_, i) => i % 3 === 0).map(h => ({
      time: h.time,
      temp: h.temp,
      pressure: h.pressure,
      wind: h.windSpeed
    }));

    const prompt = `
      Agis comme un météorologue professionnel expert. Analyse les données suivantes de la station météo personnelle IPLLAU91 (située en France).
      
      Données Actuelles:
      ${JSON.stringify(current)}
      
      Historique récent (24h):
      ${JSON.stringify(simpleHistory)}

      Génère un rapport concis en Français (max 150 mots) couvrant:
      1. Résumé des conditions actuelles.
      2. Tendance notable (pression, température).
      3. Une recommandation pratique pour les activités extérieures.
      
      Formatte la réponse en Markdown. Utilise des émojis pertinents.
    `;

    // Fix: Using gemini-3-pro-preview for complex reasoning and weather analysis as per guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    return response.text || "Analyse indisponible pour le moment.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Désolé, je ne peux pas générer l'analyse météo pour le moment. Vérifiez la clé API.";
  }
};
