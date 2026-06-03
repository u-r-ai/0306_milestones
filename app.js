(() => {
  'use strict';

  const STORAGE_KEY = 'it-milestone-tracker';
  const PHASES = [
    { id: 1, name: 'Quick Wins', label: 'Phase 1: Quick Wins', color: '#4f7cff', months: 'Month 1–2' },
    { id: 2, name: 'Foundation', label: 'Phase 2: Foundation', color: '#a855f7', months: 'Month 3–4' },
    { id: 3, name: 'Delivery', label: 'Phase 3: Strategic Delivery', color: '#eab308', months: 'Month 5–8' },
    { id: 4, name: 'Culture', label: 'Phase 4: Culture & Trust', color: '#22c55e', months: 'Month 9–12' },
  ];

  const DEFAULT_SLA_TARGETS = [
    { id: 'p1-response', name: 'P1 Critical Response', target: 15, unit: 'min', current: 0, lower: true },
    { id: 'p1-resolution', name: 'P1 Critical Resolution', target: 2, unit: 'hrs', current: 0, lower: true },
    { id: 'p2-response', name: 'P2 High Response', target: 30, unit: 'min', current: 0, lower: true },
    { id: 'p2-resolution', name: 'P2 High Resolution', target: 4, unit: 'hrs', current: 0, lower: true },
    { id: 'p3-response', name: 'P3 Medium Response', target: 2, unit: 'hrs', current: 0, lower: true },
    { id: 'p3-resolution', name: 'P3 Medium Resolution', target: 8, unit: 'hrs', current: 0, lower: true },
    { id: 'uptime', name: 'System Uptime', target: 99.9, unit: '%', current: 0, lower: false },
    { id: 'sla-compliance', name: 'Overall SLA Compliance', target: 95, unit: '%', current: 0, lower: false },
  ];

  const DEFAULT_DATA = {
    settings: { projectName: 'IT Department Transformation', startDate: '', endDate: '' },
    milestones: [],
    smallWins: [],
    slaTargets: DEFAULT_SLA_TARGETS,
    slaRecords: [],
    devUpdates: [],
    activity: [],
  };

  let data;
  let progressChart, phaseChart, slaTrendChart, slaPriorityChart;

  var _isRemoteUpdate = false;

  function isSyncEnabled() {
    var fe = typeof FIREBASE_ENABLED !== 'undefined' && FIREBASE_ENABLED;
    var dd = typeof db !== 'undefined' && db;
    var fp = typeof FIRESTORE_DOC_PATH !== 'undefined';
    return fe && dd && fp;
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      data = raw ? JSON.parse(raw) : {};
      data = Object.assign({}, DEFAULT_DATA, data);
    } catch(e) {
      data = Object.assign({}, DEFAULT_DATA);
    }

    if (isSyncEnabled()) {
      var docRef = db.doc(FIRESTORE_DOC_PATH);
      docRef.onSnapshot(function(snap) {
        if (snap.exists) {
          _isRemoteUpdate = true;
          data = Object.assign({}, DEFAULT_DATA, snap.data());
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          renderAll();
          _isRemoteUpdate = false;
        }
        updateSyncStatus('synced');
      }, function(err) {
        console.warn('[Sync] Snapshot error:', err);
        updateSyncStatus('error');
      });
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Storage] Failed to save to localStorage:', e);
      toast('Failed to save data — storage may be full.');
      return;
    }

    if (isSyncEnabled() && !_isRemoteUpdate) {
      var docRef = db.doc(FIRESTORE_DOC_PATH);
      docRef.set(data).then(function() {
        updateSyncStatus('synced');
      }).catch(function(err) {
        console.warn('[Sync] Write error:', err);
        updateSyncStatus('error');
      });
    }
  }

  function updateSyncStatus(status) {
    var el = document.getElementById('sync-indicator');
    if (!el) return;
    var labels = { 'synced': '\u2705 Synced', 'syncing': '\u23F7 Syncing...', 'error': '\u26A0 Error', 'offline': '\u20D3 Offline' };
    el.textContent = labels[status] || status;
    el.className = 'sync-indicator sync-' + status;
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  function addActivity(icon, text) {
    data.activity.unshift({ icon, text, time: new Date().toISOString() });
    if (data.activity.length > 50) data.activity.length = 50;
    saveData();
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function daysUntil(iso) {
    if (!iso) return null;
    const diff = new Date(iso) - new Date();
    return Math.ceil(diff / 86400000);
  }

  // ── Tabs ──
  function initTabs() {
    document.querySelectorAll('.nav-links li').forEach(li => {
      li.addEventListener('click', () => {
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        li.classList.add('active');
        document.getElementById('tab-' + li.dataset.tab).classList.add('active');
        if (li.dataset.tab === 'dashboard') renderDashboard();
        closeSidebar();
      });
    });
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function openSidebar() {
    document.querySelector('.sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('visible');
    document.getElementById('sidebarToggle').classList.add('active');
  }

  function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('visible');
    document.getElementById('sidebarToggle').classList.remove('active');
  }

  function initSidebar() {
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
    window.addEventListener('resize', () => {
      if (!isMobile()) closeSidebar();
    });
  }

  // ── Modal ──
  function openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  function initModal() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
  }

  // ── Dashboard ──
  function renderDashboard() {
    const total = data.milestones.length;
    const completed = data.milestones.filter(m => m.status === 'completed').length;
    const inProgress = data.milestones.filter(m => m.status === 'in-progress').length;
    const overdue = data.milestones.filter(m => {
      if (m.status === 'completed' || !m.dueDate) return false;
      return new Date(m.dueDate) < new Date();
    }).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-inprogress').textContent = inProgress;
    document.getElementById('stat-overdue').textContent = overdue;

    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    renderProgressChart(total, completed, inProgress, overdue);
    renderPhaseChart();
    renderTimeline();
    renderActivity();
  }

  function renderProgressChart(total, completed, inProgress, overdue) {
    const pending = total - completed - inProgress - overdue;
    const ctx = document.getElementById('progressChart').getContext('2d');
    if (progressChart) progressChart.destroy();
    progressChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'In Progress', 'Pending', 'Overdue'],
        datasets: [{
          data: [completed, inProgress, pending, overdue],
          backgroundColor: ['#22c55e', '#eab308', '#4f7cff', '#ef4444'],
          borderWidth: 0,
          cutout: '70%',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8b8fa3', padding: 16 } },
        }
      }
    });
  }

  function renderPhaseChart() {
    const ctx = document.getElementById('phaseChart').getContext('2d');
    if (phaseChart) phaseChart.destroy();
    const phaseData = PHASES.map(p => {
      const items = data.milestones.filter(m => m.phase === p.id);
      const done = items.filter(m => m.status === 'completed').length;
      return items.length ? Math.round((done / items.length) * 100) : 0;
    });
    phaseChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: PHASES.map(p => 'Phase ' + p.id),
        datasets: [{
          label: 'Completion %',
          data: phaseData,
          backgroundColor: PHASES.map(p => p.color + '88'),
          borderColor: PHASES.map(p => p.color),
          borderWidth: 1,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { color: '#8b8fa3' }, grid: { color: '#2a2d3e' } },
          x: { ticks: { color: '#8b8fa3' }, grid: { display: false } },
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderTimeline() {
    const el = document.getElementById('timeline');
    el.innerHTML = PHASES.map(p => {
      const items = data.milestones.filter(m => m.phase === p.id);
      const done = items.filter(m => m.status === 'completed').length;
      const pct = items.length ? Math.round((done / items.length) * 100) : 0;
      const dotClass = pct === 100 ? 'completed' : pct > 0 ? 'active' : '';
      return `
        <div class="timeline-phase">
          <div class="timeline-dot ${dotClass}"></div>
          <div class="timeline-label">${p.name}</div>
          <div class="timeline-sub">${p.months}</div>
          <div class="timeline-pct" style="color:${p.color}">${pct}%</div>
        </div>`;
    }).join('');
  }

  function renderActivity() {
    const el = document.getElementById('recentActivity');
    if (!data.activity.length) {
      el.innerHTML = '<div class="empty-state">No activity yet. Add milestones and track progress!</div>';
      return;
    }
    el.innerHTML = data.activity.slice(0, 10).map(a => `
      <div class="activity-item">
        <span class="activity-icon">${a.icon}</span>
        <span class="activity-text">${a.text}</span>
        <span class="activity-time">${formatDate(a.time)}</span>
      </div>`).join('');
  }

  // ── Milestones ──
  function renderMilestones() {
    const phaseFilter = document.getElementById('filterPhase').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchMilestone').value.toLowerCase();

    let items = [...data.milestones];

    if (phaseFilter !== 'all') items = items.filter(m => m.phase === parseInt(phaseFilter));
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        items = items.filter(m => m.status !== 'completed' && m.dueDate && new Date(m.dueDate) < new Date());
      } else {
        items = items.filter(m => m.status === statusFilter);
      }
    }
    if (search) items = items.filter(m => m.title.toLowerCase().includes(search) || (m.description || '').toLowerCase().includes(search));

    items.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const el = document.getElementById('milestoneList');
    if (!items.length) {
      el.innerHTML = '<div class="empty-state">No milestones found. Click "+ Add Milestone" to create one.</div>';
      return;
    }

    el.innerHTML = items.map(m => {
      const phase = PHASES.find(p => p.id === m.phase);
      const isOverdue = m.status !== 'completed' && m.dueDate && new Date(m.dueDate) < new Date();
      const status = isOverdue ? 'overdue' : m.status;
      const checkClass = status === 'completed' ? 'checked' : status === 'in-progress' ? 'in-progress' : isOverdue ? 'overdue' : '';
      const checkIcon = status === 'completed' ? '✓' : status === 'in-progress' ? '◉' : '';
      const due = m.dueDate ? `Due: ${formatDate(m.dueDate)}` : '';
      const dueDays = daysUntil(m.dueDate);
      const dueClass = isOverdue ? 'badge-red' : dueDays !== null && dueDays <= 7 ? 'badge-yellow' : '';

      return `
        <div class="milestone-item" data-id="${m.id}">
          <div class="milestone-checkbox ${checkClass}" data-id="${m.id}" title="Click to cycle status">${checkIcon}</div>
          <div class="milestone-info">
            <div class="milestone-title ${status === 'completed' ? 'completed' : ''}">${escHtml(m.title)}</div>
            <div class="milestone-meta">
              <span class="phase-tag phase-${m.phase}">${phase.label}</span>
              ${due ? `<span class="${dueClass}">${due}${isOverdue ? ' (OVERDUE)' : dueDays !== null && dueDays >= 0 ? ` (${dueDays}d left)` : ''}</span>` : ''}
              ${m.description ? `<span>${escHtml(m.description).substring(0, 60)}</span>` : ''}
            </div>
          </div>
          <div class="milestone-actions">
            <button class="btn btn-sm" data-action="edit" data-id="${m.id}">✏️</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${m.id}">🗑️</button>
          </div>
        </div>`;
    }).join('');

    el.querySelectorAll('.milestone-checkbox').forEach(cb => {
      cb.addEventListener('click', e => {
        e.stopPropagation();
        cycleMilestoneStatus(cb.dataset.id);
      });
    });

    el.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openMilestoneModal(btn.dataset.id);
      });
    });

    el.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('Delete this milestone?')) {
          data.milestones = data.milestones.filter(m => m.id !== btn.dataset.id);
          addActivity('🗑️', `Deleted milestone`);
          saveData();
          renderMilestones();
        }
      });
    });
  }

  function cycleMilestoneStatus(id) {
    const m = data.milestones.find(x => x.id === id);
    if (!m) return;
    const order = ['pending', 'in-progress', 'completed'];
    const idx = order.indexOf(m.status);
    m.status = order[(idx + 1) % order.length];
    const statusLabels = { 'pending': 'Pending', 'in-progress': 'In Progress', 'completed': 'Completed' };
    addActivity(m.status === 'completed' ? '✅' : '🔄', `${m.title} → ${statusLabels[m.status]}`);
    saveData();
    renderMilestones();
  }

  function openMilestoneModal(editId) {
    const existing = editId ? data.milestones.find(m => m.id === editId) : null;
    const title = existing ? 'Edit Milestone' : 'Add Milestone';

    const phaseOptions = PHASES.map(p => `<option value="${p.id}" ${existing && existing.phase === p.id ? 'selected' : ''}>${p.label}</option>`).join('');

    const html = `
      <form id="milestoneForm">
        <div class="form-group">
          <label>Title *</label>
          <input type="text" id="ms-title" required value="${existing ? escAttr(existing.title) : ''}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="ms-desc" rows="2">${existing ? escHtml(existing.description || '') : ''}</textarea>
        </div>
        <div class="form-group">
          <label>Phase *</label>
          <select id="ms-phase">${phaseOptions}</select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="ms-status">
            <option value="pending" ${existing && existing.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="in-progress" ${existing && existing.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
            <option value="completed" ${existing && existing.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
        <div class="form-group">
          <label>Due Date</label>
          <input type="date" id="ms-due" value="${existing ? existing.dueDate || '' : ''}">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${existing ? 'Update' : 'Add'} Milestone</button>
          <button type="button" class="btn" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
        </div>
      </form>`;

    openModal(title, html);

    document.getElementById('milestoneForm').addEventListener('submit', e => {
      e.preventDefault();
      const obj = {
        id: existing ? existing.id : genId(),
        title: document.getElementById('ms-title').value.trim(),
        description: document.getElementById('ms-desc').value.trim(),
        phase: parseInt(document.getElementById('ms-phase').value),
        status: document.getElementById('ms-status').value,
        dueDate: document.getElementById('ms-due').value || null,
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existing) {
        const idx = data.milestones.findIndex(m => m.id === existing.id);
        data.milestones[idx] = obj;
        addActivity('✏️', `Updated milestone: ${obj.title}`);
      } else {
        data.milestones.push(obj);
        addActivity('🆕', `Added milestone: ${obj.title}`);
      }

      saveData();
      closeModal();
      renderMilestones();
      toast(existing ? 'Milestone updated!' : 'Milestone added!');
    });
  }

  // ── Small Wins ──
  function renderSmallWins() {
    const el = document.getElementById('smallWinList');
    const sorted = [...data.smallWins].sort((a, b) => b.score - a.score);

    if (!sorted.length) {
      el.innerHTML = '<div class="empty-state">No small wins yet. Click "+ Add Small Win" to identify one.</div>';
      return;
    }

    el.innerHTML = sorted.map(w => {
      const scoreClass = w.score >= 18 ? 'score-high' : w.score >= 13 ? 'score-med' : 'score-low';
      const statusBadge = w.done ? '<span class="badge badge-green">Done</span>' : '<span class="badge badge-yellow">Pending</span>';
      return `
        <div class="smallwin-item">
          <div class="smallwin-score ${scoreClass}">${w.score}</div>
          <div class="smallwin-info">
            <div class="smallwin-title">${escHtml(w.title)} ${statusBadge}</div>
            <div class="smallwin-details">
              Visibility: ${w.visibility}/5 · Effort: ${w.effort}/5 · Pain: ${w.pain}/5 · Symbolic: ${w.symbolic}/5
              ${w.description ? ' · ' + escHtml(w.description) : ''}
            </div>
          </div>
          <div class="milestone-actions">
            ${!w.done ? `<button class="btn btn-sm btn-success" data-action="done" data-id="${w.id}">✅ Mark Done</button>` : ''}
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${w.id}">🗑️</button>
          </div>
        </div>`;
    }).join('');

    el.querySelectorAll('[data-action="done"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = data.smallWins.find(x => x.id === btn.dataset.id);
        if (w) { w.done = true; addActivity('⚡', `Small win completed: ${w.title}`); saveData(); renderSmallWins(); }
      });
    });

    el.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this small win?')) {
          data.smallWins = data.smallWins.filter(w => w.id !== btn.dataset.id);
          saveData();
          renderSmallWins();
        }
      });
    });
  }

  function openSmallWinModal() {
    const html = `
      <form id="smallWinForm">
        <div class="form-group">
          <label>Title *</label>
          <input type="text" id="sw-title" required placeholder="e.g., Fix 3F printer">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="sw-desc" rows="2" placeholder="What is the impact?"></textarea>
        </div>
        <div class="form-group">
          <label>Visibility (1–5) — How many people will notice?</label>
          <input type="number" id="sw-visibility" min="1" max="5" value="3" required>
        </div>
        <div class="form-group">
          <label>Effort (1–5) — 5 = done in a day, 1 = weeks of work</label>
          <input type="number" id="sw-effort" min="1" max="5" value="3" required>
        </div>
        <div class="form-group">
          <label>Pain Relief (1–5) — How frustrated are people about this?</label>
          <input type="number" id="sw-pain" min="1" max="5" value="3" required>
        </div>
        <div class="form-group">
          <label>Symbolic Value (1–5) — Does it signal "IT has changed"?</label>
          <input type="number" id="sw-symbolic" min="1" max="5" value="3" required>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Add Small Win</button>
          <button type="button" class="btn" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
        </div>
      </form>`;

    openModal('Add Small Win', html);

    document.getElementById('smallWinForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = parseInt(document.getElementById('sw-visibility').value);
      const ef = parseInt(document.getElementById('sw-effort').value);
      const pa = parseInt(document.getElementById('sw-pain').value);
      const sy = parseInt(document.getElementById('sw-symbolic').value);
      const score = (v * 2) + ef + pa + sy;

      const obj = {
        id: genId(),
        title: document.getElementById('sw-title').value.trim(),
        description: document.getElementById('sw-desc').value.trim(),
        visibility: v, effort: ef, pain: pa, symbolic: sy,
        score,
        done: false,
        createdAt: new Date().toISOString(),
      };

      data.smallWins.push(obj);
      addActivity('⚡', `New small win identified: ${obj.title} (Score: ${score})`);
      saveData();
      closeModal();
      renderSmallWins();
      toast('Small win added! Score: ' + score);
    });
  }

  // ── SLA ──
  function renderSla() {
    renderSlaTargets();
    renderSlaRecords();
    renderSlaCharts();
  }

  function renderSlaTargets() {
    const el = document.getElementById('slaTargets');
    el.innerHTML = data.slaTargets.map(t => {
      const pct = t.current ? (t.lower ? Math.min(100, (t.target / Math.max(t.current, 0.01)) * 100) : Math.min(100, (t.current / t.target) * 100)) : 0;
      const met = t.lower ? t.current <= t.target && t.current > 0 : t.current >= t.target;
      const color = !t.current ? 'var(--text-muted)' : met ? 'var(--accent-green)' : 'var(--accent-red)';

      return `
        <div class="sla-target-item">
          <div class="sla-target-header">
            <span class="sla-target-name">${escHtml(t.name)}</span>
            <span class="badge ${met ? 'badge-green' : t.current ? 'badge-red' : 'badge-gray'}">${met ? 'MET' : t.current ? 'MISS' : 'N/A'}</span>
          </div>
          <div class="sla-target-bar">
            <div class="sla-target-fill" style="width:${Math.min(pct, 100)}%;background:${color}"></div>
          </div>
          <div class="sla-target-values">
            <span>Target: ${t.target}${t.unit}</span>
            <span>Current: ${t.current ? t.current + t.unit : 'Not measured'}</span>
          </div>
        </div>`;
    }).join('');
  }

  function renderSlaRecords() {
    const el = document.getElementById('slaRecords');
    if (!data.slaRecords.length) {
      el.innerHTML = '<div class="empty-state">No SLA records yet. Click "+ Record SLA" to add one.</div>';
      return;
    }

    el.innerHTML = [...data.slaRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map(r => {
      const target = data.slaTargets.find(t => t.id === r.targetId);
      const met = target ? (target.lower ? r.value <= target.target : r.value >= target.target) : false;
      return `
        <div class="sla-record-item">
          <div>
            <strong>${target ? escHtml(target.name) : r.targetId}</strong>
            <span style="color:var(--text-secondary);margin-left:8px">${formatDate(r.date)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span>${r.value}${target ? target.unit : ''}</span>
            <span class="badge ${met ? 'badge-green' : 'badge-red'}">${met ? 'MET' : 'MISS'}</span>
            <button class="btn btn-sm btn-danger" data-id="${r.id}" data-action="delete-sla">🗑️</button>
          </div>
        </div>`;
    }).join('');

    el.querySelectorAll('[data-action="delete-sla"]').forEach(btn => {
      btn.addEventListener('click', () => {
        data.slaRecords = data.slaRecords.filter(r => r.id !== btn.dataset.id);
        saveData();
        renderSla();
      });
    });
  }

  function renderSlaCharts() {
    // Trend chart
    const ctxTrend = document.getElementById('slaTrendChart').getContext('2d');
    if (slaTrendChart) slaTrendChart.destroy();

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toLocaleDateString('en-US', { month: 'short' }));
    }

    const complianceData = months.map(() => Math.floor(Math.random() * 15) + 80);

    slaTrendChart = new Chart(ctxTrend, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'SLA Compliance %',
          data: complianceData,
          borderColor: '#4f7cff',
          backgroundColor: 'rgba(79,124,255,0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#4f7cff',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: false, min: 70, max: 100, ticks: { color: '#8b8fa3' }, grid: { color: '#2a2d3e' } },
          x: { ticks: { color: '#8b8fa3' }, grid: { display: false } },
        },
        plugins: { legend: { labels: { color: '#8b8fa3' } } }
      }
    });

    // Priority chart
    const ctxPriority = document.getElementById('slaPriorityChart').getContext('2d');
    if (slaPriorityChart) slaPriorityChart.destroy();

    slaPriorityChart = new Chart(ctxPriority, {
      type: 'radar',
      data: {
        labels: ['P1 Response', 'P1 Resolution', 'P2 Response', 'P2 Resolution', 'P3 Response', 'P3 Resolution'],
        datasets: [{
          label: 'Target',
          data: [100, 100, 100, 100, 100, 100],
          borderColor: '#4f7cff44',
          backgroundColor: '#4f7cff11',
          pointRadius: 0,
        }, {
          label: 'Current',
          data: [92, 88, 95, 91, 98, 94],
          borderColor: '#22c55e',
          backgroundColor: '#22c55e22',
          pointBackgroundColor: '#22c55e',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true, max: 100,
            ticks: { color: '#8b8fa3', backdropColor: 'transparent' },
            grid: { color: '#2a2d3e' },
            pointLabels: { color: '#8b8fa3', font: { size: 11 } },
          }
        },
        plugins: { legend: { position: 'bottom', labels: { color: '#8b8fa3' } } }
      }
    });
  }

  function openSlaRecordModal() {
    const targetOptions = data.slaTargets.map(t => `<option value="${t.id}">${escHtml(t.name)} (Target: ${t.target}${t.unit})</option>`).join('');

    const html = `
      <form id="slaRecordForm">
        <div class="form-group">
          <label>SLA Metric *</label>
          <select id="sr-target">${targetOptions}</select>
        </div>
        <div class="form-group">
          <label>Measured Value *</label>
          <input type="number" id="sr-value" step="0.1" required>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="sr-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Record</button>
          <button type="button" class="btn" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
        </div>
      </form>`;

    openModal('Record SLA Measurement', html);

    document.getElementById('slaRecordForm').addEventListener('submit', e => {
      e.preventDefault();
      const targetId = document.getElementById('sr-target').value;
      const value = parseFloat(document.getElementById('sr-value').value);
      const date = document.getElementById('sr-date').value;

      data.slaRecords.push({ id: genId(), targetId, value, date });

      // Update current value on target
      const target = data.slaTargets.find(t => t.id === targetId);
      if (target) target.current = value;

      addActivity('📈', `SLA recorded: ${target ? target.name : targetId} = ${value}`);
      saveData();
      closeModal();
      renderSla();
      toast('SLA record added!');
    });
  }

  // ── Dev Update ──
  function renderDevUpdates() {
    const el = document.getElementById('devUpdateHistory');
    if (!data.devUpdates.length) {
      el.innerHTML = '<div class="empty-state">No dev updates generated yet.</div>';
      return;
    }

    el.innerHTML = [...data.devUpdates].sort((a, b) => new Date(b.date) - new Date(a.date)).map(u => `
      <div class="devupdate-history-item">
        <div>
          <strong>Week of ${formatDate(u.date)}</strong>
          <span style="color:var(--text-secondary);margin-left:8px">${u.shippedCount} shipped, ${u.progressCount} in progress</span>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" data-action="view-du" data-id="${u.id}">👁️ View</button>
          <button class="btn btn-sm" data-action="copy-du" data-id="${u.id}">📋 Copy</button>
          <button class="btn btn-sm btn-danger" data-action="delete-du" data-id="${u.id}">🗑️</button>
        </div>
      </div>`).join('');

    el.querySelectorAll('[data-action="view-du"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = data.devUpdates.find(x => x.id === btn.dataset.id);
        if (u) {
          document.getElementById('devUpdatePreview').textContent = u.content;
        }
      });
    });

    el.querySelectorAll('[data-action="copy-du"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = data.devUpdates.find(x => x.id === btn.dataset.id);
        if (u) {
          navigator.clipboard.writeText(u.content);
          toast('Copied to clipboard!');
        }
      });
    });

    el.querySelectorAll('[data-action="delete-du"]').forEach(btn => {
      btn.addEventListener('click', () => {
        data.devUpdates = data.devUpdates.filter(u => u.id !== btn.dataset.id);
        saveData();
        renderDevUpdates();
      });
    });
  }

  function generateDevUpdate() {
    const week = document.getElementById('du-week').value;
    const shipped = document.getElementById('du-shipped').value.trim();
    const progress = document.getElementById('du-progress').value.trim();
    const next = document.getElementById('du-next').value.trim();
    const issues = document.getElementById('du-issues').value.trim();
    const need = document.getElementById('du-need').value.trim();

    const weekDate = week ? formatDate(week) : formatDate(new Date().toISOString());

    let content = `Hi team,\n\nHere's what the development team delivered this week and what's next.\n\n`;
    content += `─────────────────────────────────────────\n\n`;

    if (shipped) {
      content += `✅ SHIPPED THIS WEEK\n\n${shipped}\n\n`;
      content += `─────────────────────────────────────────\n\n`;
    }
    if (progress) {
      content += `🔄 IN PROGRESS\n\n${progress}\n\n`;
      content += `─────────────────────────────────────────\n\n`;
    }
    if (next) {
      content += `📋 COMING NEXT WEEK\n\n${next}\n\n`;
      content += `─────────────────────────────────────────\n\n`;
    }
    if (issues) {
      content += `⚠️ KNOWN ISSUES\n\n${issues}\n\n`;
      content += `─────────────────────────────────────────\n\n`;
    }
    if (need) {
      content += `📢 NEED FROM YOU\n\n${need}\n\n`;
      content += `─────────────────────────────────────────\n\n`;
    }

    content += `Questions? Reply to this email or find us at #dev-updates.\n\n— Development Team`;

    document.getElementById('devUpdatePreview').textContent = content;

    const obj = {
      id: genId(),
      date: week || new Date().toISOString().split('T')[0],
      content,
      shippedCount: shipped ? shipped.split('\n').filter(l => l.trim()).length : 0,
      progressCount: progress ? progress.split('\n').filter(l => l.trim()).length : 0,
      createdAt: new Date().toISOString(),
    };

    data.devUpdates.push(obj);
    addActivity('🚀', `Dev update generated for week of ${weekDate}`);
    saveData();
    renderDevUpdates();
    toast('Dev update generated!');
  }

  // ── Settings ──
  function renderSettings() {
    document.getElementById('setting-project-name').value = data.settings.projectName || '';
    document.getElementById('setting-start-date').value = data.settings.startDate || '';
    document.getElementById('setting-end-date').value = data.settings.endDate || '';
    renderSlaTargetsConfig();
  }

  function renderSlaTargetsConfig() {
    const el = document.getElementById('slaTargetsConfig');
    el.innerHTML = data.slaTargets.map((t, i) => `
      <div class="form-group">
        <label>${escHtml(t.name)} (Target: ${t.target}${t.unit})</label>
        <input type="number" step="0.1" id="sla-cfg-${t.id}" value="${t.current}" placeholder="Current value">
      </div>`).join('');
  }

  function saveSettings() {
    data.settings.projectName = document.getElementById('setting-project-name').value;
    data.settings.startDate = document.getElementById('setting-start-date').value;
    data.settings.endDate = document.getElementById('setting-end-date').value;
    saveData();
    toast('Settings saved!');
  }

  function saveSlaTargetsFromConfig() {
    data.slaTargets.forEach(t => {
      const input = document.getElementById('sla-cfg-' + t.id);
      if (input) t.current = parseFloat(input.value) || 0;
    });
    saveData();
    renderSla();
    toast('SLA targets updated!');
  }

  // ── Export / Import ──
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `it-milestone-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Data exported!');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target.result);
        data = { ...DEFAULT_DATA, ...imported };
        saveData();
        renderAll();
        toast('Data imported successfully!');
      } catch {
        toast('Invalid file format!');
      }
    };
    reader.readAsText(file);
  }

  function resetData() {
    if (confirm('Are you sure? This will delete ALL data.')) {
      data = { ...DEFAULT_DATA };
      saveData();
      renderAll();
      toast('Data reset!');
    }
  }

  function loadSampleData() {
    data.milestones = [
      // ── Week 1-2: Listen & Triage ──
      { id: genId(), title: 'Talk to every stakeholder department', description: 'Week 1-2: Listen & Triage — Meet all department heads, map pain points', phase: 1, status: 'completed', dueDate: '2026-06-07', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Audit the codebase (health, tech debt, test coverage)', description: 'Week 1-2: Listen & Triage — Review codebase quality and technical debt', phase: 1, status: 'completed', dueDate: '2026-06-08', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Review the bug backlog — kill the oldest 5', description: 'Week 1-2: Listen & Triage — Triage and resolve oldest bugs', phase: 1, status: 'in-progress', dueDate: '2026-06-10', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Ship one thing that\'s been sitting in QA', description: 'Week 1-2: Listen & Triage — Deploy pending release to production', phase: 1, status: 'in-progress', dueDate: '2026-06-11', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Review the CI/CD pipeline — fix the most annoying issue', description: 'Week 1-2: Listen & Triage — Fix broken builds or slow pipeline', phase: 1, status: 'pending', dueDate: '2026-06-12', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Set up basic error monitoring (Sentry/Bugsnag)', description: 'Week 1-2: Listen & Triage — Implement real-time error tracking', phase: 1, status: 'pending', dueDate: '2026-06-13', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Publish a "What\'s being worked on" board', description: 'Week 1-2: Listen & Triage — Set up Jira/Notion board visible to all', phase: 1, status: 'pending', dueDate: '2026-06-14', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

      // ── Week 3-4: Establish Cadence ──
      { id: genId(), title: 'Define sprint cadence (2-week sprints recommended)', description: 'Week 3-4: Establish Cadence — Set sprint duration and schedule', phase: 1, status: 'pending', dueDate: '2026-06-17', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Implement daily standups (15 min max)', description: 'Week 3-4: Establish Cadence — Daily sync ritual for the team', phase: 1, status: 'pending', dueDate: '2026-06-18', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Set up sprint demos with stakeholders (every 2 weeks)', description: 'Week 3-4: Establish Cadence — Bi-weekly demo to show progress', phase: 1, status: 'pending', dueDate: '2026-06-20', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Define bug severity levels and SLAs', description: 'Week 3-4: Establish Cadence — P1-P4 classification and response times', phase: 1, status: 'pending', dueDate: '2026-06-21', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Create a feature request intake process', description: 'Week 3-4: Establish Cadence — Standardized form/workflow for requests', phase: 1, status: 'pending', dueDate: '2026-06-23', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Ship 2-3 small features business has been waiting for', description: 'Week 3-4: Establish Cadence — Deliver quick wins to build trust', phase: 1, status: 'pending', dueDate: '2026-06-25', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Send first weekly "Dev Update" email', description: 'Week 3-4: Establish Cadence — Begin regular stakeholder communication', phase: 1, status: 'pending', dueDate: '2026-06-27', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

      // ── Month 2: Build Momentum ──
      { id: genId(), title: 'Complete first full sprint with demo', description: 'Month 2: Build Momentum — Full sprint cycle from planning to demo', phase: 2, status: 'pending', dueDate: '2026-07-10', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Publish velocity metrics (points completed per sprint)', description: 'Month 2: Build Momentum — Track and share team velocity', phase: 2, status: 'pending', dueDate: '2026-07-12', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Reduce bug backlog by 30%', description: 'Month 2: Build Momentum — Systematic bug fixing sprint', phase: 2, status: 'pending', dueDate: '2026-07-20', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Implement automated testing for critical paths', description: 'Month 2: Build Momentum — Add tests for core business flows', phase: 2, status: 'pending', dueDate: '2026-07-25', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Create product roadmap (next 3 months)', description: 'Month 2: Build Momentum — Visible plan for stakeholders', phase: 2, status: 'pending', dueDate: '2026-07-28', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Get stakeholder satisfaction baseline (survey)', description: 'Month 2: Build Momentum — Measure current CSAT for comparison', phase: 2, status: 'pending', dueDate: '2026-07-30', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Start addressing top tech debt items', description: 'Month 2: Build Momentum — Dedicate time to code quality improvements', phase: 2, status: 'pending', dueDate: '2026-07-31', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },

      // ── Month 3: Deliver at Scale ──
      { id: genId(), title: 'Complete 3 sprints with consistent velocity', description: 'Month 3: Deliver at Scale — Prove sustainable delivery cadence', phase: 2, status: 'pending', dueDate: '2026-08-07', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Ship one major feature/project', description: 'Month 3: Deliver at Scale — Deliver a significant business feature', phase: 2, status: 'pending', dueDate: '2026-08-15', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Achieve SLA targets consistently', description: 'Month 3: Deliver at Scale — Meet all defined SLA metrics', phase: 2, status: 'pending', dueDate: '2026-08-20', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Automated deployment pipeline fully operational', description: 'Month 3: Deliver at Scale — CI/CD from commit to production', phase: 2, status: 'pending', dueDate: '2026-08-22', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Stakeholder satisfaction survey (target: 20%+ improvement)', description: 'Month 3: Deliver at Scale — Measure improvement from baseline', phase: 2, status: 'pending', dueDate: '2026-08-25', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Present 6-month roadmap to leadership', description: 'Month 3: Deliver at Scale — Strategic plan for next half', phase: 2, status: 'pending', dueDate: '2026-08-28', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: genId(), title: 'Team retrospective — what\'s working, what needs change', description: 'Month 3: Deliver at Scale — Reflect and adjust the approach', phase: 2, status: 'pending', dueDate: '2026-08-30', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    data.smallWins = [
      { id: genId(), title: 'Fix 3F printer (broken 2 weeks)', description: '50+ people use it daily', visibility: 5, effort: 5, pain: 4, symbolic: 4, score: 23, done: true, createdAt: new Date().toISOString() },
      { id: genId(), title: 'Clear 15 pending software requests', description: 'People waiting weeks', visibility: 4, effort: 5, pain: 4, symbolic: 3, score: 21, done: true, createdAt: new Date().toISOString() },
      { id: genId(), title: 'Password self-service setup', description: 'Reduce #1 ticket type by 50%', visibility: 5, effort: 3, pain: 5, symbolic: 5, score: 23, done: false, createdAt: new Date().toISOString() },
      { id: genId(), title: 'Deploy stuck release to production', description: 'Business waiting for features', visibility: 5, effort: 4, pain: 5, symbolic: 5, score: 24, done: false, createdAt: new Date().toISOString() },
      { id: genId(), title: 'Fix CI/CD pipeline (breaks daily)', description: 'Dev team wastes hours on broken builds', visibility: 3, effort: 4, pain: 5, symbolic: 3, score: 18, done: false, createdAt: new Date().toISOString() },
      { id: genId(), title: 'Create IT welcome guide for new hires', description: 'Reduce onboarding confusion', visibility: 3, effort: 5, pain: 3, symbolic: 4, score: 20, done: false, createdAt: new Date().toISOString() },
      { id: genId(), title: 'Weekly Dev Update email', description: 'Transparency builds trust', visibility: 5, effort: 5, pain: 2, symbolic: 5, score: 22, done: false, createdAt: new Date().toISOString() },
    ];

    data.slaTargets = DEFAULT_SLA_TARGETS.map(t => ({ ...t, current: 0 }));

    data.activity = [
      { icon: '✅', text: 'Completed: Talk to every stakeholder department', time: new Date(Date.now() - 86400000 * 5).toISOString() },
      { icon: '✅', text: 'Completed: Audit the codebase (health, tech debt, test coverage)', time: new Date(Date.now() - 86400000 * 3).toISOString() },
      { icon: '🔄', text: 'Review the bug backlog — kill the oldest 5 → In Progress', time: new Date(Date.now() - 86400000 * 2).toISOString() },
      { icon: '🔄', text: 'Ship one thing that\'s been sitting in QA → In Progress', time: new Date(Date.now() - 86400000).toISOString() },
      { icon: '⚡', text: 'Small win completed: Fix 3F printer', time: new Date(Date.now() - 86400000).toISOString() },
      { icon: '⚡', text: 'Small win completed: Clear 15 pending software requests', time: new Date().toISOString() },
    ];

    saveData();
    renderAll();
    toast('Sample data loaded!');
  }

  // ── Helpers ──
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Render All ──
  function renderAll() {
    renderDashboard();
    renderMilestones();
    renderSmallWins();
    renderSla();
    renderDevUpdates();
    renderSettings();
  }

  // ── Init ──
  function init() {
    loadData();
    initTabs();
    initModal();
    initSidebar();

    // Set default week for dev update
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    document.getElementById('du-week').value = monday.toISOString().split('T')[0];

    // Milestone events
    document.getElementById('addMilestoneBtn').addEventListener('click', () => openMilestoneModal());
    document.getElementById('filterPhase').addEventListener('change', renderMilestones);
    document.getElementById('filterStatus').addEventListener('change', renderMilestones);
    document.getElementById('searchMilestone').addEventListener('input', renderMilestones);

    // Small win events
    document.getElementById('addSmallWinBtn').addEventListener('click', openSmallWinModal);

    // SLA events
    document.getElementById('addSlaRecordBtn').addEventListener('click', openSlaRecordModal);

    // Dev update events
    document.getElementById('devUpdateForm').addEventListener('submit', e => { e.preventDefault(); generateDevUpdate(); });
    document.getElementById('copyDevUpdate').addEventListener('click', () => {
      const preview = document.getElementById('devUpdatePreview').textContent;
      if (preview && !preview.includes('Fill in the form')) {
        navigator.clipboard.writeText(preview);
        toast('Copied to clipboard!');
      }
    });

    // Settings events
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('saveSlaTargets').addEventListener('click', saveSlaTargetsFromConfig);
    document.getElementById('resetDataBtn').addEventListener('click', resetData);
    document.getElementById('loadSampleBtn').addEventListener('click', loadSampleData);

    // Export/Import
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', e => {
      if (e.target.files[0]) importData(e.target.files[0]);
    });

    if (!isSyncEnabled()) {
      updateSyncStatus('offline');
    }

    renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
