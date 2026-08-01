export const ROOM_CLOSED_REASONS = [
  'empty_temporary_room',
  'owner_closed',
] as const;

export type RoomClosedReason = (typeof ROOM_CLOSED_REASONS)[number];
