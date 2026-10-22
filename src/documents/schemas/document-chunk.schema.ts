import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Document } from './document.schema';

export type DocumentChunkRecord = HydratedDocument<DocumentChunk>;

@Schema({ collection: 'document_chunks', timestamps: true })
export class DocumentChunk {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Document.name,
    required: true,
    index: true,
  })
  documentId: Types.ObjectId;

  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: [Number], required: true })
  embedding: number[];
}

export const DocumentChunkSchema = SchemaFactory.createForClass(DocumentChunk);
