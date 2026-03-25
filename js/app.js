import { Storage } from './storage.js';
import { Utils } from './utils.js';
import { switchPage, refreshDashboard, initFilterPills, closeCommentModal, openCommentModal, saveComment } from './dashboard.js';
import { handleFormSubmit, renderTable, showManageForm, hideForm, editTask, promptDelete, closeDeleteModal, confirmDelete } from './manage.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize tasks from API (database seeded by server)
  await Storage.initTasks();

  switchPage('dashboard');
  initFilterPills();

  document.getElementById('task-form')?.addEventListener('submit', handleFormSubmit);
  document.getElementById('btn-cancel-form')?.addEventListener('click', hideForm);
  document.getElementById('modal-comment')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) saveComment();
    if (e.key === 'Escape') closeCommentModal();
  });

  document.getElementById('f-start').value = Utils.today();
  document.getElementById('f-end').value = Utils.today();

  // Add event listeners for navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.getAttribute('data-page');
      switchPage(page);
    });
  });

  // Add event listener for "New Task" button
  document.getElementById('header-new-task')?.addEventListener('click', () => {
    switchPage('manage');
    showManageForm();
  });

  // Add event listener for empty state "Add a task" link
  document.getElementById('empty-add-task')?.addEventListener('click', () => {
    switchPage('manage');
    showManageForm();
  });

  // Add event listener for manage page "New Task" button
  document.getElementById('manage-new-task')?.addEventListener('click', () => {
    showManageForm();
  });

  window.switchPage = switchPage;
  window.showManageForm = showManageForm;
  window.hideForm = hideForm;
  window.editTask = editTask;
  window.promptDelete = promptDelete;
  window.closeDeleteModal = closeDeleteModal;
  window.confirmDelete = confirmDelete;
  window.openCommentModal = openCommentModal;
  window.closeCommentModal = closeCommentModal;
  window.saveComment = saveComment;
  window.renderTable = renderTable;
  window.refreshDashboard = refreshDashboard;
});

