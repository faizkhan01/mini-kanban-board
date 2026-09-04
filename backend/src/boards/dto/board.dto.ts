import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class UpdateBoardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class ShareBoardDto {
  @IsEmail()
  email!: string;

  @IsIn(['EDITOR', 'VIEWER'])
  role!: 'EDITOR' | 'VIEWER';
}

export class UpdateMemberDto {
  @IsIn(['EDITOR', 'VIEWER'])
  role!: 'EDITOR' | 'VIEWER';
}
