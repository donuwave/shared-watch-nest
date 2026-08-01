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
import { ChatMessage } from './chat-message.entity';

@Entity('chat_read_states')
@Index(['roomId', 'userId'], { unique: true })
export class ChatReadState {
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

  @Column({ type: 'uuid', nullable: true })
  @Index()
  lastReadMessageId: string | null;

  @ManyToOne(() => ChatMessage, { onDelete: 'SET NULL' })
  lastReadMessage: ChatMessage | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastReadAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
