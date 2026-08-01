import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Feature } from './feature.entity';
import { Role } from '../role/role.entity';

@Entity('feature_roles')
@Index(['featureId', 'roleId'], { unique: true })
export class FeatureRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  featureId: string;

  @ManyToOne(() => Feature, (feature) => feature.roles, {
    onDelete: 'CASCADE',
  })
  feature: Feature;

  @Column({ type: 'uuid' })
  @Index()
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;
}
