import { Router } from "express";
import { sessionStore } from "../sessionStore.js";
import { listTenants } from "../agent/tenantConfig.js";
import type { CreateSessionRequest, CreateSessionResponse, GetTranscriptResponse } from "@ndumi/shared";

export const sessionsRouter = Router();

/** Resolve tenant ID from request: header > query > default "banking". */
function resolveTenant(req: { headers: Record<string, string | string[] | undefined> }): string {
  const headerTenant = req.headers["x-tenant-id"] as string | undefined;
  if (headerTenant && listTenants().includes(headerTenant)) return headerTenant;
  return "banking";
}

sessionsRouter.post("/", (req, res) => {
  const body = (req.body ?? {}) as CreateSessionRequest;
  const tenantId = resolveTenant(req);
  const session = sessionStore.create({ language: body.language, tenantId });
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
