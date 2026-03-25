const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files

// Database setup
const db = new sqlite3.Database('./tasks.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    createTables();
  }
});

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    taskId TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    startDate TEXT,
    endDate TEXT,
    category TEXT,
    priority TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS task_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taskId TEXT,
    date TEXT,
    completed INTEGER DEFAULT 0,
    comment TEXT,
    completedAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (taskId) REFERENCES tasks (taskId)
  )`, () => {
    seedDatabase();
  });
}

function seedDatabase() {
  // Check if tasks table is empty
  db.get('SELECT COUNT(*) as count FROM tasks', [], (err, row) => {
    if (err) {
      console.error('Error checking tasks count:', err);
      return;
    }
    if (row.count === 0) {
      // Load seed data from tasks.json
      const seedFile = path.join(__dirname, 'data', 'tasks.json');
      if (fs.existsSync(seedFile)) {
        try {
          const seedTasks = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
          console.log('Seeding database with tasks from tasks.json...');
          const stmt = db.prepare(`INSERT INTO tasks (taskId, title, description, startDate, endDate, category, priority, isActive, createdAt)
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
          seedTasks.forEach(task => {
            stmt.run(task.taskId, task.title, task.description, task.startDate, task.endDate, task.category, task.priority, task.isActive ? 1 : 0, task.createdAt);
          });
          stmt.finalize();
          console.log('Database seeded successfully.');
        } catch (error) {
          console.error('Error seeding database:', error);
        }
      }
    }
  });
}

// API Routes
app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/tasks', (req, res) => {
  const { taskId, title, description, startDate, endDate, category, priority, isActive, createdAt } = req.body;
  db.run(`INSERT INTO tasks (taskId, title, description, startDate, endDate, category, priority, isActive, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [taskId, title, description, startDate, endDate, category, priority, isActive ? 1 : 0, createdAt],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.put('/api/tasks/:taskId', (req, res) => {
  const { title, description, startDate, endDate, category, priority } = req.body;
  db.run(`UPDATE tasks SET title = ?, description = ?, startDate = ?, endDate = ?, category = ?, priority = ?
          WHERE taskId = ?`,
    [title, description, startDate, endDate, category, priority, req.params.taskId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    });
});

app.delete('/api/tasks/:taskId', (req, res) => {
  db.run('DELETE FROM tasks WHERE taskId = ?', [req.params.taskId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM task_logs WHERE taskId = ?', [req.params.taskId]);
    res.json({ changes: this.changes });
  });
});

app.get('/api/logs', (req, res) => {
  db.all('SELECT * FROM task_logs', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/logs', (req, res) => {
  const { taskId, date, completed, comment, completedAt, updatedAt } = req.body;
  db.run(`INSERT OR REPLACE INTO task_logs (taskId, date, completed, comment, completedAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?)`,
    [taskId, date, completed ? 1 : 0, comment, completedAt, updatedAt],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});