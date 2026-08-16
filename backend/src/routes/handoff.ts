import { Router } from "express";
import { redisStore } from "../redisStore.js";

export const handoffRouter = Router();

handoffRouter.get("/", async (_req, res) => {
  if (!(await redisStore.isAvailable())) {
    res.status(503).json({ error: "Redis not available" });
    return;
  }
  const queue = await redisStore.getHandoffQueue();
  const records = await Promise.all(
    queue.map((id) => redisStore.getHandoff(id))
  );
  res.json({ queue: records.filter((r) => r !== null) });
});

handoffRouter.get("/:sessionId", async (req, res) => {
  if (!(await redisStore.isAvailable())) {
    res.status(503).json({ error: "Redis not available" });
    return;
  }
  const record = await redisStore.getHandoff(req.params.sessionId);
  if (!record) {
    res.status(404).json({ error: "No handoff record found" });
    return;
  }
  res.json(record);
});

handoffRouter.post("/:sessionId/resolve", async (req, res) => {
  if (!(await redisStore.isAvailable())) {
    res.status(503).json({ error: "Redis not available" });
    return;
  }
  await redisStore.resolveHandoff(req.params.sessionId);
  res.json({ status: "resolved", sessionId: req.params.sessionId });
});
