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
import type { RoomParticipantRole } from './types/room-participant-role';

@Entity('room_participants')
@Index(['roomId', 'userId'], { unique: true })
export class RoomParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  roomId: string;

  @ManyToOne(() => Room, (room) => room.participants, { onDelete: 'CASCADE' })
  room: Room;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'varchar', length: 24 })
  role: RoomParticipantRole;

  @Column({ length: 80 })
  displayNameSnapshot: string;

  @Column({ type: 'timestamptz' })
  joinedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
