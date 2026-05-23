import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  authenticatedRequest,
  extractAuthoritiesFromAccessToken,
  getSession,
  logoutSession,
  setSession,
} from '../auth'

const sections = [
  { id: 'users', label: 'Users', description: 'Create, update, disable, and remove realm users.' },
  { id: 'roles', label: 'Roles', description: 'Inspect realm roles and create new permission groups.' },
  { id: 'clients', label: 'Clients', description: 'Manage application clients and redirect settings.' },
]

const emptyCreateUserForm = {
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  temporaryPassword: false,
  roles: [],
  enabled: true,
}

const emptyUpdateUserForm = {
  email: '',
  firstName: '',
  lastName: '',
}

const emptyResetPasswordForm = {
  password: '',
  temporary: false,
}

const emptyRoleForm = {
  name: '',
  description: '',
}

const emptyCreateClientForm = {
  clientId: '',
  name: '',
  description: '',
  enabled: true,
  publicClient: false,
  standardFlowEnabled: true,
  serviceAccountsEnabled: false,
  redirectUris: '',
  webOrigins: '',
  clientSecret: '',
}

const emptyUpdateClientForm = {
  name: '',
  description: '',
  enabled: true,
  publicClient: false,
  standardFlowEnabled: true,
  serviceAccountsEnabled: false,
  redirectUris: '',
  webOrigins: '',
  clientSecret: '',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('users')
  const [bootstrapping, setBootstrapping] = useState(true)
  const [globalError, setGlobalError] = useState('')
  const [flashMessage, setFlashMessage] = useState('')
  const [profile, setProfile] = useState(() => getSession()?.profile ?? null)

  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roleForm, setRoleForm] = useState(emptyRoleForm)
  const [roleSubmitting, setRoleSubmitting] = useState(false)

  const [userSearch, setUserSearch] = useState('')
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [isUserCreateModalOpen, setIsUserCreateModalOpen] = useState(false)
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false)
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false)
  const [userDetailLoading, setUserDetailLoading] = useState(false)
  const [createUserForm, setCreateUserForm] = useState(emptyCreateUserForm)
  const [updateUserForm, setUpdateUserForm] = useState(emptyUpdateUserForm)
  const [resetPasswordForm, setResetPasswordForm] = useState(emptyResetPasswordForm)
  const [userRoleSelection, setUserRoleSelection] = useState([])
  const [userSubmitting, setUserSubmitting] = useState(false)

  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientDetailLoading, setClientDetailLoading] = useState(false)
  const [createClientForm, setCreateClientForm] = useState(emptyCreateClientForm)
  const [updateClientForm, setUpdateClientForm] = useState(emptyUpdateClientForm)
  const [clientSubmitting, setClientSubmitting] = useState(false)

  const sessionAuthorities = extractAuthoritiesFromAccessToken(getSession()?.accessToken)
  const authorities =
    Array.isArray(profile?.authorities) && profile.authorities.length > 0
      ? profile.authorities
      : sessionAuthorities
  const canManageEverything = authorities.includes('ROLE_SUPER_ADMIN')
  const canViewAdmin = canManageEverything || authorities.includes('ROLE_ADMIN')

  useEffect(() => {
    void bootstrapConsole()
  }, [])

  useEffect(() => {
    if (!flashMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setFlashMessage(''), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [flashMessage])

  useEffect(() => {
    if (!canViewAdmin) {
      return
    }

    void (async () => {
      if (activeSection === 'users') {
        setUsersLoading(true)

        try {
          const nextUsers = await authenticatedRequest('/api/v1/users')
          setUsers(nextUsers)

          if (selectedUserId) {
            const stillPresent = nextUsers.find((user) => user.id === selectedUserId)

            if (stillPresent) {
              hydrateSelectedUser(stillPresent)
            } else {
              setSelectedUserId('')
              setSelectedUser(null)
            }
          }
        } catch (error) {
          setGlobalError(error.message || 'Unable to load users.')
        } finally {
          setUsersLoading(false)
        }

        if (roles.length === 0) {
          setRolesLoading(true)

          try {
            const nextRoles = await authenticatedRequest('/api/v1/roles')
            setRoles(nextRoles)
          } catch (error) {
            setGlobalError(error.message || 'Unable to load roles.')
          } finally {
            setRolesLoading(false)
          }
        }
      }

      if (activeSection === 'roles') {
        setRolesLoading(true)

        try {
          const nextRoles = await authenticatedRequest('/api/v1/roles')
          setRoles(nextRoles)
        } catch (error) {
          setGlobalError(error.message || 'Unable to load roles.')
        } finally {
          setRolesLoading(false)
        }
      }

      if (activeSection === 'clients') {
        setClientsLoading(true)

        try {
          const nextClients = await authenticatedRequest('/api/v1/clients')
          setClients(nextClients)

          if (selectedClientId) {
            const stillPresent = nextClients.find((client) => client.clientId === selectedClientId)

            if (stillPresent) {
              hydrateSelectedClient(stillPresent)
            } else {
              setSelectedClientId('')
              setSelectedClient(null)
            }
          }
        } catch (error) {
          setGlobalError(error.message || 'Unable to load clients.')
        } finally {
          setClientsLoading(false)
        }
      }
    })()
  }, [activeSection, canViewAdmin, roles.length, selectedClientId, selectedUserId])

  async function bootstrapConsole() {
    setBootstrapping(true)
    setGlobalError('')

    try {
      const nextProfile = await authenticatedRequest('/api/v1/me')
      const currentSession = getSession()
      const nextAuthorities =
        Array.isArray(nextProfile?.authorities) && nextProfile.authorities.length > 0
          ? nextProfile.authorities
          : extractAuthoritiesFromAccessToken(currentSession?.accessToken)
      const normalizedProfile = {
        ...nextProfile,
        authorities: nextAuthorities,
      }

      setProfile(normalizedProfile)

      if (currentSession) {
        setSession({ ...currentSession, profile: normalizedProfile })
      }
    } catch (error) {
      setGlobalError(error.message || 'Unable to load your admin session.')
    } finally {
      setBootstrapping(false)
    }
  }

  async function loadUsers(searchTerm = '') {
    setUsersLoading(true)
    setGlobalError('')

    try {
      const query = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : ''
      const response = await authenticatedRequest(`/api/v1/users${query}`)
      setUsers(response)

      if (selectedUserId) {
        const stillPresent = response.find((user) => user.id === selectedUserId)

        if (stillPresent) {
          hydrateSelectedUser(stillPresent)
        } else {
          setSelectedUserId('')
          setSelectedUser(null)
        }
      }
    } catch (error) {
      setGlobalError(error.message || 'Unable to load users.')
    } finally {
      setUsersLoading(false)
    }
  }

  async function loadRoles() {
    setRolesLoading(true)
    setGlobalError('')

    try {
      const response = await authenticatedRequest('/api/v1/roles')
      setRoles(response)
    } catch (error) {
      setGlobalError(error.message || 'Unable to load roles.')
    } finally {
      setRolesLoading(false)
    }
  }

  async function loadClients(searchTerm = '') {
    setClientsLoading(true)
    setGlobalError('')

    try {
      const query = searchTerm.trim() ? `?clientId=${encodeURIComponent(searchTerm.trim())}` : ''
      const response = await authenticatedRequest(`/api/v1/clients${query}`)
      setClients(response)

      if (selectedClientId) {
        const stillPresent = response.find((client) => client.clientId === selectedClientId)

        if (stillPresent) {
          hydrateSelectedClient(stillPresent)
        } else {
          setSelectedClientId('')
          setSelectedClient(null)
        }
      }
    } catch (error) {
      setGlobalError(error.message || 'Unable to load clients.')
    } finally {
      setClientsLoading(false)
    }
  }

  async function selectUser(userId) {
    setSelectedUserId(userId)
    setUserDetailLoading(true)
    setGlobalError('')

    try {
      const response = await authenticatedRequest(`/api/v1/users/${userId}`)
      hydrateSelectedUser(response)
    } catch (error) {
      setGlobalError(error.message || 'Unable to load that user.')
    } finally {
      setUserDetailLoading(false)
    }
  }

  async function selectClient(clientId) {
    setSelectedClientId(clientId)
    setClientDetailLoading(true)
    setGlobalError('')

    try {
      const response = await authenticatedRequest(`/api/v1/clients/${encodeURIComponent(clientId)}`)
      hydrateSelectedClient(response)
    } catch (error) {
      setGlobalError(error.message || 'Unable to load that client.')
    } finally {
      setClientDetailLoading(false)
    }
  }

  function hydrateSelectedUser(user) {
    setSelectedUser(user)
    setSelectedUserId(user.id)
    setUpdateUserForm({
      email: user.email ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    })
    setUserRoleSelection([...(user.roles ?? [])].sort())
    setResetPasswordForm(emptyResetPasswordForm)
  }

  function hydrateSelectedClient(client) {
    setSelectedClient(client)
    setSelectedClientId(client.clientId)
    setUpdateClientForm({
      name: client.name ?? '',
      description: client.description ?? '',
      enabled: Boolean(client.enabled),
      publicClient: Boolean(client.publicClient),
      standardFlowEnabled: Boolean(client.standardFlowEnabled),
      serviceAccountsEnabled: Boolean(client.serviceAccountsEnabled),
      redirectUris: listToTextarea(client.redirectUris),
      webOrigins: listToTextarea(client.webOrigins),
      clientSecret: '',
    })
  }

  async function handleLogout() {
    await logoutSession()
    navigate('/login', { replace: true })
  }

  async function handleCreateUser(event) {
    event.preventDefault()
    setUserSubmitting(true)
    setGlobalError('')

    try {
      const response = await authenticatedRequest('/api/v1/users', {
        method: 'POST',
        body: {
          ...createUserForm,
          roles: createUserForm.roles,
        },
      })

      setCreateUserForm(emptyCreateUserForm)
      setFlashMessage('User created successfully.')
      await loadUsers(userSearch)
      setIsUserCreateModalOpen(false)
      if (response?.id) {
        hydrateSelectedUser(response)
        setIsUserEditModalOpen(true)
      }
    } catch (error) {
      setGlobalError(error.message || 'Unable to create the user.')
    } finally {
      setUserSubmitting(false)
    }
  }

  async function handleUpdateUser(event) {
    event.preventDefault()

    if (!selectedUser) {
      return
    }

    setUserSubmitting(true)
    setGlobalError('')

    try {
      const response = await authenticatedRequest(`/api/v1/users/${selectedUser.id}`, {
        method: 'PUT',
        body: updateUserForm,
      })

      hydrateSelectedUser(response)
      await loadUsers(userSearch)
      setFlashMessage('User profile updated.')
    } catch (error) {
      setGlobalError(error.message || 'Unable to update the user.')
    } finally {
      setUserSubmitting(false)
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault()

    if (!selectedUser) {
      return
    }

    setUserSubmitting(true)
    setGlobalError('')

    try {
      await authenticatedRequest(`/api/v1/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        body: resetPasswordForm,
      })

      setResetPasswordForm(emptyResetPasswordForm)
      setFlashMessage('Password reset request completed.')
    } catch (error) {
      setGlobalError(error.message || 'Unable to reset the password.')
    } finally {
      setUserSubmitting(false)
    }
  }

  async function handleUserStatusToggle() {
    if (!selectedUser) {
      return
    }

    setUserSubmitting(true)
    setGlobalError('')

    try {
      const response = await authenticatedRequest(`/api/v1/users/${selectedUser.id}/status`, {
        method: 'PUT',
        body: {
          enabled: !selectedUser.enabled,
        },
      })

      hydrateSelectedUser(response)
      await loadUsers(userSearch)
      setFlashMessage(`User ${response.enabled ? 'enabled' : 'disabled'}.`)
    } catch (error) {
      setGlobalError(error.message || 'Unable to update the user status.')
    } finally {
      setUserSubmitting(false)
    }
  }

  async function handleAssignRoles(event) {
    event.preventDefault()

    if (!selectedUser) {
      return
    }

    setUserSubmitting(true)
    setGlobalError('')

    try {
      const response = await authenticatedRequest(`/api/v1/users/${selectedUser.id}/roles`, {
        method: 'POST',
        body: {
          roles: userRoleSelection,
        },
      })

      hydrateSelectedUser(response)
      await loadUsers(userSearch)
      setFlashMessage('User roles updated.')
    } catch (error) {
      setGlobalError(error.message || 'Unable to assign roles.')
    } finally {
      setUserSubmitting(false)
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) {
      return
    }

    const confirmed = window.confirm(`Delete user "${selectedUser.username}"?`)

    if (!confirmed) {
      return
    }

    setUserSubmitting(true)
    setGlobalError('')

    try {
      await authenticatedRequest(`/api/v1/users/${selectedUser.id}`, {
        method: 'DELETE',
      })

      setSelectedUser(null)
      setSelectedUserId('')
      setIsUserCreateModalOpen(false)
      setIsUserDetailModalOpen(false)
      setIsUserEditModalOpen(false)
      setFlashMessage('User deleted.')
      await loadUsers(userSearch)
    } catch (error) {
      setGlobalError(error.message || 'Unable to delete the user.')
    } finally {
      setUserSubmitting(false)
    }
  }

  async function handleCreateRole(event) {
    event.preventDefault()
    setRoleSubmitting(true)
    setGlobalError('')

    try {
      await authenticatedRequest('/api/v1/roles', {
        method: 'POST',
        body: roleForm,
      })

      setRoleForm(emptyRoleForm)
      setFlashMessage('Role created successfully.')
      await loadRoles()
    } catch (error) {
      setGlobalError(error.message || 'Unable to create the role.')
    } finally {
      setRoleSubmitting(false)
    }
  }

  async function handleCreateClient(event) {
    event.preventDefault()
    setClientSubmitting(true)
    setGlobalError('')

    try {
      const response = await authenticatedRequest('/api/v1/clients', {
        method: 'POST',
        body: mapClientPayload(createClientForm, true),
      })

      setCreateClientForm(emptyCreateClientForm)
      setFlashMessage('Client created successfully.')
      await loadClients(clientSearch)
      hydrateSelectedClient(response)
    } catch (error) {
      setGlobalError(error.message || 'Unable to create the client.')
    } finally {
      setClientSubmitting(false)
    }
  }

  async function handleUpdateClient(event) {
    event.preventDefault()

    if (!selectedClient) {
      return
    }

    setClientSubmitting(true)
    setGlobalError('')

    try {
      const response = await authenticatedRequest(
        `/api/v1/clients/${encodeURIComponent(selectedClient.clientId)}`,
        {
          method: 'PUT',
          body: mapClientPayload(updateClientForm, false),
        },
      )

      hydrateSelectedClient(response)
      await loadClients(clientSearch)
      setFlashMessage('Client updated successfully.')
    } catch (error) {
      setGlobalError(error.message || 'Unable to update the client.')
    } finally {
      setClientSubmitting(false)
    }
  }

  if (bootstrapping) {
    return (
      <div className="console-shell console-shell--loading">
        <div className="loading-card">
          <div className="brand-lockup brand-lockup--stacked">
            <img className="brand-logo" src="/era-logo.png" alt="ERA Infotech Ltd" />
          </div>
          <p className="section-kicker">UMS Admin</p>
          <h1>Loading your management console...</h1>
        </div>
      </div>
    )
  }

  if (!canViewAdmin) {
    return (
      <div className="console-shell console-shell--loading">
        <div className="loading-card">
          <div className="brand-lockup brand-lockup--stacked">
            <img className="brand-logo" src="/era-logo.png" alt="ERA Infotech Ltd" />
          </div>
          <p className="section-kicker">Access Check</p>
          <h1>Admin or super admin authority is required.</h1>
          <p>{globalError || 'Your token is valid, but it does not include the required admin role.'}</p>
          <button className="secondary-button" type="button" onClick={() => void handleLogout()}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="console-shell">
      <aside className="console-sidebar">
        <div className="brand-grid">
          <div className="brand-lockup">
            <img className="brand-logo" src="/era-logo.png" alt="ERA Infotech Ltd" />
            <div className="brand-wordmark">
              <p className="auth-badge">ERA Console</p>
              <h1>Realm administration</h1>
            </div>
          </div>
          <p className="sidebar-copy">
            A branded control surface for your Spring Boot and Keycloak admin APIs.
          </p>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === activeSection ? 'sidebar-link sidebar-link--active' : 'sidebar-link'}
              onClick={() => setActiveSection(section.id)}
            >
              <span>{section.label}</span>
              <small>{section.description}</small>
            </button>
          ))}
        </nav>

        <div className="profile-card">
          <span>Signed in as</span>
          <strong>{profile?.username ?? 'Unknown user'}</strong>
          <p>{profile?.email ?? 'Email unavailable'}</p>
          <div className="tag-row">
            {authorities.map((authority) => (
              <span key={authority} className="tag">
                {authority}
              </span>
            ))}
          </div>
          <button className="secondary-button" type="button" onClick={() => void handleLogout()}>
            Logout
          </button>
        </div>
      </aside>

      <main className="console-main">
        <header className="console-header">
          <div>
            <p className="section-kicker">{sections.find((section) => section.id === activeSection)?.label}</p>
            <h2>{sections.find((section) => section.id === activeSection)?.description}</h2>
          </div>
          <div className="status-stack">
            {flashMessage ? <p className="form-message form-message--success">{flashMessage}</p> : null}
            {globalError ? <p className="form-message form-message--error">{globalError}</p> : null}
          </div>
        </header>

        {activeSection === 'users' ? (
          <section className="content-grid content-grid--single">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Directory</h3>
                  <p>Search users from `UserAdminController.listUsers`.</p>
                </div>
                <div className="panel-header-actions">
                  <span className="panel-counter">{users.length}</span>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => {
                      setCreateUserForm(emptyCreateUserForm)
                      setIsUserCreateModalOpen(true)
                      setIsUserDetailModalOpen(false)
                      setIsUserEditModalOpen(false)
                    }}
                    disabled={!canManageEverything}
                  >
                    Add User
                  </button>
                </div>
              </div>

              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void loadUsers(userSearch)
                }}
              >
                <input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by username, email, or name"
                />
                <button className="secondary-button" type="submit" disabled={usersLoading}>
                  {usersLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              <div className="table-card">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Roles</th>
                        <th>Status</th>
                        <th className="actions-column">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className={user.id === selectedUserId ? 'data-row data-row--active' : 'data-row'}>
                          <td>{user.username}</td>
                          <td>{user.email || 'No email'}</td>
                          <td>{formatUserName(user)}</td>
                          <td>
                            <div className="table-role-list">
                              {(user.roles ?? []).slice(0, 2).map((role) => (
                                <span key={role} className="tag">
                                  {role}
                                </span>
                              ))}
                              {(user.roles?.length ?? 0) > 2 ? (
                                <span className="tag">+{user.roles.length - 2} more</span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <span className={user.enabled ? 'pill pill--success' : 'pill pill--muted'}>
                              {user.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <ActionIconButton
                                label="View user"
                                onClick={() => {
                                  setIsUserDetailModalOpen(true)
                                  void selectUser(user.id)
                                }}
                              >
                                <ViewIcon />
                              </ActionIconButton>
                              <ActionIconButton
                                label="Edit user"
                                onClick={() => {
                                  setIsUserDetailModalOpen(false)
                                  setIsUserEditModalOpen(true)
                                  void selectUser(user.id)
                                }}
                                disabled={!canManageEverything}
                              >
                                <EditIcon />
                              </ActionIconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!usersLoading && users.length === 0 ? (
                  <div className="empty-state">No users returned by the API.</div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {isUserCreateModalOpen ? (
          <div className="modal-backdrop" role="presentation" onClick={() => setIsUserCreateModalOpen(false)}>
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-create-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="section-kicker">Create User</p>
                  <h3 id="user-create-modal-title">Maps to `POST /api/v1/users`.</h3>
                </div>
                <button className="secondary-button" type="button" onClick={() => setIsUserCreateModalOpen(false)}>
                  Close
                </button>
              </div>

              <form className="form-grid" onSubmit={handleCreateUser}>
                <input
                  value={createUserForm.username}
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, username: event.target.value }))
                  }
                  placeholder="Username"
                  disabled={!canManageEverything}
                  required
                />
                <input
                  value={createUserForm.email}
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="Email"
                  type="email"
                  disabled={!canManageEverything}
                  required
                />
                <input
                  value={createUserForm.firstName}
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                  placeholder="First name"
                  disabled={!canManageEverything}
                  required
                />
                <input
                  value={createUserForm.lastName}
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                  placeholder="Last name"
                  disabled={!canManageEverything}
                  required
                />
                <input
                  value={createUserForm.password}
                  onChange={(event) =>
                    setCreateUserForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Initial password"
                  type="password"
                  disabled={!canManageEverything}
                  required
                />

                <div className="checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={createUserForm.temporaryPassword}
                      onChange={(event) =>
                        setCreateUserForm((current) => ({
                          ...current,
                          temporaryPassword: event.target.checked,
                        }))
                      }
                      disabled={!canManageEverything}
                    />
                    Temporary password
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={createUserForm.enabled}
                      onChange={(event) =>
                        setCreateUserForm((current) => ({
                          ...current,
                          enabled: event.target.checked,
                        }))
                      }
                      disabled={!canManageEverything}
                    />
                    Enabled
                  </label>
                </div>

                <div className="role-picker">
                  {roles.map((role) => (
                    <label key={role.id} className="check-card">
                      <input
                        type="checkbox"
                        checked={createUserForm.roles.includes(role.name)}
                        onChange={() =>
                          setCreateUserForm((current) => ({
                            ...current,
                            roles: toggleValue(current.roles, role.name),
                          }))
                        }
                        disabled={!canManageEverything}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>

                <button className="primary-button" type="submit" disabled={!canManageEverything || userSubmitting}>
                  {userSubmitting ? 'Saving...' : 'Create user'}
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {isUserDetailModalOpen && selectedUser ? (
          <div className="modal-backdrop" role="presentation" onClick={() => setIsUserDetailModalOpen(false)}>
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-detail-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="section-kicker">User Detail</p>
                  <h3 id="user-detail-modal-title">Inspect the selected user profile and roles.</h3>
                </div>
                <button className="secondary-button" type="button" onClick={() => setIsUserDetailModalOpen(false)}>
                  Close
                </button>
              </div>

              <div className="detail-stack">
                <div className="detail-banner">
                  <div>
                    <strong>{selectedUser.username}</strong>
                    <p>{selectedUser.email}</p>
                  </div>
                  <span className={selectedUser.enabled ? 'pill pill--success' : 'pill pill--muted'}>
                    {selectedUser.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="detail-grid">
                  <div className="detail-item">
                    <span>User ID</span>
                    <strong>{selectedUser.id}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Full name</span>
                    <strong>{formatUserName(selectedUser)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>First name</span>
                    <strong>{selectedUser.firstName || 'N/A'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Last name</span>
                    <strong>{selectedUser.lastName || 'N/A'}</strong>
                  </div>
                </div>

                <div className="detail-section">
                  <span className="section-kicker">Assigned Roles</span>
                  <div className="tag-row">
                    {(selectedUser.roles ?? []).map((role) => (
                      <span key={role} className="tag">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="action-row">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => {
                      setIsUserDetailModalOpen(false)
                      setIsUserEditModalOpen(true)
                    }}
                    disabled={!canManageEverything}
                  >
                    Update user
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isUserEditModalOpen && selectedUser ? (
          <div className="modal-backdrop" role="presentation" onClick={() => setIsUserEditModalOpen(false)}>
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-edit-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="section-kicker">Update User</p>
                  <h3 id="user-edit-modal-title">Update profile, password, status, and role assignments.</h3>
                </div>
                <button className="secondary-button" type="button" onClick={() => setIsUserEditModalOpen(false)}>
                  Close
                </button>
              </div>

              <div className="detail-stack">
                <div className="detail-banner">
                  <div>
                    <strong>{selectedUser.username}</strong>
                    <p>{selectedUser.email}</p>
                  </div>
                  <span className={selectedUser.enabled ? 'pill pill--success' : 'pill pill--muted'}>
                    {selectedUser.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <form className="form-grid" onSubmit={handleUpdateUser}>
                  <input
                    value={updateUserForm.email}
                    onChange={(event) =>
                      setUpdateUserForm((current) => ({ ...current, email: event.target.value }))
                    }
                    type="email"
                    placeholder="Email"
                    disabled={userDetailLoading}
                    required
                  />
                  <input
                    value={updateUserForm.firstName}
                    onChange={(event) =>
                      setUpdateUserForm((current) => ({ ...current, firstName: event.target.value }))
                    }
                    placeholder="First name"
                    disabled={userDetailLoading}
                    required
                  />
                  <input
                    value={updateUserForm.lastName}
                    onChange={(event) =>
                      setUpdateUserForm((current) => ({ ...current, lastName: event.target.value }))
                    }
                    placeholder="Last name"
                    disabled={userDetailLoading}
                    required
                  />
                  <button className="primary-button" type="submit" disabled={userSubmitting || userDetailLoading}>
                    Save profile
                  </button>
                </form>

                <form className="form-grid" onSubmit={handleResetPassword}>
                  <input
                    value={resetPasswordForm.password}
                    onChange={(event) =>
                      setResetPasswordForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="New password"
                    type="password"
                    required
                  />
                  <label className="check-card">
                    <input
                      type="checkbox"
                      checked={resetPasswordForm.temporary}
                      onChange={(event) =>
                        setResetPasswordForm((current) => ({
                          ...current,
                          temporary: event.target.checked,
                        }))
                      }
                    />
                    <span>Require password update on first login</span>
                  </label>
                  <button className="secondary-button" type="submit" disabled={userSubmitting}>
                    Reset password
                  </button>
                </form>

                <form className="detail-stack" onSubmit={handleAssignRoles}>
                  <div className="role-picker">
                    {roles.map((role) => (
                      <label key={role.id} className="check-card">
                        <input
                          type="checkbox"
                          checked={userRoleSelection.includes(role.name)}
                          onChange={() => setUserRoleSelection((current) => toggleValue(current, role.name))}
                          disabled={!canManageEverything}
                        />
                        <span>{role.name}</span>
                      </label>
                    ))}
                  </div>
                  <button className="secondary-button" type="submit" disabled={!canManageEverything || userSubmitting}>
                    Update roles
                  </button>
                </form>

                <div className="action-row">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void handleUserStatusToggle()}
                    disabled={!canManageEverything || userSubmitting}
                  >
                    {selectedUser.enabled ? 'Disable user' : 'Enable user'}
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => void handleDeleteUser()}
                    disabled={!canManageEverything || userSubmitting}
                  >
                    Delete user
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeSection === 'roles' ? (
          <section className="content-grid content-grid--narrow">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Realm roles</h3>
                  <p>Returned by `RoleAdminController.listRealmRoles`.</p>
                </div>
                <span className="panel-counter">{roles.length}</span>
              </div>

              <div className="list-card">
                {roles.map((role) => (
                  <div key={role.id} className="list-row list-row--static">
                    <div>
                      <strong>{role.name}</strong>
                      <p>{role.description || 'No description'}</p>
                    </div>
                  </div>
                ))}

                {!rolesLoading && roles.length === 0 ? (
                  <div className="empty-state">No roles found.</div>
                ) : null}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Create role</h3>
                  <p>Maps to `POST /api/v1/roles`.</p>
                </div>
              </div>

              <form className="form-grid" onSubmit={handleCreateRole}>
                <input
                  value={roleForm.name}
                  onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Role name"
                  disabled={!canManageEverything}
                  required
                />
                <textarea
                  value={roleForm.description}
                  onChange={(event) =>
                    setRoleForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Description"
                  rows="5"
                  disabled={!canManageEverything}
                />
                <button className="primary-button" type="submit" disabled={!canManageEverything || roleSubmitting}>
                  {roleSubmitting ? 'Saving...' : 'Create role'}
                </button>
              </form>
            </div>
          </section>
        ) : null}

        {activeSection === 'clients' ? (
          <section className="content-grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Clients</h3>
                  <p>Search against `ClientAdminController.listClients`.</p>
                </div>
                <span className="panel-counter">{clients.length}</span>
              </div>

              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void loadClients(clientSearch)
                }}
              >
                <input
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                  placeholder="Search by clientId"
                />
                <button className="secondary-button" type="submit" disabled={clientsLoading}>
                  {clientsLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              <div className="list-card">
                {clients.map((client) => (
                  <button
                    key={client.id || client.clientId}
                    type="button"
                    className={client.clientId === selectedClientId ? 'list-row list-row--active' : 'list-row'}
                    onClick={() => void selectClient(client.clientId)}
                  >
                    <div>
                      <strong>{client.clientId}</strong>
                      <p>{client.name || 'Unnamed client'}</p>
                    </div>
                    <span className={client.enabled ? 'pill pill--success' : 'pill pill--muted'}>
                      {client.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                ))}

                {!clientsLoading && clients.length === 0 ? (
                  <div className="empty-state">No clients returned by the API.</div>
                ) : null}
              </div>
            </div>

            <div className="panel-stack">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Create client</h3>
                    <p>Maps to `POST /api/v1/clients`.</p>
                  </div>
                </div>

                <form className="form-grid" onSubmit={handleCreateClient}>
                  <input
                    value={createClientForm.clientId}
                    onChange={(event) =>
                      setCreateClientForm((current) => ({ ...current, clientId: event.target.value }))
                    }
                    placeholder="Client ID"
                    disabled={!canManageEverything}
                    required
                  />
                  <input
                    value={createClientForm.name}
                    onChange={(event) =>
                      setCreateClientForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Display name"
                    disabled={!canManageEverything}
                  />
                  <textarea
                    value={createClientForm.description}
                    onChange={(event) =>
                      setCreateClientForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Description"
                    rows="4"
                    disabled={!canManageEverything}
                  />
                  <textarea
                    value={createClientForm.redirectUris}
                    onChange={(event) =>
                      setCreateClientForm((current) => ({ ...current, redirectUris: event.target.value }))
                    }
                    placeholder="Redirect URIs, one per line"
                    rows="4"
                    disabled={!canManageEverything}
                  />
                  <textarea
                    value={createClientForm.webOrigins}
                    onChange={(event) =>
                      setCreateClientForm((current) => ({ ...current, webOrigins: event.target.value }))
                    }
                    placeholder="Web origins, one per line"
                    rows="4"
                    disabled={!canManageEverything}
                  />
                  <input
                    value={createClientForm.clientSecret}
                    onChange={(event) =>
                      setCreateClientForm((current) => ({ ...current, clientSecret: event.target.value }))
                    }
                    placeholder="Client secret"
                    disabled={!canManageEverything}
                  />

                  <div className="checkbox-row checkbox-row--wrap">
                    {renderClientOption(createClientForm.enabled, 'Enabled', !canManageEverything, (checked) =>
                      setCreateClientForm((current) => ({ ...current, enabled: checked })),
                    )}
                    {renderClientOption(createClientForm.publicClient, 'Public client', !canManageEverything, (checked) =>
                      setCreateClientForm((current) => ({ ...current, publicClient: checked })),
                    )}
                    {renderClientOption(
                      createClientForm.standardFlowEnabled,
                      'Standard flow enabled',
                      !canManageEverything,
                      (checked) =>
                        setCreateClientForm((current) => ({ ...current, standardFlowEnabled: checked })),
                    )}
                    {renderClientOption(
                      createClientForm.serviceAccountsEnabled,
                      'Service accounts enabled',
                      !canManageEverything,
                      (checked) =>
                        setCreateClientForm((current) => ({ ...current, serviceAccountsEnabled: checked })),
                    )}
                  </div>

                  <button className="primary-button" type="submit" disabled={!canManageEverything || clientSubmitting}>
                    {clientSubmitting ? 'Saving...' : 'Create client'}
                  </button>
                </form>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Client detail</h3>
                    <p>Load and update a client configuration.</p>
                  </div>
                </div>

                {selectedClient ? (
                  <form className="form-grid" onSubmit={handleUpdateClient}>
                    <div className="detail-banner">
                      <div>
                        <strong>{selectedClient.clientId}</strong>
                        <p>{selectedClient.name || 'Unnamed client'}</p>
                      </div>
                      <span className={selectedClient.enabled ? 'pill pill--success' : 'pill pill--muted'}>
                        {selectedClient.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <input
                      value={updateClientForm.name}
                      onChange={(event) =>
                        setUpdateClientForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Display name"
                      disabled={!canManageEverything || clientDetailLoading}
                      required
                    />
                    <textarea
                      value={updateClientForm.description}
                      onChange={(event) =>
                        setUpdateClientForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Description"
                      rows="4"
                      disabled={!canManageEverything || clientDetailLoading}
                    />
                    <textarea
                      value={updateClientForm.redirectUris}
                      onChange={(event) =>
                        setUpdateClientForm((current) => ({ ...current, redirectUris: event.target.value }))
                      }
                      placeholder="Redirect URIs, one per line"
                      rows="4"
                      disabled={!canManageEverything || clientDetailLoading}
                    />
                    <textarea
                      value={updateClientForm.webOrigins}
                      onChange={(event) =>
                        setUpdateClientForm((current) => ({ ...current, webOrigins: event.target.value }))
                      }
                      placeholder="Web origins, one per line"
                      rows="4"
                      disabled={!canManageEverything || clientDetailLoading}
                    />
                    <input
                      value={updateClientForm.clientSecret}
                      onChange={(event) =>
                        setUpdateClientForm((current) => ({ ...current, clientSecret: event.target.value }))
                      }
                      placeholder="Client secret"
                      disabled={!canManageEverything || clientDetailLoading}
                    />

                    <div className="checkbox-row checkbox-row--wrap">
                      {renderClientOption(updateClientForm.enabled, 'Enabled', !canManageEverything, (checked) =>
                        setUpdateClientForm((current) => ({ ...current, enabled: checked })),
                      )}
                      {renderClientOption(
                        updateClientForm.publicClient,
                        'Public client',
                        !canManageEverything,
                        (checked) => setUpdateClientForm((current) => ({ ...current, publicClient: checked })),
                      )}
                      {renderClientOption(
                        updateClientForm.standardFlowEnabled,
                        'Standard flow enabled',
                        !canManageEverything,
                        (checked) =>
                          setUpdateClientForm((current) => ({ ...current, standardFlowEnabled: checked })),
                      )}
                      {renderClientOption(
                        updateClientForm.serviceAccountsEnabled,
                        'Service accounts enabled',
                        !canManageEverything,
                        (checked) =>
                          setUpdateClientForm((current) => ({ ...current, serviceAccountsEnabled: checked })),
                      )}
                    </div>

                    <button className="primary-button" type="submit" disabled={!canManageEverything || clientSubmitting}>
                      {clientSubmitting ? 'Saving...' : 'Update client'}
                    </button>
                  </form>
                ) : (
                  <div className="empty-state">
                    Select a client to load `GET /api/v1/clients/{'{clientId}'}`.
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

function renderClientOption(checked, label, disabled, onChange) {
  return (
    <label className="check-card">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  )
}

function formatUserName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name'
}

function ActionIconButton({ children, disabled = false, label, onClick }) {
  return (
    <button
      className="icon-button"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20l3.6-.8L19 7.8 16.2 5 4.8 16.4 4 20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14.8 6.4 17.6 9.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function toggleValue(values, nextValue) {
  if (values.includes(nextValue)) {
    return values.filter((value) => value !== nextValue)
  }

  return [...values, nextValue].sort()
}

function listToTextarea(values) {
  return Array.isArray(values) ? values.join('\n') : ''
}

function textareaToList(value) {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function mapClientPayload(form, includeClientId) {
  const payload = {
    name: form.name.trim(),
    description: form.description.trim(),
    enabled: form.enabled,
    publicClient: form.publicClient,
    standardFlowEnabled: form.standardFlowEnabled,
    serviceAccountsEnabled: form.serviceAccountsEnabled,
    redirectUris: textareaToList(form.redirectUris),
    webOrigins: textareaToList(form.webOrigins),
    clientSecret: form.clientSecret.trim() || null,
  }

  if (includeClientId) {
    return {
      clientId: form.clientId.trim(),
      ...payload,
    }
  }

  return payload
}
