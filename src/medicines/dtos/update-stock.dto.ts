import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { StockAction } from '../../auth/user-role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty({ enum: StockAction, example: StockAction.REDUCE })
  @IsIn(Object.values(StockAction))
  action: StockAction;

  @ApiProperty({ example: 30, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'Dispensed to patient' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
