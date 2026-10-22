import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DocumentRecord = HydratedDocument<Document>;

@Schema({ timestamps: true })
export class Document {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ default: '' })
  originalText: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  status: string;

  @Prop({ default: 0 })
  totalChunks: number;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
