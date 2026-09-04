import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const RANK: Record<BoardRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

@Injectable()
export class BoardAccessService {
  constructor(private readonly prisma: PrismaService) {}

  // Effective role for a user on a board, or null if the board is invisible to them.
  async getRole(boardId: string, userId: string): Promise<BoardRole | null> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: {
        ownerId: true,
        members: { where: { userId }, select: { role: true } },
      },
    });
    if (!board) return null;
    if (board.ownerId === userId) return BoardRole.OWNER;
    return board.members[0]?.role ?? null;
  }

  // Requires at least `minRole`: 404 when the board is invisible (no leak), 403 when the role is too low.
  async require(
    boardId: string,
    userId: string,
    minRole: BoardRole = BoardRole.VIEWER,
  ): Promise<BoardRole> {
    const role = await this.getRole(boardId, userId);
    if (!role) throw new NotFoundException('Board not found');
    if (RANK[role] < RANK[minRole]) {
      throw new ForbiddenException(
        `Requires ${minRole.toLowerCase()} access to this board`,
      );
    }
    return role;
  }

  // Checks access via the column's owning board.
  async requireViaColumn(
    columnId: string,
    userId: string,
    minRole: BoardRole = BoardRole.VIEWER,
  ): Promise<{ boardId: string; role: BoardRole }> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    if (!column) throw new NotFoundException('Column not found');
    const role = await this.require(column.boardId, userId, minRole);
    return { boardId: column.boardId, role };
  }

  // Checks access via the task's owning board.
  async requireViaTask(
    taskId: string,
    userId: string,
    minRole: BoardRole = BoardRole.VIEWER,
  ): Promise<{ boardId: string; columnId: string; role: BoardRole }> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { boardId: true, columnId: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    const role = await this.require(task.boardId, userId, minRole);
    return { boardId: task.boardId, columnId: task.columnId, role };
  }
}
