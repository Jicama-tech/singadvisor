import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OperatorsService } from './operators.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { SessionPayload } from '../auth/session-payload';

@Controller('operators')
@UseGuards(JwtAuthGuard)
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Get()
  findAll() {
    return this.operatorsService.findForAdmin();
  }

  /** The logged-in operator's own record (fresh accessTabs for the SPA). */
  @Get('me')
  me(@Req() req: Request & { user: SessionPayload }) {
    return this.operatorsService.findMe(req.user.sub);
  }

  @Post()
  create(@Body() dto: CreateOperatorDto, @Req() req: Request & { user: SessionPayload }) {
    return this.operatorsService.create(dto, req.user.email || req.user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOperatorDto) {
    return this.operatorsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.operatorsService.remove(id);
  }

  @Post('change-password')
  changePassword(
    @Req() req: Request & { user: SessionPayload },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.operatorsService.changePassword(
      req.user.sub,
      body.currentPassword,
      body.newPassword,
    );
  }
}
