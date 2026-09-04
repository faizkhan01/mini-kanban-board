import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class UpdateColumnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class ReorderColumnDto {
  // Target 0-based index among the board's columns.
  @IsInt()
  @Min(0)
  position!: number;
}
