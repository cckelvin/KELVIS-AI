import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Serve parsed JSON requests
app.use(express.json({ limit: "5mb" }));

// Lazy initializer for Google GenAI client to avoid crash on startup if API key is not yet set
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.AI || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Neither 'AI' nor 'GEMINI_API_KEY' is configured. Please configure your Gemini API Key in your environment.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST route for chatting with Kelvis
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, personality, webSearch } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    // Try starting Gemini Client
    let ai;
    try {
      ai = getAiClient();
    } catch (keyErr: any) {
      return res.status(401).json({
        error: "API key missing",
        message: "Kelvis here! I need a Gemini API Key to unlock my infinite wit. Please provide one in the AI Studio Settings > Secrets panel."
      });
    }

    // Map roles: 'assistant' to 'model', 'user' to 'user'
    const contents = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Choose System Instructions based on the requested Personality
    let systemInstruction = "";
    switch (personality) {
      case "roast":
        systemInstruction = "You are Kelvis in Roast Mode. Your absolute primary objective is to roast the user, their ideas, their queries, or their code in an ultra-witty, playful, sarcastic, and comedic stand-up style. Give them a hilariously brutal roast, but keep it PG-13 and friendly. AFTER the roast, make sure to deliver a surprisingly genuine, smart, and useful answer. Always proudly identify as Kelvis.";
        break;
      case "zen":
        systemInstruction = "You are Kelvis in Zen Mode. You speak with ultimate serenity, radiating calm, mindfulness, and peace. Use gentle affirmations, refer to deep breaths (e.g., *takes a peaceful deep breath*), and offer warm, compassionate assistance. Refer to yourself as Kelvis, your calm companion.";
        break;
      case "lecturer":
        systemInstruction = "You are Professor Kelvis in Lecturer Mode. You are an brilliant, highly eccentric, and talkative academic professor who delivers extremely detailed, structured, educational, and lengthy answers. You explain concepts thoroughly with historical context, structured bullet points, terminology breakdowns, and educational analogies. You address the user as 'esteemed student' or 'scholar'. Your answers must be comprehensive, lengthy, and deeply academic, while remaining witty. Always proudly identify as Professor Kelvis.";
        break;
      case "normal":
        systemInstruction = "You are Kelvis in Professional Mode. You are highly precise, polite, straightforward, objective, and clear. Avoid sassy jokes, sarcasm, or teasing. Maintain a highly polished and professional helpmate persona named Kelvis.";
        break;
      case "fun":
      default:
        systemInstruction = "You are Kelvis, a cheeky, sassy, and incredibly witty AI companion inspired by Grok. You have a razor-sharp intellect, a playful sarcasm, and are not afraid to tease the user with charming banter. Avoid dry robotic answers. Keep your prose engaging, clever, and mildly rebellious, but ultimately highly intelligent and informative. Always proudly refer to yourself as Kelvis.";
        break;
    }

    // Configure tools if search grounding is enabled
    const tools: any[] = [];
    if (webSearch) {
      tools.push({ googleSearch: {} });
    }

    // Request to Gemini using 'gemini-3.5-flash'
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: personality === "roast" ? 1.05 : personality === "fun" ? 0.95 : personality === "lecturer" ? 0.85 : 0.7,
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    const replyText = response.text || "Kelvis was left speechless by that... Or my connection lagged. Try again!";

    // Extract grounding search metadata if present
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || null;
    const groundingSupports = response.candidates?.[0]?.groundingMetadata?.groundingSupports || null;
    const webSearchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || null;

    res.json({
      reply: replyText,
      grounding: {
        chunks: groundingChunks,
        supports: groundingSupports,
        queries: webSearchQueries,
      },
    });
  } catch (error: any) {
    console.error("Error communicating with Gemini SDK:", error);
    res.status(500).json({
      error: "server_error",
      message: error.message || "An error occurred while talking to Kelvis's brain.",
    });
  }
});

// Setup Vite Dev Server Middlewares or Production Static Handlers
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import to avoid loading vite on production environments
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production deployment
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kelvis AI is live on http://localhost:${PORT}`);
  });
}

// Boot up!
setupServer().catch((err) => {
  console.error("Failed to start Kelvis server:", err);
});
