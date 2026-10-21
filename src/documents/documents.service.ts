import {
  Injectable,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Document, DocumentRecord } from './schemas/document.schema';

const EMBEDDING_API_URL =
  process.env.EMBEDDING_API_URL ?? 'https://embedding-api-two.vercel.app';

const BATCH_SIZE = 32;

interface EmbeddingResponse {
  model: string;
  dimensions: number;
  embeddings: number[][];
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document.name)
    private documentModel: Model<DocumentRecord>,
  ) {}

  async extractText(file: Express.Multer.File) {
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    let text: string;

    if (extension === 'txt') {
      text = file.buffer.toString('utf-8');
    } else if (extension === 'pdf') {
      const parser = new PDFParse({ data: file.buffer });

      try {
        const result = await parser.getText();
        text = result.text;
      } finally {
        await parser.destroy();
      }
    } else if (extension === 'docx') {
      const result = await mammoth.extractRawText({
        buffer: file.buffer,
      });
      text = result.value;
    } else {
      throw new BadRequestException('Only PDF, DOCX, and TXT are supported');
    }

    if (!text.trim()) {
      throw new BadRequestException('The uploaded document contains no text');
    }

    const chunks = this.chunkText(text);
    const embeddings = await this.generateEmbeddings(chunks);

    const savedChunks = chunks.map((chunk, index) => ({
      text: chunk,
      embedding: embeddings[index],
    }));

    const savedDocument = await this.documentModel.create({
      filename: file.originalname,
      originalText: text,
      chunks: savedChunks,
    });

    return {
      id: savedDocument._id,
      filename: savedDocument.filename,
      totalChunks: savedDocument.chunks.length,
    };
  }

  private async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      let response: Response;

      try {
        response = await fetch(`${EMBEDDING_API_URL}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ texts: batch }),
          signal: AbortSignal.timeout(60_000),
        });
      } catch {
        throw new BadGatewayException('Could not connect to the Embedding API');
      }

      if (!response.ok) {
        throw new BadGatewayException(
          `Embedding API failed with status ${response.status}`,
        );
      }

      const result = (await response.json()) as EmbeddingResponse;

      if (
        !Array.isArray(result.embeddings) ||
        result.embeddings.length !== batch.length ||
        result.embeddings.some(
          (embedding) => !Array.isArray(embedding) || embedding.length !== 384,
        )
      ) {
        throw new BadGatewayException(
          'Embedding API returned an invalid response',
        );
      }

      allEmbeddings.push(...result.embeddings);
    }

    return allEmbeddings;
  }

  private chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
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
}
