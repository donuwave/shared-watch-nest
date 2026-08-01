# Rooms Workflow

- Keep real-time room concerns split by domain.
- Room presence tracks connection lifecycle and heartbeat only.
- Video sync owns source URL, playback state, and playback control events.
- Chat should be a separate entity/module.
- Voice/WebRTC signaling should be a separate gateway/module.
- Current video control permission: room `owner` and `moderator`.
- Only room `owner` can promote or demote active participants between `moderator` and `member`.
