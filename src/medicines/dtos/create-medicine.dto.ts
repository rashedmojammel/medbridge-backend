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
  @IsString() @IsNotEmpty() brandName: string;
  @IsString() @IsNotEmpty() genericName: string;
  @IsOptional() @IsString() manufacturer?: string;

  @IsIn(DOSAGE_FORMS)
  dosageForm: string;

  @IsString() @IsNotEmpty() strength: string;
  @IsOptional() @IsString() therapeuticClass?: string;

  @IsOptional() @IsBoolean() isAvailable?: boolean;

  @IsOptional() @IsInt() @Min(0) stockQty?: number;
  @IsOptional() @IsInt() @Min(0) threshold?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  alternativeIds?: number[];
}
