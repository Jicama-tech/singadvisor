import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CrmService } from './crm.service';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { AddNoteDto } from './dto/add-note.dto';

const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const IMPORT_ACCEPTED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);

type AuthedRequest = { user?: { name?: string; email?: string } };

/** Admin-only end to end — the CRM never has a public-facing route (unlike
 * Blog/Newsletter's own controllers), so every method here is guarded. */
@Controller('crm/contacts')
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('tag') tag?: string,
    @Query('leadStatus') leadStatus?: string,
    @Query('source') source?: string,
  ) {
    return this.crmService.findAll({ q, tag, leadStatus, source });
  }

  @Get('export')
  async exportCsv(
    @Res() res: Response,
    @Query('q') q?: string,
    @Query('tag') tag?: string,
    @Query('leadStatus') leadStatus?: string,
    @Query('source') source?: string,
  ) {
    const csv = await this.crmService.exportCsv({ q, tag, leadStatus, source });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.send(csv);
  }

  /** Re-runnable on purpose (see CrmService.backfill docs) — a dedicated
   * route rather than an automatic startup hook, so it only ever runs when
   * an admin deliberately asks for it. */
  @Post('backfill')
  backfill() {
    return this.crmService.backfill();
  }

  /** Bulk-add from a .csv/.xlsx/.xls file — memoryStorage + a size/extension
   * check up front, same discipline as careers' résumé upload. */
  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMPORT_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!IMPORT_ACCEPTED_EXTENSIONS.has(ext)) {
          cb(new BadRequestException('Please upload a CSV or Excel (.xlsx/.xls) file.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  importContacts(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.crmService.importFromSpreadsheet(file.buffer, file.originalname);
  }

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.crmService.createManual(dto);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.crmService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.crmService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crmService.remove(id);
  }

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() dto: AddNoteDto, @Req() req: AuthedRequest) {
    return this.crmService.addNote(id, dto, req.user?.name || req.user?.email || 'Admin');
  }

  @Delete(':id/notes/:noteId')
  deleteNote(@Param('id') id: string, @Param('noteId') noteId: string) {
    return this.crmService.deleteNote(id, noteId);
  }
}
