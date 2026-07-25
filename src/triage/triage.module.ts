import { Module } from '@nestjs/common';
import { TriageService } from './triage.service';
import { TriageController } from './triage.controller';

@Module({
  providers: [TriageService],
  controllers: [TriageController],
})
export class TriageModule {}
