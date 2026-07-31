import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Session } from '../session/session.entity';
import { Role } from '../role/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationDeadlineAt: Date | null;

  @Column({ default: false })
  blocked: boolean;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  roleId?: string;

  @ManyToOne(() => Role, (role) => role.users, { onDelete: 'SET NULL' })
  role?: Role;

  @OneToMany(() => Session, (session) => session.user, { cascade: true })
  sessions: Session[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
