import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.OPENAI_API_KEY;

// 🧠 AI AGENTS
function systemPrompt(mode) {
  if (mode === "planner")
    return "You are a startup planner. Create business + app plans.";

  if (mode === "debugger")
    return "Fix and improve this code. Return only clean code.";

  return "You are an expert coder. Build full working apps. Return only code.";
}

app.post("/ai", async (req, res) => {
  const { prompt, mode } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "prompt is required" });
  if (!API_KEY) return res.status(503).json({ error: "OPENAI_API_KEY is not configured" });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt(mode) },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await response.json();
  res.json({ result: data.choices[0].message.content });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AI OS running on port ${port}`));
