import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { envVars } from '../config/envVars';
import { FileUploadJobData } from '../queues/fileUpload.queue';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import mongoose, { Types } from 'mongoose';
import { Document, DocumentSchema } from '../documents/schemas/document.schema';
import {
  DocumentChunk,
  DocumentChunkSchema,
} from '../documents/schemas/document-chunk.schema';
import { BatchEmbeddingResponse } from '../documents/interfaces/document.interfaces';

const redisClient = getRedisClient();

const getDocumentModel = () =>
  mongoose.models[Document.name] ||
  mongoose.model(Document.name, DocumentSchema);

const getDocumentChunkModel = () =>
  mongoose.models[DocumentChunk.name] ||
  mongoose.model(DocumentChunk.name, DocumentChunkSchema);

// Helper: Standard text chunking
function textToChunk(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  const cleanText = text.replace(/\s+/g, ' ').trim();

  for (let i = 0; i < cleanText.length; i += chunkSize - overlap) {
    const chunk = cleanText.slice(i, i + chunkSize);
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

// Helper: Policy-based text chunking
function policyBasedTextToChunk(
  text: string,
  chunkSize = 1000,
  overlap = 200,
): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  const policyRegex =
    /(?:^|\r?\n)\s*(Policy\s+(?:[A-Za-z0-9_.-]+\s*[:\-]|[\d]+[A-Za-z0-9_.-]*\b))/gi;
  const matches = [...text.matchAll(policyRegex)];

  if (matches.length === 0) {
    return textToChunk(text, chunkSize, overlap);
  }

  const chunks: string[] = [];
  const firstHeadingIndex =
    matches[0].index + matches[0][0].indexOf(matches[0][1]);
  const preamble = text.slice(0, firstHeadingIndex).trim();
  if (preamble) {
    chunks.push(preamble);
  }

  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index + matches[i][0].indexOf(matches[i][1]);
    const nextHeadingIndex =
      i + 1 < matches.length
        ? matches[i + 1].index + matches[i + 1][0].indexOf(matches[i + 1][1])
        : text.length;

    const policyChunk = text.slice(startIndex, nextHeadingIndex).trim();
    if (policyChunk) {
      chunks.push(policyChunk);
    }
  }

  return chunks;
}

// Helper: Generate Embeddings from embedding API
async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const BATCH_SIZE = 32;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const embeddingUrl = envVars.EMBEDDING_API_URL;
    const response = await fetch(`${embeddingUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts: batch }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(`Embedding API failed with status ${response.status}`);
    }

    const result = (await response.json()) as BatchEmbeddingResponse;

    if (
      !Array.isArray(result.embeddings) ||
      result.embeddings.length !== batch.length ||
      result.embeddings.some(
        (embedding) => !Array.isArray(embedding) || embedding.length !== 384,
      )
    ) {
      throw new Error('Embedding API returned an invalid response');
    }

    allEmbeddings.push(...result.embeddings);
  }

  return allEmbeddings;
}

async function ensureDbConnected() {
  if (mongoose.connection.readyState === 0) {
    const mongoUri = envVars.MONGODB_URI;
    await mongoose.connect(mongoUri);
  }
}

export const fileUploadWorker = new Worker<FileUploadJobData>(
  'file-upload',
  async (job: Job<FileUploadJobData>) => {
    await ensureDbConnected();
    const { documentId, fileUrl, filename } = job.data;
    const documentModel = getDocumentModel();
    const documentChunkModel = getDocumentChunkModel();

    console.log(
      `[Worker] Started processing document ${documentId} (${filename})`,
    );

    // 1. Update status to 'processing'
    await documentModel.findByIdAndUpdate(documentId, {
      status: 'processing',
    });

    try {
      // 2. Download file from Supabase live URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to download file from Supabase: ${response.statusText}`,
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 3. Extract text
      const extension = filename.split('.').pop()?.toLowerCase();
      let text: string;

      if (extension === 'txt') {
        text = buffer.toString('utf-8');
      } else if (extension === 'pdf') {
        const result = await pdfParse(buffer);
        text = result.text;
      } else if (extension === 'docx') {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else {
        throw new Error('Only PDF, DOCX, and TXT are supported');
      }

      if (!text.trim()) {
        throw new Error('The uploaded document contains no text');
      }

      // 4. Chunk text and generate embeddings
      const chunks = policyBasedTextToChunk(text);
      const embeddings = await generateEmbeddings(chunks);

      const chunkDocs = chunks.map((chunk, index) => ({
        documentId: new Types.ObjectId(documentId),
        text: chunk,
        embedding: embeddings[index],
      }));

      // 5. Clean up old chunks (prevents duplicates on retry) and insert new chunks
      await documentChunkModel.deleteMany({
        documentId: new Types.ObjectId(documentId),
      });

      if (chunkDocs.length > 0) {
        await documentChunkModel.insertMany(chunkDocs);
      }

      // 6. Update document with extracted text and status 'completed'
      const updated = await documentModel.findByIdAndUpdate(
        documentId,
        {
          originalText: text,
          status: 'completed',
          totalChunks: chunkDocs.length,
        },
        { returnDocument: 'after' },
      );

      console.log(
        `[Worker] Finished processing document ${documentId}: ${chunkDocs.length} chunks saved`,
      );

      return {
        documentId,
        totalChunks: chunkDocs.length,
        status: updated?.status ?? 'completed',
      };
    } catch (error) {
      console.error(`[Worker] Error processing document ${documentId}:`, error);

      // Clean up orphan chunks and mark document as failed
      await Promise.allSettled([
        documentChunkModel.deleteMany({
          documentId: new Types.ObjectId(documentId),
        }),
        documentModel.findByIdAndUpdate(documentId, {
          status: 'failed',
        }),
      ]);

      throw error;
    }
  },
  {
    connection: redisClient,
    concurrency: 5,
  },
);

fileUploadWorker.on('completed', (job) => {
  console.log(
    `[Worker] Job ${job.id} for document ${job.data?.documentId} completed successfully`,
  );
});

fileUploadWorker.on('failed', (job, err) => {
  console.error(
    `[Worker] Job ${job?.id} failed with error:`,
    err?.message || err,
  );
});
