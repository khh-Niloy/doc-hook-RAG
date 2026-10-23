import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DocumentRecord = HydratedDocument<Document>;

@Schema({ timestamps: true })
export class Document {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalText: string;

  @Prop({
    type: [
      {
        text: { type: String, required: true },
        embedding: { type: [Number], required: true },
      },
    ],
    default: [],
  })
  chunks: {
    text: string;
    embedding: number[];
  }[];
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
