import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  dob: string;

  @ApiProperty({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender: string;

  @IsOptional()
  @ApiProperty({ example: 'A+', required: false })
  @IsString()
  bloodGroup?: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '+0987654321', required: false })
  @IsOptional()
  @IsString()
  altPhone?: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Springfield', required: false })
  @IsOptional()
  @IsString()
  village?: string;
  @ApiProperty({ example: 'Greene County', required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  emergencyContactName: string;

  @ApiProperty({ example: 'Spouse', required: false })
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  emergencyContactPhone: string;

  @ApiProperty({ example: 'Peanuts', required: false })
  @IsOptional()
  @IsString()
  allergies?: string;
  @ApiProperty({ example: 'Diabetes', required: false })
  @IsOptional()
  @IsString()
  chronicConditions?: string;
  @ApiProperty({ example: 'Metformin', required: false })
  @IsOptional()
  @IsString()
  currentMedications?: string;
}
