const DEFAULT_API_BASE_URL = '/iam-admin-service'
const DEFAULT_SSO_LOGIN_URL = 'http://localhost:5173/login'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '')
const SSO_LOGIN_URL = import.meta.env.VITE_UMS_SSO_LOGIN_URL ?? DEFAULT_SSO_LOGIN_URL
const CLIENT_ID = import.meta.env.VITE_UMS_ADMIN_CLIENT_ID ?? 'ums-admin-app'
const SESSION_STORAGE_KEY = 'ums-admin-session'
const STATE_STORAGE_KEY = 'ums-admin-sso-state'

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function getClientId() {
  return CLIENT_ID
}

export function getRouterBasename() {
  return getAppBasePath()
}

export function getRedirectUri() {
  const configuredRedirectUri = import.meta.env.VITE_UMS_ADMIN_REDIRECT_URI

  if (configuredRedirectUri) {
    return configuredRedirectUri
  }

  return new URL(buildAppPath('/auth/callback'), window.location.origin).toString()
}

export function createStateValue() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

export function setPendingState(state) {
  window.localStorage.setItem(STATE_STORAGE_KEY, state)
}

export function getPendingState() {
  return window.localStorage.getItem(STATE_STORAGE_KEY)
}

export function clearPendingState() {
  window.localStorage.removeItem(STATE_STORAGE_KEY)
}

export function buildSsoLoginUrl(state) {
  const url = new URL(SSO_LOGIN_URL)
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', getRedirectUri())
  url.searchParams.set('state', state)
  return url.toString()
}

export function redirectToSso() {
  const state = getPendingState() ?? createStateValue()
  setPendingState(state)
  window.location.assign(buildSsoLoginUrl(state))
}

export function getSession() {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function hasActiveSession() {
  const session = getSession()
  return Boolean(session?.accessToken && session?.refreshToken && session?.clientId === CLIENT_ID)
}

export function setSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
  clearPendingState()
}

export function validateCallbackParams({ ums_login, client_id, state, access_token, refresh_token }) {
  if (ums_login !== 'success') {
    return false
  }

  if (client_id !== CLIENT_ID) {
    return false
  }

  if (!state || state !== getPendingState()) {
    return false
  }

  return Boolean(access_token && refresh_token)
}

export function createSessionFromCallback(searchParams) {
  return {
    username: searchParams.get('username'),
    clientId: searchParams.get('client_id'),
    accessToken: searchParams.get('access_token'),
    refreshToken: searchParams.get('refresh_token'),
    tokenType: searchParams.get('token_type') ?? 'Bearer',
    scope: searchParams.get('scope') ?? '',
    expiresIn: Number(searchParams.get('expires_in') ?? 0),
    refreshExpiresIn: Number(searchParams.get('refresh_expires_in') ?? 0),
    authenticatedAt: Date.now(),
  }
}

export function extractAuthoritiesFromAccessToken(accessToken) {
  const claims = decodeJwtPayload(accessToken)

  if (!claims || typeof claims !== 'object') {
    return []
  }

  const realmRoles = Array.isArray(claims.realm_access?.roles) ? claims.realm_access.roles : []
  const clientRoles = Array.isArray(claims.resource_access?.[CLIENT_ID]?.roles)
    ? claims.resource_access[CLIENT_ID].roles
    : []

  return [...new Set([...realmRoles, ...clientRoles].filter((role) => typeof role === 'string' && role.trim()))].sort()
}

export async function refreshSession() {
  const currentSession = getSession()

  if (!currentSession?.refreshToken) {
    clearSession()
    throw new Error('Your session has expired. Please sign in again.')
  }

  const tokenResponse = await apiRequest('/api/v1/auth/refresh', {
    method: 'POST',
    body: {
      clientId: CLIENT_ID,
      refreshToken: currentSession.refreshToken,
    },
    skipAuthRetry: true,
  })

  const refreshedSession = {
    ...currentSession,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
    refreshExpiresIn: tokenResponse.refresh_expires_in,
    tokenType: tokenResponse.token_type,
    scope: tokenResponse.scope,
    authenticatedAt: Date.now(),
  }

  setSession(refreshedSession)
  return refreshedSession
}

export async function logoutSession() {
  const currentSession = getSession()

  try {
    if (currentSession?.refreshToken) {
      await apiRequest('/api/v1/auth/logout', {
        method: 'POST',
        body: {
          clientId: CLIENT_ID,
          refreshToken: currentSession.refreshToken,
        },
        skipAuthRetry: true,
      })
    }
  } finally {
    clearSession()
  }
}

export async function authenticatedRequest(path, options = {}) {
  const activeSession = getSession()

  if (!activeSession?.accessToken) {
    throw new Error('You are not authenticated. Please sign in again.')
  }

  return apiRequest(path, {
    ...options,
    token: activeSession.accessToken,
  })
}

async function apiRequest(
  path,
  {
    method = 'GET',
    body,
    token,
    headers,
    skipAuthRetry = false,
  } = {},
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && !skipAuthRetry && getSession()?.refreshToken) {
    const refreshedSession = await refreshSession()

    return apiRequest(path, {
      method,
      body,
      headers,
      token: refreshedSession.accessToken,
      skipAuthRetry: true,
    })
  }

  if (!response.ok) {
    throw await buildApiError(response)
  }

  if (response.status === 204) {
    return undefined
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    return undefined
  }

  return response.json()
}

async function buildApiError(response) {
  try {
    const body = await response.json()
    const message = typeof body?.message === 'string' ? body.message : null

    return new Error(message || `Request failed with status ${response.status}.`)
  } catch {
    return new Error(`Request failed with status ${response.status}.`)
  }
}

function buildAppPath(routePath) {
  const basePath = getAppBasePath()

  if (!basePath) {
    return routePath
  }

  return `${basePath}${routePath}`
}

function getAppBasePath() {
  const configuredBasePath = normalizeBasePath(import.meta.env.VITE_UMS_ADMIN_BASE_PATH)

  if (configuredBasePath !== null) {
    return configuredBasePath
  }

  const viteBasePath = normalizeBasePath(import.meta.env.BASE_URL)

  if (viteBasePath) {
    return viteBasePath
  }

  return inferBasePath(window.location.pathname)
}

function inferBasePath(pathname) {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const knownRoutes = ['/login', '/dashboard', '/auth/callback']

  for (const routePath of knownRoutes) {
    if (normalizedPathname === routePath) {
      return ''
    }

    if (normalizedPathname.endsWith(routePath)) {
      return normalizedPathname.slice(0, -routePath.length)
    }
  }

  return normalizedPathname === '/' ? '' : normalizedPathname
}

function normalizeBasePath(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()

  if (!trimmedValue || trimmedValue === '/') {
    return ''
  }

  return `/${trimmedValue.replace(/^\/+|\/+$/g, '')}`
}

function decodeJwtPayload(token) {
  if (typeof token !== 'string') {
    return null
  }

  const segments = token.split('.')

  if (segments.length < 2) {
    return null
  }

  try {
    const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`
    const decoded = window.atob(padded)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}
