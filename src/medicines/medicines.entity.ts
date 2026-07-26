import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MedicineInventory } from './medicine-inventory.entity';

@Entity()
export class Medicines {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  brandName: string;

  @Column()
  genericName: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column()
  dosageForm: string;

  @Column()
  strength: string;

  @Column({ nullable: true })
  therapeuticClass: string;

  @Column({ nullable: true })
  unitPrice: string;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ default: true })
  isAvailable: boolean;

  @OneToOne(() => MedicineInventory, (i) => i.medicine, { eager: true })
  inventory: MedicineInventory;
}