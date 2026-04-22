// ============================================
// calendar.js — Calendar Rendering
// ============================================

const Calendar = {
  currentDate: new Date(),

  render(tasks = []) {
    const container = document.getElementById('calendar-container');
    if (!container) return;
    const year  = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Group tasks by date string "YYYY-MM-DD"
    const taskMap = {};
    tasks.forEach(t => {
      if (!t.deadline) return;
      const d = t.deadline.toDate ? t.deadline.toDate() : new Date(t.deadline);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!taskMap[key]) taskMap[key] = [];
      taskMap[key].push(t);
    });

    const monthLabel = new Date(year, month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const firstDay   = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth= new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    let html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <button class="btn btn-secondary btn-sm" id="cal-prev">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><polyline points="15 18 9 12 15 6"/></svg>
          Prev
        </button>
        <h2 style="font-size:1rem;font-weight:700;color:var(--text-primary)">${monthLabel}</h2>
        <button class="btn btn-secondary btn-sm" id="cal-next">
          Next
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="cal-header">${dayLabels.map(d => `<div class="cal-day-label">${d}</div>`).join('')}</div>
      <div class="calendar-grid">
    `;

    // Previous month tail
    for (let i = firstDay - 1; i >= 0; i--) {
      html += `<div class="cal-cell other-month"><div class="cal-date">${daysInPrev - i}</div></div>`;
    }

    // Current month cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const isToday = dateStr === todayStr;
      const dayTasks = taskMap[dateStr] || [];

      const taskDots = dayTasks.slice(0, 3).map(t => {
        const colors = {
          pending:      '#64748b',
          in_progress:  '#3b82f6',
          submitted:    '#f59e0b',
          under_review: '#8b5cf6',
          completed:    '#10b981'
        };
        const now = new Date();
        const deadline = t.deadline.toDate ? t.deadline.toDate() : new Date(t.deadline);
        const isOverdue = deadline < now && t.status !== TASK_STATUS.COMPLETED;
        const bg = isOverdue ? '#ef4444' : (colors[t.status] || '#64748b');
        return `<div class="cal-task-dot" style="background:${bg}22;color:${bg}" title="${t.title} — ${t.status}">${t.title.slice(0,12)}${t.title.length > 12 ? '…' : ''}</div>`;
      }).join('');

      const moreNote = dayTasks.length > 3 ? `<div style="font-size:0.6rem;color:var(--text-muted);margin-top:2px">+${dayTasks.length-3} more</div>` : '';

      html += `
        <div class="cal-cell ${isToday ? 'today' : ''}" data-date="${dateStr}" style="cursor:${dayTasks.length ? 'pointer' : 'default'}">
          <div class="cal-date">${day}</div>
          ${taskDots}
          ${moreNote}
        </div>
      `;
    }

    // Next month filler
    const totalCells = firstDay + daysInMonth;
    const remaining  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="cal-cell other-month"><div class="cal-date">${i}</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Navigation
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      this.currentDate = new Date(year, month - 1, 1);
      this.render(tasks);
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      this.currentDate = new Date(year, month + 1, 1);
      this.render(tasks);
    });

    // Click on date cell to see tasks in a popup
    container.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const date = cell.dataset.date;
        const dayTasks = taskMap[date] || [];
        if (!dayTasks.length) return;
        this.showDayModal(date, dayTasks);
      });
    });
  },

  showDayModal(dateStr, tasks) {
    const existing = document.getElementById('cal-day-modal');
    if (existing) existing.remove();

    const [y, m, d] = dateStr.split('-');
    const label = new Date(y, m-1, d).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });

    const overlay = document.createElement('div');
    overlay.id = 'cal-day-modal';
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <h2 class="modal-title">📅 ${label}</h2>
          <button class="modal-close" onclick="document.getElementById('cal-day-modal').remove()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.6rem">
          ${tasks.map(t => `
            <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius);padding:0.85rem">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:0.85rem;font-weight:600;color:var(--text-primary)">${t.title}</span>
                ${statusBadge(t.status)}
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
                ${priorityBadge(t.priority)}
                <span style="font-size:0.72rem;color:var(--text-muted)">→ ${t.assignedToName || '—'}</span>
              </div>
              ${t.description ? `<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:6px">${t.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }
};

// ============================================
// search.js — Global & Per-Page Search
// ============================================

const Search = {
  // ---- Filter tasks array client-side ----
  filterTasks(tasks, query = '', filters = {}) {
    let result = [...tasks];
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.assignedToName?.toLowerCase().includes(q)
      );
    }
    if (filters.status && filters.status !== 'all') {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.priority && filters.priority !== 'all') {
      result = result.filter(t => t.priority === filters.priority);
    }
    if (filters.uid && filters.uid !== 'all') {
      result = result.filter(t => t.assignedTo === filters.uid);
    }
    if (filters.month) {
      result = result.filter(t => {
        if (!t.deadline) return false;
        const d = t.deadline.toDate ? t.deadline.toDate() : new Date(t.deadline);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        return key === filters.month;
      });
    }
    return result;
  },

  // ---- Filter pipeline items ----
  filterPipeline(items, query = '', filters = {}) {
    let result = [...items];
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.assignedToName?.toLowerCase().includes(q)
      );
    }
    if (filters.status && filters.status !== 'all') {
      result = result.filter(i => i.status === filters.status);
    }
    if (filters.month) {
      result = result.filter(i => i.targetMonth === filters.month);
    }
    return result;
  },

  // ---- Init global search (header) ----
  initGlobal(onSearch) {
    const input = document.getElementById('global-search');
    if (!input) return;
    input.addEventListener('input', debounce(e => {
      onSearch(e.target.value.trim());
    }, 300));
  }
};
