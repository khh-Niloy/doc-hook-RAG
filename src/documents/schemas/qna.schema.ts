import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type QnaRecord = HydratedDocument<Qna>;

@Schema({ timestamps: true, collection: 'qnas' })
export class Qna {
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  documentId: string;

  @Prop({ required: true })
  documentName: string;

  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;

  @Prop({ default: false })
  insufficientContext: boolean;

  @Prop({ type: [Object], default: [] })
  rerankedChunks: Array<Record<string, any>>;

  @Prop({ type: [Object], default: [] })
  rawChunks: Array<Record<string, any>>;

  @Prop({ type: Object, default: {} })
  timings: {
    embeddingSeconds: number;
    vectorSearchSeconds: number;
    rerankerSeconds: number;
    geminiSeconds: number;
    totalSeconds: number;
  };
}

export const QnaSchema = SchemaFactory.createForClass(Qna);
