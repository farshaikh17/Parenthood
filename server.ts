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

  // AI Journal reflection — grounded ONLY in the structured day log the client sends.
  app.post("/api/gemini/journal-reflection", async (req, res) => {
    try {
      const { babyName, ageDays, temperament, caregivers, dayStats, events, actions, milestonesToday, parentNote } = req.body || {};
      const ai = getGeminiClient();
      const stats = dayStats || {};

      const factualFallback = () =>
        res.json({
          reflection: `Day ${ageDays}: ${stats.feedsCount ?? 0} feeds, ${stats.diapersCount ?? 0} nappy changes, about ${stats.sleepHoursTotal ?? 0} hours of sleep and ${stats.cryingMinutesTotal ?? 0} minutes of crying.`,
          milestoneInsight: "",
          source: "offline_fallback"
        });

      if (!ai) return factualFallback();

      const prompt = `You write the daily journal for "Parenthood", an educational baby-care simulation.
Write in the voice of an observant caregiver describing ${babyName}'s day (NOT the baby speaking; a ${ageDays}-day-old cannot narrate thoughts).
Use ONLY the facts below. Do not invent feeds, sleep, crying, milestones, illnesses, or parent actions that are not listed.
If the log is sparse, say the day was quiet. No medical claims, no diagnoses, no "research shows". 60-100 words, warm but plain.

FACTS
Baby: ${babyName}, age ${ageDays} days, temperament parameters: ${temperament}
Caregivers: ${JSON.stringify(caregivers || [])}
Day counters (authoritative): ${JSON.stringify(stats)}
Events today: ${JSON.stringify(events || [])}
Care actions today (by = who did it; "autopilot" means simulated care while the user was away): ${JSON.stringify(actions || [])}
Milestones reached today: ${JSON.stringify(milestonesToday || [])}
Parent's own note (quote or paraphrase only if present): ${parentNote ? JSON.stringify(parentNote) : "none"}

Respond in valid JSON: {"reflection": string, "milestoneInsight": string}
"milestoneInsight" must be ONE short, cautious, non-medical sentence about something that actually happened today, or an empty string.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const responseText = response.text?.trim() || "{}";
      try {
        const parsed = JSON.parse(responseText);
        if (typeof parsed.reflection !== "string" || parsed.reflection.length < 10) return factualFallback();
        res.json({
          reflection: parsed.reflection,
          milestoneInsight: typeof parsed.milestoneInsight === "string" ? parsed.milestoneInsight : "",
          source: "gemini"
        });
      } catch {
        return factualFallback();
      }
    } catch (error: any) {
      console.error("Gemini Journal Error:", error?.message || error);
      const stats = (req.body && req.body.dayStats) || {};
      res.json({
        reflection: `Day ${req.body?.ageDays ?? "?"}: ${stats.feedsCount ?? 0} feeds, ${stats.diapersCount ?? 0} nappy changes, about ${stats.sleepHoursTotal ?? 0} hours of sleep.`,
        milestoneInsight: "",
        source: "error_fallback"
      });
    }
  });

  // AI Parenting advice / explanation endpoint
  app.post("/api/gemini/explain-event", async (req, res) => {
    try {
      const { babyState, recentEvent, question } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          insight: "In the simulation, this happened because of the baby's current state (hunger, tiredness, wind or a wet nappy). Check the Needs screen for the likely cause.",
          source: "offline_fallback"
        });
      }

      const prompt = `You explain events inside "Parenthood", an educational baby-care SIMULATION.
Simulation state right now: ${JSON.stringify(babyState || {})}
Event: ${recentEvent || "Baby was crying"}
Question: ${question || "Why did this happen?"}

In 2-3 plain sentences, explain what in the simulation state most likely caused this event (e.g. hunger high, awake too long, wind after a feed, wet nappy). Refer only to values present in the state. Do not give medical advice, do not diagnose, do not cite studies or organisations, do not say "evidence-based". You may add ONE cautious sentence that real babies vary. Plain text only.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({
        insight: response.text?.trim() || "The simulation could not produce an explanation. Check the Needs screen for the likely cause.",
        source: "gemini"
      });
    } catch (error: any) {
      console.error("Pediatric Insight Error:", error);
      res.json({
        insight: "The explanation service is unavailable right now. Check the Needs screen for the likely cause.",
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
