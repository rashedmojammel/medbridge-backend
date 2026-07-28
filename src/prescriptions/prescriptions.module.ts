import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Patients } from '../patients/patients.entity';
import { PrescriptionItems } from './prescription-items.entity';
import { Prescriptions } from './prescriptions.entity';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { TreatmentPlans } from './treatment-plans.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prescriptions, PrescriptionItems, TreatmentPlans, Patients]),
    NotificationsModule,
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}