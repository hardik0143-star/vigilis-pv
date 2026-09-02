export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
  try {
    const { messages, max_tokens = 1000, useWebSearch = false } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "messages is required" });
    const payload = { model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6", max_tokens, messages };
    if (useWebSearch) payload.tools = [{ type: "web_search_20250305", name: "web_search" }];
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(payload),
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || "Anthropic API request failed" });
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return res.status(200).json({ text });
  } catch (error) {
    console.error("AI proxy error:", error);
    return res.status(500).json({ error: "AI service request failed" });
  }
}
