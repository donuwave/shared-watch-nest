export const uuidSchema = {
  type: 'string',
  format: 'uuid',
  example: '8f6b0a84-82b7-4f39-a3d1-6dfb2c6e4421',
};

export const isoDateSchema = {
  type: 'string',
  format: 'date-time',
  example: '2026-08-02T00:00:00.000Z',
};

export const errorResponseSchema = {
  type: 'object',
  required: [
    'statusCode',
    'code',
    'message',
    'details',
    'path',
    'method',
    'timestamp',
  ],
  properties: {
    statusCode: { type: 'number', example: 403 },
    code: { type: 'string', example: 'FORBIDDEN' },
    message: {
      type: 'string',
      example: 'Недостаточно прав в комнате',
    },
    details: {
      nullable: true,
      oneOf: [
        { type: 'object', additionalProperties: true },
        { type: 'array', items: { type: 'string' } },
      ],
      example: null,
    },
    path: { type: 'string', example: '/rooms/invalid/state' },
    method: { type: 'string', example: 'GET' },
    timestamp: {
      type: 'string',
      format: 'date-time',
      example: '2026-08-02T00:00:00.000Z',
    },
  },
};

export const accessTokenSchema = {
  type: 'string',
  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.shared-watch-access-token',
};

export const userSnapshotSchema = {
  type: 'object',
  properties: {
    id: uuidSchema,
    username: { type: 'string', example: 'donu' },
    discriminator: { type: 'string', example: '1234' },
    avatarUrl: {
      type: 'string',
      nullable: true,
      example: 'https://example.com/avatar.png',
    },
  },
};

export const authMeResponseSchema = {
  type: 'object',
  properties: {
    profile: {
      type: 'object',
      properties: {
        id: uuidSchema,
        email: { type: 'string', format: 'email', example: 'user@example.com' },
        username: { type: 'string', example: 'donu' },
        discriminator: { type: 'string', example: '1234' },
        avatarUrl: { type: 'string', nullable: true, example: null },
        role: { type: 'string', example: 'user' },
      },
    },
    emailVerification: {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          enum: ['verified', 'verification_pending', 'verification_expired'],
          example: 'verification_pending',
        },
        secondsUntilBlock: { type: 'number', example: 86400 },
        isVerified: { type: 'boolean', example: false },
        emailVerificationDeadlineAt: {
          ...isoDateSchema,
          nullable: true,
        },
      },
    },
  },
};

export const roomSnapshotSchema = {
  type: 'object',
  properties: {
    id: uuidSchema,
    title: { type: 'string', example: 'Фильм вечером' },
    createdByUserId: uuidSchema,
    isOpen: { type: 'boolean', example: true },
    isTemporary: { type: 'boolean', example: true },
    closedAt: { ...isoDateSchema, nullable: true },
    closedReason: { type: 'string', nullable: true, example: null },
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  },
};

export const roomParticipantSchema = {
  type: 'object',
  properties: {
    id: uuidSchema,
    roomId: uuidSchema,
    userId: uuidSchema,
    role: { type: 'string', enum: ['owner', 'moderator', 'member'] },
    displayNameSnapshot: { type: 'string', example: 'donu#1234' },
    joinedAt: isoDateSchema,
    leftAt: { ...isoDateSchema, nullable: true },
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    user: userSnapshotSchema,
  },
};

export const roomPresenceSchema = {
  type: 'object',
  properties: {
    id: uuidSchema,
    roomId: uuidSchema,
    userId: uuidSchema,
    connectedAt: isoDateSchema,
    lastSeenAt: isoDateSchema,
    disconnectedAt: { ...isoDateSchema, nullable: true },
    isOnline: { type: 'boolean', example: true },
  },
};

export const videoStateSchema = {
  type: 'object',
  nullable: true,
  properties: {
    id: uuidSchema,
    roomId: uuidSchema,
    sourceUrl: {
      type: 'string',
      example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    sourceType: { type: 'string', enum: ['youtube', 'direct'] },
    providerVideoId: { type: 'string', nullable: true, example: 'dQw4w9WgXcQ' },
    playing: { type: 'boolean', example: false },
    currentTime: { type: 'number', example: 35.4 },
    effectiveCurrentTime: { type: 'number', example: 36.1 },
    duration: { type: 'number', nullable: true, example: 212 },
    updatedByUserId: { ...uuidSchema, nullable: true },
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    serverTime: isoDateSchema,
    serverTimestamp: { type: 'number', example: 1785628801200 },
  },
};

export const whiteboardStateSchema = {
  type: 'object',
  properties: {
    id: { ...uuidSchema, nullable: true },
    roomId: uuidSchema,
    enabled: { type: 'boolean', example: false },
    snapshot: {
      type: 'object',
      properties: {
        strokes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: uuidSchema,
              userId: uuidSchema,
              color: { type: 'string', example: '#ffcc00' },
              width: { type: 'number', example: 4 },
              points: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    x: { type: 'number', example: 0.42 },
                    y: { type: 'number', example: 0.31 },
                    pressure: { type: 'number', example: 0.8 },
                  },
                },
              },
              createdAt: isoDateSchema,
            },
          },
        },
      },
    },
    updatedByUserId: { ...uuidSchema, nullable: true },
    createdAt: { ...isoDateSchema, nullable: true },
    updatedAt: { ...isoDateSchema, nullable: true },
  },
};

export const roomStateResponseSchema = {
  type: 'object',
  properties: {
    room: roomSnapshotSchema,
    currentParticipant: roomParticipantSchema,
    participants: {
      type: 'array',
      items: roomParticipantSchema,
    },
    presence: {
      type: 'array',
      items: roomPresenceSchema,
    },
    video: videoStateSchema,
    whiteboard: whiteboardStateSchema,
  },
};

export const chatMessageSchema = {
  type: 'object',
  properties: {
    id: uuidSchema,
    roomId: uuidSchema,
    userId: uuidSchema,
    text: { type: 'string', nullable: true, example: 'Привет' },
    editedAt: { ...isoDateSchema, nullable: true },
    deletedAt: { ...isoDateSchema, nullable: true },
    deletedByUserId: { ...uuidSchema, nullable: true },
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
    user: userSnapshotSchema,
  },
};

export const chatReadStateSchema = {
  type: 'object',
  properties: {
    roomId: uuidSchema,
    userId: uuidSchema,
    lastReadMessageId: { ...uuidSchema, nullable: true },
    lastReadAt: { ...isoDateSchema, nullable: true },
    unreadCount: { type: 'number', example: 3 },
  },
};

export const messageResponseSchema = (message: string) => ({
  type: 'object',
  properties: {
    message: { type: 'string', example: message },
  },
});
