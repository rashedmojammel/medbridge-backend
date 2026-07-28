import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  patientId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  doctorId: number;

  @ApiProperty({ example: '2024-06-01T10:00:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ example: 'Consultation', required: false })
  @IsOptional()
  @IsString()
  type?: string;
}
