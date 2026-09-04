import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { BoardsService } from './boards.service';
import {
  CreateBoardDto,
  ShareBoardDto,
  UpdateBoardDto,
  UpdateMemberDto,
} from './dto/board.dto';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.boards.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBoardDto) {
    return this.boards.create(user.id, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.boards.getOne(id, user.id);
  }

  @Patch(':id')
  rename(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boards.rename(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.boards.remove(id, user.id);
  }

  // Sharing

  @Post(':id/members')
  share(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ShareBoardDto,
  ) {
    return this.boards.share(id, user.id, dto);
  }

  @Patch(':id/members/:userId')
  updateMember(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.boards.updateMember(id, user.id, memberUserId, dto);
  }

  @Delete(':id/members/:userId')
  revoke(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.boards.revoke(id, user.id, memberUserId);
  }
}
