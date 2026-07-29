import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dtos/create-appointment.dto';
import { UpdateAppointmentDto } from './dtos/update-appointment.dto';

@Controller('appointments')
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('appointments')
@ApiBearerAuth('access-token')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(UserRole.DOCTOR, UserRole.CHW)
  create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
    return this.appointmentsService.create(dto, req.user.id);
  }

  @Get()
  @Roles(UserRole.DOCTOR, UserRole.PATIENT, UserRole.CHW, UserRole.ADMIN)
  findAll(@Req() req: any) {
    const { filter } = req.query;
    return this.appointmentsService.findAllFor(req.user, filter);
  }

  @Patch(':id')
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.PATIENT, UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
    @Req() req: any,
  ) {
    return this.appointmentsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.remove(id);
  }
}
