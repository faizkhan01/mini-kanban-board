import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post('columns/:columnId/tasks')
  create(
    @Param('columnId') columnId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(columnId, user.id, dto);
  }

  @Patch('tasks/:id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(id, user.id, dto);
  }

  @Patch('tasks/:id/move')
  move(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasks.move(id, user.id, dto);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tasks.remove(id, user.id);
  }
}
