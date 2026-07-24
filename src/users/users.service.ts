import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Users } from './users.entity';
import { Doctors } from './doctors.entity';
import { HealthWorkers } from './health-workers.entity';
import { Staff } from './staff.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserRole } from '../auth/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users) private usersRepo: Repository<Users>,
    @InjectRepository(Doctors) private doctorsRepo: Repository<Doctors>,
    @InjectRepository(HealthWorkers) private chwRepo: Repository<HealthWorkers>,
    @InjectRepository(Staff) private staffRepo: Repository<Staff>,
    private dataSource: DataSource,
  ) {}

  async findByEmail(email: string): Promise<Users | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: number): Promise<Users> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: { doctorProfile: true, chwProfile: true, staffProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto): Promise<Users> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    return this.dataSource.transaction(async (manager) => {
      const passwordHash = await bcrypt.hash(dto.password, 10);

      const user = manager.create(Users, {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        password: passwordHash,
        role: dto.role,
        isPublic: dto.isPublic ?? false,
      });
      const savedUser = await manager.save(user);

      if (dto.role === UserRole.DOCTOR) {
        const doctor = manager.create(Doctors, {
          user: savedUser,
          specialization: dto.specialization ?? '',
          qualifications: dto.qualifications ?? '',
          experienceYears: dto.experienceYears ?? 0,
          licenseNumber: dto.licenseNumber ?? '',
          bio: dto.bio ?? '',
        });
        await manager.save(doctor);
      }

      if (dto.role === UserRole.CHW) {
        const chw = manager.create(HealthWorkers, {
          user: savedUser,
          assignedArea: dto.assignedArea ?? '',
          activeSince: new Date().toISOString().slice(0, 10),
        });
        await manager.save(chw);
      }

      if (dto.role === UserRole.STAFF || dto.role === UserRole.PHARMACIST) {
        const staff = manager.create(Staff, {
          user: savedUser,
          department: dto.department ?? '',
          designation: dto.designation ?? dto.role,
        });
        await manager.save(staff);
      }

      return savedUser;
    });
  }

  async findAll(filters: {
    role?: UserRole;
    isActive?: boolean;
    isPublic?: boolean;
    search?: string;
    page: number;
  }) {
    const pageSize = 20;
    const page = Math.max(1, filters.page);
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.doctorProfile', 'doctorProfile')
      .leftJoinAndSelect('user.chwProfile', 'chwProfile')
      .leftJoinAndSelect('user.staffProfile', 'staffProfile');

    if (filters.role) qb.andWhere('user.role = :role', { role: filters.role });
    if (filters.isActive !== undefined)
      qb.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    if (filters.isPublic !== undefined)
      qb.andWhere('user.isPublic = :isPublic', { isPublic: filters.isPublic });
    if (filters.search)
      qb.andWhere('(user.fullName ILIKE :s OR user.email ILIKE :s)', {
        s: `%${filters.search}%`,
      });

    const [data, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async update(id: number, dto: UpdateUserDto): Promise<Users> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    return this.usersRepo.save(user);
  }

  async savePhotoPath(id: number, path: string): Promise<Users> {
    const user = await this.findById(id);
    user.profileImage = path;
    return this.usersRepo.save(user);
  }

  async publicDoctors(search?: string, specialization?: string) {
    const qb = this.doctorsRepo
      .createQueryBuilder('doctor')
      .innerJoinAndSelect('doctor.user', 'user')
      .where('user.isPublic = true')
      .andWhere('user.isActive = true');

    if (search) qb.andWhere('user.fullName ILIKE :s', { s: `%${search}%` });
    if (specialization)
      qb.andWhere('doctor.specialization ILIKE :spec', {
        spec: `%${specialization}%`,
      });

    const doctors = await qb.getMany();
    return doctors.map((d) => this.toPublicDoctor(d));
  }

  async publicDoctorById(id: number) {
    const doctor = await this.doctorsRepo.findOne({
      where: { id, user: { isPublic: true, isActive: true } },
      relations: { user: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return this.toPublicDoctor(doctor);
  }

  async publicChws(search?: string, area?: string) {
    const qb = this.chwRepo
      .createQueryBuilder('chw')
      .innerJoinAndSelect('chw.user', 'user')
      .where('user.isPublic = true')
      .andWhere('user.isActive = true');

    if (search) qb.andWhere('user.fullName ILIKE :s', { s: `%${search}%` });
    if (area) qb.andWhere('chw.assignedArea ILIKE :a', { a: `%${area}%` });

    const chws = await qb.getMany();
    return chws.map((c) => ({
      id: c.id,
      fullName: c.user.fullName,
      assignedArea: c.assignedArea,
      profileImage: c.user.profileImage,
    }));
  }

  async publicStaff(department?: string) {
    const qb = this.staffRepo
      .createQueryBuilder('staff')
      .innerJoinAndSelect('staff.user', 'user')
      .where('user.isPublic = true')
      .andWhere('user.isActive = true');

    if (department)
      qb.andWhere('staff.department ILIKE :d', { d: `%${department}%` });

    const staff = await qb.getMany();
    return staff.map((s) => ({
      id: s.id,
      fullName: s.user.fullName,
      department: s.department,
      designation: s.designation,
      profileImage: s.user.profileImage,
    }));
  }

  private toPublicDoctor(d: Doctors) {
    return {
      id: d.id,
      fullName: d.user.fullName,
      specialization: d.specialization,
      qualifications: d.qualifications,
      experienceYears: d.experienceYears,
      bio: d.bio,
      profileImage: d.user.profileImage,
    };
  }
}
