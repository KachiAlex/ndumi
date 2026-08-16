import { vectorStore, type RetrievalResult } from "./vectorStore.js";

export interface RetrievedContext {
  results: RetrievalResult[];
  contextText: string;
}

export function retrieveContext(query: string, topK = 3): RetrievedContext {
  const results = vectorStore.search(query, topK);

  const contextText = results
    .map((r) => `[${r.document.category.toUpperCase()}] ${r.document.title}\n${r.document.content}`)
    .join("\n\n");

  return { results, contextText };
}

export function buildAugmentedPrompt(
  systemPrompt: string,
  customerText: string,
  context: RetrievedContext
): string {
  if (context.contextText.length === 0) {
    return `${systemPrompt}\n\nCustomer: ${customerText}`;
  }

  return (
    `${systemPrompt}\n\n` +
    `Relevant knowledge:\n${context.contextText}\n\n` +
    `Customer: ${customerText}`
  );
}
