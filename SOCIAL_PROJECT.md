# Loopline Community

Loopline is the working social/community project embedded in the portfolio's Safari window.

## Features

- Secure registration, login, logout, and 30-day server sessions
- Editable user profiles with validated profile images
- Persistent text and image posts
- Likes, comments, post deletion, and comment deletion
- User search by username or display name
- Private two-person conversations with persisted messages
- Stored read/unread notifications for likes, comments, and messages
- Admin statistics, user filtering, suspension/restoration, post filtering, and moderation
- Server-side ownership and administrator authorization checks
- Responsive desktop and mobile interfaces

## Database

The application uses SQLite through Node.js and creates these related tables automatically:

- `users`
- `sessions`
- `posts`
- `likes`
- `comments`
- `conversations`
- `conversation_members`
- `messages`
- `notifications`
- `moderation_log`

Duplicate likes are prevented by a composite primary key. Foreign keys and cascading deletion keep related records consistent.

## Admin setup

1. Set `SOCIAL_ADMIN_EMAIL` in `.env` locally and in the backend host's environment variables.
2. Register through Loopline using that exact email address.
3. That account alone receives the `admin` role during registration.

Changing `SOCIAL_ADMIN_EMAIL` does not retroactively change existing accounts. Do not publish an administrator password in source control.

## Image uploads

PNG, JPEG, and WebP images are accepted. Both the browser and server enforce a 1.5 MB limit. The server checks the decoded file signature instead of trusting the filename or browser-provided MIME type. Images are stored in the database as data URLs, which keeps this portfolio deployment self-contained.

## Environment variables

- `SOCIAL_ADMIN_EMAIL`: email that is allowed to receive the admin role during registration
- `SOCIAL_DATA_DIR`: directory that stores `social.sqlite`; defaults to `./data`
- `FRONTEND_URL`: allowed deployed frontend origin
- `ALLOWED_ORIGINS`: optional comma-separated additional frontend origins

## Deployment note

Use a persistent disk for `SOCIAL_DATA_DIR` in production. A hosting plan with an ephemeral filesystem will retain data during normal use but can lose the SQLite database when the service is rebuilt or restarted. For a larger public community, migrate the same relational model to managed PostgreSQL and move images to object storage.
