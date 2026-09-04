import { Controller, Get, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('search')
  search(@Query('q') q = '', @CurrentUser() user: AuthUser) {
    return this.users.search(q, user.id);
  }
}
