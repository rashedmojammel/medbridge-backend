import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class UpdateAppointmentDto {
  @ApiProperty({ example: '2024-06-01T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ example: 'SCHEDULED', required: false })
  @IsOptional()
  @IsIn(['SCHEDULED', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @ApiProperty({ example: 'Patient requested reschedule', required: false })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
