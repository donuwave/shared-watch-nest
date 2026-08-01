import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Room } from '../room/room.entity';
import { User } from '../users/users.entity';

export type WhiteboardPoint = {
  x: number;
  y: number;
  pressure?: number;
};

export type WhiteboardStroke = {
  id: string;
  userId: string;
  color: string;
  width: number;
  points: WhiteboardPoint[];
  createdAt: string;
};

export type WhiteboardSnapshot = {
  strokes: WhiteboardStroke[];
};

@Entity('room_whiteboard_states')
export class WhiteboardState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  @Index()
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  room: Room;

  @Column({ default: false })
  enabled: boolean;

  @Column({
    type: 'jsonb',
    default: () => `'{"strokes":[]}'::jsonb`,
  })
  snapshot: WhiteboardSnapshot;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  updatedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  updatedByUser: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
