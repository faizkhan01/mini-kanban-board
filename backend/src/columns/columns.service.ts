import { Injectable, NotFoundException } from '@nestjs/common';
import { BoardRole, Prisma } from '@prisma/client';
import { BoardAccessService } from '../boards/board-access.service';
import { applyMove } from '../common/ordering';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateColumnDto,
  ReorderColumnDto,
  UpdateColumnDto,
} from './dto/column.dto';

// Writes 0-based positions for `orderedIds` in two passes (scratch range, then final) to never break the unique constraint.
async function resequenceColumns(
  tx: Prisma.TransactionClient,
  orderedIds: string[],
) {
  const OFFSET = 100000;
  for (let i = 0; i < orderedIds.length; i++) {
    await tx.column.update({
      where: { id: orderedIds[i] },
      data: { position: i + OFFSET },
    });
  }
  for (let i = 0; i < orderedIds.length; i++) {
    await tx.column.update({ where: { id: orderedIds[i] }, data: { position: i } });
  }
}

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
  ) {}

  async create(boardId: string, userId: string, dto: CreateColumnDto) {
    await this.access.require(boardId, userId, BoardRole.EDITOR);
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.column.count({ where: { boardId } });
      return tx.column.create({
        data: { boardId, name: dto.name, position: count },
      });
    });
  }

  async rename(columnId: string, userId: string, dto: UpdateColumnDto) {
    await this.access.requireViaColumn(columnId, userId, BoardRole.EDITOR);
    return this.prisma.column.update({
      where: { id: columnId },
      data: { name: dto.name },
    });
  }

  async remove(columnId: string, userId: string) {
    const { boardId } = await this.access.requireViaColumn(
      columnId,
      userId,
      BoardRole.EDITOR,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.column.delete({ where: { id: columnId } });
      const remaining = await tx.column.findMany({
        where: { boardId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      await resequenceColumns(
        tx,
        remaining.map((c) => c.id),
      );
      return { deleted: true };
    });
  }

  async reorder(columnId: string, userId: string, dto: ReorderColumnDto) {
    const { boardId } = await this.access.requireViaColumn(
      columnId,
      userId,
      BoardRole.EDITOR,
    );
    return this.prisma.$transaction(async (tx) => {
      const columns = await tx.column.findMany({
        where: { boardId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      const ids = columns.map((c) => c.id);
      if (!ids.includes(columnId)) {
        throw new NotFoundException('Column not found');
      }

      await resequenceColumns(tx, applyMove(ids, columnId, dto.position));
      return tx.column.findMany({
        where: { boardId },
        orderBy: { position: 'asc' },
      });
    });
  }
}
