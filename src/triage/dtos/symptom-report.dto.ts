import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TriageStatus } from '../../auth/user-role.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SymptomReportDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  patientId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  vitalSignId?: number;

  @ApiProperty({ example: 'Persistent cough and fever' })
  @IsString()
  @IsNotEmpty()
  primaryComplaint: string;

  @ApiProperty({ example: ['cough', 'fever'], type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  symptoms: string[];

  @ApiPropertyOptional({ example: '3 days' })
  @IsOptional() @IsString() duration?: string;

  @ApiProperty({ example: 'MODERATE', enum: ['MILD', 'MODERATE', 'SEVERE'] })
  @IsIn(['MILD', 'MODERATE', 'SEVERE'])
  severity: string;

  @ApiProperty({ enum: TriageStatus, example: TriageStatus.CRITICAL })
  @IsEnum(TriageStatus)
  triageStatus: TriageStatus;

  @ApiPropertyOptional({ example: 'Patient reports symptoms worsening at night.' })
  @IsOptional() @IsString() notes?: string;
}
