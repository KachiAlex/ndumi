import { Router } from "express";
import { sessionStore } from "../sessionStore.js";
import type { CreateSessionRequest, CreateSessionResponse, GetTranscriptResponse } from "@ndumi/shared";

export const sessionsRouter = Router();

sessionsRouter.post("/", (req, res) => {
  const body = (req.body ?? {}) as CreateSessionRequest;
  const session = sessionStore.create({ language: body.language });
  const response: CreateSessionResponse = { session };
  res.status(201).json(response);
});

sessionsRouter.get("/:id", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({ session });
});

sessionsRouter.get("/:id/transcript", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const entries = sessionStore.getTranscripts(req.params.id);
  const response: GetTranscriptResponse = { sessionId: req.params.id, entries };
  res.json(response);
});

sessionsRouter.delete("/:id", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  sessionStore.endSession(req.params.id);
  res.json({ status: "ended", sessionId: req.params.id });
});
