import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DocumentRecord = HydratedDocument<Document>;

@Schema({ timestamps: true })
export class Document {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalText: string;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
