import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../auth/user-role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'DOCTOR', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  //  Doctor-only fields
  @ApiProperty({ example: 'Cardiologist', required: false })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ example: 'MBBS, MD', required: false })
  @IsOptional()
  @IsString()
  qualifications?: string;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsInt()
  experienceYears?: number;

  @ApiProperty({ example: 'LIC123456', required: false })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ example: 'Experienced cardiologist', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  // CHW-only fields
  @ApiProperty({ example: 'Springfield', required: false })
  @IsOptional()
  @IsString()
  assignedArea?: string;

  //  Staff-only fields
  @ApiProperty({ example: 'Human Resources', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ example: 'Manager', required: false })
  @IsOptional()
  @IsString()
  designation?: string;
}
