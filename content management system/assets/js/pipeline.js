// ============================================
// pipeline.js — Content Pipeline CRUD
// ============================================

const PipelineService = {
  // ---- Create content entry ----
  async create(data) {
    return await db.collection(COLLECTIONS.CONTENT).add({
      title:          data.title,
      assignedTo:     data.assignedTo     || auth.currentUser.uid,
      assignedToName: data.assignedToName || '',
      targetMonth:    data.targetMonth,
      status:         data.status || CONTENT_STATUS.UPCOMING,
      performanceNotes: data.performanceNotes || '',
      completedAt:    null,
      createdAt:      firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  // ---- Update ----
  async update(id, data) {
    const update = { ...data };
    if (data.status === CONTENT_STATUS.COMPLETED && !data.completedAt) {
      update.completedAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    await db.collection(COLLECTIONS.CONTENT).doc(id).update(update);
  },

  // ---- Delete ----
  async delete(id) {
    await db.collection(COLLECTIONS.CONTENT).doc(id).delete();
  },

  // ---- Get all ----
  async getAll(filters = {}) {
    let q = db.collection(COLLECTIONS.CONTENT).orderBy('createdAt', 'desc');
    if (filters.status && filters.status !== 'all') q = q.where('status', '==', filters.status);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ---- Real-time listener ----
  onAll(callback) {
    return db.collection(COLLECTIONS.CONTENT)
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(items);
      });
  },

  // ---- Get pipeline stats ----
  async getStats() {
    const snap = await db.collection(COLLECTIONS.CONTENT).get();
    const items = snap.docs.map(d => d.data());
    return {
      total:      items.length,
      upcoming:   items.filter(i => i.status === CONTENT_STATUS.UPCOMING).length,
      inProgress: items.filter(i => i.status === CONTENT_STATUS.IN_PROGRESS).length,
      completed:  items.filter(i => i.status === CONTENT_STATUS.COMPLETED).length,
    };
  }
};

// ============================================
// analytics.js — Charts & Progress Reports
// ============================================

const Analytics = {
  charts: {},

  destroyChart(id) {
    if (this.charts[id]) { this.charts[id].destroy(); delete this.charts[id]; }
  },

  // ---- Task Status Donut ----
  renderStatusDonut(canvasId, stats) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'In Progress', 'Submitted', 'Under Review', 'Completed'],
        datasets: [{
          data: [stats.pending, stats.inProgress, stats.submitted, stats.underReview, stats.completed],
          backgroundColor: ['#64748b','#3b82f6','#f59e0b','#8b5cf6','#10b981'],
          borderColor: 'transparent',
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 14, boxWidth: 10 }
          },
          tooltip: {
            backgroundColor: '#1e1e30',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1
          }
        }
      }
    });
  },

  // ---- Monthly Completions Bar ----
  renderMonthlyBar(canvasId, monthlyData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const sortedKeys = Object.keys(monthlyData).sort();
    const last6 = sortedKeys.slice(-6);
    const labels = last6.map(k => {
      const [y, m] = k.split('-');
      return new Date(y, m-1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });
    const values = last6.map(k => monthlyData[k] || 0);

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Completed Tasks',
          data: values,
          backgroundColor: 'rgba(99,102,241,0.7)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e1e30',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, stepSize: 1 }, beginAtZero: true }
        }
      }
    });
  },

  // ---- Per-User Productivity Bar ----
  renderUserProductivity(canvasId, userStats) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const labels = userStats.map(u => u.name.split(' ')[0]);
    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Completed', data: userStats.map(u => u.completed), backgroundColor: 'rgba(16,185,129,0.7)', borderColor:'#10b981', borderWidth:1, borderRadius:4, borderSkipped:false },
          { label: 'In Progress', data: userStats.map(u => u.inProgress), backgroundColor: 'rgba(59,130,246,0.7)', borderColor:'#3b82f6', borderWidth:1, borderRadius:4, borderSkipped:false },
          { label: 'Pending', data: userStats.map(u => u.pending), backgroundColor: 'rgba(100,116,139,0.5)', borderColor:'#64748b', borderWidth:1, borderRadius:4, borderSkipped:false },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 14, boxWidth: 10 } },
          tooltip: { backgroundColor: '#1e1e30', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, stepSize: 1 }, beginAtZero: true }
        }
      }
    });
  },

  // ---- Completion Rate Line ----
  renderCompletionLine(canvasId, monthlyData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const sortedKeys = Object.keys(monthlyData).sort().slice(-6);
    const labels = sortedKeys.map(k => {
      const [y, m] = k.split('-');
      return new Date(y, m-1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });
    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Tasks Completed',
          data: sortedKeys.map(k => monthlyData[k] || 0),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139,92,246,0.1)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#0d0d1a',
          pointBorderWidth: 2,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#1e1e30', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, stepSize: 1 }, beginAtZero: true }
        }
      }
    });
  }
};
