import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 10000);
const frontendDir = path.join(__dirname, "../frontend");

app.disable("x-powered-by");
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map(v => v.trim()) : true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(frontendDir));

function systemPrompt(mode) {
  if (mode === "planner") return "You are a startup planner. Create clear business and app plans.";
  if (mode === "debugger") return "Review the supplied code, explain issues briefly, and return corrected code.";
  return "You are an expert software engineer. Build complete, safe, working web application code.";
}

app.get("/health", (_req, res) => res.status(200).json({ ok: true, service: "html-run-plus" }));
app.get("/", (_req, res) => res.sendFile(path.join(frontendDir, "index.html")));

app.post("/ai", async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  const mode = ["coder", "debugger", "planner"].includes(req.body?.mode) ? req.body.mode : "coder";
  if (!prompt) return res.status(400).json({ error: "A prompt is required" });
  if (prompt.length > 15000) return res.status(413).json({ error: "Prompt is too long" });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "OPENAI_API_KEY is not configured on the server" });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt(mode) }, { role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "AI provider request failed" });
    const result = data?.choices?.[0]?.message?.content;
    if (typeof result !== "string") return res.status(502).json({ error: "Unexpected AI provider response" });
    res.json({ result });
  } catch (err) {
    console.error("AI request failed:", err.message);
    res.status(502).json({ error: "AI request failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`HTML Run Plus listening on ${PORT}`));
