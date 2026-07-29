import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dtos/create-prescription.dto';
import { CreateTreatmentPlanDto } from './dtos/create-treatment-plan.dto';

class CancelPrescriptionDto {
  @ApiProperty({ example: 'Medication is no longer appropriate for the patient.' })
  @IsString() @IsNotEmpty() reason: string;
}

@Controller()
@UseGuards(JwtGuard, RolesGuard)
@ApiTags('prescriptions')
@ApiBearerAuth('access-token')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  /** #25 */
  @Post('prescriptions')
  @Roles(UserRole.DOCTOR)
  create(@Body() dto: CreatePrescriptionDto, @Req() req: any) {
    return this.prescriptionsService.create(dto, req.user.id);
  }

  /** #26 */
  @Get('prescriptions')
  @Roles(UserRole.DOCTOR, UserRole.PATIENT)
  findAll(@Req() req: any) {
    return this.prescriptionsService.findAllFor(req.user);
  }

  /** #27 */
  @Get('prescriptions/:id')
  @Roles(UserRole.DOCTOR, UserRole.PATIENT, UserRole.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.prescriptionsService.findOne(id, req.user);
  }

  /** #28 - cancel & reissue is the only "edit" path */
  @Patch('prescriptions/:id/cancel')
  @Roles(UserRole.DOCTOR)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPrescriptionDto,
    @Req() req: any,
  ) {
    return this.prescriptionsService.cancel(id, req.user.id, dto.reason);
  }

  /** #29 */
  @Post('treatment-plans')
  @Roles(UserRole.DOCTOR)
  createPlan(@Body() dto: CreateTreatmentPlanDto, @Req() req: any) {
    return this.prescriptionsService.createPlan(dto, req.user.id);
  }

  /** #30 */
  @Get('treatment-plans/patient/:patientId')
  @Roles(UserRole.DOCTOR, UserRole.PATIENT, UserRole.ADMIN)
  plansForPatient(@Param('patientId', ParseIntPipe) patientId: number, @Req() req: any) {
    return this.prescriptionsService.plansForPatient(patientId, req.user);
  }
}