const DEFAULT_SSO_LOGIN_URL = 'http://localhost:5173/login'
const SSO_LOGIN_URL = import.meta.env.VITE_UMS_SSO_LOGIN_URL ?? DEFAULT_SSO_LOGIN_URL
const CLIENT_ID = import.meta.env.VITE_UMS_ADMIN_CLIENT_ID ?? 'ums-admin-app'
const SESSION_STORAGE_KEY = 'ums-admin-session'
const STATE_STORAGE_KEY = 'ums-admin-sso-state'

export function getRedirectUri() {
  const configuredRedirectUri = import.meta.env.VITE_UMS_ADMIN_REDIRECT_URI

  if (configuredRedirectUri) {
    return configuredRedirectUri
  }

  return new URL(buildAppPath('/auth/callback'), window.location.origin).toString()
}

export function getRouterBasename() {
  return getAppBasePath()
}

export function createStateValue() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

export function setPendingState(state) {
  localStorage.setItem(STATE_STORAGE_KEY, state)
}

export function getPendingState() {
  return localStorage.getItem(STATE_STORAGE_KEY)
}

export function clearPendingState() {
  localStorage.removeItem(STATE_STORAGE_KEY)
}

export function getSession() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error('Failed to parse session data', error)
    return null
  }
}

export function isAuthenticated() {
  const session = getSession()
  return Boolean(session?.username && session?.client_id === CLIENT_ID)
}

export function setSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
  clearPendingState()
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

export function validateCallbackParams({ ums_login, client_id, username, state }) {
  if (ums_login !== 'success') {
    return false
  }

  if (client_id !== CLIENT_ID) {
    return false
  }

  if (!username || !state) {
    return false
  }

  return state === getPendingState()
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
  const knownRoutes = ['/auth/callback', '/dashboard', '/login']

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
