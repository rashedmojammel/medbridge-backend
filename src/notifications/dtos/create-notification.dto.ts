import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationType } from 'src/auth/user-role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationsDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 'EMERGENCY_ALERT' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'New Message' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'You have a new message from your doctor.' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  refId?: number;
}
