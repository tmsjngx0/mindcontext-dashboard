# MindContext Dashboard

Your personal progress tracking dashboard. Fork this template to create your own dashboard hosted on GitHub Pages.

## Quick Start

1. **Use this template**: Click "Use this template" on GitHub to create your own dashboard repository
2. **Enable GitHub Pages**: Go to Settings > Pages > Source: Deploy from branch > Branch: `main`, folder: `/docs`
3. **Connect projects**: Run `mc connect` in your projects to start syncing updates

## Structure

```
my-dashboard/
├── projects/               # Progress update files (synced by mc CLI)
│   └── {project-name}/
│       └── updates/
│           └── {timestamp}_{machine}_{hash}.json
├── docs/                   # GitHub Pages dashboard
│   ├── index.html
│   ├── app.js
│   └── style.css
├── config.json             # Dashboard configuration
└── README.md
```

## Configuration

Edit `config.json` to customize your dashboard:

```json
{
  "title": "My Projects",
  "categories": {
    "work": { "color": "#3b82f6", "label": "Work" },
    "personal": { "color": "#10b981", "label": "Personal" }
  },
  "kanban": {
    "columns": [
      { "id": "backlog", "label": "Backlog", "statuses": ["proposed", "backlog"] },
      { "id": "in_progress", "label": "In Progress", "statuses": ["in_progress", "active"] },
      { "id": "review", "label": "Review", "statuses": ["review", "testing"] },
      { "id": "done", "label": "Done", "statuses": ["done", "complete", "completed"] }
    ]
  },
  "refresh_interval": 300000
}
```

## Dashboard Views

### Overview
Project cards showing:
- Current change/task
- Progress bar with task counts
- Active/idle indicator
- Last update timestamp

### Kanban
Task board with customizable columns:
- Filter by project
- Cards show change name, project, task progress
- Status-based column mapping

### Timeline
Activity feed showing:
- Date-grouped updates
- Work done (notes)
- Next tasks planned
- Filter by project or machine

## Features

- **Dark mode**: Auto-detects system preference, toggleable
- **Responsive**: Works on desktop and mobile
- **Auto-refresh**: Configurable refresh interval
- **Offline-first**: Works with local files, no server needed
- **Zero dependencies**: Vanilla HTML/CSS/JS

## How Updates Work

The `mc` CLI creates update files in this structure:

```json
{
  "timestamp": "2025-01-08T10:30:00Z",
  "machine": "dev-laptop",
  "project": "my-app",
  "progress": {
    "change": "add-auth",
    "tasks_done": 3,
    "tasks_total": 7,
    "source": "openspec"
  },
  "context": {
    "current_task": "Implementing JWT",
    "status": "in_progress",
    "notes": ["Added token validation"],
    "next": ["Write tests"]
  }
}
```

Each machine writes timestamped files - no merge conflicts possible.

## Team Collaboration

- Each team member forks/clones the same dashboard repo
- Everyone runs `mc sync` - unique files created per machine
- `mc pull` fetches team updates
- Dashboard shows all activity across the team

## Local Development

To test the dashboard locally:

```bash
# Serve the docs folder
cd docs
python -m http.server 8000
# Open http://localhost:8000
```

Demo data is shown when no real projects are detected.

## Requirements

- GitHub account (for hosting)
- [mindcontext CLI](https://www.npmjs.com/package/mindcontext) installed
- Git

## License

MIT
