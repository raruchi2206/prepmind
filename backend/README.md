# PrepMind Authentication API

## Start

1. Copy `.env.example` to `.env`.
2. Set two different random JWT secrets with at least 32 characters.
3. Make sure MongoDB is running at the configured URI.
4. Run `npm install` and `npm run dev`.

The API runs on `http://localhost:5000` by default.

## Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/users/me`
- `PATCH /api/users/profile`
- `GET /api/health`

Authentication uses Argon2id password hashes and HTTP-only access and refresh cookies. JWT payloads contain only the subject, role, and token version. Profile updates are always scoped to the authenticated user from the verified cookie JWT.
