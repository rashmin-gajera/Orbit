import { Storage } from './storage.js';
import { Utils } from './utils.js';

let currentFilter = 'all';
const TODAY = Utils.today();

export async function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const targetPage = document.getElementById(`page-${page}`);
  if (!targetPage) return;
  targetPage.classList.add('active');
  const activeNav = document.querySelector(`[data-page="${page}"]`);
  if (activeNav) activeNav.classList.add('active');

  if (page === 'dashboard') await refreshDashboard();
  if (page === 'manage' && window.renderTable) await window.renderTable();
}

export async function refreshDashboard() {
  const allTasks = await Storage.getTasks() || [];
  renderHeader(allTasks);
  await renderTasks(allTasks);
  renderKPIs(allTasks);
  renderWeeklyBars();
  renderCategoryBreakdown();
}

function getTodayTasks(allTasks) {
  return allTasks.filter(t => Utils.isTaskActiveOnDate(t, TODAY));
}

async function getCompletedToday(tasks = null) {
  const allTasks = tasks || getTodayTasks(await Storage.getTasks() || []);
  return await Promise.all(allTasks.map(async (t) => {
    const l = await Storage.getLog(t.taskId, TODAY);
    return (l && l.completed) ? t : null;
  })).then(results => results.filter(Boolean));
}

async function getOverdueTasks() {
  const allTasks = await Storage.getTasks() || [];
  return allTasks.filter(t => t.isActive && Utils.isOverdue(t, TODAY));
}

async function getFilteredTasks() {
  const all = getTodayTasks(await Storage.getTasks() || []);

  if (currentFilter === 'pending') {
    return await Promise.all(all.map(async (t) => {
      const l = await Storage.getLog(t.taskId, TODAY);
      return (!l || !l.completed) ? t : null;
    })).then(results => results.filter(Boolean));
  }

  if (currentFilter === 'completed') {
    return await Promise.all(all.map(async (t) => {
      const l = await Storage.getLog(t.taskId, TODAY);
      return (l && l.completed) ? t : null;
    })).then(results => results.filter(Boolean));
  }

  if (currentFilter === 'high')
    return all.filter(t => t.priority === 'High');

  return all;
}

async function renderHeader(allTasks) {
  document.getElementById('header-date').textContent = Utils.formatDateFull(TODAY);
  document.getElementById('header-greeting').textContent = Utils.getGreeting();

  const todayTasks = getTodayTasks(allTasks);
  document.getElementById('qs-total').textContent = todayTasks.length;
  document.getElementById('qs-done').textContent = (await getCompletedToday(todayTasks)).length;
  document.getElementById('qs-overdue').textContent = (await getOverdueTasks()).length;
}

async function renderTasks(allTasks) {
  const filtered = await getFilteredTasks();
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');

  if (!filtered.length) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  const sorted = await Promise.all(filtered.map(async (t) => {
    const log = await Storage.getLog(t.taskId, TODAY);
    return { task: t, log };
  }));

  sorted.sort((a, b) => {
    const pri = { High: 0, Medium: 1, Low: 2 };
    const ad = a.log && a.log.completed ? 1 : 0;
    const bd = b.log && b.log.completed ? 1 : 0;
    if (ad !== bd) return ad - bd;
    return (pri[a.task.priority] || 1) - (pri[b.task.priority] || 1);
  });

  list.innerHTML = sorted.map(({ task, log }, i) => renderTaskCard(task, log, i)).join('');

  document.querySelectorAll('[data-check]').forEach(el =>
    el.addEventListener('click', e => toggleCompletion(e.currentTarget.getAttribute('data-check')))
  );

  document.querySelectorAll('[data-comment]').forEach(el =>
    el.addEventListener('click', e => openCommentModal(e.currentTarget.getAttribute('data-comment'), e.currentTarget.getAttribute('data-title')))
  );
}

function renderTaskCard(task, log, index) {
  const done = log && log.completed;
  const note = log && log.comment && log.comment.trim();
  const overdue = Utils.isOverdue(task, TODAY);
  const dr = task.startDate === task.endDate
    ? Utils.formatDate(task.startDate)
    : `${Utils.formatDate(task.startDate)} → ${Utils.formatDate(task.endDate)}`;

  return `<div class="task-card ${done ? 'completed' : ''} ${overdue && !done ? 'overdue-card-item' : ''}" style="animation-delay:${index * 0.04}s" data-task-id="${task.taskId}">
        <div class="task-checkbox ${done ? 'checked' : ''}" data-check="${task.taskId}">${done ? '✓' : ''}</div>
        <div class="task-body">
          <div class="task-title-row">
            <span class="task-title">${Utils.esc(task.title)}</span>
            <span class="priority-pill ${task.priority}">${task.priority}</span>
            ${overdue && !done ? '<span class="priority-pill" style="background:rgba(248,113,113,.12);color:#fda4af;border:1px solid rgba(248,113,113,.24)">Overdue</span>' : ''}
          </div>
          <div class="task-meta">
            <span class="task-date">${dr}</span>
            <span class="task-category"><span class="cat-dot cat-${task.category}"></span>${task.category}</span>
          </div>
          ${note ? `<div class="task-comment-preview">${Utils.esc(log.comment)}</div>` : ''}
        </div>
        <div class="task-actions">
          <button class="task-comment-btn ${note ? 'has-note' : ''}" data-comment="${task.taskId}" data-title="${Utils.esc(task.title)}">✎ ${note ? 'Note' : 'Add note'}</button>
        </div>
      </div>`;
}

async function toggleCompletion(taskId) {
  const log = await Storage.getLog(taskId, TODAY);
  const now = !(log && log.completed);
  await Storage.setLog(taskId, TODAY, { completed: now, completedAt: now ? new Date().toISOString() : null });
  await refreshDashboard();
  if (window.renderTable) await window.renderTable();
  Utils.toast(now ? 'Task completed' : 'Marked incomplete', now ? 'success' : 'default');
}

async function renderKPIs(allTasks) {
  const todayTasks = getTodayTasks(allTasks);
  const done = await getCompletedToday(todayTasks);
  const overdue = await getOverdueTasks();

  const tomorrow = (() => {
    const d = new Date(TODAY + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const allTasksFull = await Storage.getTasks() || [];
  const upcoming = allTasksFull.filter(t => Utils.isTaskActiveOnDate(t, tomorrow));
  const pct = todayTasks.length ? Math.round((done.length / todayTasks.length) * 100) : 0;

  document.getElementById('ring-fill').style.strokeDashoffset = 314 - (314 * pct) / 100;
  document.getElementById('ring-pct').textContent = `${pct}%`;
  document.getElementById('pm-done').textContent = done.length;
  document.getElementById('pm-remaining').textContent = todayTasks.length - done.length;
  document.getElementById('pm-total').textContent = todayTasks.length;

  document.getElementById('kpi-overdue').textContent = overdue.length;
  document.getElementById('kpi-upcoming').textContent = upcoming.length;

  const streak = await calculateStreak();
  document.getElementById('kpi-streak').textContent = streak;
  document.getElementById('sidebar-streak').textContent = `${streak} day streak`;

  const last7 = Utils.getLast7Days();
  const rates = await Promise.all(last7.map(d => getCompletionRate(d)));
  const validRates = rates.filter(r => r !== null);
  const avg = validRates.length ? Math.round(validRates.reduce((a, b) => a + b, 0) / validRates.length) : null;
  document.getElementById('kpi-weekly').textContent = avg !== null ? `${avg}%` : '—';
}

async function renderWeeklyBars() {
  const days = Utils.getLast7Days();
  const rates = await Promise.all(days.map(date => getCompletionRate(date)));
  document.getElementById('weekly-bars').innerHTML = days.map((date, i) => {
    const rate = rates[i] ?? 0;
    const isToday = date === TODAY;
    const h = Math.max(6, Math.round(rate * 0.78));
    return `<div class="bar-col"><div class="bar-fill ${isToday ? 'today' : ''}" style="height:${h}px" title="${date}: ${rate}%"></div><span class="bar-day ${isToday ? 'today' : ''}">${Utils.dayAbbr(date)}</span></div>`;
  }).join('');
}

async function renderCategoryBreakdown(allTasks) {
  const todayTasks = getTodayTasks(allTasks);
  const catList = document.getElementById('category-list');
  if (!todayTasks.length) {
    catList.innerHTML = '<div style="font-size:12px;color:var(--text-3)">No tasks today.</div>';
    return;
  }
  const catMap = {};
  todayTasks.forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + 1;
  });
  const total = todayTasks.length;
  catList.innerHTML = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => {
      const pct = Math.round((count / total) * 100);
      const color = Utils.catColor(cat);
      return `<div class="category-row"><span class="category-name">${cat}</span><div class="category-bar-wrap"><div class="category-bar-fill" style="width:${pct}%;background:${color}"></div></div><span class="category-count">${count}</span></div>`;
    }).join('');
}

async function getCompletionRate(date) {
  const tasks = await Storage.getTasks() || [];
  const logs = await Storage.getLogs();
  const active = tasks.filter(t => Utils.isTaskActiveOnDate(t, date));
  if (!active.length) return null;
  const done = active.filter(t => {
    const l = logs.find(l => l.taskId === t.taskId && l.date === date);
    return l && l.completed;
  });
  return Math.round((done.length / active.length) * 100);
}

async function calculateStreak() {
  const d = new Date(TODAY + 'T00:00:00');
  let streak = 0;

  for (let i = 0; i < 30; i++) {
    const ds = d.toISOString().slice(0, 10);
    const rate = await getCompletionRate(ds);

    if (i === 0 && rate !== null && rate >= 50) {
      streak++;
      d.setDate(d.getDate() - 1);
      continue;
    }

    if (i === 0) {
      d.setDate(d.getDate() - 1);
      continue;
    }

    if (rate === null || rate < 50) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

export async function openCommentModal(taskId, title) {
  const log = await Storage.getLog(taskId, TODAY);
  document.getElementById('modal-task-title').textContent = title;
  document.getElementById('modal-comment').value = (log && log.comment) || '';
  document.getElementById('comment-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('modal-comment').focus(), 50);
}

export function closeCommentModal() {
  document.getElementById('comment-modal').style.display = 'none';
}

export async function saveComment() {
  if (!window.commentTargetId) return;
  await Storage.setLog(window.commentTargetId, TODAY, { comment: document.getElementById('modal-comment').value.trim() });
  closeCommentModal();
  await refreshDashboard();
  if (window.renderTable) await window.renderTable();
  Utils.toast('Note saved', 'success');
}

export function initFilterPills() {
  document.querySelectorAll('.pill').forEach(p => p.addEventListener('click', async e => {
    document.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.getAttribute('data-filter') || 'all';
    await renderTasks(await Storage.getTasks() || []);
    await renderKPIs(await Storage.getTasks() || []);
  }));
}
