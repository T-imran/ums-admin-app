# UMS Admin App

This app delegates sign-in to the standalone `ums-sso-app` and expects the SSO app to redirect back to the admin callback route with:

```text
ums_login=success&client_id=ums-admin-app&username=<value>&state=<value>
```

## Redirect behavior

The admin callback URL is now derived from the current app URL so the flow works both:

- on local Vite dev routes such as `http://localhost:5174/auth/callback`
- when the admin UI is mounted under a backend module path such as `/ums-admin/auth/callback`

If you want to override the defaults, set:

```text
VITE_UMS_SSO_LOGIN_URL=http://localhost:5173/login
VITE_UMS_ADMIN_CLIENT_ID=ums-admin-app
VITE_UMS_ADMIN_REDIRECT_URI=http://localhost:5174/auth/callback
VITE_UMS_ADMIN_BASE_PATH=/ums-admin
```
