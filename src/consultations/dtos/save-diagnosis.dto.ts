import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveDiagnosisDto {
  @ApiProperty({ example: 'Common cold' })
  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @ApiProperty({ example: 'Patient should rest and stay hydrated', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
