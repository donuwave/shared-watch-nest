export const ROOM_PARTICIPANT_ROLES = ['owner', 'moderator', 'member'] as const;

export type RoomParticipantRole = (typeof ROOM_PARTICIPANT_ROLES)[number];
