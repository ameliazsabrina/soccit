# Avatar assets — frontend convention

User profiles carry an `avatar` field. The backend stores the selected **id** on the profile and serves the image bytes from MongoDB through `/api/assets/avatars/<id>.webp`.

## Contract

- Valid ids are a fixed preset: `avatar-0` … `avatar-11` (see `AVATARS` in `src/modules/user/user.schema.ts`). The backend rejects any other value.
- `GET /api/avatars` (and tRPC `user.avatars`) returns the list with a conventional source path:

  ```json
  [
    { "id": "avatar-0", "src": "/api/assets/avatars/avatar-0.webp" },
    { "id": "avatar-1", "src": "/api/assets/avatars/avatar-1.webp" }
  ]
  ```

- `src` points at the Mongo-backed API asset route.
- A user's chosen id appears as `avatar` on the profile (`GET /api/user/:wallet`) and on enriched leaderboard rows (`ranking[].user.avatar`). Render it with `/api/assets/avatars/${avatar}.webp`, or use the `src` from `/api/avatars`.

## Changing the set

Add/remove ids in the `AVATARS` tuple in `user.schema.ts` and add the matching image files. To change the path or extension, edit `avatarSrc()` in `src/modules/user/user.service.ts` (single source of the convention).
