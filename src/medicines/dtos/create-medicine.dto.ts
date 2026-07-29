import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

const DOSAGE_FORMS = [
  'TABLET',
  'CAPSULE',
  'SYRUP',
  'CREAM',
  'GEL',
  'INJECTION',
  'OINTMENT',
  'GRANULES',
  'SOLUTION',
  'DROPS',
  'OTHER',
] as const;

export class CreateMedicineDto {
  @ApiProperty({ example: 'Napa 500mg' })
  @IsString() @IsNotEmpty() brandName: string;
  @ApiProperty({ example: 'Paracetamol' })
  @IsString() @IsNotEmpty() genericName: string;
  @ApiPropertyOptional({ example: 'Beximco Pharmaceuticals' })
  @IsOptional() @IsString() manufacturer?: string;

  @ApiProperty({ example: 'TABLET', enum: DOSAGE_FORMS })
  @IsIn(DOSAGE_FORMS)
  dosageForm: string;

  @ApiProperty({ example: '500mg' })
  @IsString() @IsNotEmpty() strength: string;
  @ApiPropertyOptional({ example: 'Analgesic and antipyretic' })
  @IsOptional() @IsString() therapeuticClass?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() isAvailable?: boolean;

  @ApiPropertyOptional({ example: 200, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) stockQty?: number;
  @ApiPropertyOptional({ example: 50, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) threshold?: number;

  @ApiPropertyOptional({ example: [12, 18], type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  alternativeIds?: number[];
}
