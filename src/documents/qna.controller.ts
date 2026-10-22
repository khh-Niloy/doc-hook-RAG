import {
  Controller,
  Get,
  Delete,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Controller('qna')
export class QnaController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async getAllQna() {
    return this.documentsService.getAllQnas();
  }

  @Get(':id')
  async getQnaById(@Param('id') id: string) {
    return this.documentsService.getQnaById(id);
  }

  @Delete(':id')
  async deleteQna() {
    throw new ForbiddenException(
      'Deleting conversation history is not allowed.',
    );
  }

  @Delete()
  async clearAllQna() {
    throw new ForbiddenException(
      'Clearing conversation history is not allowed.',
    );
  }
}
