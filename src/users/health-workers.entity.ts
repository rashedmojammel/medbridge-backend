import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Users } from './users.entity';

@Entity()
export class HealthWorkers {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Users)
  @JoinColumn()
  user: Users;

  @Column()
  assignedArea: string;

  @Column({ type: 'date' })
  activeSince: string;
}
