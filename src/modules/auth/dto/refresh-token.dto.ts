import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshToken {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
} 