export { KNOWLEDGE_BASE } from "./documents.js";
export type { KnowledgeDocument } from "./documents.js";
export { TfidfEmbedder, cosineSimilarity } from "./embedder.js";
export { vectorStore } from "./vectorStore.js";
export type { RetrievalResult } from "./vectorStore.js";
export { retrieveContext, buildAugmentedPrompt } from "./retrieval.js";
export type { RetrievedContext } from "./retrieval.js";
