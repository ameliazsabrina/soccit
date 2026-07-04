# Avatar assets — frontend convention

User profiles carry an `avatar` field. The backend stores only an **id** (not an image); the frontend owns the image files.

## Contract

- Valid ids are a fixed preset: `avatar-1` … `avatar-8` (see `AVATARS` in `src/modules/user/user.schema.ts`). The backend rejects any other value.
- `GET /api/avatars` (and tRPC `user.avatars`) returns the list with a conventional source path:

  ```json
  [
    { "id": "avatar-1", "src": "/avatars/avatar-1.png" },
    { "id": "avatar-2", "src": "/avatars/avatar-2.png" }
  ]
  ```

- `src` is the path the **frontend** serves the image from — drop the 8 files into the frontend's `public/avatars/` as `avatar-1.png` … `avatar-8.png`. The API does not host images.
- A user's chosen id appears as `avatar` on the profile (`GET /api/user/:wallet`) and on enriched leaderboard rows (`ranking[].user.avatar`). Render it with `/avatars/${avatar}.png`, or use the `src` from `/api/avatars`.

## Changing the set

Add/remove ids in the `AVATARS` tuple in `user.schema.ts` and add the matching image files. To change the path or extension, edit `avatarSrc()` in `src/modules/user/user.service.ts` (single source of the convention).
