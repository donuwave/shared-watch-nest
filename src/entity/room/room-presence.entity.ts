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

@Entity('room_presence')
@Index(['roomId', 'userId', 'connectionId'], { unique: true })
export class RoomPresence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  room: Room;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'varchar', length: 128 })
  @Index()
  connectionId: string;

  @Column({ type: 'timestamptz' })
  connectedAt: Date;

  @Column({ type: 'timestamptz' })
  lastSeenAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  disconnectedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
