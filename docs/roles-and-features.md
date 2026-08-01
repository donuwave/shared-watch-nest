# Roles And Features

## Global Roles

Global roles are application-level roles:

```text
admin
moderator
user
```

Use global roles for admin and moderation surfaces, not for room membership.

Examples:

- `admin` can manage roles and features.
- `moderator` can inspect users where allowed.
- `user` is the default role for regular registered and OAuth users.

Base global roles are seeded on application startup and cannot be softly deleted.

## Features

Features answer whether a user can use a product capability.

Current default feature:

```text
rooms.create
```

`rooms.create` requirements:

- feature is active;
- user exists;
- user is not blocked;
- user email is verified;
- no specific global role is required.

The feature model supports optional role restrictions through `feature_roles`.
If a feature has no linked roles, every user who satisfies the feature flags can use it.
If a feature has linked roles, user role must be one of those roles.

Use in controllers:

```ts
@UseGuards(JwtAuthGuard, FeatureGuard)
@Feature('rooms.create')
@Post('rooms')
```

## Room Roles

Room roles are not global roles. They belong to a user inside one room:

```text
owner
moderator
member
```

Current mapping:

- `owner` - room creator, full control inside room.
- `moderator` - can help manage room participants and chat.
- `member` - regular participant.

Room roles live in `room_participants.role`.

The creator of a room must become `owner` automatically.

Detailed room permission checks are documented in `docs/room-permissions.md`.
