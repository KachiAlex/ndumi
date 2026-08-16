import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer } from "ws";
import { sessionStore } from "./sessionStore.js";
import { sessionsRouter } from "./routes/sessions.js";
import { ttsRouter } from "./routes/tts.js";
import { handleSessionWs } from "./ws/handler.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(express.json({ limit: "10mb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ndumi-backend",
    activeSessions: sessionStore.activeCount(),
    version: "0.1.0",
  });
});

app.use("/v1/sessions", sessionsRouter);
app.use("/v1/tts", ttsRouter);

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = req.url ?? "";
  if (url.startsWith("/v1/sessions/") && url.endsWith("/stream")) {
    handleSessionWs(ws, req);
  } else {
    ws.close(1008, "Unknown WebSocket path");
  }
});

server.listen(PORT, () => {
  console.log(`Ndumi backend running on http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/v1/sessions/:id/stream`);
});

