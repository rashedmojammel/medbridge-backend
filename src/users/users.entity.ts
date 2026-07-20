import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../auth/user-role.enum';
import { Doctors } from './doctors.entity';
import { HealthWorkers } from './health-workers.entity';
import { Staff } from './staff.entity';


@Entity()
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column()
  @Exclude() 
  password: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  profileImage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Doctors, (doctor) => doctor.user)
  doctorProfile: Doctors;

  @OneToOne(() => HealthWorkers, (chw) => chw.user)
  chwProfile: HealthWorkers;

  @OneToOne(() => Staff, (staff) => staff.user)
  staffProfile: Staff;

}