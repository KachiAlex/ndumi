import type { KnowledgeDocument } from "./documents.js";
import { KNOWLEDGE_BASE } from "./documents.js";
import { TfidfEmbedder, cosineSimilarity, type EmbeddingVector } from "./embedder.js";

export interface RetrievalResult {
  document: KnowledgeDocument;
  score: number;
}

class VectorStore {
  private embedder: TfidfEmbedder;
  private docEmbeddings: EmbeddingVector[] = [];

  constructor(documents: KnowledgeDocument[]) {
    this.embedder = new TfidfEmbedder(
      documents.map((d) => ({ content: d.content, tags: d.tags }))
    );

    for (const doc of documents) {
      const text = doc.content + " " + doc.tags.join(" ");
      const vector = this.embedder.embed(text);
      this.docEmbeddings.push({ docId: doc.id, vector });
    }

    console.log(`[VectorStore] Indexed ${this.docEmbeddings.length} documents, vocab size: ${this.embedder.size}`);
  }

  search(query: string, topK = 3, threshold = 0.15): RetrievalResult[] {
    const queryVector = this.embedder.embed(query);

    const scored = this.docEmbeddings.map((emb) => {
      const doc = this.findDoc(emb.docId);
      if (!doc) return null;
      return {
        document: doc,
        score: cosineSimilarity(queryVector, emb.vector),
      };
    }).filter((r): r is RetrievalResult => r !== null && r.score >= threshold);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  private findDoc(id: string): KnowledgeDocument | undefined {
    return KNOWLEDGE_BASE.find((d) => d.id === id);
  }
}

export const vectorStore = new VectorStore(KNOWLEDGE_BASE);
