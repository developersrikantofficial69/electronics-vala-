// ============================================
// notifications.js — In-App Notification System
// ============================================

const NotifService = {
  _unsub: null,

  // ---- Create a notification for a user ----
  async create(uid, { type, message, taskId = null }) {
    await db.collection(COLLECTIONS.USERS).doc(uid)
      .collection('notifications').add({
        type,
        message,
        taskId,
        read:      false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
  },

  // ---- Mark a single notification as read ----
  async markRead(uid, notifId) {
    await db.collection(COLLECTIONS.USERS).doc(uid)
      .collection('notifications').doc(notifId)
      .update({ read: true });
  },

  // ---- Mark all as read ----
  async markAllRead(uid) {
    const snap = await db.collection(COLLECTIONS.USERS).doc(uid)
      .collection('notifications').where('read', '==', false).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  },

  // ---- Real-time listener ----
  listen(uid, callback) {
    if (this._unsub) this._unsub();
    this._unsub = db.collection(COLLECTIONS.USERS).doc(uid)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .onSnapshot(snap => {
        const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(notifs);
      });
    return this._unsub;
  },

  stopListening() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  },

  // ---- Render notifications in the dropdown ----
  renderDropdown(uid, notifs) {
    const listEl  = document.getElementById('notif-list');
    const badgeEl = document.getElementById('notif-badge');
    if (!listEl) return;

    const unread = notifs.filter(n => !n.read).length;
    if (badgeEl) {
      if (unread > 0) {
        badgeEl.textContent = unread > 9 ? '9+' : unread;
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    // Also update sidebar nav badge if present
    const navBadge = document.getElementById('nav-notif-badge');
    if (navBadge) {
      navBadge.textContent = unread;
      navBadge.style.display = unread > 0 ? 'flex' : 'none';
    }

    if (notifs.length === 0) {
      listEl.innerHTML = `<div class="notif-empty">🔔 No notifications yet</div>`;
      return;
    }

    const typeIcons = {
      [NOTIF_TYPE.TASK_ASSIGNED]:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
      [NOTIF_TYPE.TASK_APPROVED]:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      [NOTIF_TYPE.TASK_REJECTED]:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      [NOTIF_TYPE.DEADLINE_NEAR]:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      [NOTIF_TYPE.COMMENT_ADDED]:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
      [NOTIF_TYPE.FEEDBACK]:       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
    };

    listEl.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}" data-task-id="${n.taskId || ''}">
        <div class="notif-item-icon">${typeIcons[n.type] || typeIcons[NOTIF_TYPE.TASK_ASSIGNED]}</div>
        <div class="notif-item-text">
          <div class="notif-item-msg">${n.message}</div>
          <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
        </div>
        ${!n.read ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:6px"></div>' : ''}
      </div>
    `).join('');

    // Click to mark as read
    listEl.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', async () => {
        const nid = el.dataset.notifId;
        await NotifService.markRead(uid, nid);
        el.classList.remove('unread');
        el.querySelector('[style*="border-radius:50%"]')?.remove();
      });
    });

    // Mark all read button
    document.getElementById('mark-all-read')?.addEventListener('click', async () => {
      await NotifService.markAllRead(uid);
      Toast.success('Done', 'All notifications marked as read.');
    });
  },

  // ---- Auto deadline checker (run every hour) ----
  async checkDeadlines(uid) {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const snap = await db.collection(COLLECTIONS.TASKS)
      .where('assignedTo', '==', uid)
      .where('status', 'in', [TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS])
      .get();
    for (const doc of snap.docs) {
      const task = doc.data();
      if (!task.deadline) continue;
      const deadline = task.deadline.toDate();
      if (deadline > now && deadline <= in24h) {
        const hoursLeft = Math.ceil((deadline - now) / 3600000);
        await this.create(uid, {
          type:    NOTIF_TYPE.DEADLINE_NEAR,
          message: `⏰ Deadline in ~${hoursLeft}h: "${task.title}"`,
          taskId:  doc.id
        });
      }
    }
  }
};
