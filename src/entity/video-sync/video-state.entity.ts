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
import type { VideoSourceType } from './types/video-source-type';

@Entity('video_states')
export class VideoState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  @Index()
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  room: Room;

  @Column({ type: 'text' })
  sourceUrl: string;

  @Column({ type: 'varchar', length: 32 })
  sourceType: VideoSourceType;

  @Column({ type: 'varchar', length: 128, nullable: true })
  providerVideoId: string | null;

  @Column({ default: false })
  playing: boolean;

  @Column({ type: 'double precision', default: 0 })
  currentTime: number;

  @Column({ type: 'double precision', nullable: true })
  duration: number | null;

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
