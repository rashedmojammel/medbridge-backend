import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Users } from './users.entity';
import { Doctors } from './doctors.entity';
import { HealthWorkers } from './health-workers.entity';
import { Staff } from './staff.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Doctors, HealthWorkers, Staff])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
