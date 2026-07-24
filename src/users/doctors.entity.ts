import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Users } from './users.entity';

@Entity()
export class Doctors {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Users)
  @JoinColumn()
  user: Users;

  @Column()
  specialization: string;

  @Column()
  qualifications: string;

  @Column({ type: 'int' })
  experienceYears: number;

  @Column()
  licenseNumber: string;

  @Column({ type: 'text', nullable: true })
  bio: string;
}
