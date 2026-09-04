import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Lookup registered users by email/name fragment, for board sharing.
  async search(query: string, excludeUserId: string) {
    const q = query.trim();
    if (q.length < 2) return [];
    return this.prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true },
      take: 10,
      orderBy: { email: 'asc' },
    });
  }
}
