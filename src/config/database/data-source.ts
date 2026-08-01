import { DataSource } from 'typeorm';
import { Role } from '../../entity/role/role.entity';
import { Session } from '../../entity/session/session.entity';
import { User } from '../../entity/users/users.entity';
import { EmailToken } from '../../entity/email-token/email-token.entity';
import { OAuthAccount } from '../../entity/oauth-account/oauth-account.entity';
import { Feature } from '../../entity/feature/feature.entity';
import { FeatureRole } from '../../entity/feature/feature-role.entity';
import { Room } from '../../entity/room/room.entity';
import { RoomParticipant } from '../../entity/room/room-participant.entity';
import { RoomInvite } from '../../entity/room/room-invite.entity';
import { RoomPresence } from '../../entity/room/room-presence.entity';
import { VideoState } from '../../entity/video-sync/video-state.entity';
import { ChatMessage } from '../../entity/chat/chat-message.entity';
import { ChatReadState } from '../../entity/chat/chat-read-state.entity';
import { WhiteboardState } from '../../entity/whiteboard/whiteboard-state.entity';

const dbPort = Number(process.env.DB_PORT ?? 5432);

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: dbPort,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    Role,
    Session,
    User,
    EmailToken,
    OAuthAccount,
    Feature,
    FeatureRole,
    Room,
    RoomParticipant,
    RoomInvite,
    RoomPresence,
    VideoState,
    ChatMessage,
    ChatReadState,
    WhiteboardState,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
