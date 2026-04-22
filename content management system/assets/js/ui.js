// ============================================
// UI.js — Shared UI Utilities
// Toasts, Modals, Sidebar, Header, Loaders
// ============================================

// ---- Toast Notifications ----
const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },

  show(type, title, message, duration = 4000) {
    this.init();
    const icons = {
      success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      info:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
    `;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
    return toast;
  },

  success(title, msg, dur) { return this.show('success', title, msg, dur); },
  error(title, msg, dur)   { return this.show('error',   title, msg, dur); },
  info(title, msg, dur)    { return this.show('info',    title, msg, dur); },
  warning(title, msg, dur) { return this.show('warning', title, msg, dur); }
};

// ---- Modal Management ----
const Modal = {
  open(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },
  close(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
};

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) Modal.closeAll();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') Modal.closeAll();
});

// ---- Page Loader ----
const Loader = {
  show(message = 'Loading...') {
    let el = document.getElementById('page-loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'page-loader';
      el.className = 'page-loader';
      el.innerHTML = `
        <div class="loader-logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:26px;height:26px">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        </div>
        <div class="spinner"></div>
        <span style="font-size:0.78rem;color:var(--text-muted)">${message}</span>
      `;
      document.body.appendChild(el);
    }
  },
  hide() {
    const el = document.getElementById('page-loader');
    if (el) {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }
  }
};

// ---- Generate initials from name ----
function getInitials(name = '') {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

// ---- Format date helpers ----
function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return formatDate(ts);
}

// ---- Deadline badge helper ----
function deadlineBadge(deadline) {
  if (!deadline) return '';
  const d = deadline.toDate ? deadline.toDate() : new Date(deadline);
  const now = new Date();
  const diff = d - now;
  const days = Math.ceil(diff / 86400000);
  if (diff < 0) return `<span class="deadline-badge deadline-overdue">⚠ Overdue</span>`;
  if (days <= 3) return `<span class="deadline-badge deadline-soon">⏰ ${days}d left</span>`;
  return `<span class="deadline-badge deadline-ok">📅 ${days}d left</span>`;
}

// ---- Status badge HTML ----
function statusBadge(status) {
  const map = {
    pending:      ['badge-pending',   '○ Pending'],
    in_progress:  ['badge-progress',  '◐ In Progress'],
    submitted:    ['badge-submitted', '● Submitted'],
    under_review: ['badge-review',    '⟳ Under Review'],
    completed:    ['badge-completed', '✓ Completed'],
  };
  const [cls, label] = map[status] || ['badge-pending', status];
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${label}</span>`;
}

// ---- Priority badge HTML ----
function priorityBadge(priority) {
  const map = {
    high:   ['badge-high',   '↑ High'],
    medium: ['badge-medium', '→ Medium'],
    low:    ['badge-low',    '↓ Low'],
  };
  const [cls, label] = map[priority] || ['badge-low', priority];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ---- Sidebar builder ----
function buildSidebar(role, activePage) {
  const isAdmin = role === 'admin';
  const base = isAdmin ? '/admin' : '/user';
  const rootPath = window.location.pathname.includes('/admin/') ? '../' :
                   window.location.pathname.includes('/user/')  ? '../' :
                   window.location.pathname.includes('/shared/')? '../' : './';

  const adminLinks = [
    { href: `${rootPath}admin/dashboard.html`, icon: 'home',       label: 'Dashboard',   key: 'dashboard' },
    { href: `${rootPath}admin/tasks.html`,     icon: 'check-sq',   label: 'Tasks',        key: 'tasks' },
    { href: `${rootPath}admin/users.html`,     icon: 'users',      label: 'Team Members', key: 'users' },
    { href: `${rootPath}admin/analytics.html`, icon: 'bar-chart',  label: 'Analytics',    key: 'analytics' },
    { href: `${rootPath}admin/pipeline.html`,  icon: 'layers',     label: 'Pipeline',     key: 'pipeline' },
  ];
  const userLinks = [
    { href: `${rootPath}user/dashboard.html`,  icon: 'home',       label: 'Dashboard',   key: 'dashboard' },
    { href: `${rootPath}user/tasks.html`,      icon: 'check-sq',   label: 'My Tasks',     key: 'tasks' },
    { href: `${rootPath}user/pipeline.html`,   icon: 'layers',     label: 'Pipeline',     key: 'pipeline' },
  ];
  const sharedLinks = [
    { href: `${rootPath}shared/calendar.html`, icon: 'calendar',   label: 'Calendar',    key: 'calendar' },
  ];
  const links = isAdmin ? adminLinks : userLinks;

  const icons = {
    'home':      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    'check-sq':  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    'users':     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    'bar-chart': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    'layers':    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    'calendar':  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    'logout':    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  };

  const navItems = links.map(lnk => `
    <a href="${lnk.href}" class="nav-item ${activePage === lnk.key ? 'active' : ''}">
      ${icons[lnk.icon]} <span>${lnk.label}</span>
    </a>
  `).join('');

  const sharedItems = sharedLinks.map(lnk => `
    <a href="${lnk.href}" class="nav-item ${activePage === lnk.key ? 'active' : ''}">
      ${icons[lnk.icon]} <span>${lnk.label}</span>
    </a>
  `).join('');

  return `
    <div class="sidebar-logo">
      <div class="logo-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
      </div>
      <div>
        <div class="logo-text">ELECTRONICS VALA</div>
        <div class="logo-sub">${isAdmin ? '👑 Admin Panel' : '👤 Team Portal'}</div>
      </div>
    </div>
    <p class="sidebar-section-label">Main</p>
    <nav class="sidebar-nav">
      ${navItems}
    </nav>
    <p class="sidebar-section-label">Shared</p>
    <nav class="sidebar-nav">
      ${sharedItems}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user" id="sidebar-user-info">
        <div class="avatar user-avatar" id="sidebar-avatar">U</div>
        <div class="user-info">
          <div class="user-name" id="sidebar-name">Loading...</div>
          <div class="user-role">${isAdmin ? '👑 Admin' : '👤 Member'}</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm w-full mt-1" id="sign-out-btn" style="justify-content:flex-start;gap:0.5rem">
        ${icons['logout']} Sign out
      </button>
    </div>
  `;
}

// ---- Build Header ----
function buildHeader(title, subtitle) {
  return `
    <button class="mobile-menu-btn" id="mobile-menu-btn">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <div>
      <div class="header-title">${title}</div>
    </div>
    <div class="header-spacer"></div>
    <div class="search-box">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" class="search-input" id="global-search" placeholder="Search tasks, users…" autocomplete="off">
    </div>
    <div style="position:relative" id="notif-wrapper">
      <div class="notif-btn" id="notif-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span class="notif-badge hidden" id="notif-badge">0</span>
      </div>
      <div class="notif-dropdown" id="notif-dropdown">
        <div class="notif-header">
          <h3>Notifications</h3>
          <button class="btn btn-ghost btn-sm" id="mark-all-read">Mark all read</button>
        </div>
        <div class="notif-list" id="notif-list">
          <div class="notif-empty">No notifications yet</div>
        </div>
      </div>
    </div>
    <div class="dropdown" id="avatar-dropdown">
      <div class="avatar-btn" id="avatar-btn">U</div>
      <div class="dropdown-menu" id="avatar-menu">
        <div class="dropdown-item" id="profile-info" style="cursor:default;flex-direction:column;align-items:flex-start;gap:2px">
          <span style="font-weight:700;color:var(--text-primary);font-size:0.82rem" id="menu-user-name">—</span>
          <span style="color:var(--text-muted);font-size:0.72rem" id="menu-user-email">—</span>
        </div>
        <div class="dropdown-divider"></div>
        <div class="dropdown-item danger" id="avatar-signout">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </div>
      </div>
    </div>
  `;
}

// ---- Dropdown toggles ----
function initDropdowns() {
  // Avatar dropdown
  const avatarBtn = document.getElementById('avatar-btn');
  const avatarMenu = document.getElementById('avatar-menu');
  if (avatarBtn && avatarMenu) {
    avatarBtn.addEventListener('click', e => {
      e.stopPropagation();
      avatarMenu.classList.toggle('open');
      document.getElementById('notif-dropdown')?.classList.remove('open');
    });
  }
  // Notification dropdown
  const notifBtn = document.getElementById('notif-btn');
  const notifDrop = document.getElementById('notif-dropdown');
  if (notifBtn && notifDrop) {
    notifBtn.addEventListener('click', e => {
      e.stopPropagation();
      notifDrop.classList.toggle('open');
      avatarMenu?.classList.remove('open');
    });
  }
  // Close on outside click
  document.addEventListener('click', () => {
    avatarMenu?.classList.remove('open');
    notifDrop?.classList.remove('open');
  });
}

// ---- Mobile sidebar toggle ----
function initMobileSidebar() {
  const btn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  if (!btn || !sidebar) return;
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });
}

// ---- Debounce helper ----
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---- Truncate text ----
function truncate(str, len = 40) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// ---- Confirm dialog ----
function confirmDialog(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;text-align:center">
        <div style="margin-bottom:1rem">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--prio-high)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px;margin:0 auto 0.75rem"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <p style="font-size:0.85rem;color:var(--text-secondary)">${message}</p>
        </div>
        <div style="display:flex;gap:0.5rem;justify-content:center">
          <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
          <button class="btn btn-danger" id="confirm-ok">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#confirm-ok').onclick    = () => { overlay.remove(); resolve(true); };
    overlay.onclick = e => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}
