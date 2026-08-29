import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Lazy initialize Gemini client
  function getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  }

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Journal reflection and emotional insight endpoint
  app.post("/api/gemini/journal-reflection", async (req, res) => {
    try {
      const { babyName, ageDays, temperament, recentEvents, parentStress, parentingConfidence } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        // Fallback realistic reflection if no key is configured
        return res.json({
          reflection: `Day ${ageDays} with baby ${babyName || "our baby"}: It's been a day full of learning rhythms. With ${babyName}'s ${temperament || "developing"} temperament, every soothe and feed builds our connection. Parenting brings fatigue, but each calm moment between cycles reminds us why this dedication matters so deeply.`,
          milestoneInsight: `At ${ageDays} days old, babies are adjusting to sensory life outside the womb. Every gentle touch and responsive feeding supports neural pathways for secure attachment.`,
          source: "offline_fallback"
        });
      }

      const prompt = `You are the parenting AI assistant in the "Parenthood" realistic baby simulation app.
Baby Name: ${babyName}
Age: ${ageDays} days old
Temperament: ${temperament}
Recent Events: ${JSON.stringify(recentEvents || [])}
Parent Stress Level (0-100): ${parentStress}
Parent Confidence (0-100): ${parentingConfidence}

Write a warm, deeply realistic, emotionally grounded daily journal reflection (around 70-100 words) from the perspective of an observant, encouraging parenting coach. Reflect on the day's caregiving efforts, realistic sleep/feeding challenges, and how parent responsiveness builds secure attachment. Also provide one concise scientific developmental insight (1-2 sentences).

Respond in valid JSON with keys:
"reflection": string
"milestoneInsight": string`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text?.trim() || "{}";
      try {
        const parsed = JSON.parse(responseText);
        res.json({
          reflection: parsed.reflection,
          milestoneInsight: parsed.milestoneInsight,
          source: "gemini"
        });
      } catch {
        res.json({
          reflection: responseText,
          milestoneInsight: "Consistent caregiving fosters emotional security and brain development.",
          source: "gemini_raw"
        });
      }
    } catch (error: any) {
      console.error("Gemini Journal Error:", error);
      res.json({
        reflection: "Today was filled with attentive care. Every responsive moment shapes your baby's sense of safety in the world.",
        milestoneInsight: "Newborns thrive on consistent, loving responsiveness.",
        source: "error_fallback"
      });
    }
  });

  // AI Parenting advice / explanation endpoint
  app.post("/api/gemini/pediatric-insight", async (req, res) => {
    try {
      const { babyState, recentEvent, question } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          insight: "Newborns communicate exclusively through cries and body cues. Responsive care during these early weeks cannot 'spoil' a baby—it actively builds emotional regulation.",
          source: "offline_fallback"
        });
      }

      const prompt = `You are an educational pediatric simulator advisor for the Parenthood app.
Baby Current State: ${JSON.stringify(babyState || {})}
Recent Event: ${recentEvent || "Baby was crying"}
Question/Context: ${question || "Why is baby crying?"}

Provide reassuring, general, educational, illustrative guidance (2-3 sentences max) explaining typical developmental or biological patterns behind this newborn behavior in the context of this parenting simulation. Clearly frame this as general illustrative simulation guidance, not verified medical fact, and avoid making definitive medical claims or clinical diagnoses. (Always purely educational, non-prescriptive, and realistic).
Output plain text.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({
        insight: response.text?.trim() || "Young infants experience rapid neurological changes that frequently alter their sleep and feeding patterns.",
        source: "gemini"
      });
    } catch (error: any) {
      console.error("Pediatric Insight Error:", error);
      res.json({
        insight: "Infant circadian rhythms take several weeks to mature, leading to variable wake windows and unexpected nighttime waking.",
        source: "error_fallback"
      });
    }
  });

  // Setup Vite development middleware or static production serving
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Parenthood server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
