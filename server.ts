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
      const { babyName, ageDays, careDay, temperament, caregivers, dayStats, events, actions, milestonesToday, parentNote } = req.body || {};
      const ai = getGeminiClient();
      const stats = dayStats || {};

      const factualFallback = () =>
        res.json({
          reflection: `Day ${careDay ?? ageDays}: ${stats.feedsCount ?? 0} feeds, ${stats.diapersCount ?? 0} nappy changes, about ${stats.sleepHoursTotal ?? 0} hours of sleep and ${stats.cryingMinutesTotal ?? 0} minutes of crying.`,
          milestoneInsight: "",
          source: "offline_fallback"
        });

      if (!ai) return factualFallback();

      const prompt = `You write the daily journal for "Parenthood", an educational baby-care simulation.
Write in the voice of an observant caregiver describing ${babyName}'s day (NOT the baby speaking; a ${ageDays}-day-old cannot narrate thoughts).
Use ONLY the facts below. Do not invent feeds, sleep, crying, milestones, illnesses, or parent actions that are not listed.
If the log is sparse, say the day was quiet. No medical claims, no diagnoses, no "research shows". 60-100 words, warm but plain.

FACTS
Baby: ${babyName}, developmental age ${ageDays} days (this is day ${careDay ?? '?'} of the parents caring for them), temperament parameters: ${temperament}
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
      const { event, snapshot, staticNote, question } = req.body || {};
      const ai = getGeminiClient();

      // Deterministic, always-available explanation built only from the snapshot
      const factual = () => {
        if (!snapshot) return staticNote || "No detail was recorded for this event.";
        const reasons: string[] = [];
        if (snapshot.hunger >= 60) reasons.push(`hunger was high (${snapshot.hunger}/100, last feed ${snapshot.minutesSinceFeed} min earlier)`);
        if (snapshot.gasDiscomfort >= 40) reasons.push(`there was trapped wind (${snapshot.gasDiscomfort}/100)`);
        if (snapshot.diaperSoiled >= 50) reasons.push(`the nappy was ${snapshot.diaperType} (${snapshot.minutesSinceDiaper} min since a change)`);
        if (!snapshot.isSleeping && snapshot.sleepiness >= 65) reasons.push(`they had been awake ${snapshot.awakeMinutes} min and were over-tired (${snapshot.sleepiness}/100)`);
        if (reasons.length === 0) reasons.push(`no single need stood out — comfort was ${snapshot.comfort}/100 and it was ${snapshot.isNight ? "night" : "daytime"}`);
        return `In the simulation at that moment: ${reasons.join("; ")}.`;
      };

      if (!ai) return res.json({ insight: factual(), source: "offline_fallback" });

      const prompt = `You explain events inside "Parenthood", an educational baby-care SIMULATION, to the parent.
Event: ${JSON.stringify(event || {})}
Simulation state at that moment (the ONLY facts you may use): ${JSON.stringify(snapshot || {})}
Simulation note already shown to the user: ${JSON.stringify(staticNote || "")}
Parent's question: ${question || "Why did this happen?"}

Write 2-3 plain sentences saying which values in the state most likely caused the event (hunger, awake time/over-tiredness, wind after a feed, nappy). Quote the numbers you rely on. If nothing stands out, say so honestly. Do not give medical advice, do not diagnose, do not cite studies or organisations, do not say "evidence-based". You may end with one cautious sentence that real babies vary. Plain text only.`;

      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      const text = response.text?.trim();
      res.json({ insight: text && text.length > 20 ? text : factual(), source: text ? "gemini" : "offline_fallback" });
    } catch (error: any) {
      console.error("Explain Event Error:", error?.message || error);
      res.json({ insight: "The explanation service is unavailable right now. Check the Needs screen for the likely cause.", source: "error_fallback" });
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
