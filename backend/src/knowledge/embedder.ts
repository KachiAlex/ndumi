export interface EmbeddingVector {
  docId: string;
  vector: number[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  const total = tokens.length || 1;
  for (const [key, val] of tf) {
    tf.set(key, val / total);
  }
  return tf;
}

function buildIdf(documents: { content: string; tags: string[] }[]): Map<string, number> {
  const docCount = documents.length;
  const docFreq = new Map<string, number>();

  for (const doc of documents) {
    const tokens = new Set(tokenize(doc.content + " " + doc.tags.join(" ")));
    for (const token of tokens) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [token, freq] of docFreq) {
    idf.set(token, Math.log((docCount + 1) / (freq + 1)) + 1);
  }
  return idf;
}

export class TfidfEmbedder {
  private idf: Map<string, number>;
  private vocabulary: Set<string>;

  constructor(documents: { content: string; tags: string[] }[]) {
    this.idf = buildIdf(documents);
    this.vocabulary = new Set(this.idf.keys());
  }

  embed(text: string): number[] {
    const tokens = tokenize(text);
    const tf = termFrequency(tokens);
    const vector: number[] = [];

    for (const term of this.vocabulary) {
      const tfVal = tf.get(term) || 0;
      const idfVal = this.idf.get(term) || 0;
      vector.push(tfVal * idfVal);
    }

    return normalize(vector);
  }

  get size(): number {
    return this.vocabulary.size;
  }
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
