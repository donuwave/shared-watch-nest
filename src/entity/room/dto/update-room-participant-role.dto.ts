import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { RoomParticipantRole } from '../types/room-participant-role';

export type ManageableRoomParticipantRole = Exclude<
  RoomParticipantRole,
  'owner'
>;

export const MANAGEABLE_ROOM_PARTICIPANT_ROLES = [
  'moderator',
  'member',
] as const satisfies ManageableRoomParticipantRole[];

export class UpdateRoomParticipantRoleDto {
  @ApiProperty({ enum: MANAGEABLE_ROOM_PARTICIPANT_ROLES })
  @IsIn(MANAGEABLE_ROOM_PARTICIPANT_ROLES)
  role: ManageableRoomParticipantRole;
}
