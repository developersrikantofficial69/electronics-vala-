// ============================================
// tasks.js — Task CRUD + Status Workflow
// ============================================

const TasksService = {
  // ---- Create a new task (Admin only) ----
  async create(data) {
    const ref = await db.collection(COLLECTIONS.TASKS).add({
      title:          data.title,
      description:    data.description || '',
      assignedTo:     data.assignedTo,
      assignedToName: data.assignedToName,
      createdBy:      auth.currentUser.uid,
      deadline:       firebase.firestore.Timestamp.fromDate(new Date(data.deadline)),
      priority:       data.priority || TASK_PRIORITY.MEDIUM,
      status:         TASK_STATUS.PENDING,
      progressNote:   '',
      completedAt:    null,
      createdAt:      firebase.firestore.FieldValue.serverTimestamp()
    });
    // Notify assigned user
    await NotifService.create(data.assignedTo, {
      type:    NOTIF_TYPE.TASK_ASSIGNED,
      message: `New task assigned: "${data.title}"`,
      taskId:  ref.id
    });
    return ref.id;
  },

  // ---- Update task fields (Admin) ----
  async update(taskId, data) {
    const allowed = ['title','description','assignedTo','assignedToName','deadline','priority'];
    const filtered = {};
    for (const k of allowed) {
      if (data[k] !== undefined) filtered[k] = data[k];
    }
    if (data.deadline) filtered.deadline = firebase.firestore.Timestamp.fromDate(new Date(data.deadline));
    await db.collection(COLLECTIONS.TASKS).doc(taskId).update(filtered);
  },

  // ---- Update task status ----
  async updateStatus(taskId, newStatus, note = '') {
    const update = { status: newStatus };
    if (note) update.progressNote = note;
    if (newStatus === TASK_STATUS.COMPLETED) {
      update.completedAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    await db.collection(COLLECTIONS.TASKS).doc(taskId).update(update);
  },

  // ---- Admin: Approve task ----
  async approve(taskId, task) {
    await db.collection(COLLECTIONS.TASKS).doc(taskId).update({
      status:      TASK_STATUS.COMPLETED,
      completedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await NotifService.create(task.assignedTo, {
      type:    NOTIF_TYPE.TASK_APPROVED,
      message: `✅ Your task "${task.title}" has been approved!`,
      taskId
    });
  },

  // ---- Admin: Reject task (send back) ----
  async reject(taskId, task, reason = '') {
    await db.collection(COLLECTIONS.TASKS).doc(taskId).update({
      status:      TASK_STATUS.IN_PROGRESS,
      progressNote: reason ? `Admin feedback: ${reason}` : ''
    });
    await NotifService.create(task.assignedTo, {
      type:    NOTIF_TYPE.TASK_REJECTED,
      message: `❌ Your task "${task.title}" was sent back.${reason ? ' Reason: ' + reason : ''}`,
      taskId
    });
  },

  // ---- Delete task ----
  async delete(taskId) {
    await db.collection(COLLECTIONS.TASKS).doc(taskId).delete();
  },

  // ---- Get all tasks (Admin) ----
  async getAll(filters = {}) {
    let q = db.collection(COLLECTIONS.TASKS).orderBy('createdAt', 'desc');
    if (filters.status && filters.status !== 'all')   q = q.where('status',   '==', filters.status);
    if (filters.priority && filters.priority !== 'all') q = q.where('priority','==', filters.priority);
    if (filters.uid)   q = q.where('assignedTo', '==', filters.uid);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ---- Get tasks for a specific user ----
  async getForUser(uid, filters = {}) {
    let q = db.collection(COLLECTIONS.TASKS)
              .where('assignedTo', '==', uid)
              .orderBy('createdAt', 'desc');
    const snap = await q.get();
    let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (filters.status && filters.status !== 'all') {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    return tasks;
  },

  // ---- Get single task ----
  async get(taskId) {
    const doc = await db.collection(COLLECTIONS.TASKS).doc(taskId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  // ---- Real-time listener for all tasks ----
  onAll(callback, filters = {}) {
    let q = db.collection(COLLECTIONS.TASKS).orderBy('createdAt', 'desc');
    if (filters.status && filters.status !== 'all')   q = q.where('status',   '==', filters.status);
    if (filters.uid)   q = q.where('assignedTo', '==', filters.uid);
    return q.onSnapshot(snap => {
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(tasks);
    });
  },

  // ---- Real-time listener for user tasks ----
  onForUser(uid, callback) {
    return db.collection(COLLECTIONS.TASKS)
      .where('assignedTo', '==', uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(tasks);
      });
  },

  // ---- User: start task ----
  async start(taskId, note = '') {
    await this.updateStatus(taskId, TASK_STATUS.IN_PROGRESS, note);
  },

  // ---- User: submit task ----
  async submit(taskId, task, note = '') {
    await this.updateStatus(taskId, TASK_STATUS.SUBMITTED, note);
    // Notify admin
    const adminDoc = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', ADMIN_EMAIL).limit(1).get();
    if (!adminDoc.empty) {
      const adminUid = adminDoc.docs[0].id;
      await NotifService.create(adminUid, {
        type:    NOTIF_TYPE.FEEDBACK,
        message: `📤 ${task.assignedToName || 'A user'} submitted task: "${task.title}"`,
        taskId
      });
    }
  },

  // ---- Stats summary ----
  async getStats(uid = null) {
    let q = db.collection(COLLECTIONS.TASKS);
    if (uid) q = q.where('assignedTo', '==', uid);
    const snap = await q.get();
    const tasks = snap.docs.map(d => d.data());
    return {
      total:      tasks.length,
      pending:    tasks.filter(t => t.status === TASK_STATUS.PENDING).length,
      inProgress: tasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length,
      submitted:  tasks.filter(t => t.status === TASK_STATUS.SUBMITTED).length,
      underReview:tasks.filter(t => t.status === TASK_STATUS.UNDER_REVIEW).length,
      completed:  tasks.filter(t => t.status === TASK_STATUS.COMPLETED).length,
    };
  },

  // ---- Per-user stats (for admin analytics) ----
  async getPerUserStats() {
    const snap = await db.collection(COLLECTIONS.TASKS).get();
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const map = {};
    for (const t of tasks) {
      if (!map[t.assignedTo]) {
        map[t.assignedTo] = {
          uid:        t.assignedTo,
          name:       t.assignedToName || '—',
          total:      0,
          pending:    0,
          inProgress: 0,
          completed:  0,
          submitted:  0
        };
      }
      map[t.assignedTo].total++;
      if (t.status === TASK_STATUS.PENDING)     map[t.assignedTo].pending++;
      if (t.status === TASK_STATUS.IN_PROGRESS) map[t.assignedTo].inProgress++;
      if (t.status === TASK_STATUS.SUBMITTED || t.status === TASK_STATUS.UNDER_REVIEW) map[t.assignedTo].submitted++;
      if (t.status === TASK_STATUS.COMPLETED)   map[t.assignedTo].completed++;
    }
    return Object.values(map);
  },

  // ---- Monthly completion data ----
  async getMonthlyCompletions() {
    const snap = await db.collection(COLLECTIONS.TASKS)
      .where('status', '==', TASK_STATUS.COMPLETED)
      .get();
    const map = {};
    snap.docs.forEach(d => {
      const data = d.data();
      const ts = data.completedAt || data.createdAt;
      if (!ts) return;
      const date = ts.toDate();
      const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }
};

// ============================================
// Comments Service
// ============================================
const CommentsService = {
  async add(taskId, text) {
    const user = auth.currentUser;
    const profileDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
    const name = profileDoc.exists ? profileDoc.data().name : user.email.split('@')[0];
    await db.collection(COLLECTIONS.TASKS).doc(taskId)
      .collection('comments').add({
        text,
        authorId:   user.uid,
        authorName: name,
        authorEmail:user.email,
        createdAt:  firebase.firestore.FieldValue.serverTimestamp()
      });
    // Notify task owner if commented by admin
    const task = await TasksService.get(taskId);
    if (task && user.email === ADMIN_EMAIL && task.assignedTo !== user.uid) {
      await NotifService.create(task.assignedTo, {
        type:    NOTIF_TYPE.COMMENT_ADDED,
        message: `💬 Admin commented on your task: "${task.title}"`,
        taskId
      });
    }
  },

  onComments(taskId, callback) {
    return db.collection(COLLECTIONS.TASKS).doc(taskId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .onSnapshot(snap => {
        const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(comments);
      });
  }
};
