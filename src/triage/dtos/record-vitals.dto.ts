import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordVitalsDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  patientId: number;

  @ApiProperty({ example: 36.6 })
  @IsNumber()
  @Min(30)
  @Max(45)
  temperature: number;

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(50)
  @Max(260)
  bpSystolic: number;

  @ApiProperty({ example: 80 })
  @IsInt()
  @Min(30)
  @Max(200)
  bpDiastolic: number;

  @ApiProperty({ example: 70 })
  @IsInt()
  @Min(20)
  @Max(250)
  pulse: number;


  @ApiProperty({ example: 98 })
  @IsInt()
  @Min(0)
  @Max(100)
  spo2: number;

  @ApiProperty({ example: 18, required: false })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(80)
  respiratoryRate?: number;

  @ApiProperty({ example: 120, required: false })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(800)
  bloodSugar?: number;
}
