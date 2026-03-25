import { Storage } from './storage.js';

export const Utils = {
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  formatDate(d) {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  formatDateFull(d) {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  },

  dayAbbr(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
  },

  isTaskActiveOnDate(t, d) {
    return t.isActive && t.startDate <= d && t.endDate >= d;
  },

  isOverdue(t, d) {
    return t.endDate < d;
  },

  getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  },

  async generateTaskId() {
    const tasks = await Storage.getTasks() || [];
    const nums = tasks.map(t => parseInt(t.taskId.replace('T', '')) || 0);
    const max = nums.length ? Math.max(...nums) : 0;
    return `T${String(max + 1).padStart(3, '0')}`;
  },

  getTaskStatus(t) {
    const today = this.today();
    if (t.startDate > today) return 'upcoming';
    if (t.endDate < today) return 'overdue';
    return 'active';
  },

  getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning, Rashmin.';
    if (h < 17) return 'Good afternoon, Rashmin.';
    return 'Good evening, Rashmin.';
  },

  catColor(c) {
    return {
      Study: '#60a5fa',
      Work: '#a78bfa',
      Health: '#4ade80',
      Personal: '#f59e0b',
      Finance: '#2dd4bf',
      Learning: '#f472b6',
      General: '#64748b'
    }[c] || '#64748b';
  },

  esc(s) {
    if (!s) return '';
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  toast(msg, type = 'default') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }
};