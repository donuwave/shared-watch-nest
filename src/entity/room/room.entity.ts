import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { RoomParticipant } from './room-participant.entity';
import { RoomInvite } from './room-invite.entity';
import type { RoomClosedReason } from './types/room-closed-reason';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'uuid' })
  @Index()
  createdByUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  createdByUser: User;

  @Column({ default: true })
  isOpen: boolean;

  @Column({ default: true })
  isTemporary: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  closedReason: RoomClosedReason | null;

  @OneToMany(() => RoomParticipant, (participant) => participant.room)
  participants: RoomParticipant[];

  @OneToMany(() => RoomInvite, (invite) => invite.room)
  invites: RoomInvite[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
