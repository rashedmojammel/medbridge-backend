import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationsModule } from './notifications/notifications.module';
import { PatientsModule } from './patients/patients.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TriageModule } from './triage/triage.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicinesModule } from './medicines/medicines.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER', 'postgres'),
        password: config.get('DATABASE_PASSWORD'),
        database: config.get('DATABASE_NAME', 'medbridge'),
        autoLoadEntities: true,
        synchronize: true, // dev only - use migrations in production
      }),
    }),
    ScheduleModule.forRoot(),
    NotificationsModule,
    PatientsModule,
    AuthModule,
    UsersModule,
    TriageModule,
    ConsultationsModule,
    AppointmentsModule,
    MedicinesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
