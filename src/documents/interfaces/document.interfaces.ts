import { Types } from 'mongoose';

export interface SingleEmbeddingResponse {
  model: string;
  dimensions: number;
  embedding: number[];
}

export interface BatchEmbeddingResponse {
  model: string;
  dimensions: number;
  embeddings: number[][];
}

export interface VectorSearchResult {
  _id: Types.ObjectId;
  documentId: Types.ObjectId;
  text: string;
  score: number;
}

export interface RerankedChunk {
  id: string;
  text: string;
  score?: number;
}

export interface GeminiAnswerResult {
  answer: string;
  insufficientContext: boolean;
}
