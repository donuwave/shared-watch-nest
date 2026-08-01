import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Room } from './room.entity';
import { User } from '../users/users.entity';

@Entity('room_invites')
export class RoomInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  roomId: string;

  @ManyToOne(() => Room, (room) => room.invites, { onDelete: 'CASCADE' })
  room: Room;

  @Column({ unique: true, length: 64 })
  @Index()
  code: string;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'int', nullable: true })
  maxUses: number | null;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  @Index()
  createdByUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  createdByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
