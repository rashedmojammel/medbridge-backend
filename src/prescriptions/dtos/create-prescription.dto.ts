import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsInt, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PrescriptionItemDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  medicineId: number;

  @ApiProperty({ example: '1 tablet' })
  @IsString()
  dosage: string;

  @ApiProperty({ example: 'Three times daily' })
  @IsString()
  frequency: string;

  @ApiProperty({ example: '5 days' })
  @IsString()
  duration: string;

  @ApiPropertyOptional({ example: 'ORAL' })
  @IsOptional() @IsString() route?: string;
  @ApiPropertyOptional({ example: 'Take after meals' })
  @IsOptional() @IsString() instructions?: string;
}

export class CreatePrescriptionDto {
  @ApiPropertyOptional({ example: 22 })
  @IsOptional()
  @IsInt()
  consultationId?: number;

  @ApiProperty({ example: 13 })
  @IsInt()
  patientId: number;

  @ApiPropertyOptional({ example: 'Rest, hydrate, and return if symptoms persist.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PrescriptionItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}