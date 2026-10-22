import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './documents.controller';
import { QnaController } from './qna.controller';
import { DocumentsService } from './documents.service';
import { Document, DocumentSchema } from './schemas/document.schema';
import {
  DocumentChunk,
  DocumentChunkSchema,
} from './schemas/document-chunk.schema';
import { Qna, QnaSchema } from './schemas/qna.schema';
import '../workers/fileUpload.worker';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Document.name, schema: DocumentSchema },
      { name: DocumentChunk.name, schema: DocumentChunkSchema },
      { name: Qna.name, schema: QnaSchema },
    ]),
  ],
  controllers: [DocumentsController, QnaController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
