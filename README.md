# UMS Admin App

This app uses `ums-sso-app` for login.

Flow:

1. Open `ums-admin-app`
2. `/login` redirects to `ums-sso-app`
3. `ums-sso-app` authenticates against the backend auth API
4. `ums-sso-app` redirects back to `/auth/callback` with `client_id`, `state`, and token data
5. `ums-admin-app` stores the returned tokens and calls the secured admin APIs

## Environment

```text
VITE_API_BASE_URL=http://localhost:8081/iam-admin-service
VITE_UMS_SSO_LOGIN_URL=http://localhost:5173/login
VITE_UMS_ADMIN_CLIENT_ID=ums-admin-app
VITE_UMS_ADMIN_REDIRECT_URI=http://localhost:5174/auth/callback
VITE_UMS_ADMIN_BASE_PATH=/ums-admin
```

## Integrated APIs

- `/api/v1/users`
- `/api/v1/roles`
- `/api/v1/clients`
- `/api/v1/me`
- `/api/v1/auth/refresh`
- `/api/v1/auth/logout`
