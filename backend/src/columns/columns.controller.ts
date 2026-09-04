import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { ColumnsService } from './columns.service';
import {
  CreateColumnDto,
  ReorderColumnDto,
  UpdateColumnDto,
} from './dto/column.dto';

@Controller()
export class ColumnsController {
  constructor(private readonly columns: ColumnsService) {}

  @Post('boards/:boardId/columns')
  create(
    @Param('boardId') boardId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateColumnDto,
  ) {
    return this.columns.create(boardId, user.id, dto);
  }

  @Patch('columns/:id')
  rename(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.columns.rename(id, user.id, dto);
  }

  @Patch('columns/:id/reorder')
  reorder(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderColumnDto,
  ) {
    return this.columns.reorder(id, user.id, dto);
  }

  @Delete('columns/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.columns.remove(id, user.id);
  }
}
