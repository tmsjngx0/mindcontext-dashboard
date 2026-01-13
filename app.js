/**
 * MindContext Dashboard
 * Client-side aggregation of progress updates
 */

class Dashboard {
  constructor() {
    this.config = null;
    this.projects = new Map();
    this.updates = [];
    this.currentView = 'overview';

    this.init();
  }

  async init() {
    await this.loadConfig();
    await this.loadProjects();
    this.setupEventListeners();
    this.setupTheme();
    this.render();
    this.setupAutoRefresh();
  }

  async loadConfig() {
    try {
      const response = await fetch('./config.json');
      this.config = await response.json();
      document.getElementById('title').textContent = this.config.title || 'MindContext Dashboard';
    } catch (e) {
      console.warn('Could not load config.json, using defaults');
      this.config = {
        title: 'MindContext Dashboard',
        categories: {
          work: { color: '#3b82f6', label: 'Work' },
          personal: { color: '#10b981', label: 'Personal' },
          default: { color: '#6b7280', label: 'Projects' }
        },
        kanban: {
          columns: [
            { id: 'backlog', label: 'Backlog', statuses: ['proposed', 'backlog'] },
            { id: 'in_progress', label: 'In Progress', statuses: ['in_progress', 'active'] },
            { id: 'review', label: 'Review', statuses: ['review', 'testing'] },
            { id: 'done', label: 'Done', statuses: ['done', 'complete', 'completed'] }
          ]
        },
        refresh_interval: 300000
      };
    }
  }

  async loadProjects() {
    try {
      // In a real deployment, this would fetch from the GitHub API or a manifest file
      // For now, we'll try to load from a projects.json manifest
      const response = await fetch('./projects/manifest.json');
      const manifest = await response.json();

      for (const projectName of manifest.projects || []) {
        await this.loadProject(projectName);
      }
    } catch (e) {
      // No manifest, try to discover projects (works locally)
      console.log('No manifest found, showing demo data');
      this.loadDemoData();
    }

    this.updateStats();
  }

  async loadProject(projectName) {
    try {
      // Try to load manifest first
      const manifestResponse = await fetch(`./projects/${projectName}/updates/manifest.json`);
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json();
        for (const filename of manifest.files || []) {
          if (filename.endsWith('.json') && filename !== 'manifest.json') {
            await this.loadUpdate(projectName, filename);
          }
        }
        return;
      }

      // Fallback: try to parse directory listing
      const response = await fetch(`./projects/${projectName}/updates/`);
      const text = await response.text();
      const files = text.match(/href="([^"]+\.json)"/g) || [];

      for (const match of files) {
        const filename = match.replace('href="', '').replace('"', '');
        await this.loadUpdate(projectName, filename);
      }
    } catch (e) {
      console.warn(`Could not load project ${projectName}:`, e);
    }
  }

  async loadUpdate(projectName, filename) {
    try {
      const response = await fetch(`./projects/${projectName}/updates/${filename}`);
      const update = await response.json();

      this.updates.push(update);

      // Track latest update per project
      const existing = this.projects.get(projectName);
      if (!existing || new Date(update.timestamp) > new Date(existing.timestamp)) {
        this.projects.set(projectName, update);
      }
    } catch (e) {
      console.warn(`Could not load update ${filename}:`, e);
    }
  }

  loadDemoData() {
    // Demo data for testing the dashboard
    const demoUpdates = [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        machine: 'dev-laptop',
        project: 'my-app',
        progress: { change: 'add-auth', tasks_done: 5, tasks_total: 8, source: 'openspec' },
        context: {
          current_task: 'Working on add-auth',
          status: 'in_progress',
          notes: ['Implemented JWT tokens', 'Added login endpoint'],
          next: ['Add password reset', 'Write tests']
        }
      },
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        machine: 'dev-laptop',
        project: 'my-app',
        progress: { change: 'add-auth', tasks_done: 3, tasks_total: 8, source: 'openspec' },
        context: {
          current_task: 'Working on add-auth',
          status: 'in_progress',
          notes: ['Started auth implementation'],
          next: ['Add JWT tokens']
        }
      },
      {
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        machine: 'workstation',
        project: 'api-server',
        progress: { change: 'fix-performance', tasks_done: 2, tasks_total: 5, source: 'openspec' },
        context: {
          current_task: 'Database optimization',
          status: 'in_progress',
          notes: ['Added query caching'],
          next: ['Index optimization', 'Load testing']
        }
      },
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        machine: 'dev-laptop',
        project: 'docs-site',
        progress: { change: 'update-guides', tasks_done: 4, tasks_total: 4, source: 'openspec' },
        context: {
          current_task: 'Completed',
          status: 'done',
          notes: ['Updated all getting started guides'],
          next: []
        }
      }
    ];

    this.updates = demoUpdates;

    // Group by project, keeping latest
    for (const update of demoUpdates) {
      const existing = this.projects.get(update.project);
      if (!existing || new Date(update.timestamp) > new Date(existing.timestamp)) {
        this.projects.set(update.project, update);
      }
    }
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchView(e.target.dataset.view);
      });
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.refresh();
    });

    // Filters
    document.getElementById('kanban-project-filter').addEventListener('change', () => {
      this.renderKanban();
    });

    document.getElementById('timeline-project-filter').addEventListener('change', () => {
      this.renderTimeline();
    });

    document.getElementById('timeline-machine-filter').addEventListener('change', () => {
      this.renderTimeline();
    });
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.getElementById('theme-toggle').textContent = '☀️';
    }
  }

  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      document.getElementById('theme-toggle').textContent = '🌙';
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.getElementById('theme-toggle').textContent = '☀️';
      localStorage.setItem('theme', 'dark');
    }
  }

  setupAutoRefresh() {
    if (this.config.refresh_interval) {
      setInterval(() => this.refresh(), this.config.refresh_interval);
    }
  }

  async refresh() {
    document.getElementById('refresh-btn').textContent = '⟳';
    this.projects.clear();
    this.updates = [];
    await this.loadProjects();
    this.render();
    document.getElementById('refresh-btn').textContent = '↻';
  }

  switchView(view) {
    this.currentView = view;

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === view);
    });
  }

  render() {
    this.populateFilters();
    this.renderOverview();
    this.renderKanban();
    this.renderTimeline();
    this.updateLastUpdated();
  }

  populateFilters() {
    const projectNames = Array.from(this.projects.keys()).sort();
    const machines = [...new Set(this.updates.map(u => u.machine))].sort();

    // Kanban filter
    const kanbanFilter = document.getElementById('kanban-project-filter');
    kanbanFilter.innerHTML = '<option value="all">All Projects</option>' +
      projectNames.map(p => `<option value="${p}">${p}</option>`).join('');

    // Timeline filters
    const timelineProjectFilter = document.getElementById('timeline-project-filter');
    timelineProjectFilter.innerHTML = '<option value="all">All Projects</option>' +
      projectNames.map(p => `<option value="${p}">${p}</option>`).join('');

    const timelineMachineFilter = document.getElementById('timeline-machine-filter');
    timelineMachineFilter.innerHTML = '<option value="all">All Machines</option>' +
      machines.map(m => `<option value="${m}">${m}</option>`).join('');
  }

  renderOverview() {
    const container = document.getElementById('projects-grid');

    if (this.projects.size === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <p>No projects found</p>
          <p style="font-size: 0.875rem; margin-top: 0.5rem;">
            Run <code>mc connect</code> in your project to start tracking
          </p>
        </div>
      `;
      return;
    }

    const cards = Array.from(this.projects.entries()).map(([name, update]) => {
      const progress = update.progress || {};
      const percentage = progress.tasks_total > 0
        ? Math.round((progress.tasks_done / progress.tasks_total) * 100)
        : 0;
      const category = this.getCategoryForProject(name);
      const categoryConfig = this.config.categories[category] || this.config.categories.default;
      const isActive = this.isRecentlyActive(update.timestamp);

      return `
        <div class="project-card">
          <div class="project-header">
            <span class="project-name">${name}</span>
            <span class="project-category" style="background: ${categoryConfig.color}">
              ${categoryConfig.label}
            </span>
          </div>
          ${progress.change ? `<div class="project-change">📋 ${progress.change}</div>` : ''}
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%; background: ${percentage === 100 ? '#10b981' : '#3b82f6'}"></div>
          </div>
          <div class="progress-text">
            <span>${progress.tasks_done || 0}/${progress.tasks_total || 0} tasks</span>
            <span>${percentage}%</span>
          </div>
          <div class="project-activity">
            <div class="activity-item">
              <span class="activity-dot ${isActive ? '' : 'idle'}"></span>
              <span>${update.machine} • ${this.formatTime(update.timestamp)}</span>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = cards.join('');
  }

  renderKanban() {
    const container = document.getElementById('kanban-board');
    const filterProject = document.getElementById('kanban-project-filter').value;

    // Get all changes from updates
    const changes = new Map();
    for (const update of this.updates) {
      if (filterProject !== 'all' && update.project !== filterProject) continue;

      const change = update.progress?.change;
      if (!change) continue;

      const key = `${update.project}:${change}`;
      const existing = changes.get(key);
      if (!existing || new Date(update.timestamp) > new Date(existing.timestamp)) {
        changes.set(key, update);
      }
    }

    if (changes.size === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1">
          <div class="empty-state-icon">📋</div>
          <p>No tasks found</p>
        </div>
      `;
      return;
    }

    // Group by status
    const columns = this.config.kanban.columns.map(col => ({
      ...col,
      items: []
    }));

    for (const [key, update] of changes) {
      const status = update.context?.status || 'backlog';
      const column = columns.find(c => c.statuses.includes(status)) || columns[0];
      column.items.push({
        project: update.project,
        change: update.progress.change,
        tasks_done: update.progress.tasks_done,
        tasks_total: update.progress.tasks_total,
        machine: update.machine,
        timestamp: update.timestamp
      });
    }

    container.innerHTML = columns.map(col => `
      <div class="kanban-column">
        <div class="column-header">
          <span class="column-title">${col.label}</span>
          <span class="column-count">${col.items.length}</span>
        </div>
        <div class="kanban-cards">
          ${col.items.length === 0 ? '<div style="color: var(--text-secondary); font-size: 0.75rem; text-align: center; padding: 1rem;">No items</div>' :
            col.items.map(item => `
              <div class="kanban-card">
                <div class="kanban-card-title">${item.change}</div>
                <div class="kanban-card-meta">
                  <span class="kanban-card-project">${item.project}</span>
                  <span>${item.tasks_done}/${item.tasks_total}</span>
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    `).join('');
  }

  renderTimeline() {
    const container = document.getElementById('timeline-feed');
    const filterProject = document.getElementById('timeline-project-filter').value;
    const filterMachine = document.getElementById('timeline-machine-filter').value;

    let filtered = this.updates;
    if (filterProject !== 'all') {
      filtered = filtered.filter(u => u.project === filterProject);
    }
    if (filterMachine !== 'all') {
      filtered = filtered.filter(u => u.machine === filterMachine);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📜</div>
          <p>No activity found</p>
        </div>
      `;
      return;
    }

    // Group by date
    const groups = new Map();
    for (const update of filtered) {
      const date = new Date(update.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date).push(update);
    }

    const html = [];
    for (const [date, updates] of groups) {
      html.push(`<div class="timeline-date">${date}</div>`);

      for (const update of updates) {
        const notes = update.context?.notes || [];
        const next = update.context?.next || [];

        html.push(`
          <div class="timeline-item">
            <div class="timeline-header">
              <span class="timeline-project">${update.project}</span>
              <span class="timeline-time">${this.formatTime(update.timestamp)}</span>
            </div>
            <div class="timeline-machine">🖥️ ${update.machine} ${update.progress?.change ? `• ${update.progress.change}` : ''}</div>
            <div class="timeline-content">
              ${notes.length > 0 ? `
                <ul class="timeline-notes">
                  ${notes.map(n => `<li>${n}</li>`).join('')}
                </ul>
              ` : ''}
              ${next.length > 0 ? `
                <div class="timeline-next-label">Next:</div>
                <ul class="timeline-next">
                  ${next.map(n => `<li>${n}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          </div>
        `);
      }
    }

    container.innerHTML = html.join('');
  }

  updateLastUpdated() {
    const latest = this.updates.reduce((max, u) =>
      !max || new Date(u.timestamp) > new Date(max.timestamp) ? u : max, null);

    document.getElementById('last-updated').textContent = latest
      ? this.formatTime(latest.timestamp)
      : 'Never';
  }

  updateStats() {
    const stats = document.getElementById('stats');
    stats.textContent = `${this.projects.size} projects • ${this.updates.length} updates`;
  }

  // Helpers
  getCategoryForProject(name) {
    // Could be enhanced to read from project config
    return 'default';
  }

  isRecentlyActive(timestamp) {
    const hourAgo = Date.now() - 3600000;
    return new Date(timestamp) > hourAgo;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// Initialize dashboard
new Dashboard();
