const API_BASE = 'http://localhost:3000/api';

export const Storage = {
  async getTasks() {
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return await res.json();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  },

  async saveTasks(tasks) {
    // Not needed since we use API for individual operations
    console.log('Tasks are saved via API operations');
  },

  async initTasks(seedTasks) {
    // Database is seeded by server
    return await this.getTasks();
  },

  async addTask(task) {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!res.ok) throw new Error('Failed to add task');
      return await res.json();
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  },

  async updateTask(taskId, updates) {
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update task');
      return await res.json();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  async deleteTask(taskId) {
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete task');
      return await res.json();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },

  async getLogs() {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return await res.json();
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  },

  async saveLogs(logs) {
    // Not needed
  },

  async getLog(taskId, date) {
    const logs = await this.getLogs();
    return logs.find(l => l.taskId === taskId && l.date === date) || null;
  },

  async setLog(taskId, date, updates) {
    try {
      const logData = { taskId, date, ...updates };
      const res = await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
      if (!res.ok) throw new Error('Failed to save log');
      return await res.json();
    } catch (error) {
      console.error('Error saving log:', error);
      throw error;
    }
  }
};