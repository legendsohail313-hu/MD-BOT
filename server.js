const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const REMOTE_PANEL_BASE = process.env.REMOTE_PANEL_BASE || "https://panel.shackspanel.xyz";

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  return res.json({ ok: true, service: "pairing-panel-backend" });
});

app.post("/api/pair", async (req, res) => {
  try {
    const phone = String(req.body?.phone || "").replace(/\D/g, "");
    if (phone.length < 7) {
      return res.status(400).json({
        error: "Enter phone number with country code"
      });
    }

    const response = await fetch(`${REMOTE_PANEL_BASE}/api/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : { error: await response.text() };

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || `Remote API error: HTTP ${response.status}`
      });
    }

    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
