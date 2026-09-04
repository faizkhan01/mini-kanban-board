import { Module } from '@nestjs/common';
import { BoardAccessService } from './board-access.service';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';

@Module({
  controllers: [BoardsController],
  providers: [BoardsService, BoardAccessService],
  exports: [BoardAccessService],
})
export class BoardsModule {}
