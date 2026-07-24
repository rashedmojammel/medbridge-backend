import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, Like, Repository } from 'typeorm';
import { UserRole } from '../auth/user-role.enum';
import { Patients } from './patients.entity';
import { CreatePatientDto } from './dtos/create-patient.dto';
import { UpdatePatientDto } from './dtos/update-patient.dto';

/** MRN format: P-YYYY-NNNNNN */
export async function generateMrn(manager: EntityManager): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `P-${year}-`;

  // count existing MRNs for this year
  const count = await manager.count(Patients, {
    where: { mrn: Like(`${prefix}%`) },
  });

  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patients) private patientsRepo: Repository<Patients>,
    private dataSource: DataSource,
  ) {}

  /** CHW registers a new patient */
  async create(dto: CreatePatientDto, chwUserId: number) {
    return this.dataSource.transaction(async (manager) => {
      const mrn = await generateMrn(manager);
      const patient = manager.create(Patients, {
        ...dto,
        mrn,
        registeredBy: { id: chwUserId } as any,
      });
      return manager.save(patient);
    });
  }

  /** List/search patients */
  async findAll(search?: string) {
    if (!search) {
      return this.patientsRepo.find({
        relations: { user: true },
        order: { createdAt: 'DESC' },
      });
    }

    // search across MRN, name, or phone
    return this.patientsRepo.find({
      where: [
        { mrn: ILike(`%${search}%`) },
        { fullName: ILike(`%${search}%`) },
        { phone: ILike(`%${search}%`) },
      ],
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  /** Get one patient with ownership check */
  async findOne(id: number, requester: { id: number; role: UserRole }) {
    const patient = await this.patientsRepo.findOne({
      where: { id },
      relations: { registeredBy: true, user: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    // patients can only view their own record
    if (requester.role === UserRole.PATIENT) {
      if (!patient.user || patient.user.id !== requester.id)
        throw new ForbiddenException('You can only view your own record');
    }

    return patient;
  }

  /** Find patient by their login account */
  async findByUserId(userId: number) {
    return this.patientsRepo.findOne({ where: { user: { id: userId } } });
  }

  /** Update demographics (MRN can't be changed - not in DTO) */
  async update(id: number, dto: UpdatePatientDto) {
    const patient = await this.patientsRepo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    Object.assign(patient, dto);
    return this.patientsRepo.save(patient);
  }

  /** Delete - blocked if patient has any clinical records */
  async remove(id: number) {
    const patient = await this.patientsRepo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    try {
      await this.patientsRepo.remove(patient);
      return { deleted: true };
    } catch (err) {
      if (err.code === '23503') {
        throw new BadRequestException(
          'Cannot delete a patient with existing clinical records',
        );
      }
      throw err;
    }
  }
}
