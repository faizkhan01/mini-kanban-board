import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardRole, Prisma } from '@prisma/client';
import { BoardAccessService } from '../boards/board-access.service';
import { applyMove } from '../common/ordering';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto/task.dto';

// Writes 0-based positions for `orderedIds` in two passes (scratch range, then final) to never break the unique constraint.
async function resequenceTasks(
  tx: Prisma.TransactionClient,
  orderedIds: string[],
) {
  const OFFSET = 1_000_000;
  for (let i = 0; i < orderedIds.length; i++) {
    await tx.task.update({
      where: { id: orderedIds[i] },
      data: { position: i + OFFSET },
    });
  }
  for (let i = 0; i < orderedIds.length; i++) {
    await tx.task.update({ where: { id: orderedIds[i] }, data: { position: i } });
  }
}

// Postgres serialization failure / Prisma write-conflict codes.
function isSerializationError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === 'P2034' || code === '40001' || code === '40P01';
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
  ) {}

  async create(columnId: string, userId: string, dto: CreateTaskDto) {
    const { boardId } = await this.access.requireViaColumn(
      columnId,
      userId,
      BoardRole.EDITOR,
    );
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.task.count({ where: { columnId } });
      return tx.task.create({
        data: {
          boardId,
          columnId,
          title: dto.title,
          description: dto.description ?? null,
          position: count,
        },
      });
    });
  }

  async update(taskId: string, userId: string, dto: UpdateTaskDto) {
    await this.access.requireViaTask(taskId, userId, BoardRole.EDITOR);
    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    return this.prisma.task.update({ where: { id: taskId }, data });
  }

  async remove(taskId: string, userId: string) {
    const { columnId } = await this.access.requireViaTask(
      taskId,
      userId,
      BoardRole.EDITOR,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: taskId } });
      const remaining = await tx.task.findMany({
        where: { columnId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      await resequenceTasks(
        tx,
        remaining.map((t) => t.id),
      );
      return { deleted: true };
    });
  }

  // Reorders within a column or moves across columns of the same board; retries on serialization conflicts.
  async move(taskId: string, userId: string, dto: MoveTaskDto) {
    const { boardId, columnId: fromColumnId } =
      await this.access.requireViaTask(taskId, userId, BoardRole.EDITOR);

    for (let attempt = 0; ; attempt++) {
      try {
        return await this.runMove(taskId, boardId, fromColumnId, dto);
      } catch (err) {
        if (attempt < 3 && isSerializationError(err)) continue;
        if (isSerializationError(err)) {
          throw new ConflictException('Board was busy, please retry');
        }
        throw err;
      }
    }
  }

  private runMove(
    taskId: string,
    boardId: string,
    fromColumnId: string,
    dto: MoveTaskDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const targetColumn = await tx.column.findUnique({
          where: { id: dto.columnId },
          select: { boardId: true },
        });
        if (!targetColumn) throw new NotFoundException('Target column not found');
        if (targetColumn.boardId !== boardId) {
          throw new BadRequestException(
            'Cannot move a task to a column on a different board',
          );
        }

        const sameColumn = fromColumnId === dto.columnId;

        const sourceIds = (
          await tx.task.findMany({
            where: { columnId: fromColumnId },
            orderBy: { position: 'asc' },
            select: { id: true },
          })
        ).map((t) => t.id);
        const sourceWithout = sourceIds.filter((id) => id !== taskId);

        const destinationBase = sameColumn
          ? sourceWithout
          : (
              await tx.task.findMany({
                where: { columnId: dto.columnId },
                orderBy: { position: 'asc' },
                select: { id: true },
              })
            ).map((t) => t.id);

        const targetIds = applyMove(destinationBase, taskId, dto.position);

        // Park the moved task clear of any live position before resequencing.
        await tx.task.update({
          where: { id: taskId },
          data: { columnId: dto.columnId, position: 2_000_000 },
        });

        if (!sameColumn) {
          await resequenceTasks(tx, sourceWithout);
        }
        await resequenceTasks(tx, targetIds);

        return tx.task.findMany({
          where: { boardId },
          orderBy: [{ columnId: 'asc' }, { position: 'asc' }],
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
