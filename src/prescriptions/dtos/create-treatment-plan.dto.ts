import { IsDateString, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTreatmentPlanDto {
  @ApiProperty({ example: 13 })
  @IsInt()
  patientId: number;

  @ApiProperty({ example: 'Diabetes management plan' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Monitor blood glucose daily and follow the prescribed diet.' })
  @IsString()
  @IsNotEmpty()
  details: string;

  @ApiProperty({ example: '2026-07-29' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-10-29' })
  @IsDateString()
  endDate: string;
}