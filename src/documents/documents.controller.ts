import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentsService.embeddedChunk(file);
  }

  @Post('search')
  async search(@Body() body: SearchQueryDto) {
    if (!body || typeof body.query !== 'string' || !body.query.trim()) {
      throw new BadRequestException('A non-empty query string is required');
    }

    return this.documentsService.embedQuery(body.query.trim());
  }
}
