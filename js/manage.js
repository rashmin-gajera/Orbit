import { Storage } from './storage.js';
import { Utils } from './utils.js';

const TODAY = Utils.today();

export async function handleFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('f-title').value.trim();
  const desc = document.getElementById('f-desc').value.trim();
  const start = document.getElementById('f-start').value;
  const end = document.getElementById('f-end').value;
  const category = document.getElementById('f-category').value;
  const priority = document.getElementById('f-priority').value;

  if (!title || !start || !end) {
    Utils.toast('Fill required fields', 'error');
    return;
  }

  if (end < start) {
    Utils.toast('End date must be after start', 'error');
    return;
  }

  if (window.editMode) {
    const taskId = document.getElementById('edit-task-id').value;
    await Storage.updateTask(taskId, { title, description: desc, startDate: start, endDate: end, category, priority });
    Utils.toast('Task updated', 'success');
  } else {
    const newTask = {
      taskId: await Utils.generateTaskId(),
      title,
      description: desc,
      startDate: start,
      endDate: end,
      category,
      priority,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    await Storage.addTask(newTask);
    Utils.toast('Task added', 'success');
  }
  hideForm();
  renderTable();
}

export async function renderTable() {
  const allTasks = await Storage.getTasks();
  const search = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
  const catF = document.getElementById('filter-category')?.value || 'all';
  const priF = document.getElementById('filter-priority')?.value || 'all';

  const filtered = allTasks.filter(t => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search) || (t.description || '').toLowerCase().includes(search) || t.category.toLowerCase().includes(search);
    const matchesCategory = catF === 'all' || t.category === catF;
    const matchesPriority = priF === 'all' || t.priority === priF;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const tbody = document.getElementById('task-table-body');
  const empty = document.getElementById('table-empty');
  const badge = document.getElementById('task-count-badge');

  if (badge) badge.textContent = `(${allTasks.length})`;

  if (!filtered.length) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  tbody.innerHTML = sorted.map(task => {
    const status = Utils.getTaskStatus(task);
    const label = { active: 'Active', upcoming: 'Upcoming', overdue: 'Overdue', past: 'Past' }[status] || status;

    return `<tr>
      <td><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-3)">${task.taskId}</span></td>
      <td class="td-title"><span class="title-text" title="${Utils.esc(task.title)}">${Utils.esc(task.title)}</span>${task.description ? `<span style="display:block;font-size:11px;color:var(--text-3);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px">${Utils.esc(task.description)}</span>` : ''}</td>
      <td><span style="display:flex;align-items:center;gap:6px"><span class="cat-dot cat-${task.category}"></span><span style="font-size:12px">${task.category}</span></span></td>
      <td><span class="priority-pill ${task.priority}">${task.priority}</span></td>
      <td class="td-date">${Utils.formatDate(task.startDate)}</td>
      <td class="td-date">${Utils.formatDate(task.endDate)}</td>
      <td><span class="status-badge status-${status}">${label}</span></td>
      <td><div class="tbl-actions"><button class="tbl-btn tbl-btn-edit" onclick="editTask('${task.taskId}')">Edit</button><button class="tbl-btn tbl-btn-del" onclick="promptDelete('${task.taskId}','${Utils.esc(task.title)}')">Delete</button></div></td>
    </tr>`;
  }).join('');
}

export async function editTask(taskId) {
  const allTasks = await Storage.getTasks() || [];
  const task = allTasks.find(t => t.taskId === taskId);
  if (task) {
    showManageForm(task);
  }
}

let deleteTargetId = null;

export function promptDelete(taskId, name) {
  deleteTargetId = taskId;
  document.getElementById('delete-task-name').textContent = name;
  document.getElementById('delete-modal').style.display = 'flex';
}

export function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('delete-modal').style.display = 'none';
}

export async function confirmDelete() {
  if (!deleteTargetId) return;
  await Storage.deleteTask(deleteTargetId);
  closeDeleteModal();
  await renderTable();
  if (window.refreshDashboard) await window.refreshDashboard();
  Utils.toast('Task deleted', 'success');
}

export function showManageForm(editTask = null) {
  window.switchPage('manage');

  const cancelBtn = document.getElementById('btn-cancel-form');
  const submitBtn = document.getElementById('form-submit-btn');

  cancelBtn.style.display = 'inline-flex';

  if (editTask) {
    window.editMode = true;
    document.getElementById('form-title').textContent = 'Edit Task';
    submitBtn.textContent = 'Save Changes';
    document.getElementById('edit-task-id').value = editTask.taskId;
    document.getElementById('f-title').value = editTask.title || '';
    document.getElementById('f-desc').value = editTask.description || '';
    document.getElementById('f-start').value = editTask.startDate || '';
    document.getElementById('f-end').value = editTask.endDate || '';
    document.getElementById('f-category').value = editTask.category || 'General';
    document.getElementById('f-priority').value = editTask.priority || 'Medium';
  } else {
    window.editMode = false;
    document.getElementById('form-title').textContent = 'New Task';
    submitBtn.textContent = 'Add Task';
    document.getElementById('task-form').reset();
    document.getElementById('edit-task-id').value = '';
    document.getElementById('f-start').value = TODAY;
    document.getElementById('f-end').value = TODAY;
  }

  document.getElementById('f-title').focus();
}

export function hideForm() {
  window.editMode = false;
  document.getElementById('btn-cancel-form').style.display = 'none';
  document.getElementById('task-form').reset();
  document.getElementById('edit-task-id').value = '';
  document.getElementById('form-title').textContent = 'New Task';
  document.getElementById('form-submit-btn').textContent = 'Add Task';
  document.getElementById('f-start').value = TODAY;
  document.getElementById('f-end').value = TODAY;
}
