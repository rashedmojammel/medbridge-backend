import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medicines } from './medicines.entity';

@Entity()
export class MedicineAlternatives {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Medicines, { eager: true, onDelete: 'CASCADE' })
  medicine: Medicines;

  @ManyToOne(() => Medicines, { eager: true, onDelete: 'CASCADE' })
  alternative: Medicines;
}