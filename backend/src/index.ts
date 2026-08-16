import express from "express";
import http from "http";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ndumi-backend" });
});

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Ndumi backend running on http://localhost:${PORT}`);
});
