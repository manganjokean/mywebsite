/**
 * Assignment 4 – Part 1: Authentication & Access Control System
 * 
 * Authentication = Verifying WHO you are (login with credentials)
 * Authorization  = Determining WHAT you can do (role-based permissions)
 * 
 * Roles:
 * - Regular User: View personal information, Edit personal profile
 * - Administrator: Manage users, View security logs, Manage website content
 */
(function () {
  'use strict';

  // =========================================================================
  // 1. USER DATABASE (localStorage-backed)
  // =========================================================================

  const STORAGE_KEY_USERS = 'jm_auth_users';
  const STORAGE_KEY_SESSION = 'jm_auth_session';
  const STORAGE_KEY_LOGS = 'jm_auth_logs';
  const STORAGE_KEY_CONTENT = 'jm_site_content';

  // Default users (seeded on first load)
  const DEFAULT_USERS = [
    {
      id: 'u1',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      fullName: 'System Administrator',
      email: 'admin@mywebsite.local',
      bio: 'Full system access. Manages users, security logs, and website content.',
      created: new Date().toISOString(),
      avatar: null
    },
    {
      id: 'u2',
      username: 'user',
      password: 'user123',
      role: 'user',
      fullName: 'John Manganelli',
      email: 'john@mywebsite.local',
      bio: 'Regular user. Can view personal information and edit own profile.',
      created: new Date().toISOString(),
      avatar: null
    }
  ];

  // Default editable website content
  const DEFAULT_CONTENT = {
    heroTitle: 'John Manganelli',
    heroSubtitle: 'Senior • Information Technology • IT Computer Security (Prof. Xiwang Guo)',
    announcement: 'Welcome to my cybersecurity portfolio! Explore my projects and assignments.'
  };

  // =========================================================================
  // 2. DATA ACCESS LAYER
  // =========================================================================

  function getUsers() {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
      return [...DEFAULT_USERS];
    }
    try { return JSON.parse(raw); } catch { return [...DEFAULT_USERS]; }
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }

  function getSession() {
    const raw = sessionStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function setSession(session) {
    if (session) sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY_SESSION);
  }

  function getLogs() {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  function addLog(entry) {
    const logs = getLogs();
    logs.unshift({
      timestamp: new Date().toISOString(),
      ...entry
    });
    // Keep last 100 logs
    if (logs.length > 100) logs.splice(100);
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }

  function getContent() {
    const raw = localStorage.getItem(STORAGE_KEY_CONTENT);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CONTENT, JSON.stringify(DEFAULT_CONTENT));
      return { ...DEFAULT_CONTENT };
    }
    try { return JSON.parse(raw); } catch { return { ...DEFAULT_CONTENT }; }
  }

  function saveContent(content) {
    localStorage.setItem(STORAGE_KEY_CONTENT, JSON.stringify(content));
  }

  // =========================================================================
  // 3. AUTHENTICATION & AUTHORIZATION HELPERS
  // =========================================================================

  function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    const users = getUsers();
    return users.find(u => u.id === session.userId) || null;
  }

  function isAuthenticated() {
    return getCurrentUser() !== null;
  }

  function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
  }

  function hasPermission(permission) {
    const user = getCurrentUser();
    if (!user) return false;
    const PERMISSIONS = {
      admin: ['view_profile', 'edit_profile', 'manage_users', 'view_logs', 'manage_content'],
      user: ['view_profile', 'edit_profile']
    };
    return (PERMISSIONS[user.role] || []).includes(permission);
  }

  // =========================================================================
  // 4. LOGIN / LOGOUT
  // =========================================================================

  function login(username, password) {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      setSession({ userId: user.id, loginTime: new Date().toISOString() });
      addLog({ event: 'LOGIN_SUCCESS', username: user.username, role: user.role, ip: 'client-side' });
      return { success: true, user };
    } else {
      addLog({ event: 'LOGIN_FAILURE', username: username, reason: 'Invalid credentials', ip: 'client-side' });
      return { success: false, error: 'Invalid username or password.' };
    }
  }

  function logout() {
    const user = getCurrentUser();
    if (user) {
      addLog({ event: 'LOGOUT', username: user.username, role: user.role });
    }
    setSession(null);
  }

  // =========================================================================
  // 5. UI: LOGIN MODAL
  // =========================================================================

  function createLoginModal() {
    if (document.getElementById('auth-login-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'auth-login-modal';
    overlay.className = 'auth-modal-overlay';
    overlay.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-login-title">
        <div class="auth-modal-header">
          <div class="auth-modal-icon">&#x1F512;</div>
          <h2 id="auth-login-title">Authentication Required</h2>
          <p class="auth-modal-subtitle">Verify your identity to access the system</p>
        </div>
        <div class="auth-modal-body">
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="login">Login</button>
            <button class="auth-tab" data-tab="register">Register</button>
          </div>

          <!-- Login Form -->
          <form id="auth-login-form" class="auth-form">
            <div class="auth-field">
              <label for="auth-login-username">Username</label>
              <input type="text" id="auth-login-username" placeholder="Enter username" required autocomplete="username">
            </div>
            <div class="auth-field">
              <label for="auth-login-password">Password</label>
              <input type="password" id="auth-login-password" placeholder="Enter password" required autocomplete="current-password">
            </div>
            <div id="auth-login-error" class="auth-error" role="alert"></div>
            <button type="submit" class="auth-btn auth-btn-primary">Authenticate</button>
            <div class="auth-demo-credentials">
              <p><strong>Demo Credentials:</strong></p>
              <p>Admin: <code>admin / admin123</code></p>
              <p>User: <code>user / user123</code></p>
            </div>
          </form>

          <!-- Register Form -->
          <form id="auth-register-form" class="auth-form hidden">
            <div class="auth-field">
              <label for="auth-reg-username">Username</label>
              <input type="text" id="auth-reg-username" placeholder="Choose username" required>
            </div>
            <div class="auth-field">
              <label for="auth-reg-fullname">Full Name</label>
              <input type="text" id="auth-reg-fullname" placeholder="Your full name" required>
            </div>
            <div class="auth-field">
              <label for="auth-reg-email">Email</label>
              <input type="email" id="auth-reg-email" placeholder="your@email.com" required>
            </div>
            <div class="auth-field">
              <label for="auth-reg-password">Password</label>
              <input type="password" id="auth-reg-password" placeholder="Choose password" required minlength="6">
            </div>
            <div id="auth-register-error" class="auth-error" role="alert"></div>
            <button type="submit" class="auth-btn auth-btn-primary">Create Account</button>
          </form>
        </div>
        <div class="auth-modal-footer">
          <span class="auth-info-badge">&#x1F4A1; Authentication = Who are you?</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Tab switching
    overlay.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        overlay.querySelector('#auth-login-form').classList.toggle('hidden', target !== 'login');
        overlay.querySelector('#auth-register-form').classList.toggle('hidden', target !== 'register');
      });
    });

    // Login submit
    overlay.querySelector('#auth-login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const username = overlay.querySelector('#auth-login-username').value.trim();
      const password = overlay.querySelector('#auth-login-password').value;
      const result = login(username, password);
      const errEl = overlay.querySelector('#auth-login-error');

      if (result.success) {
        errEl.textContent = '';
        closeLoginModal();
        showDashboard();
      } else {
        errEl.textContent = result.error;
      }
    });

    // Register submit
    overlay.querySelector('#auth-register-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const username = overlay.querySelector('#auth-reg-username').value.trim();
      const fullName = overlay.querySelector('#auth-reg-fullname').value.trim();
      const email = overlay.querySelector('#auth-reg-email').value.trim();
      const password = overlay.querySelector('#auth-reg-password').value;
      const errEl = overlay.querySelector('#auth-register-error');

      const users = getUsers();
      if (users.find(u => u.username === username)) {
        errEl.textContent = 'Username already exists.';
        return;
      }

      const newUser = {
        id: 'u' + Date.now(),
        username,
        password,
        role: 'user',
        fullName,
        email,
        bio: 'New user account.',
        created: new Date().toISOString(),
        avatar: null
      };
      users.push(newUser);
      saveUsers(users);
      addLog({ event: 'USER_REGISTERED', username, role: 'user' });

      errEl.textContent = '';
      // Auto-login after registration
      const result = login(username, password);
      if (result.success) {
        closeLoginModal();
        showDashboard();
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeLoginModal();
    });
  }

  function openLoginModal() {
    createLoginModal();
    const modal = document.getElementById('auth-login-modal');
    if (modal) modal.classList.add('active');
  }

  function closeLoginModal() {
    const modal = document.getElementById('auth-login-modal');
    if (modal) modal.classList.remove('active');
  }

  // =========================================================================
  // 6. UI: DASHBOARD (Post-Authentication Control Panel)
  // =========================================================================

  function showDashboard() {
    const user = getCurrentUser();
    if (!user) {
      openLoginModal();
      return;
    }

    let dash = document.getElementById('auth-dashboard');
    if (!dash) {
      dash = document.createElement('div');
      dash.id = 'auth-dashboard';
      dash.className = 'auth-dashboard';
      document.body.appendChild(dash);
    }

    const roleBadge = user.role === 'admin'
      ? '<span class="auth-role-badge admin">Administrator</span>'
      : '<span class="auth-role-badge user">Regular User</span>';

    const canViewProfile = hasPermission('view_profile');
    const canEditProfile = hasPermission('edit_profile');
    const canManageUsers = hasPermission('manage_users');
    const canViewLogs = hasPermission('view_logs');
    const canManageContent = hasPermission('manage_content');

    dash.innerHTML = `
      <div class="auth-dash-header">
        <div class="auth-dash-user">
          <div class="auth-dash-avatar">${user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}</div>
          <div class="auth-dash-info">
            <span class="auth-dash-name">${escapeHtml(user.fullName || user.username)}</span>
            ${roleBadge}
          </div>
        </div>
        <div class="auth-dash-actions">
          <button id="auth-dash-logout" class="auth-btn auth-btn-danger">Logout</button>
        </div>
      </div>

      <div class="auth-dash-body">
        <!-- Authorization Explanation Banner -->
        <div class="auth-info-banner">
          <div class="auth-info-col">
            <strong>&#x1F511; Authentication</strong>
            <p>Verifying <em>who you are</em> — you logged in as <code>${escapeHtml(user.username)}</code>.</p>
          </div>
          <div class="auth-info-col">
            <strong>&#x1F6E1;&#xFE0F; Authorization</strong>
            <p>Determining <em>what you can do</em> — your role is <strong>${user.role}</strong>, granting specific permissions.</p>
          </div>
        </div>

        <!-- Permissions Grid -->
        <div class="auth-perms-grid">
          <div class="auth-perm-card ${canViewProfile ? 'granted' : 'denied'}">
            <span class="auth-perm-icon">&#x1F464;</span>
            <span class="auth-perm-label">View Personal Info</span>
            <span class="auth-perm-status">${canViewProfile ? '&#x2705; Allowed' : '&#x274C; Denied'}</span>
          </div>
          <div class="auth-perm-card ${canEditProfile ? 'granted' : 'denied'}">
            <span class="auth-perm-icon">&#x270F;&#xFE0F;</span>
            <span class="auth-perm-label">Edit Profile</span>
            <span class="auth-perm-status">${canEditProfile ? '&#x2705; Allowed' : '&#x274C; Denied'}</span>
          </div>
          <div class="auth-perm-card ${canManageUsers ? 'granted' : 'denied'}">
            <span class="auth-perm-icon">&#x1F465;</span>
            <span class="auth-perm-label">Manage Users</span>
            <span class="auth-perm-status">${canManageUsers ? '&#x2705; Allowed' : '&#x274C; Denied'}</span>
          </div>
          <div class="auth-perm-card ${canViewLogs ? 'granted' : 'denied'}">
            <span class="auth-perm-icon">&#x1F4CB;</span>
            <span class="auth-perm-label">View Security Logs</span>
            <span class="auth-perm-status">${canViewLogs ? '&#x2705; Allowed' : '&#x274C; Denied'}</span>
          </div>
          <div class="auth-perm-card ${canManageContent ? 'granted' : 'denied'}">
            <span class="auth-perm-icon">&#x2699;&#xFE0F;</span>
            <span class="auth-perm-label">Manage Content</span>
            <span class="auth-perm-status">${canManageContent ? '&#x2705; Allowed' : '&#x274C; Denied'}</span>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="auth-dash-tabs">
          ${canViewProfile ? '<button class="auth-dash-tab active" data-panel="profile">My Profile</button>' : ''}
          ${canManageUsers ? '<button class="auth-dash-tab" data-panel="users">User Management</button>' : ''}
          ${canViewLogs ? '<button class="auth-dash-tab" data-panel="logs">Security Logs</button>' : ''}
          ${canManageContent ? '<button class="auth-dash-tab" data-panel="content">Content Management</button>' : ''}
        </div>

        <!-- Panels -->
        <div class="auth-dash-panels">
          ${canViewProfile ? `
          <div class="auth-dash-panel active" id="auth-panel-profile">
            <h3>&#x1F464; Personal Information</h3>
            <div class="auth-profile-view">
              <div class="auth-profile-row"><strong>Username:</strong> <code>${escapeHtml(user.username)}</code></div>
              <div class="auth-profile-row"><strong>Full Name:</strong> ${escapeHtml(user.fullName || '—')}</div>
              <div class="auth-profile-row"><strong>Email:</strong> ${escapeHtml(user.email || '—')}</div>
              <div class="auth-profile-row"><strong>Role:</strong> ${user.role}</div>
              <div class="auth-profile-row"><strong>Bio:</strong> ${escapeHtml(user.bio || '—')}</div>
              <div class="auth-profile-row"><strong>Account Created:</strong> ${new Date(user.created).toLocaleDateString()}</div>
            </div>
            ${canEditProfile ? `
            <h3 style="margin-top:1.5rem;">&#x270F;&#xFE0F; Edit Profile</h3>
            <form id="auth-edit-profile-form" class="auth-form">
              <div class="auth-field">
                <label>Full Name</label>
                <input type="text" id="auth-edit-fullname" value="${escapeHtml(user.fullName || '')}">
              </div>
              <div class="auth-field">
                <label>Email</label>
                <input type="email" id="auth-edit-email" value="${escapeHtml(user.email || '')}">
              </div>
              <div class="auth-field">
                <label>Bio</label>
                <textarea id="auth-edit-bio" rows="3">${escapeHtml(user.bio || '')}</textarea>
              </div>
              <button type="submit" class="auth-btn auth-btn-primary">Save Changes</button>
            </form>` : '<p class="auth-denied-msg">&#x26D4; You do not have permission to edit profiles.</p>'}
          </div>` : ''}

          ${canManageUsers ? `
          <div class="auth-dash-panel" id="auth-panel-users">
            <h3>&#x1F465; User Management</h3>
            <div class="auth-users-table-wrap">
              <table class="auth-table">
                <thead>
                  <tr><th>Username</th><th>Full Name</th><th>Role</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody id="auth-users-tbody"></tbody>
              </table>
            </div>
          </div>` : ''}

          ${canViewLogs ? `
          <div class="auth-dash-panel" id="auth-panel-logs">
            <h3>&#x1F4CB; Security Logs</h3>
            <div class="auth-logs-wrap" id="auth-logs-container"></div>
          </div>` : ''}

          ${canManageContent ? `
          <div class="auth-dash-panel" id="auth-panel-content">
            <h3>&#x2699;&#xFE0F; Website Content Management</h3>
            <form id="auth-content-form" class="auth-form">
              <div class="auth-field">
                <label>Hero Title</label>
                <input type="text" id="auth-content-hero-title">
              </div>
              <div class="auth-field">
                <label>Hero Subtitle</label>
                <input type="text" id="auth-content-hero-subtitle">
              </div>
              <div class="auth-field">
                <label>Announcement</label>
                <textarea id="auth-content-announcement" rows="3"></textarea>
              </div>
              <button type="submit" class="auth-btn auth-btn-primary">Update Content</button>
            </form>
          </div>` : ''}
        </div>
      </div>
    `;

    dash.classList.add('active');

    // Logout
    dash.querySelector('#auth-dash-logout').addEventListener('click', () => {
      logout();
      dash.classList.remove('active');
      updateNavAuthState();
      openLoginModal();
    });

    // Tab switching
    dash.querySelectorAll('.auth-dash-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        dash.querySelectorAll('.auth-dash-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const panel = tab.dataset.panel;
        dash.querySelectorAll('.auth-dash-panel').forEach(p => p.classList.remove('active'));
        const panelEl = dash.querySelector('#auth-panel-' + panel);
        if (panelEl) panelEl.classList.add('active');

        if (panel === 'users') renderUsersTable();
        if (panel === 'logs') renderLogs();
        if (panel === 'content') loadContentForm();
      });
    });

    // Edit profile
    const editForm = dash.querySelector('#auth-edit-profile-form');
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const users = getUsers();
        const u = users.find(x => x.id === user.id);
        if (u) {
          u.fullName = dash.querySelector('#auth-edit-fullname').value.trim();
          u.email = dash.querySelector('#auth-edit-email').value.trim();
          u.bio = dash.querySelector('#auth-edit-bio').value.trim();
          saveUsers(users);
          addLog({ event: 'PROFILE_UPDATED', username: u.username });
          alert('Profile updated successfully!');
          showDashboard(); // re-render
        }
      });
    }

    // Content management
    const contentForm = dash.querySelector('#auth-content-form');
    if (contentForm) {
      contentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const content = getContent();
        content.heroTitle = dash.querySelector('#auth-content-hero-title').value.trim();
        content.heroSubtitle = dash.querySelector('#auth-content-hero-subtitle').value.trim();
        content.announcement = dash.querySelector('#auth-content-announcement').value.trim();
        saveContent(content);
        addLog({ event: 'CONTENT_UPDATED', username: user.username });
        alert('Website content updated!');
      });
    }

    updateNavAuthState();
  }

  function hideDashboard() {
    const dash = document.getElementById('auth-dashboard');
    if (dash) dash.classList.remove('active');
  }

  // =========================================================================
  // 7. USER MANAGEMENT (Admin only)
  // =========================================================================

  function renderUsersTable() {
    const tbody = document.getElementById('auth-users-tbody');
    if (!tbody) return;
    const users = getUsers();
    const currentUser = getCurrentUser();

    tbody.innerHTML = users.map(u => `
      <tr>
        <td><code>${escapeHtml(u.username)}</code></td>
        <td>${escapeHtml(u.fullName || '—')}</td>
        <td><span class="auth-role-badge ${u.role}">${u.role}</span></td>
        <td>${new Date(u.created).toLocaleDateString()}</td>
        <td>
          ${u.id !== currentUser.id ? `
            <button class="auth-btn-sm auth-btn-danger" data-delete-user="${u.id}">Delete</button>
            <button class="auth-btn-sm auth-btn-secondary" data-toggle-role="${u.id}">${u.role === 'admin' ? 'Demote' : 'Promote'}</button>
          ` : '<em>(you)</em>'}
        </td>
      </tr>
    `).join('');

    // Delete user
    tbody.querySelectorAll('[data-delete-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this user?')) return;
        const users = getUsers().filter(x => x.id !== btn.dataset.deleteUser);
        saveUsers(users);
        addLog({ event: 'USER_DELETED', targetId: btn.dataset.deleteUser });
        renderUsersTable();
      });
    });

    // Toggle role
    tbody.querySelectorAll('[data-toggle-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const users = getUsers();
        const u = users.find(x => x.id === btn.dataset.toggleRole);
        if (u) {
          u.role = u.role === 'admin' ? 'user' : 'admin';
          saveUsers(users);
          addLog({ event: 'ROLE_CHANGED', targetUsername: u.username, newRole: u.role });
          renderUsersTable();
        }
      });
    });
  }

  // =========================================================================
  // 8. SECURITY LOGS (Admin only)
  // =========================================================================

  function renderLogs() {
    const container = document.getElementById('auth-logs-container');
    if (!container) return;
    const logs = getLogs();

    if (logs.length === 0) {
      container.innerHTML = '<p class="auth-empty-msg">No security events logged yet.</p>';
      return;
    }

    container.innerHTML = logs.map(log => {
      const date = new Date(log.timestamp);
      const timeStr = date.toLocaleString();
      let eventClass = 'log-info';
      if (log.event.includes('FAILURE') || log.event.includes('DELETED')) eventClass = 'log-danger';
      else if (log.event.includes('SUCCESS') || log.event.includes('LOGIN')) eventClass = 'log-success';
      else if (log.event.includes('REGISTERED') || log.event.includes('UPDATED')) eventClass = 'log-warn';

      return `
        <div class="auth-log-entry ${eventClass}">
          <span class="auth-log-time">${timeStr}</span>
          <span class="auth-log-event">${escapeHtml(log.event)}</span>
          <span class="auth-log-detail">${escapeHtml(log.username || log.targetUsername || '')}${log.role ? ' (' + log.role + ')' : ''}</span>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // 9. CONTENT MANAGEMENT (Admin only)
  // =========================================================================

  function loadContentForm() {
    const content = getContent();
    const titleEl = document.getElementById('auth-content-hero-title');
    const subtitleEl = document.getElementById('auth-content-hero-subtitle');
    const announcementEl = document.getElementById('auth-content-announcement');
    if (titleEl) titleEl.value = content.heroTitle || '';
    if (subtitleEl) subtitleEl.value = content.heroSubtitle || '';
    if (announcementEl) announcementEl.value = content.announcement || '';
  }

  // =========================================================================
  // 10. NAVIGATION AUTH STATE
  // =========================================================================

  function updateNavAuthState() {
    const user = getCurrentUser();
    const navBtn = document.getElementById('nav-auth-btn');
    if (!navBtn) return;

    if (user) {
      navBtn.innerHTML = '&#x1F464; ' + escapeHtml(user.fullName || user.username);
      navBtn.onclick = (e) => {
        e.preventDefault();
        showDashboard();
      };
    } else {
      navBtn.innerHTML = '&#x1F512; Login';
      navBtn.onclick = (e) => {
        e.preventDefault();
        openLoginModal();
      };
    }
  }

  // =========================================================================
  // 11. UTILITY
  // =========================================================================

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // 12. INITIALIZATION
  // =========================================================================

  function initAuth() {
    // Add auth button to nav
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && !document.getElementById('nav-auth-btn')) {
      const li = document.createElement('li');
      li.innerHTML = '<a href="#" id="nav-auth-btn" class="nav-highlight">&#x1F512; Login</a>';
      navLinks.appendChild(li);
    }

    updateNavAuthState();

    // If already authenticated, show dashboard option
    if (isAuthenticated()) {
      // Don't auto-show dashboard, just update nav
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }
})();
