// ============================================
// auth.js — Authentication & Role Routing
// ============================================

// ---- Determine role from email (fallback) ----
function getRoleFromEmail(email) {
  return email === ADMIN_EMAIL ? 'admin' : 'user';
}

// ---- Auto-provision or fetch Firestore user doc ----
async function ensureUserDoc(user) {
  const ref = db.collection(COLLECTIONS.USERS).doc(user.uid);
  try {
    const doc = await ref.get();
    if (doc.exists) {
      const data = doc.data();
      // If role field is missing, patch it
      if (!data.role) {
        const role = getRoleFromEmail(user.email);
        await ref.update({ role });
        return { uid: user.uid, email: user.email, ...data, role };
      }
      return { uid: user.uid, email: user.email, ...data };
    } else {
      // Create the document with sensible defaults
      const role = getRoleFromEmail(user.email);
      const name = user.displayName || user.email.split('@')[0];
      const newDoc = {
        name,
        email: user.email,
        role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await ref.set(newDoc);
      return { uid: user.uid, ...newDoc };
    }
  } catch (err) {
    console.warn('ensureUserDoc failed, using fallback:', err.message);
    const role = getRoleFromEmail(user.email);
    const name = user.displayName || user.email.split('@')[0];
    return { uid: user.uid, email: user.email, role, name };
  }
}

// ---- Role Detection ----
async function getUserRole(uid) {
  try {
    const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (doc.exists) return doc.data().role || 'user';
  } catch(e) { /* rules may block */ }
  const user = auth.currentUser;
  if (user && user.uid === uid) return getRoleFromEmail(user.email);
  return 'user';
}

// ---- Get current user profile ----
async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  return ensureUserDoc(user);
}

// ---- Redirect logic ----
function redirectByRole(role) {
  const rootPath = getRootPath();
  if (role === 'admin') {
    window.location.href = rootPath + 'admin/dashboard.html';
  } else {
    window.location.href = rootPath + 'user/dashboard.html';
  }
}

function getRootPath() {
  const path = window.location.pathname;
  if (path.includes('/admin/') || path.includes('/user/') || path.includes('/shared/')) {
    return '../';
  }
  return './';
}

// ---- Auth Guard — call on every protected page ----
async function requireAuth(expectedRole = null) {
  return new Promise((resolve, reject) => {
    Loader.show('Authenticating…');
    const unsub = auth.onAuthStateChanged(async user => {
      unsub();
      if (!user) {
        Loader.hide();
        window.location.href = getRootPath() + 'index.html';
        return;
      }
      try {
        const profile = await ensureUserDoc(user);
        Loader.hide();
        // Role guard
        if (expectedRole && profile.role !== expectedRole) {
          Toast.error('Access Denied', 'You do not have permission to view this page.');
          setTimeout(() => redirectByRole(profile.role), 1500);
          return;
        }
        resolve(profile);
      } catch (err) {
        console.error('Auth guard error:', err);
        Loader.hide();
        const role = getRoleFromEmail(user.email);
        const name = user.displayName || user.email.split('@')[0];
        if (expectedRole && role !== expectedRole) {
          Toast.error('Access Denied', 'You do not have permission to view this page.');
          setTimeout(() => redirectByRole(role), 1500);
          return;
        }
        resolve({ uid: user.uid, email: user.email, role, name });
      }
    });
  });
}

// ---- Populate header/sidebar with user info ----
function populateUserUI(profile) {
  const initials = getInitials(profile.name || profile.email);
  // Sidebar
  const avatarEl = document.getElementById('sidebar-avatar');
  const nameEl   = document.getElementById('sidebar-name');
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl)   nameEl.textContent   = profile.name || profile.email.split('@')[0];
  // Header avatar
  const headerAvatar = document.getElementById('avatar-btn');
  if (headerAvatar) headerAvatar.textContent = initials;
  // Dropdown
  const menuName  = document.getElementById('menu-user-name');
  const menuEmail = document.getElementById('menu-user-email');
  if (menuName)  menuName.textContent  = profile.name || '—';
  if (menuEmail) menuEmail.textContent = profile.email || '—';
}

// ---- Sign Out ----
async function signOutUser() {
  try {
    await auth.signOut();
    window.location.href = getRootPath() + 'index.html';
  } catch (err) {
    Toast.error('Sign Out Failed', err.message);
  }
}

// Attach sign out to all sign out buttons
document.addEventListener('click', e => {
  if (e.target.closest('#sign-out-btn') || e.target.closest('#avatar-signout')) {
    signOutUser();
  }
});

// ---- Login Page Logic ----
function initLoginPage() {
  const loginForm   = document.getElementById('login-form');
  const loginBtn    = document.getElementById('login-btn');
  const emailInput  = document.getElementById('login-email');
  const passInput   = document.getElementById('login-pass');
  const forgotLink  = document.getElementById('forgot-link');
  const forgotForm  = document.getElementById('forgot-form');
  const forgotEmail = document.getElementById('forgot-email');
  const forgotBtn   = document.getElementById('forgot-btn');
  const backToLogin = document.getElementById('back-to-login');
  const passToggle  = document.getElementById('pass-toggle-btn');

  // Toggle password visibility
  if (passToggle) {
    passToggle.addEventListener('click', () => {
      const type = passInput.type === 'password' ? 'text' : 'password';
      passInput.type = type;
      passToggle.innerHTML = type === 'password'
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    });
  }

  // Show forgot password form
  if (forgotLink) {
    forgotLink.addEventListener('click', e => {
      e.preventDefault();
      loginForm.classList.add('hidden');
      forgotForm.classList.remove('hidden');
      forgotEmail.value = emailInput?.value || '';
    });
  }
  if (backToLogin) {
    backToLogin.addEventListener('click', e => {
      e.preventDefault();
      forgotForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    });
  }

  // Forgot password submit
  if (forgotBtn) {
    forgotBtn.addEventListener('click', async () => {
      const email = forgotEmail.value.trim();
      if (!email) { Toast.warning('Enter Email', 'Please enter your email address.'); return; }
      forgotBtn.disabled = true;
      forgotBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Sending…`;
      try {
        await auth.sendPasswordResetEmail(email);
        Toast.success('Reset Email Sent!', 'Check your inbox for the password reset link.');
        forgotForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
      } catch (err) {
        let msg = err.message;
        if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
        Toast.error('Failed', msg);
      } finally {
        forgotBtn.disabled = false;
        forgotBtn.innerHTML = `Send Reset Link`;
      }
    });
  }

  // Main login submit
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  if (emailInput) {
    emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') passInput?.focus(); });
  }
  if (passInput) {
    passInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  }

  async function handleLogin() {
    const email = emailInput?.value.trim();
    const pass  = passInput?.value;
    if (!email || !pass) { Toast.warning('Missing Fields', 'Please enter your email and password.'); return; }

    loginBtn.disabled = true;
    loginBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Signing in…`;
    try {
      const cred = await auth.signInWithEmailAndPassword(email, pass);
      // Ensure Firestore user doc exists with correct role
      const profile = await ensureUserDoc(cred.user);
      Toast.success('Welcome back!', `Hello, ${profile.name || email.split('@')[0]}!`);
      setTimeout(() => redirectByRole(profile.role), 800);
    } catch (err) {
      let msg = 'Invalid email or password.';
      if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';
      if (err.code === 'auth/network-request-failed') msg = 'Network error. Check your connection.';
      Toast.error('Sign In Failed', msg);
      loginBtn.disabled = false;
      loginBtn.innerHTML = `Sign In`;
    }
  }

  // Check if already logged in
  auth.onAuthStateChanged(async user => {
    if (user) {
      const role = await getUserRole(user.uid);
      redirectByRole(role);
    }
  });
}
