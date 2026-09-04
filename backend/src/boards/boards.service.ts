import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BoardAccessService } from './board-access.service';
import {
  CreateBoardDto,
  ShareBoardDto,
  UpdateBoardDto,
  UpdateMemberDto,
} from './dto/board.dto';

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
  ) {}

  // Boards the user owns or has been given access to.
  async list(userId: string) {
    const boards = await this.prisma.board.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { where: { userId }, select: { role: true } },
        _count: { select: { columns: true, tasks: true } },
      },
    });
    return boards.map(({ members, ...b }) => ({
      ...b,
      myRole:
        b.ownerId === userId
          ? BoardRole.OWNER
          : (members[0]?.role ?? BoardRole.VIEWER),
    }));
  }

  async create(userId: string, dto: CreateBoardDto) {
    return this.prisma.board.create({
      data: {
        name: dto.name,
        ownerId: userId,
        columns: {
          create: DEFAULT_COLUMNS.map((name, position) => ({ name, position })),
        },
      },
      include: { columns: true },
    });
  }

  // Full board payload: ordered columns, each with its ordered tasks.
  async getOne(boardId: string, userId: string) {
    const role = await this.access.require(boardId, userId, BoardRole.VIEWER);
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        columns: {
          orderBy: { position: 'asc' },
          include: { tasks: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!board) throw new NotFoundException('Board not found');
    return { ...board, myRole: role };
  }

  async rename(boardId: string, userId: string, dto: UpdateBoardDto) {
    await this.access.require(boardId, userId, BoardRole.EDITOR);
    return this.prisma.board.update({
      where: { id: boardId },
      data: { name: dto.name },
    });
  }

  async remove(boardId: string, userId: string) {
    await this.access.require(boardId, userId, BoardRole.OWNER);
    await this.prisma.board.delete({ where: { id: boardId } });
    return { deleted: true };
  }

  // Sharing

  async share(boardId: string, userId: string, dto: ShareBoardDto) {
    await this.access.require(boardId, userId, BoardRole.OWNER);

    const target = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, name: true, email: true },
    });
    if (!target) throw new NotFoundException('No registered user with that email');

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true },
    });
    if (board?.ownerId === target.id) {
      throw new BadRequestException('User already owns this board');
    }

    const member = await this.prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId: target.id } },
      create: { boardId, userId: target.id, role: dto.role as BoardRole },
      update: { role: dto.role as BoardRole },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return member;
  }

  async updateMember(
    boardId: string,
    userId: string,
    memberUserId: string,
    dto: UpdateMemberDto,
  ) {
    await this.access.require(boardId, userId, BoardRole.OWNER);
    const existing = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: memberUserId } },
    });
    if (!existing) throw new NotFoundException('Member not found');
    return this.prisma.boardMember.update({
      where: { boardId_userId: { boardId, userId: memberUserId } },
      data: { role: dto.role as BoardRole },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async revoke(boardId: string, userId: string, memberUserId: string) {
    // Owners can remove anyone; members can remove themselves (leave board).
    if (memberUserId !== userId) {
      await this.access.require(boardId, userId, BoardRole.OWNER);
    } else {
      const role = await this.access.getRole(boardId, userId);
      if (!role) throw new NotFoundException('Board not found');
      if (role === BoardRole.OWNER) {
        throw new ForbiddenException('Owner cannot leave their own board');
      }
    }
    await this.prisma.boardMember
      .delete({ where: { boardId_userId: { boardId, userId: memberUserId } } })
      .catch(() => {
        throw new NotFoundException('Member not found');
      });
    return { removed: true };
  }
}
