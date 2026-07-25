import { Test, TestingModule } from '@nestjs/testing';
import { TriageController } from './triage.controller';

describe('TriageController', () => {
  let controller: TriageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TriageController],
    }).compile();

    controller = module.get<TriageController>(TriageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
